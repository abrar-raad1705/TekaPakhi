import { Router } from 'express';
import authController from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  resetPinSchema,
  changePinSchema,
  refreshTokenSchema,
} from '../validations/authValidation.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/request-otp', otpLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/forgot-pin', otpLimiter, validate(requestOtpSchema), authController.forgotPin);
router.post('/reset-pin', authLimiter, validate(resetPinSchema), authController.resetPin);

// Authenticated routes
router.post('/change-pin', authenticate, validate(changePinSchema), authController.changePin);
router.post('/logout', authenticate, authController.logout);

export default router;
