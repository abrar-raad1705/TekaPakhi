import pool, { DB_SCHEMA } from '../config/db.js';

const ledgerModel = {
  /**
   * Commission policies for a transaction type (shares of fee)
   */
  async findByTransactionType(transactionTypeId) {
    const result = await pool.query(
      `SELECT cp.*, pt.type_name AS beneficiary_type_name
       FROM ${DB_SCHEMA}.commission_policies cp
       JOIN ${DB_SCHEMA}.profile_types pt ON cp.profile_type_id = pt.type_id
       WHERE cp.transaction_type_id = $1
       ORDER BY cp.commission_share DESC`,
      [transactionTypeId]
    );
    return result.rows;
  },

  /**
   * Insert a ledger line (inside a transaction)
   */
  async createLedgerEntry(client, { transactionId, walletId, entryType, amount, description, beforeBalance, afterBalance }) {
    const result = await client.query(
      `INSERT INTO ${DB_SCHEMA}.ledger_entries (transaction_id, wallet_id, entry_type, amount, description, before_balance, after_balance)
       VALUES ($1, $2, $3::${DB_SCHEMA}.ledger_entry_type, $4, $5, $6, $7)
       RETURNING *`,
      [transactionId, walletId, entryType, amount, description ?? null, beforeBalance ?? null, afterBalance ?? null]
    );
    return result.rows[0];
  },

  /**
   * All ledger lines for a transaction
   */
  async findByTransactionId(transactionId) {
    const result = await pool.query(
      `SELECT le.*, w.profile_id
       FROM ${DB_SCHEMA}.ledger_entries le
       JOIN ${DB_SCHEMA}.wallets w ON le.wallet_id = w.wallet_id
       WHERE le.transaction_id = $1
       ORDER BY le.id`,
      [transactionId]
    );
    return result.rows;
  },

  async findByTransactionIdClient(client, transactionId) {
    const result = await client.query(
      `SELECT le.*, w.profile_id
       FROM ${DB_SCHEMA}.ledger_entries le
       JOIN ${DB_SCHEMA}.wallets w ON le.wallet_id = w.wallet_id
       WHERE le.transaction_id = $1
       ORDER BY le.id`,
      [transactionId]
    );
    return result.rows;
  },
};

export default ledgerModel;
