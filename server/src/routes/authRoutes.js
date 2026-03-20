const { Router } = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  resetPinSchema,
  changePinSchema,
  checkPhoneSchema,
} = require('../validations/authValidation');

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/request-otp', otpLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/forgot-pin', otpLimiter, validate(requestOtpSchema), authController.forgotPin);
router.post('/reset-pin', authLimiter, validate(resetPinSchema), authController.resetPin);

// Authenticated routes
router.post('/change-pin', authenticate, validate(changePinSchema), authController.changePin);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
