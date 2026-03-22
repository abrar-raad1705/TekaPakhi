const bcrypt = require('bcrypt');
const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { generateTxRef } = require('../utils/helpers');
const { PROFILE_TYPES } = require('../utils/constants');
const adminModel = require('../models/adminModel');
const profileModel = require('../models/profileModel');
const walletModel = require('../models/walletModel');
const commissionModel = require('../models/commissionModel');

const SALT_ROUNDS = 12;

const adminService = {
  // ── Dashboard ────────────────────────────────────────────────

  async getDashboard() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const [userCounts, txStats, todayStats, monthStats, monthlyTrend, recentUsers, platformFinancials] = await Promise.all([
        adminModel.getUserCountsByType(client),
        adminModel.getTransactionStats(client),
        adminModel.getTodayStats(client),
        adminModel.getThisMonthStats(client),
        adminModel.getMonthlyTrend(6, client),
        adminModel.getRecentRegistrations(5, client),
        adminModel.getPlatformFinancials(client),
      ]);

      const totalUsers = userCounts.reduce((sum, r) => sum + r.count, 0);

      await client.query('COMMIT');

      return {
        users: {
          total: totalUsers,
          byType: userCounts,
        },
        platform: platformFinancials,
        transactions: {
          allTime: {
            count: txStats.total_count,
            volume: parseFloat(txStats.total_volume),
            revenue: parseFloat(txStats.total_revenue),
          },
          today: {
            count: todayStats.count,
            volume: parseFloat(todayStats.volume),
            revenue: parseFloat(todayStats.revenue),
          },
          thisMonth: {
            count: monthStats.count,
            volume: parseFloat(monthStats.volume),
            revenue: parseFloat(monthStats.revenue),
          },
          monthlyTrend: monthlyTrend.map((r) => ({
            month: r.month,
            count: r.count,
            volume: parseFloat(r.volume),
            revenue: parseFloat(r.revenue),
          })),
        },
        recentRegistrations: recentUsers,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  // ── User Management ──────────────────────────────────────────

  async listUsers(filters) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getUsers(filters, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getUserDetail(profileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const detail = await adminModel.getUserDetail(profileId, client);
      if (!detail) throw new AppError('User not found.', 404);
      await client.query('COMMIT');
      return detail;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  /**
   * Create a Distributor or Biller profile (admin-only)
   */
  async createProfile({ phoneNumber, fullName, securityPin, accountType, ...subtypeFields }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await profileModel.findByPhone(phoneNumber, client);
      if (existing) throw new AppError('An account with this phone number already exists.', 409);

<<<<<<< Updated upstream
    const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

=======
      const typeId = PROFILE_TYPES[accountType];
      if (!typeId) throw new AppError('Invalid account type.', 400);

      const pinHash = await bcrypt.hash(securityPin, SALT_ROUNDS);
>>>>>>> Stashed changes
      const profile = await profileModel.create({ phoneNumber, fullName, pinHash, typeId }, client);

      if (accountType === 'DISTRIBUTOR') {
        await profileModel.createDistributorSubtype(profile.profile_id, subtypeFields, client);
      } else if (accountType === 'BILLER') {
        await profileModel.createBillerSubtype(profile.profile_id, subtypeFields, client);
      }

      await client.query('COMMIT');

      return {
        profileId: profile.profile_id,
        phoneNumber: profile.phone_number,
        fullName: profile.full_name,
        accountType,
        accountStatus: 'ACTIVE',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  /**
   * Load e-cash to a profile's wallet
   */
  async loadWallet(targetProfileId, amount, adminProfileId) {
    if (amount <= 0) throw new AppError('Amount must be positive.', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const target = await profileModel.findById(targetProfileId, client);
      if (!target) throw new AppError('Target profile not found.', 404);

      // Get system wallet (sender for audit trail — NOT debited)
      const systemWalletResult = await client.query(
        `SELECT w.wallet_id FROM tp.wallets w
         JOIN tp.profiles p ON w.profile_id = p.profile_id
         JOIN tp.profile_types pt ON p.type_id = pt.type_id
         WHERE pt.type_name = 'SYSTEM' LIMIT 1`
      );
      if (systemWalletResult.rows.length === 0) throw new AppError('System wallet not found.', 500);
      const systemWalletId = systemWalletResult.rows[0].wallet_id;

      // Lock target wallet
      const targetWallet = await walletModel.findByProfileIdForUpdate(targetProfileId, client);
      if (!targetWallet) throw new AppError('Target wallet not found.', 404);

<<<<<<< Updated upstream
      // Credit target wallet (new money creation)
      await walletModel.credit(client, targetWallet.wallet_id, amount);

      // Record transaction for audit trail
      const txRef = generateTxRef();
      await client.query(
        `INSERT INTO tp.transactions
           (transaction_ref, amount, fee_amount, status, sender_wallet_id, receiver_wallet_id,
            type_id, user_note)
         VALUES ($1, $2, 0, 'COMPLETED', $3, $4,
           (SELECT type_id FROM tp.transaction_types WHERE type_name = 'CASH_IN'),
           $5)`,
        [txRef, amount, systemWalletId, targetWallet.wallet_id,
          `ADMIN_LOAD: ৳${amount} loaded by admin #${adminProfileId}`]
      );
=======
      // Insert transaction record (Triggers will handle balance)
      let txRef;
      try {
        const txType = await client.query("SELECT type_id FROM tp.transaction_types WHERE type_name = 'CASH_IN'");
        if (txType.rows.length === 0) throw new AppError('CASH_IN transaction type not found.', 500);

        ({ txRef } = await transactionModel.createWithTxRef({
          amount,
          fee: 0,
          typeId: txType.rows[0].type_id,
          senderWalletId: systemWalletId,
          receiverWalletId: targetWallet.wallet_id,
          senderDebit: 0,
          receiverCredit: amount,
          note: `ADMIN_LOAD: ৳${amount} loaded by admin #${adminProfileId}`,
          status: 'COMPLETED',
        }, undefined, client));
      } catch (e) {
        if (e.code === 'TX_REF_EXHAUSTED') {
          throw new AppError('Could not assign a transaction ID. Please try again.', 503);
        }
        throw e;
      }
>>>>>>> Stashed changes

      await client.query('COMMIT');

      return {
        transactionRef: txRef,
        targetProfileId,
        targetName: target.full_name,
        amount,
        newBalance: parseFloat(targetWallet.balance) + amount,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async updateUserStatus(profileId, newStatus) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

<<<<<<< Updated upstream
=======
      // First get the user's type
>>>>>>> Stashed changes
      const userResult = await client.query(
        `SELECT p.profile_id, pt.type_name
         FROM tp.profiles p
         JOIN tp.profile_types pt ON p.type_id = pt.type_id
         WHERE p.profile_id = $1`,
        [profileId]
      );
      if (userResult.rows.length === 0) throw new AppError('User not found.', 404);

      const { type_name } = userResult.rows[0];
      if (type_name === 'SYSTEM') throw new AppError('Cannot modify SYSTEM profile status.', 400);

      const updated = await adminModel.updateUserStatus(profileId, type_name, newStatus, client);
      if (!updated) throw new AppError('Failed to update status. Subtype profile not found.', 404);

      await client.query('COMMIT');

      return { profileId, typeName: type_name, newStatus: updated.status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async listTransactions(filters) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getAllTransactions(filters, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },


  // ── Transaction Reversal ─────────────────────────────────────

  /**
   * Reverse a completed transaction atomically.
   *
   * Steps:
   *   1. Verify original transaction is COMPLETED
   *   2. BEGIN
   *   3. Lock sender & receiver wallets
   *   4. Credit back the sender (amount + fee if sender bore the fee)
   *   5. Debit back the receiver (amount or amount - fee if receiver bore it)
   *   6. Reverse commission entries (debit beneficiary wallets)
   *   7. Insert reversal transaction record
   *   8. Mark original as REVERSED
   *   9. COMMIT
   */
  async reverseTransaction(transactionId, adminProfileId) {
    const original = await adminModel.getTransactionForReversal(transactionId);
    if (!original) throw new AppError('Transaction not found.', 404);
    if (original.status !== 'COMPLETED') {
      throw new AppError(`Cannot reverse a transaction with status: ${original.status}`, 400);
    }

    const amount = parseFloat(original.amount);
    const fee = parseFloat(original.fee_amount);

    // Determine reversal amounts based on fee bearer
    let senderCreditBack, receiverDebitBack;
    if (original.fee_bearer === 'SENDER') {
      senderCreditBack = amount + fee;   // sender was debited this total
      receiverDebitBack = amount;         // receiver got the principal
    } else {
      senderCreditBack = amount;          // sender was debited principal only
      receiverDebitBack = amount - fee;   // receiver got principal minus fee
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock wallets
      const senderWallet = await walletModel.findByProfileIdForUpdate(original.sender_profile_id, client);
      const receiverWallet = await walletModel.findByProfileIdForUpdate(original.receiver_profile_id, client);

      if (!senderWallet) throw new AppError('Sender wallet not found.', 404);
      if (!receiverWallet) throw new AppError('Receiver wallet not found.', 404);

      // Check receiver has enough balance to debit back
      if (parseFloat(receiverWallet.balance) < receiverDebitBack) {
        throw new AppError(
          `Cannot reverse: receiver has insufficient balance (৳${parseFloat(receiverWallet.balance).toFixed(2)} < ৳${receiverDebitBack.toFixed(2)}).`,
          400
        );
      }

      // Credit sender
      await walletModel.credit(senderWallet.wallet_id, senderCreditBack, client);

      // Debit receiver
      await walletModel.debit(receiverWallet.wallet_id, receiverDebitBack, client);

      // Reverse commissions — debit each beneficiary wallet directly
      const commissions = await commissionModel.findByTransactionId(transactionId, client);

      for (const entry of commissions) {
        await client.query(
          `UPDATE tp.wallets SET balance = balance - $1, last_activity_date = NOW()
           WHERE wallet_id = $2 AND balance >= $1`,
          [parseFloat(entry.commission_amount), entry.beneficiary_wallet_id]
        );
      }

      // Insert reversal record
      const txRef = generateTxRef();
      const reversalResult = await client.query(
        `INSERT INTO tp.transactions
           (transaction_ref, amount, fee_amount, transaction_time, status,
            sender_wallet_id, receiver_wallet_id, type_id, original_transaction_id,
            user_note)
         VALUES ($1, $2, $3, NOW(), 'REVERSED', $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          txRef, amount, fee, original.receiver_wallet_id, original.sender_wallet_id,
          original.type_id, original.transaction_id,
          `Reversed by admin (profile #${adminProfileId})`,
        ]
      );

      // Mark original as REVERSED
      await client.query(
        `UPDATE tp.transactions SET status = 'REVERSED' WHERE transaction_id = $1`,
        [transactionId]
      );

      await client.query('COMMIT');

      return {
        originalTransactionId: transactionId,
        reversalTransactionId: reversalResult.rows[0].transaction_id,
        reversalRef: txRef,
        senderCreditBack,
        receiverDebitBack,
        commissionsReversed: commissions.length,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ── Config Management ────────────────────────────────────────

  async getTransactionTypes() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getTransactionTypes(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async updateTransactionType(typeId, fields) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const allowed = ['fee_percentage', 'fee_flat_amount', 'fee_bearer', 'fee_min_amount', 'fee_max_amount'];
      const filtered = {};
      for (const key of allowed) {
        if (fields[key] !== undefined) filtered[key] = fields[key];
      }
      const result = await adminModel.updateTransactionType(typeId, filtered, client);
      if (!result) throw new AppError('Transaction type not found or no valid fields.', 404);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getTransactionLimits() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getTransactionLimits(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async upsertTransactionLimit(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.upsertTransactionLimit(data, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteTransactionLimit(profileTypeId, transactionTypeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.deleteTransactionLimit(profileTypeId, transactionTypeId, client);
      if (!result) throw new AppError('Limit not found.', 404);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getCommissionPolicies() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getCommissionPolicies(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async upsertCommissionPolicy(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.upsertCommissionPolicy(data, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async deleteCommissionPolicy(profileTypeId, transactionTypeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.deleteCommissionPolicy(profileTypeId, transactionTypeId, client);
      if (!result) throw new AppError('Policy not found.', 404);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // ── Reports ──────────────────────────────────────────────────

  async getTransactionReport(filters) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getTransactionReport(filters, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getUserGrowthReport(filters) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await adminModel.getUserGrowthReport(filters, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

};

module.exports = adminService;
