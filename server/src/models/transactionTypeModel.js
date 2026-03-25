import pool, { DB_SCHEMA } from '../config/db.js';

const transactionTypeModel = {
  async findByName(typeName) {
    const result = await pool.query(
      `SELECT * FROM ${DB_SCHEMA}.transaction_types WHERE type_name = $1`,
      [typeName]
    );
    return result.rows[0] || null;
  },
};

export default transactionTypeModel;
