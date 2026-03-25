import ledgerModel from "../models/ledgerModel.js";
import walletModel from "../models/walletModel.js";
import { PROFILE_TYPES, WALLET_ROLES } from "../utils/constants.js";

/**
 * Double-entry ledger + fee distribution via Revenue wallet.
 */
const ledgerService = {
  /**
   * Book the main legs: sender debited, receiver credited, fee credited to Revenue (if any).
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
    },
  ) {
    // 1. Sender debit
    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: senderWalletId,
      entryType: "DEBIT",
      amount: senderDebit,
      description: `${typeLabel}: sender`,
    });
    // 2. Receiver credit
    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: receiverWalletId,
      entryType: "CREDIT",
      amount: receiverCredit,
      description: `${typeLabel}: receiver`,
    });
    // 3. System Revenue credit (if any)
    if (fee > 0 && revenueWalletId) {
      await ledgerModel.createLedgerEntry(client, {
        transactionId,
        walletId: revenueWalletId,
        entryType: "CREDIT",
        amount: fee,
        description: `${typeLabel}: fee to revenue`,
      });
    }

    // 4. Treasury tracking: Tracks the "real cash position"
    // - CASH_OUT: Real cash leaves system (Agent -> Customer) -> Debit Treasury (decreases obligation/cash backing)
    // - Other transactions (CASH_IN, SEND_MONEY, PAYMENT, etc.) are internal transfers or movements and do not affect system's net cash position.
    if (typeLabel === "CASH_OUT") {
      const treasury = await walletModel.findByRoleForUpdate(
        client,
        WALLET_ROLES.TREASURY,
      );
      if (treasury) {
        await walletModel.debit(client, treasury.wallet_id, amount);
        await ledgerModel.createLedgerEntry(client, {
          transactionId,
          walletId: treasury.wallet_id,
          entryType: "DEBIT",
          amount,
          description: `${typeLabel}: treasury cash-out settlement`,
        });
      }
    }
  },

  /**
   * Split share based on transaction amount from Revenue to beneficiaries per commission_policies.
   * SYSTEM share stays in Revenue (no transfer).
   * Unmatched policy types (e.g. distributor with no linked profile) are skipped — share remains in Revenue.
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
        // Find distributor linked to the agent involved in this transaction
        let agentProfileId = null;
        if (parties.senderTypeId === PROFILE_TYPES.AGENT) {
          agentProfileId = parties.senderProfileId;
        } else if (parties.receiverTypeId === PROFILE_TYPES.AGENT) {
          agentProfileId = parties.receiverProfileId;
        }

        if (agentProfileId) {
          const agentRes = await client.query(
            `SELECT distributor_id FROM tp.agent_profiles WHERE profile_id = $1`,
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

      // Note: We don't cap by remainingFee anymore as some transactions (like CASH_IN)
      // don't charge the customer but still pay out commissions from the Revenue wallet.

      const treasury = await walletModel.findByRoleForUpdate(
        client,
        WALLET_ROLES.TREASURY,
      );

      await walletModel.debit(client, revenueWallet.wallet_id, shareAmount);
      await walletModel.credit(client, wallet.wallet_id, shareAmount);
      if (treasury) {
        await walletModel.credit(client, treasury.wallet_id, shareAmount);
      }

      await ledgerModel.createLedgerEntry(client, {
        transactionId,
        walletId: revenueWallet.wallet_id,
        entryType: "DEBIT",
        amount: shareAmount,
        description: `Commission share (${policy.commission_share}% of volume to ${policy.beneficiary_type_name})`,
      });
      await ledgerModel.createLedgerEntry(client, {
        transactionId,
        walletId: wallet.wallet_id,
        entryType: "CREDIT",
        amount: shareAmount,
        description: `Commission share (${policy.commission_share}% of volume to ${policy.beneficiary_type_name})`,
      });
      if (treasury) {
        await ledgerModel.createLedgerEntry(client, {
          transactionId,
          walletId: treasury.wallet_id,
          entryType: "CREDIT",
          amount: shareAmount,
          description: `Commission share record to treasury`,
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
   * Admin load e-cash: Treasury debited, target credited (same transaction_id as tp.transactions row).
   */
  async recordLoadEcashLedger(
    client,
    transactionId,
    treasuryWalletId,
    targetWalletId,
    amount,
  ) {
    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: treasuryWalletId,
      entryType: "CREDIT",
      amount,
      description: "ADMIN_LOAD: treasury",
    });
    await ledgerModel.createLedgerEntry(client, {
      transactionId,
      walletId: targetWalletId,
      entryType: "CREDIT",
      amount,
      description: "ADMIN_LOAD: recipient",
    });
  },
};

export default ledgerService;
