import pool, { DB_SCHEMA } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { PROFILE_TYPES, WALLET_ROLES } from '../utils/constants.js';
import profileModel from '../models/profileModel.js';
import walletModel from '../models/walletModel.js';
import transactionModel from '../models/transactionModel.js';
import transactionTypeModel from '../models/transactionTypeModel.js';
import feeService from './feeService.js';
import limitService from './limitService.js';
import ledgerService from './ledgerService.js';
import authService from './authService.js';
import auditLogService from './auditLogService.js';

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

/**
 * Lock wallets in deterministic order (avoids deadlocks).
 */
async function lockWalletsOrdered(client, walletIds) {
  const sorted = [...new Set(walletIds)].sort((a, b) => a - b);
  const map = new Map();
  for (const wid of sorted) {
    const row = await walletModel.findByWalletIdForUpdate(client, wid);
    if (row) map.set(wid, row);
  }
  return map;
}

/**
 * Role validation rules: which profile types can send/receive for each tx type
 */
const ROLE_RULES = {
  SEND_MONEY:  { sender: [PROFILE_TYPES.CUSTOMER, PROFILE_TYPES.MERCHANT], receiver: [PROFILE_TYPES.CUSTOMER] },
  CASH_IN:     { sender: [PROFILE_TYPES.AGENT],    receiver: [PROFILE_TYPES.CUSTOMER] },
  CASH_OUT:    { sender: [PROFILE_TYPES.CUSTOMER, PROFILE_TYPES.MERCHANT],  receiver: [PROFILE_TYPES.AGENT] },
  PAYMENT:     { sender: [PROFILE_TYPES.CUSTOMER, PROFILE_TYPES.MERCHANT],  receiver: [PROFILE_TYPES.MERCHANT] },
  PAY_BILL:    { sender: [PROFILE_TYPES.CUSTOMER, PROFILE_TYPES.MERCHANT, PROFILE_TYPES.AGENT],  receiver: [PROFILE_TYPES.BILLER] },
  B2B:         { sender: [PROFILE_TYPES.DISTRIBUTOR, PROFILE_TYPES.AGENT], receiver: [PROFILE_TYPES.AGENT, PROFILE_TYPES.DISTRIBUTOR] },
};

async function assertB2BReceiverAllowed(sender, receiver) {
  if (
    sender.type_id === PROFILE_TYPES.DISTRIBUTOR &&
    receiver.type_id === PROFILE_TYPES.AGENT
  ) {
    const isConnected = await profileModel.isAgentConnectedToDistributor(
      sender.profile_id,
      receiver.profile_id,
    );
    if (!isConnected) {
      throw new AppError(
        'You can only transfer float to agents connected to your distributor account.',
        403,
      );
    }
    return;
  }

  if (
    sender.type_id === PROFILE_TYPES.AGENT &&
    receiver.type_id === PROFILE_TYPES.DISTRIBUTOR
  ) {
    const connectedDistributorId = await profileModel.getAgentDistributorId(sender.profile_id);
    if (!connectedDistributorId || connectedDistributorId !== receiver.profile_id) {
      throw new AppError(
        'You can only transfer float to your connected distributor.',
        403,
      );
    }
    return;
  }
}

async function assertSenderCanTransact(sender) {
  const senderStatus = await profileModel.getAccountStatus(
    sender.profile_id,
    sender.type_name,
  );

  if (senderStatus === 'PENDING_KYC') {
    throw new AppError(
      'Your account is pending verification. Please wait for admin approval before transacting.',
      403,
    );
  }

  if (senderStatus === 'SUSPENDED' || senderStatus === 'BLOCKED') {
    throw new AppError(
      `Your account is ${senderStatus.toLowerCase()}. Contact support.`,
      403,
    );
  }
}

const transactionService = {
  async execute({ senderProfileId, receiverPhone, amount, typeCode, pin, note, billAccountNumber = null, billContactNumber = null, meta }) {
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

    if (typeCode === 'B2B') {
      await assertB2BReceiverAllowed(sender, receiver);
    }

    await assertSenderCanTransact(sender);
    // Verify PIN (with brute force protection)
    await authService.verifyTransactionPin(senderProfileId, pin, meta);

    // Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // AUTHORIZE INTERNAL SYSTEM OPERATION
      await client.query("SELECT set_config('app.internal_op', 'true', true)");

      //Calculate fee
      let fee;
      if (typeCode === 'SEND_MONEY') {
        const monthlyTotal = await transactionModel.getMonthlyTotalForUpdate(client, sender.profile_id, txType.type_id);
        fee = feeService.calculateSendMoneyFee(amount, monthlyTotal);
      } else if (typeCode === 'PAY_BILL') {
        // Use biller-specific charges instead of system-wide fee
        const billerRes = await client.query(
          `SELECT sender_charge_flat, sender_charge_percent FROM ${DB_SCHEMA}.biller_profiles WHERE profile_id = $1`,
          [receiver.profile_id],
        );
        const biller = billerRes.rows[0];
        const flat = parseFloat(biller?.sender_charge_flat) || 0;
        const pct = parseFloat(biller?.sender_charge_percent) || 0;
        fee = Math.round((flat + (amount * pct) / 100) * 100) / 100;
      } else {
        fee = feeService.calculate(txType, amount);
      }
      const { senderDebit, receiverCredit } = feeService.applyFeeBearer(amount, fee, txType.fee_bearer);

      const swRes = await client.query(
        `SELECT wallet_id FROM ${DB_SCHEMA}.wallets WHERE profile_id = $1`,
        [sender.profile_id]
      );
      const rwRes = await client.query(
        `SELECT wallet_id FROM ${DB_SCHEMA}.wallets WHERE profile_id = $1`,
        [receiver.profile_id]
      );
      if (!swRes.rows[0]?.wallet_id)
        throw new AppError("Sender wallet not found.", 404);
      if (!rwRes.rows[0]?.wallet_id)
        throw new AppError("Receiver wallet not found.", 404);

      // Check limits
      await limitService.check(client, sender.type_id, txType.type_id, sender.profile_id, amount);

      // The Stored Procedure handles order-locking, balance checks, transaction insert, ledger entries, and commissions.
      let transactionId;
      let txRef;
      try {
        const result = await transactionModel.executeProcedure(client, {
          senderWalletId: swRes.rows[0].wallet_id,
          receiverWalletId: rwRes.rows[0].wallet_id,
          amount,
          fee,
          typeId: txType.type_id,
          note,
        });
        txRef = result.txRef;
        transactionId = result.transactionId;
      } catch (e) {
        if (e.code === 'TX_REF_EXHAUSTED') {
          throw new AppError('Could not assign a transaction ID. Please try again.', 503);
        }
        if (e.code === 'P0001') { // PostgreSQL RAISE EXCEPTION code
          throw new AppError(e.message, 400); // Expose DB error nicely
        }
        throw e;
      }

      // If PAY_BILL, write account/contact to the dedicated details table
      if (txType.type_name === 'PAY_BILL' && billAccountNumber && billContactNumber) {
        await transactionModel.createBillDetails(client, {
          transactionId,
          billAccountNumber,
          billContactNumber,
        });
      }

      await client.query('COMMIT');

      auditLogService.logAudit({
        eventType: txType.type_name,
        actorId: sender.profile_id,
        actorType: 'USER',
        summary: `${sender.type_name} ${maskPhone(sender.phone_number)} sent ৳${parseFloat(amount)} to ${maskPhone(receiver.phone_number)} (fee: ৳${fee}, ref: ${txRef})`,
        details: { type: txType.type_name, amount: parseFloat(amount), fee, senderDebit, receiverCredit },
        relatedTransactionId: transactionId,
      });

      return {
        transactionRef: txRef,
        transactionId: transactionId,
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
        billAccountNumber: billAccountNumber || null,
        billContactNumber: billContactNumber || null,
        status: 'COMPLETED',
        timestamp: new Date(),
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
    const receiverWallet = await walletModel.getBalance(receiver.profile_id);

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

    if (typeCode === 'B2B') {
      await assertB2BReceiverAllowed(sender, receiver);
    }

    await assertSenderCanTransact(sender);

    // Tiered fee for SEND_MONEY, biller-specific for PAY_BILL, standard for others
    let fee;
    if (typeCode === 'SEND_MONEY') {
      const monthlyTotal = await transactionModel.getMonthlyTotal(sender.profile_id, txType.type_id);
      fee = feeService.calculateSendMoneyFee(amount, monthlyTotal);
    } else if (typeCode === 'PAY_BILL') {
      // Use biller-specific charges instead of system-wide fee
      const billerRes = await pool.query(
        `SELECT sender_charge_flat, sender_charge_percent FROM ${DB_SCHEMA}.biller_profiles WHERE profile_id = $1`,
        [receiver.profile_id],
      );
      const biller = billerRes.rows[0];
      const flat = parseFloat(biller?.sender_charge_flat) || 0;
      const pct = parseFloat(biller?.sender_charge_percent) || 0;
      fee = Math.round((flat + (amount * pct) / 100) * 100) / 100;
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
      receiver: {
        name: receiver.full_name,
        phone: receiver.phone_number,
        balance: receiverWallet ? parseFloat(receiverWallet.balance) : null,
        maxBalance: receiverWallet ? parseFloat(receiverWallet.max_balance) : null,
        balanceAfterCredit: receiverWallet
          ? parseFloat(receiverWallet.balance) + receiverCredit
          : null,
      },
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
      billAccountNumber: tx.bill_account_number || null,
      billContactNumber: tx.bill_contact_number || null,
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

  async getConnectedB2BAgents(profileId) {
    const profile = await profileModel.findById(profileId);
    if (!profile) throw new AppError('Profile not found.', 404);
    if (profile.type_id !== PROFILE_TYPES.DISTRIBUTOR) {
      throw new AppError('Only distributor accounts can access B2B agent list.', 403);
    }

    return profileModel.listConnectedAgentsForDistributor(profileId);
  },

  async getConnectedDistributor(profileId) {
    const profile = await profileModel.findById(profileId);
    if (!profile) throw new AppError('Profile not found.', 404);
    if (profile.type_id !== PROFILE_TYPES.AGENT) {
      throw new AppError('Only agent accounts can access connected distributor.', 403);
    }

    const distributor = await profileModel.getConnectedDistributorForAgent(profileId);
    if (!distributor) {
      throw new AppError('No connected distributor found for your agent account.', 404);
    }
    return distributor;
  },
};

export default transactionService;
