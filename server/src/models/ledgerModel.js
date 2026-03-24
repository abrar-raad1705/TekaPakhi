import pool from '../config/db.js';

const ledgerModel = {
  /**
   * Commission policies for a transaction type (shares of fee)
   */
  async findByTransactionType(transactionTypeId) {
    const result = await pool.query(
      `SELECT cp.*, pt.type_name AS beneficiary_type_name
       FROM tp.commission_policies cp
       JOIN tp.profile_types pt ON cp.profile_type_id = pt.type_id
       WHERE cp.transaction_type_id = $1
       ORDER BY cp.commission_share DESC`,
      [transactionTypeId]
    );
    return result.rows;
  },

  /**
   * Insert a ledger line (inside a transaction)
   */
  async createLedgerEntry(client, { transactionId, walletId, entryType, amount, description }) {
    const result = await client.query(
      `INSERT INTO tp.ledger_entries (transaction_id, wallet_id, entry_type, amount, description)
       VALUES ($1, $2, $3::tp.ledger_entry_type, $4, $5)
       RETURNING *`,
      [transactionId, walletId, entryType, amount, description ?? null]
    );
    return result.rows[0];
  },

  /**
   * All ledger lines for a transaction
   */
  async findByTransactionId(transactionId) {
    const result = await pool.query(
      `SELECT le.*, w.profile_id
       FROM tp.ledger_entries le
       JOIN tp.wallets w ON le.wallet_id = w.wallet_id
       WHERE le.transaction_id = $1
       ORDER BY le.id`,
      [transactionId]
    );
    return result.rows;
  },

  async findByTransactionIdClient(client, transactionId) {
    const result = await client.query(
      `SELECT le.*, w.profile_id
       FROM tp.ledger_entries le
       JOIN tp.wallets w ON le.wallet_id = w.wallet_id
       WHERE le.transaction_id = $1
       ORDER BY le.id`,
      [transactionId]
    );
    return result.rows;
  },
};

export default ledgerModel;
