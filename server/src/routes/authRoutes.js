import { Router } from 'express';
import authController from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import authenticate from '../middleware/authenticate.js';
import {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  resetPinSchema,
  changePinSchema,
  refreshTokenSchema,
  checkPhoneSchema,
} from '../validations/authValidation.js';

const router = Router();

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/request-otp', validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/forgot-pin', validate(requestOtpSchema), authController.forgotPin);
router.post('/reset-pin', validate(resetPinSchema), authController.resetPin);
router.post('/check-phone', validate(checkPhoneSchema), authController.checkPhone);

// Authenticated routes
router.post('/change-pin', authenticate, validate(changePinSchema), authController.changePin);
router.post('/logout', authenticate, authController.logout);

export default router;
