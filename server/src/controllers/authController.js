const authService = require('../services/authService');

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
   * POST /api/v1/auth/refresh-token
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.validatedBody;
      const result = await authService.refreshToken(refreshToken);
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
      const { phoneNumber } = req.validatedBody;
      const result = await authService.forgotPin(phoneNumber);
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
      const result = await authService.verifyPhone(req.validatedBody);
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
      const result = await authService.forgotPin(phoneNumber);
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
      const { refreshToken } = req.body;
      const result = await authService.logout(req.user.profileId, refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
