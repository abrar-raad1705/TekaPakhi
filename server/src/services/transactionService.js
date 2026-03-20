import pool from '../config/db.js';
import AppError from '../utils/AppError.js';
import { PROFILE_TYPES } from '../utils/constants.js';
import profileModel from '../models/profileModel.js';
import walletModel from '../models/walletModel.js';
import transactionModel from '../models/transactionModel.js';
import transactionTypeModel from '../models/transactionTypeModel.js';
import feeService from './feeService.js';
import limitService from './limitService.js';
import commissionService from './commissionService.js';
import authService from './authService.js';

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
  async execute({ senderProfileId, receiverPhone, amount, typeCode, pin, note }) {
    // Resolve transaction type
    const txType = await transactionTypeModel.findByName(typeCode);
    if (!txType) {
      throw new AppError(`Unknown transaction type: ${typeCode}`, 400);
    }

    // Resolve sender profile
    const sender = await profileModel.findById(senderProfileId);
    if (!sender) throw new AppError('Sender profile not found.', 404);

    // Resolve receiver profile
    const receiver = await profileModel.findByPhone(receiverPhone);
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
    const senderStatus = await profileModel.getAccountStatus(sender.profile_id, sender.type_name);
    if (senderStatus === 'PENDING_KYC') {
      throw new AppError('Your account is pending verification. Please wait for admin approval before transacting.', 403);
    }
    if (senderStatus === 'SUSPENDED' || senderStatus === 'BLOCKED') {
      throw new AppError(`Your account is ${senderStatus.toLowerCase()}. Contact support.`, 403);
    }
    // Verify PIN (with brute force protection)
    await authService.verifyTransactionPin(senderProfileId, pin);

    // Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock wallets to prevent race conditions
      const senderWallet = await walletModel.findByProfileIdForUpdate(client, sender.profile_id);
      const receiverWallet = await walletModel.findByProfileIdForUpdate(client, receiver.profile_id);

      if (!senderWallet) throw new AppError('Sender wallet not found.', 404);
      if (!receiverWallet) throw new AppError('Receiver wallet not found.', 404);

      //Calculate fee
      let fee;
      if (typeCode === 'SEND_MONEY') {
        const monthlyTotal = await transactionModel.getMonthlyTotalForUpdate(client, sender.profile_id, txType.type_id);
        fee = feeService.calculateSendMoneyFee(amount, monthlyTotal);
      } else {
        fee = feeService.calculate(txType, amount);
      }
      const { senderDebit, receiverCredit } = feeService.applyFeeBearer(amount, fee, txType.fee_bearer);

      // Check limits
      await limitService.check(client, sender.type_id, txType.type_id, sender.profile_id, amount);

      // Check sender balance
      if (parseFloat(senderWallet.balance) < senderDebit) {
        throw new AppError(
          `Insufficient balance. You need ৳${senderDebit.toFixed(2)} but have ৳${parseFloat(senderWallet.balance).toFixed(2)}.`,
          400
        );
      }

      // Check receiver max balance
      if (parseFloat(receiverWallet.balance) + receiverCredit > parseFloat(receiverWallet.max_balance)) {
        throw new AppError("Transaction would exceed the recipient's maximum wallet balance.", 400);
      }

      // Debit sender
      await walletModel.debit(client, senderWallet.wallet_id, senderDebit);

      // Credit receiver
      await walletModel.credit(client, receiverWallet.wallet_id, receiverCredit);

      // Insert transaction record (retry on rare transaction_ref collision)
      let transaction;
      let txRef;
      try {
        ({ txRef, row: transaction } = await transactionModel.createWithTxRef(client, {
          amount,
          fee,
          typeId: txType.type_id,
          senderWalletId: senderWallet.wallet_id,
          receiverWalletId: receiverWallet.wallet_id,
          note,
          status: 'COMPLETED',
        }));
      } catch (e) {
        if (e.code === 'TX_REF_EXHAUSTED') {
          throw new AppError('Could not assign a transaction ID. Please try again.', 503);
        }
        throw e;
      }

      // Distribute commissions
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

      // Return receipt
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
   * Receipt-shaped payload for PDF (sender debit from stored fee + fee_bearer)
   */
  async getReceiptDataForPdf(transactionId, profileId) {
    const tx = await transactionModel.findByIdForProfile(transactionId, profileId);
    if (!tx) throw new AppError('Transaction not found.', 404);
    const amount = parseFloat(tx.amount);
    const fee = parseFloat(tx.fee_amount);
    const { senderDebit } = feeService.applyFeeBearer(amount, fee, tx.fee_bearer);
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

export default transactionService;
