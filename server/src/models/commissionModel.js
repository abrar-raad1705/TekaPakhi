const pool = require('../config/db');

const commissionModel = {
  /**
   * Get all commission policies for a transaction type
   */
  async findByTransactionType(transactionTypeId, client = pool) {
    const result = await client.query(
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
   * Insert a commission entry
   */
  async createEntry({ transactionId, beneficiaryWalletId, commissionAmount }, client = pool) {
    const result = await client.query(
      `INSERT INTO tp.commission_entries (transaction_id, beneficiary_wallet_id, commission_amount)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [transactionId, beneficiaryWalletId, commissionAmount]
    );
    return result.rows[0];
  },

  /**
   * Get commission entries for a transaction
   */
  async findByTransactionId(transactionId, client = pool) {
    const result = await client.query(
      `SELECT ce.*, p.full_name AS beneficiary_name, pt.type_name AS beneficiary_type
       FROM tp.commission_entries ce
       JOIN tp.wallets w ON ce.beneficiary_wallet_id = w.wallet_id
       JOIN tp.profiles p ON w.profile_id = p.profile_id
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE ce.transaction_id = $1`,
      [transactionId]
    );
    return result.rows;
  },
};

<<<<<<< Updated upstream
module.exports = commissionModel;
=======

export default commissionModel;
>>>>>>> Stashed changes
