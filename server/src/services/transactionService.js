import pool, { DB_SCHEMA } from '../config/db.js';
import AppError from '../utils/AppError.js';
import { PROFILE_TYPES, WALLET_ROLES } from '../utils/constants.js';
import profileModel from '../models/profileModel.js';
import walletModel from '../models/walletModel.js';
import transactionModel from '../models/transactionModel.js';
import transactionTypeModel from '../models/transactionTypeModel.js';
import feeService from './feeService.js';
import ledgerService from './ledgerService.js';
import authService from './authService.js';
import auditLogService from './auditLogService.js';

/**
 * Per-viewer fee/amount display: reversals show fee 0 and the user's wallet leg amount
 * (gross refund for payer, net clawback for payee on merchant payments).
 */
function normalizeTransactionalForViewer(tx, profileId) {
  if (!tx) return tx;
  const pid = String(profileId ?? '');
  const isSender = String(tx.sender_profile_id) === pid;
  const isReceiver = String(tx.receiver_profile_id) === pid;
  if (tx.original_transaction_id) {
    tx.fee_amount = 0;
    if (tx.profile_leg_amount != null) {
      tx.amount = tx.profile_leg_amount;
    }
    if (Object.prototype.hasOwnProperty.call(tx, 'profile_leg_amount')) {
      delete tx.profile_leg_amount;
    }
    return tx;
  }
  if (isSender && tx.fee_bearer === 'RECEIVER') tx.fee_amount = 0;
  if (isReceiver && tx.fee_bearer === 'SENDER') tx.fee_amount = 0;
  if (Object.prototype.hasOwnProperty.call(tx, 'profile_leg_amount')) {
    delete tx.profile_leg_amount;
  }
  return tx;
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

    // PIN Verification (Critical)
    await authService.verifyTransactionPin(senderProfileId, pin, meta);

    // DB Transaction Execution
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Identify Wallets (Required for Procedure parameters)
      const swRes = await client.query(`SELECT wallet_id FROM wallets WHERE profile_id = $1`, [sender.profile_id]);
      const rwRes = await client.query(`SELECT wallet_id FROM wallets WHERE profile_id = $1`, [receiver.profile_id]);
      
      if (!swRes.rows[0]?.wallet_id) throw new AppError("Sender wallet not found.", 404);
      if (!rwRes.rows[0]?.wallet_id) throw new AppError("Receiver wallet not found.", 404);

      // Execute Stored Procedure
      // This handles: Role validation, Account status checks, Fee/Limit calculation, Atomic multi-locking,
      // Sender balance check, Ledger entries, and Commission distribution.
      let result;
      try {
        result = await transactionModel.executeProcedure(client, {
          senderWalletId: swRes.rows[0].wallet_id,
          receiverWalletId: rwRes.rows[0].wallet_id,
          amount,
          typeId: txType.type_id,
          note,
        });
      } catch (e) {
        if (e.code === 'P0001') throw new AppError(e.message, 400); // DB Raise Exception
        throw e;
      }

      // If PAY_BILL, write account/contact to the dedicated details table
      if (txType.type_name === 'PAY_BILL' && billAccountNumber && billContactNumber) {
        await transactionModel.createBillDetails(client, {
          transactionId: result.transactionId,
          billAccountNumber,
          billContactNumber,
        });
      }

      await client.query('COMMIT');

      // Fetch Final Transaction Details for Audit Log and Response
      // Must happen after COMMIT so the data is visible via the pool connection
      const finalTx = await transactionModel.findByIdForProfile(result.transactionId, sender.profile_id);

      // Final Audit & Response
      auditLogService.logAudit({
        eventType: txType.type_name,
        actorId: sender.profile_id,
        actorType: 'USER',
        summary: `${sender.type_name} ${sender.phone_number} sent ৳${parseFloat(amount)} to ${receiver.phone_number} (ref: ${result.txRef})`,
        details: { 
          type: txType.type_name, 
          amount: parseFloat(finalTx.amount), 
          fee: parseFloat(finalTx.fee_amount),
          status: finalTx.status
        },
        relatedTransactionId: result.transactionId,
      });

      const isSenderForExecute = String(finalTx.sender_profile_id) === String(sender.profile_id);
      const isReceiverForExecute = String(finalTx.receiver_profile_id) === String(sender.profile_id);
      let feeToDisplay = parseFloat(finalTx.fee_amount || 0);
      if (isSenderForExecute && finalTx.fee_bearer === 'RECEIVER') feeToDisplay = 0;
      if (isReceiverForExecute && finalTx.fee_bearer === 'SENDER') feeToDisplay = 0;

      return {
        transactionRef: result.txRef,
        transactionId: result.transactionId,
        type: txType.type_name,
        amount: parseFloat(finalTx.amount),
        fee: feeToDisplay,
        feeBearer: finalTx.fee_bearer,
        sender: { name: sender.full_name, phone: sender.phone_number },
        receiver: { name: receiver.full_name, phone: receiver.phone_number },
        note: note || null,
        billAccountNumber: billAccountNumber || null,
        billContactNumber: billContactNumber || null,
        status: finalTx.status,
        timestamp: finalTx.transaction_time,
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

    // Perform unified preflight validation in DB (Roles, Status, Limits, B2B Connection)
    const validationRes = await pool.query(
      `SELECT fn_validate_transaction_preflight($1, $2, $3, $4) as error_msg`,
      [sender.profile_id, receiver.profile_id, txType.type_id, amount]
    );

    if (validationRes.rows[0].error_msg) {
      throw new AppError(validationRes.rows[0].error_msg, 400);
    }

    // Calculate fee using database function
    const feeRes = await pool.query(
      `SELECT fn_calculate_transaction_fee($1, $2, $3, $4) as fee`,
      [txType.type_id, amount, sender.profile_id, receiver.profile_id]
    );
    const fee = parseFloat(feeRes.rows[0].fee);

    // Check limits using database function
    const limitRes = await pool.query(
      `SELECT fn_check_transaction_limits($1, $2, $3) as error_msg`,
      [sender.profile_id, txType.type_id, amount]
    );
    if (limitRes.rows[0].error_msg) {
      throw new AppError(limitRes.rows[0].error_msg, 400);
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
    return normalizeTransactionalForViewer(tx, profileId);
  },

  /**
   * Receipt-shaped payload for PDF (sender debit from stored fee + fee_bearer)
   */
  async getReceiptDataForPdf(transactionId, profileId) {
    const tx = await transactionModel.findByIdForProfile(transactionId, profileId);
    if (!tx) throw new AppError('Transaction not found.', 404);

    if (tx.original_transaction_id) {
      throw new AppError('Receipts are not available for reversal transactions.', 400);
    }
    if (tx.status === 'REVERSED') {
      throw new AppError('Receipts are not available for reversed transactions.', 400);
    }
    
    const isSender = String(tx.sender_profile_id) === String(profileId);
    const isReceiver = String(tx.receiver_profile_id) === String(profileId);
    if (isSender && tx.fee_bearer === 'RECEIVER') tx.fee_amount = 0;
    if (isReceiver && tx.fee_bearer === 'SENDER') tx.fee_amount = 0;

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
    const result = await transactionModel.findByProfileId(profileId, filters);
    result.transactions = (result.transactions || []).map((tx) =>
      normalizeTransactionalForViewer(tx, profileId),
    );
    return result;
  },

  /**
   * Get mini statement (last N transactions)
   */
  async getMiniStatement(profileId, count = 5) {
    const txs = await transactionModel.miniStatement(profileId, count);
    return (txs || []).map((tx) => normalizeTransactionalForViewer(tx, profileId));
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
      throw new AppError('No connected distributor found for your agent account.', 404, { code: 'B2B_SUSPENDED' });
    }
    if (distributor.b2bSuspended) {
      throw new AppError(
        'Your distributor account has been blocked. B2B transfers are temporarily unavailable until a new distributor is assigned to your area.',
        403,
        { code: 'B2B_SUSPENDED' },
      );
    }
    return distributor;
  },
};

export default transactionService;
