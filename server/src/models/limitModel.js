const pool = require('../config/db');

const limitModel = {
  /**
   * Get transaction limits for a profile type + transaction type
   */
  async findByTypes(profileTypeId, transactionTypeId) {
    const result = await pool.query(
      `SELECT * FROM tp.transaction_limits
       WHERE profile_type_id = $1 AND transaction_type_id = $2`,
      [profileTypeId, transactionTypeId]
    );
    return result.rows[0] || null;
  },
};

module.exports = limitModel;
