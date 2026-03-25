import ledgerModel from "../models/ledgerModel.js";
import walletModel from "../models/walletModel.js";
import { DB_SCHEMA } from "../config/db.js";
import { PROFILE_TYPES, WALLET_ROLES } from "../utils/constants.js";

/**
 * Double-entry ledger + fee distribution via Revenue wallet.
 *
 * Balance snapshots (before_balance / after_balance) are recorded on every
 * ledger entry.  Callers pass a `balances` map keyed by wallet_id whose
 * values are `{ before_balance, after_balance }`.  For wallet movements that
 * happen *inside* this service (commissions, treasury CASH_OUT) the snapshots
 * are captured from the walletModel return value.
 */
const ledgerService = {
  /**
   * Book the main legs: sender debited, receiver credited, fee credited to Revenue (if any).
   * `balances` = Map<walletId, { before_balance, after_balance }> from caller's debit/credit calls.
   */
  async recordMainTransactionLedger(
    client,
    transactionId,
    {
      senderWalletId,
      receiverWalletId,
      revenueWalletId,
      senderDebit,
      receiverCredit,
      fee,
      amount,
      typeLabel,
      balances,
    },
  ) {
    const bal = (wid) => balances?.get(wid) || {};

    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: senderWalletId,
      entryType: "DEBIT",
      amount: senderDebit,
      description: `${typeLabel}: sender`,
      beforeBalance: bal(senderWalletId).before_balance,
      afterBalance: bal(senderWalletId).after_balance,
    });

    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: receiverWalletId,
      entryType: "CREDIT",
      amount: receiverCredit,
      description: `${typeLabel}: receiver`,
      beforeBalance: bal(receiverWalletId).before_balance,
      afterBalance: bal(receiverWalletId).after_balance,
    });

    if (fee > 0 && revenueWalletId) {
      await ledgerModel.createLedgerEntry(client, {
        transactionId,
        walletId: revenueWalletId,
        entryType: "CREDIT",
        amount: fee,
        description: `${typeLabel}: fee to revenue`,
        beforeBalance: bal(revenueWalletId).before_balance,
        afterBalance: bal(revenueWalletId).after_balance,
      });
    }

    if (typeLabel === "CASH_OUT") {
      const treasury = await walletModel.findByRoleForUpdate(
        client,
        WALLET_ROLES.TREASURY,
      );
      if (treasury) {
        const tResult = await walletModel.debit(client, treasury.wallet_id, amount);
        await ledgerModel.createLedgerEntry(client, {
          transactionId,
          walletId: treasury.wallet_id,
          entryType: "DEBIT",
          amount,
          description: `${typeLabel}: treasury cash-out settlement`,
          beforeBalance: tResult.before_balance,
          afterBalance: tResult.after_balance,
        });
      }
    }
  },

  /**
   * Split share based on transaction amount from Revenue to beneficiaries per commission_policies.
   */
  async distributeCommissions(
    client,
    txTypeId,
    transactionAmount,
    transactionId,
    parties,
  ) {
    if (transactionAmount <= 0) return [];

    const revenueWallet = await walletModel.findByRoleForUpdate(
      client,
      WALLET_ROLES.REVENUE,
    );
    if (!revenueWallet) return [];

    const policies = await ledgerModel.findByTransactionType(txTypeId);
    if (policies.length === 0) return [];

    const results = [];

    for (const policy of policies) {
      if (policy.profile_type_id === PROFILE_TYPES.SYSTEM) {
        continue;
      }

      let beneficiaryProfileId;
      if (policy.profile_type_id === parties.senderTypeId) {
        beneficiaryProfileId = parties.senderProfileId;
      } else if (policy.profile_type_id === parties.receiverTypeId) {
        beneficiaryProfileId = parties.receiverProfileId;
      } else if (policy.profile_type_id === PROFILE_TYPES.DISTRIBUTOR) {
        let agentProfileId = null;
        if (parties.senderTypeId === PROFILE_TYPES.AGENT) {
          agentProfileId = parties.senderProfileId;
        } else if (parties.receiverTypeId === PROFILE_TYPES.AGENT) {
          agentProfileId = parties.receiverProfileId;
        }

        if (agentProfileId) {
          const agentRes = await client.query(
            `SELECT distributor_id FROM ${DB_SCHEMA}.agent_profiles WHERE profile_id = $1`,
            [agentProfileId],
          );
          beneficiaryProfileId = agentRes.rows[0]?.distributor_id;
        }
      }

      if (!beneficiaryProfileId) continue;

      const shareAmount = Number(
        ((transactionAmount * policy.commission_share) / 100).toFixed(2),
      );
      if (shareAmount <= 0) continue;

      const wallet = await walletModel.findByProfileIdForUpdate(
        client,
        beneficiaryProfileId,
      );
      if (!wallet) continue;

      const treasury = await walletModel.findByRoleForUpdate(
        client,
        WALLET_ROLES.TREASURY,
      );

      const revResult = await walletModel.debit(client, revenueWallet.wallet_id, shareAmount);
      const benResult = await walletModel.credit(client, wallet.wallet_id, shareAmount);

      let tresResult;
      if (treasury) {
        tresResult = await walletModel.credit(client, treasury.wallet_id, shareAmount);
      }

      await ledgerModel.createLedgerEntry(client, {
        transactionId,
        walletId: revenueWallet.wallet_id,
        entryType: "DEBIT",
        amount: shareAmount,
        description: `Commission share (${policy.commission_share}% of volume to ${policy.beneficiary_type_name})`,
        beforeBalance: revResult.before_balance,
        afterBalance: revResult.after_balance,
      });
      await ledgerModel.createLedgerEntry(client, {
        transactionId,
        walletId: wallet.wallet_id,
        entryType: "CREDIT",
        amount: shareAmount,
        description: `Commission share (${policy.commission_share}% of volume to ${policy.beneficiary_type_name})`,
        beforeBalance: benResult.before_balance,
        afterBalance: benResult.after_balance,
      });
      if (treasury && tresResult) {
        await ledgerModel.createLedgerEntry(client, {
          transactionId,
          walletId: treasury.wallet_id,
          entryType: "CREDIT",
          amount: shareAmount,
          description: `Commission share record to treasury`,
          beforeBalance: tresResult.before_balance,
          afterBalance: tresResult.after_balance,
        });
      }

      results.push({
        policy,
        shareAmount,
        beneficiaryWalletId: wallet.wallet_id,
      });
    }

    return results;
  },

  /**
   * Admin load e-cash: Treasury credited, target credited.
   * Accepts pre-computed balance snapshots from adminService.
   */
  async recordLoadEcashLedger(
    client,
    transactionId,
    treasuryWalletId,
    targetWalletId,
    amount,
    balances,
  ) {
    const bal = (wid) => balances?.get(wid) || {};

    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: treasuryWalletId,
      entryType: "CREDIT",
      amount,
      description: "ADMIN_LOAD: treasury",
      beforeBalance: bal(treasuryWalletId).before_balance,
      afterBalance: bal(treasuryWalletId).after_balance,
    });
    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: targetWalletId,
      entryType: "CREDIT",
      amount,
      description: "ADMIN_LOAD: recipient",
      beforeBalance: bal(targetWalletId).before_balance,
      afterBalance: bal(targetWalletId).after_balance,
    });
  },
};

export default ledgerService;
