import authService from '../services/authService.js';

const authController = {
  /**
   * POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.validatedBody);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.validatedBody);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/request-otp
   */
  async requestOtp(req, res, next) {
    try {
      const { phoneNumber, purpose } = req.validatedBody;
      const result = await authService.requestOtp(phoneNumber, purpose);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/verify-otp
   */
  async verifyOtp(req, res, next) {
    try {
      const result = await authService.verifyOtp(req.validatedBody);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/forgot-pin
   */
  async forgotPin(req, res, next) {
    try {
      const { phoneNumber } = req.validatedBody;
      const result = await authService.requestOtp(phoneNumber, 'RESET_PIN');
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/reset-pin
   */
  async resetPin(req, res, next) {
    try {
      const result = await authService.resetPin(req.validatedBody);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/change-pin (authenticated)
   */
  async changePin(req, res, next) {
    try {
      const result = await authService.changePin({
        profileId: req.user.profileId,
        ...req.validatedBody,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/logout (authenticated)
   */
  async logout(req, res, next) {
    try {
      const result = await authService.logout();
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
  /**
   * GET /api/v1/auth/check-phone/:phoneNumber
   */
  async checkPhone(req, res, next) {
    try {
      const { phoneNumber } = req.validatedBody;
      const result = await authService.checkPhone(phoneNumber);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/auth/distributor/finalize-pin (authenticated distributor/biller)
   */
  async finalizeDistributorPin(req, res, next) {
    try {
      const result = await authService.finalizeAccountPin(
        req.user.profileId,
        req.validatedBody.newPin
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

export default authController;
