const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const isDev = env.NODE_ENV === 'development';

/**
 * General API rate limiter
 * Development: 1000 requests per 15 minutes
 * Production:  100 requests per 15 minutes
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoints rate limiter
 * Development: 50 attempts per 15 minutes
 * Production:  10 attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 10,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP request rate limiter
 * Development: 20 requests per 5 minutes
 * Production:  3 requests per 5 minutes
 */
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 20 : 3,
  message: { success: false, message: 'Too many OTP requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter, otpLimiter };
