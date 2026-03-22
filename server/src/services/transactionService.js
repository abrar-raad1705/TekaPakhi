const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { generateTxRef } = require('../utils/helpers');
const { PROFILE_TYPES } = require('../utils/constants');
const profileModel = require('../models/profileModel');
const walletModel = require('../models/walletModel');
const transactionModel = require('../models/transactionModel');
const transactionTypeModel = require('../models/transactionTypeModel');
const feeService = require('./feeService');
const limitService = require('./limitService');
const commissionService = require('./commissionService');
const authService = require('./authService');

/**
 * Role validation rules: which profile types can send/receive for each tx type
 */
const ROLE_RULES = {
  SEND_MONEY: { sender: [PROFILE_TYPES.CUSTOMER], receiver: [PROFILE_TYPES.CUSTOMER] },
  CASH_IN: { sender: [PROFILE_TYPES.AGENT], receiver: [PROFILE_TYPES.CUSTOMER] },
  CASH_OUT: { sender: [PROFILE_TYPES.CUSTOMER], receiver: [PROFILE_TYPES.AGENT] },
  PAYMENT: { sender: [PROFILE_TYPES.CUSTOMER], receiver: [PROFILE_TYPES.MERCHANT] },
  PAY_BILL: { sender: [PROFILE_TYPES.CUSTOMER], receiver: [PROFILE_TYPES.BILLER] },
  B2B: { sender: [PROFILE_TYPES.DISTRIBUTOR], receiver: [PROFILE_TYPES.AGENT] },
};

const transactionService = {
  /**
   * Execute a transaction — the universal pipeline
   *
   * Flow: resolve parties → validate roles → verify PIN → calculate fee
   *       → check limits → check balances → BEGIN → debit/credit → insert tx
   *       → distribute commissions → COMMIT → return receipt
   */
  async execute({ senderProfileId, receiverPhone, amount, typeCode, pin, note }) {
<<<<<<< Updated upstream
    // ── 1. Resolve transaction type ──
    const txType = await transactionTypeModel.findByName(typeCode);
    if (!txType) {
      throw new AppError(`Unknown transaction type: ${typeCode}`, 400);
    }

    // ── 2. Resolve sender profile ──
    const sender = await profileModel.findById(senderProfileId);
    if (!sender) throw new AppError('Sender profile not found.', 404);

    // ── 3. Resolve receiver profile ──
    const receiver = await profileModel.findByPhone(receiverPhone);
    if (!receiver) throw new AppError('Recipient not found. Please check the phone number.', 404);

    // ── 4. Can't send to yourself ──
    if (sender.profile_id === receiver.profile_id) {
      throw new AppError('You cannot send money to yourself.', 400);
    }

    // ── 5. Validate roles ──
    const rules = ROLE_RULES[typeCode];
    if (rules) {
      if (!rules.sender.includes(sender.type_id)) {
        throw new AppError(`Your account type (${sender.type_name}) cannot initiate ${typeCode} transactions.`, 403);
      }
      if (!rules.receiver.includes(receiver.type_id)) {
        throw new AppError(`Recipient account type (${receiver.type_name}) is not valid for ${typeCode}.`, 400);
      }
    }

    // ── 6. Check KYC status — block PENDING_KYC accounts ──
    const senderStatus = await profileModel.getAccountStatus(sender.profile_id, sender.type_name);
    if (senderStatus === 'PENDING_KYC') {
      throw new AppError('Your account is pending verification. Please wait for admin approval before transacting.', 403);
    }
    if (senderStatus === 'SUSPENDED' || senderStatus === 'BLOCKED') {
      throw new AppError(`Your account is ${senderStatus.toLowerCase()}. Contact support.`, 403);
    }

    // ── 7. Verify PIN (with brute force protection) ──
    await authService.verifyTransactionPin(senderProfileId, pin);

    // ── 7. Atomic transaction ──
=======
>>>>>>> Stashed changes
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Resolve transaction type
      const txType = await transactionTypeModel.findByName(typeCode, client);
      if (!txType) {
        throw new AppError(`Unknown transaction type: ${typeCode}`, 400);
      }

      // Resolve sender profile
      const sender = await profileModel.findById(senderProfileId, client);
      if (!sender) throw new AppError('Sender profile not found.', 404);

      // Resolve receiver profile
      const receiver = await profileModel.findByPhone(receiverPhone, client);
      if (!receiver) throw new AppError('Recipient not found. Please check the phone number.', 404);

      // Can't send to yourself
      if (sender.profile_id === receiver.profile_id) {
        throw new AppError('You cannot send money to yourself.', 400);
      }

      // Validate roles
      const rules = ROLE_RULES[typeCode];
      if (rules) {
        if (!rules.sender.includes(sender.type_id)) {
          throw new AppError(`Your account type (${sender.type_name}) cannot initiate ${typeCode} transactions.`, 403);
        }
        if (!rules.receiver.includes(receiver.type_id)) {
          throw new AppError(`Recipient account type (${receiver.type_name}) is not valid for ${typeCode}.`, 400);
        }
      }

      // Check KYC status — block PENDING_KYC accounts
      const senderStatus = await profileModel.getAccountStatus(sender.profile_id, sender.type_name, client);
      if (senderStatus === 'PENDING_KYC') {
        throw new AppError('Your account is pending verification. Please wait for admin approval before transacting.', 403);
      }
      if (senderStatus === 'SUSPENDED' || senderStatus === 'BLOCKED') {
        throw new AppError(`Your account is ${senderStatus.toLowerCase()}. Contact support.`, 403);
      }

      // Verify PIN (Inside transaction since it accesses DB)
      await authService.verifyTransactionPin(senderProfileId, pin, client);


      // Lock wallets to prevent race conditions
      const senderWallet = await walletModel.findByProfileIdForUpdate(sender.profile_id, client);
      const receiverWallet = await walletModel.findByProfileIdForUpdate(receiver.profile_id, client);

      if (!senderWallet) throw new AppError('Sender wallet not found.', 404);
      if (!receiverWallet) throw new AppError('Receiver wallet not found.', 404);

      // ── 8. Calculate fee (tiered for SEND_MONEY, standard for others) ──
      let fee;
      if (typeCode === 'SEND_MONEY') {
        const monthlyTotal = await transactionModel.getMonthlyTotalForUpdate(sender.profile_id, txType.type_id, client);
        fee = feeService.calculateSendMoneyFee(amount, monthlyTotal);
      } else {
        fee = feeService.calculate(txType, amount);
      }
      const { senderDebit, receiverCredit } = feeService.applyFeeBearer(amount, fee, txType.fee_bearer);

      // ── 9. Check limits ──
      await limitService.check(client, sender.type_id, txType.type_id, sender.profile_id, amount);

      // ── 10. Check sender balance ──
      if (parseFloat(senderWallet.balance) < senderDebit) {
        throw new AppError(
          `Insufficient balance. You need ৳${senderDebit.toFixed(2)} but have ৳${parseFloat(senderWallet.balance).toFixed(2)}.`,
          400
        );
      }

      // ── 11. Check receiver max balance ──
      if (parseFloat(receiverWallet.balance) + receiverCredit > parseFloat(receiverWallet.max_balance)) {
        throw new AppError("Transaction would exceed the recipient's maximum wallet balance.", 400);
      }

<<<<<<< Updated upstream
      // ── 12. Debit sender ──
      await walletModel.debit(client, senderWallet.wallet_id, senderDebit);

      // ── 13. Credit receiver ──
      await walletModel.credit(client, receiverWallet.wallet_id, receiverCredit);

      // ── 14. Insert transaction record ──
      const txRef = generateTxRef();
      const transaction = await transactionModel.create(client, {
        txRef,
        amount,
        fee,
        typeId: txType.type_id,
        senderWalletId: senderWallet.wallet_id,
        receiverWalletId: receiverWallet.wallet_id,
        note,
        status: 'COMPLETED',
      });

      // ── 15. Distribute commissions ──
      await commissionService.distribute(
        client,
        txType.type_id,
        fee,
        transaction.transaction_id,
        {
          senderProfileId: sender.profile_id,
          senderTypeId: sender.type_id,
          receiverProfileId: receiver.profile_id,
          receiverTypeId: receiver.type_id,
        }
      );

=======
      // Insert transaction record (Triggers will handle balances and commissions)
      let transaction;
      let txRef;
      try {
        ({ txRef, row: transaction } = await transactionModel.createWithTxRef({
          amount,
          fee,
          typeId: txType.type_id,
          senderWalletId: senderWallet.wallet_id,
          receiverWalletId: receiverWallet.wallet_id,
          senderDebit,
          receiverCredit,
          note,
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

      // ── 16. Return receipt ──
      return {
        transactionRef: txRef,
        transactionId: transaction.transaction_id,
        type: txType.type_name,
        amount: parseFloat(amount),
        fee,
        totalDebit: senderDebit,
        totalCredit: receiverCredit,
        feeBearer: txType.fee_bearer,
        sender: {
          name: sender.full_name,
          phone: sender.phone_number,
        },
        receiver: {
          name: receiver.full_name,
          phone: receiver.phone_number,
        },
        note: note || null,
        status: 'COMPLETED',
        timestamp: transaction.transaction_time,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Preview a transaction
   */
  async preview({ senderProfileId, receiverPhone, amount, typeCode }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const txType = await transactionTypeModel.findByName(typeCode, client);
      if (!txType) throw new AppError(`Unknown transaction type: ${typeCode}`, 400);

      const sender = await profileModel.findById(senderProfileId, client);
      if (!sender) throw new AppError('Sender profile not found.', 404);

      const receiver = await profileModel.findByPhone(receiverPhone, client);
      if (!receiver) throw new AppError('Recipient not found.', 404);

      if (sender.profile_id === receiver.profile_id) {
        throw new AppError('You cannot send money to yourself.', 400);
      }

      const rules = ROLE_RULES[typeCode];
      if (rules) {
        if (!rules.sender.includes(sender.type_id)) {
          throw new AppError(`Your account type cannot initiate ${typeCode} transactions.`, 403);
        }
        if (!rules.receiver.includes(receiver.type_id)) {
          throw new AppError(`Recipient is not valid for ${typeCode}.`, 400);
        }
      }

      let fee;
      if (typeCode === 'SEND_MONEY') {
        const monthlyTotal = await transactionModel.getMonthlyTotal(sender.profile_id, txType.type_id, client);
        fee = feeService.calculateSendMoneyFee(amount, monthlyTotal);
      } else {
        fee = feeService.calculate(txType, amount);
      }
      const { senderDebit, receiverCredit } = feeService.applyFeeBearer(amount, fee, txType.fee_bearer);

      await client.query('COMMIT');

      return {
        type: txType.type_name,
        amount: parseFloat(amount),
        fee,
        feeBearer: txType.fee_bearer,
        totalDebit: senderDebit,
        totalCredit: receiverCredit,
        sender: { name: sender.full_name, phone: sender.phone_number },
        receiver: { name: receiver.full_name, phone: receiver.phone_number },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get transaction details by ID
   */
  async getDetail(transactionId, profileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = await transactionModel.findByIdForProfile(transactionId, profileId, client);
      if (!tx) throw new AppError('Transaction not found.', 404);
      await client.query('COMMIT');
      return tx;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
<<<<<<< Updated upstream
=======
   * Receipt data for PDF
   */
  async getReceiptDataForPdf(transactionId, profileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = await transactionModel.findByIdForProfile(transactionId, profileId, client);
      if (!tx) throw new AppError('Transaction not found.', 404);
      const amount = parseFloat(tx.amount);
      const fee = parseFloat(tx.fee_amount);
      const { senderDebit } = feeService.applyFeeBearer(amount, fee, tx.fee_bearer);
      await client.query('COMMIT');
      return {
        transactionRef: tx.transaction_ref,
        type: tx.type_name,
        amount,
        fee,
        totalDebit: senderDebit,
        sender: { name: tx.sender_name, phone: tx.sender_phone },
        receiver: { name: tx.receiver_name, phone: tx.receiver_phone },
        note: tx.user_note || null,
        timestamp: tx.transaction_time,
        status: tx.status,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
>>>>>>> Stashed changes
   * Get paginated transaction history
   */
  async getHistory(profileId, filters) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await transactionModel.findByProfileId(profileId, filters, client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Get mini statement
   */
  async getMiniStatement(profileId, count = 5) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await transactionModel.miniStatement(profileId, count, client);
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

<<<<<<< Updated upstream
module.exports = transactionService;
=======

export default transactionService;
>>>>>>> Stashed changes
