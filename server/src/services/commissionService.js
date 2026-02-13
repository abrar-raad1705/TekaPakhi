const commissionModel = require('../models/commissionModel');
const walletModel = require('../models/walletModel');
const { PROFILE_TYPES } = require('../utils/constants');

/**
 * System profile ID (Platform Revenue wallet)
 * This is the profile created in migration 005 with phone 01999999999
 */
const SYSTEM_PROFILE_ID = 1;

const commissionService = {
  /**
   * Distribute commissions for a transaction
   * Reads commission_policies for the tx type, calculates each share, credits wallets
   *
   * @param {Object} client - DB client (within transaction)
   * @param {number} txTypeId - Transaction type ID
   * @param {number} feeAmount - Total fee collected
   * @param {number} transactionId - The transaction record ID
   * @param {Object} parties - { senderProfileId, senderTypeId, receiverProfileId, receiverTypeId }
   * @returns {Array} commission entries created
   */
  async distribute(client, txTypeId, feeAmount, transactionId, parties) {
    if (feeAmount <= 0) return [];

    const policies = await commissionModel.findByTransactionType(txTypeId);
    if (policies.length === 0) return [];

    const entries = [];

    for (const policy of policies) {
      const shareAmount = Math.round((feeAmount * parseFloat(policy.commission_share) / 100) * 100) / 100;
      if (shareAmount <= 0) continue;

      // Determine which wallet to credit
      let beneficiaryProfileId;

      if (policy.profile_type_id === PROFILE_TYPES.SYSTEM) {
        // System/Platform gets its share
        beneficiaryProfileId = SYSTEM_PROFILE_ID;
      } else if (policy.profile_type_id === parties.senderTypeId) {
        // Commission goes to the sender (e.g., agent in cash-in)
        beneficiaryProfileId = parties.senderProfileId;
      } else if (policy.profile_type_id === parties.receiverTypeId) {
        // Commission goes to the receiver (e.g., agent in cash-out)
        beneficiaryProfileId = parties.receiverProfileId;
      } else {
        // Fallback: unresolvable beneficiary type → goes to system
        beneficiaryProfileId = SYSTEM_PROFILE_ID;
      }

      const wallet = await walletModel.findByProfileIdForUpdate(client, beneficiaryProfileId);
      if (!wallet) continue;

      // Credit the beneficiary's wallet
      await walletModel.credit(client, wallet.wallet_id, shareAmount);

      // Record the commission entry
      const entry = await commissionModel.createEntry(client, {
        transactionId,
        beneficiaryWalletId: wallet.wallet_id,
        commissionAmount: shareAmount,
      });

      entries.push(entry);
    }

    return entries;
  },
};

module.exports = commissionService;
