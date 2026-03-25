import pool, { DB_SCHEMA } from '../config/db.js';
import AppError from '../utils/AppError.js';

const walletModel = {
  /**
   * Find wallet by profile ID
   */
  async findByProfileId(profileId) {
    const result = await pool.query(
      `SELECT * FROM ${DB_SCHEMA}.wallets WHERE profile_id = $1`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find wallet by profile ID with row lock (FOR UPDATE) — use inside a transaction
   */
  async findByProfileIdForUpdate(client, profileId) {
    const result = await client.query(
      `SELECT * FROM ${DB_SCHEMA}.wallets WHERE profile_id = $1 FOR UPDATE`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * System wallet by role (no lock) — e.g. TREASURY, REVENUE, ADJUSTMENT
   */
  async findByRole(role) {
    const result = await pool.query(
      `SELECT * FROM ${DB_SCHEMA}.wallets WHERE role = $1::${DB_SCHEMA}.wallet_role`,
      [role]
    );
    return result.rows[0] || null;
  },

  /**
   * System wallet by role with row lock — use inside a transaction
   */
  async findByRoleForUpdate(client, role) {
    const result = await client.query(
      `SELECT * FROM ${DB_SCHEMA}.wallets WHERE role = $1::${DB_SCHEMA}.wallet_role FOR UPDATE`,
      [role]
    );
    return result.rows[0] || null;
  },

  /**
   * Lock a wallet by wallet_id (for commission payouts, etc.)
   */
  async findByWalletIdForUpdate(client, walletId) {
    const result = await client.query(
      `SELECT * FROM ${DB_SCHEMA}.wallets WHERE wallet_id = $1 FOR UPDATE`,
      [walletId]
    );
    return result.rows[0] || null;
  },

  /**
   * Debit a wallet (use inside a transaction). Fails if insufficient balance.
   */
  async debit(client, walletId, amount) {
    const result = await client.query(
      `UPDATE ${DB_SCHEMA}.wallets
       SET balance = balance - $1, last_activity_date = NOW()
       WHERE wallet_id = $2 AND balance >= $1
       RETURNING *, (balance + $1) AS before_balance, balance AS after_balance`,
      [amount, walletId]
    );
    if (result.rows.length === 0) {
      throw new AppError('Insufficient balance.', 400);
    }
    return result.rows[0];
  },

  /**
   * Credit a wallet (use inside a transaction).
   */
  async credit(client, walletId, amount) {
    const result = await client.query(
      `UPDATE ${DB_SCHEMA}.wallets
       SET balance = balance + $1, last_activity_date = NOW()
       WHERE wallet_id = $2
       RETURNING *, (balance - $1) AS before_balance, balance AS after_balance`,
      [amount, walletId]
    );
    return result.rows[0];
  },

  /**
   * Get balance summary for a profile
   */
  async getBalance(profileId) {
    const result = await pool.query(
      `SELECT w.wallet_id, w.balance, w.max_balance, w.last_activity_date,
              p.phone_number, p.full_name, pt.type_name
       FROM ${DB_SCHEMA}.wallets w
       JOIN ${DB_SCHEMA}.profiles p ON w.profile_id = p.profile_id
       JOIN ${DB_SCHEMA}.profile_types pt ON p.type_id = pt.type_id
       WHERE w.profile_id = $1`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Admin: set max_balance for a normal user wallet (role IS NULL).
   */
  async updateMaxBalanceByProfileId(profileId, maxBalance, client = null) {
    const db = client || pool;
    const result = await db.query(
      `UPDATE ${DB_SCHEMA}.wallets
       SET max_balance = $1
       WHERE profile_id = $2 AND role IS NULL
       RETURNING *`,
      [maxBalance, profileId],
    );
    return result.rows[0] || null;
  },
};

export default walletModel;
