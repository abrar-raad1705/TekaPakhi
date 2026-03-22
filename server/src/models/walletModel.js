const pool = require('../config/db');
const AppError = require('../utils/AppError');

const walletModel = {
  /**
   * Find wallet by profile ID
   */
  async findByProfileId(profileId, client = pool) {
    const result = await client.query(
      `SELECT * FROM tp.wallets WHERE profile_id = $1`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find wallet by profile ID with row lock (FOR UPDATE) — use inside a transaction
   */
  async findByProfileIdForUpdate(profileId, client = pool) {
    const result = await client.query(
      `SELECT * FROM tp.wallets WHERE profile_id = $1 FOR UPDATE`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Debit a wallet (use inside a transaction). Fails if insufficient balance.
   */
  async debit(walletId, amount, client = pool) {
    const result = await client.query(
      `UPDATE tp.wallets
       SET balance = balance - $1, last_activity_date = NOW()
       WHERE wallet_id = $2 AND balance >= $1
       RETURNING *`,
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
  async credit(walletId, amount, client = pool) {
    const result = await client.query(
      `UPDATE tp.wallets
       SET balance = balance + $1, last_activity_date = NOW()
       WHERE wallet_id = $2
       RETURNING *`,
      [amount, walletId]
    );
    return result.rows[0];
  },

  /**
   * Get balance summary for a profile
   */
  async getBalance(profileId, client = pool) {
    const result = await client.query(
      `SELECT w.wallet_id, w.balance, w.max_balance, w.last_activity_date,
              p.phone_number, p.full_name, pt.type_name
       FROM tp.wallets w
       JOIN tp.profiles p ON w.profile_id = p.profile_id
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE w.profile_id = $1`,
      [profileId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get the system wallet ID
   */
  async getSystemWalletId(client = pool) {
    const result = await client.query(
      `SELECT w.wallet_id FROM tp.wallets w
       JOIN tp.profiles p ON w.profile_id = p.profile_id
       JOIN tp.profile_types pt ON p.type_id = pt.type_id
       WHERE pt.type_name = 'SYSTEM' LIMIT 1`
    );
    if (result.rows.length === 0) throw new AppError('System wallet not found.', 500);
    return result.rows[0].wallet_id;
  },
};

<<<<<<< Updated upstream
module.exports = walletModel;
=======
export default walletModel;


>>>>>>> Stashed changes
