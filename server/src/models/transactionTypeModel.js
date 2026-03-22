const pool = require('../config/db');

const transactionTypeModel = {
  async findByName(typeName, client = pool) {
    const result = await client.query(
      `SELECT * FROM tp.transaction_types WHERE type_name = $1`,
      [typeName]
    );
    return result.rows[0] || null;
  },

  async findById(typeId) {
    const result = await pool.query(
      `SELECT * FROM tp.transaction_types WHERE type_id = $1`,
      [typeId]
    );
    return result.rows[0] || null;
  },

  async findAll() {
    const result = await pool.query(`SELECT * FROM tp.transaction_types ORDER BY type_id`);
    return result.rows;
  },
};

<<<<<<< Updated upstream
module.exports = transactionTypeModel;
=======
export default transactionTypeModel;

>>>>>>> Stashed changes
