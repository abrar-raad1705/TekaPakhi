import pool from '../config/db.js';

const transactionTypeModel = {
  async findByName(typeName) {
    const result = await pool.query(
      `SELECT * FROM tp.transaction_types WHERE type_name = $1`,
      [typeName]
    );
    return result.rows[0] || null;
  },
};

export default transactionTypeModel;
