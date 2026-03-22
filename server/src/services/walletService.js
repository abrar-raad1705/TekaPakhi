<<<<<<< Updated upstream
const walletModel = require('../models/walletModel');
const AppError = require('../utils/AppError');
=======
import pool from '../config/db.js';
import walletModel from '../models/walletModel.js';
import AppError from '../utils/AppError.js';
>>>>>>> Stashed changes

const walletService = {
  /**
   * Get wallet balance for the authenticated user
   */
  async getBalance(profileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const wallet = await walletModel.getBalance(profileId, client);

      if (!wallet) {
        throw new AppError('Wallet not found.', 404);
      }

      await client.query('COMMIT');

      return {
        walletId: wallet.wallet_id,
        balance: parseFloat(wallet.balance),
        maxBalance: parseFloat(wallet.max_balance),
        lastActivityDate: wallet.last_activity_date,
        owner: {
          phoneNumber: wallet.phone_number,
          fullName: wallet.full_name,
          typeName: wallet.type_name,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

<<<<<<< Updated upstream
module.exports = walletService;
=======
export default walletService;

>>>>>>> Stashed changes
