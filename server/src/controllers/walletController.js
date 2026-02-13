const walletService = require('../services/walletService');

const walletController = {
  /**
   * GET /api/v1/wallet/balance
   */
  async getBalance(req, res, next) {
    try {
      const result = await walletService.getBalance(req.user.profileId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = walletController;
