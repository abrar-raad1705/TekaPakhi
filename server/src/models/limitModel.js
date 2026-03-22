const pool = require('../config/db');

const limitModel = {
  /**
   * Get transaction limits for a profile type + transaction type
   */
  async findByTypes(profileTypeId, transactionTypeId, client = pool) {
    const result = await client.query(
      `SELECT * FROM tp.transaction_limits
       WHERE profile_type_id = $1 AND transaction_type_id = $2`,
      [profileTypeId, transactionTypeId]
    );
    return result.rows[0] || null;
  },
};

<<<<<<< Updated upstream
module.exports = limitModel;
=======
export default limitModel;

>>>>>>> Stashed changes
