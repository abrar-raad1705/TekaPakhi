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
  SEND_MONEY:  { sender: [PROFILE_TYPES.CUSTOMER], receiver: [PROFILE_TYPES.CUSTOMER] },
  CASH_IN:     { sender: [PROFILE_TYPES.AGENT],    receiver: [PROFILE_TYPES.CUSTOMER] },
  CASH_OUT:    { sender: [PROFILE_TYPES.CUSTOMER],  receiver: [PROFILE_TYPES.AGENT] },
  PAYMENT:     { sender: [PROFILE_TYPES.CUSTOMER],  receiver: [PROFILE_TYPES.MERCHANT] },
  PAY_BILL:    { sender: [PROFILE_TYPES.CUSTOMER],  receiver: [PROFILE_TYPES.BILLER] },
  B2B:         { sender: [PROFILE_TYPES.DISTRIBUTOR], receiver: [PROFILE_TYPES.AGENT] },
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock wallets to prevent race conditions
      const senderWallet = await walletModel.findByProfileIdForUpdate(client, sender.profile_id);
      const receiverWallet = await walletModel.findByProfileIdForUpdate(client, receiver.profile_id);

      if (!senderWallet) throw new AppError('Sender wallet not found.', 404);
      if (!receiverWallet) throw new AppError('Receiver wallet not found.', 404);

      // ── 8. Calculate fee (tiered for SEND_MONEY, standard for others) ──
      let fee;
      if (typeCode === 'SEND_MONEY') {
        const monthlyTotal = await transactionModel.getMonthlyTotalForUpdate(client, sender.profile_id, txType.type_id);
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
   * Preview a transaction (calculate fee without executing)
   */
  async preview({ senderProfileId, receiverPhone, amount, typeCode }) {
    const txType = await transactionTypeModel.findByName(typeCode);
    if (!txType) throw new AppError(`Unknown transaction type: ${typeCode}`, 400);

    const sender = await profileModel.findById(senderProfileId);
    if (!sender) throw new AppError('Sender profile not found.', 404);

    const receiver = await profileModel.findByPhone(receiverPhone);
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

    // Tiered fee for SEND_MONEY, standard for others
    let fee;
    if (typeCode === 'SEND_MONEY') {
      const monthlyTotal = await transactionModel.getMonthlyTotal(sender.profile_id, txType.type_id);
      fee = feeService.calculateSendMoneyFee(amount, monthlyTotal);
    } else {
      fee = feeService.calculate(txType, amount);
    }
    const { senderDebit, receiverCredit } = feeService.applyFeeBearer(amount, fee, txType.fee_bearer);

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
  },

  /**
   * Get transaction details by ID (for the authenticated user)
   */
  async getDetail(transactionId, profileId) {
    const tx = await transactionModel.findByIdForProfile(transactionId, profileId);
    if (!tx) throw new AppError('Transaction not found.', 404);
    return tx;
  },

  /**
   * Get paginated transaction history
   */
  async getHistory(profileId, filters) {
    return await transactionModel.findByProfileId(profileId, filters);
  },

  /**
   * Get mini statement (last N transactions)
   */
  async getMiniStatement(profileId, count = 5) {
    return await transactionModel.miniStatement(profileId, count);
  },
};

module.exports = transactionService;
