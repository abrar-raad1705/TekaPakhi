const walletModel = require('../models/walletModel');
const AppError = require('../utils/AppError');

const walletService = {
  /**
   * Get wallet balance for the authenticated user
   */
  async getBalance(profileId) {
    const wallet = await walletModel.getBalance(profileId);

    if (!wallet) {
      throw new AppError('Wallet not found.', 404);
    }

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
  },
};

module.exports = walletService;
