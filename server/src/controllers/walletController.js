import walletService from '../services/walletService.js';

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

  async getDashboardStats(req, res, next) {
    try {
      const result = await walletService.getDashboardStats(req.user.profileId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

export default walletController;
