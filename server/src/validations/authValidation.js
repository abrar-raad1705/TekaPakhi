import { z } from 'zod';

const bdPhoneRegex = /^01[3-9][0-9]{8}$/;

export const registerSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number (e.g., 01712345678)'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  securityPin: z
    .string()
    .length(5, 'PIN must be exactly 5 digits')
    .regex(/^\d{5}$/, 'PIN must contain only digits'),
  accountType: z
    .enum(['CUSTOMER', 'AGENT', 'MERCHANT'])
    .default('CUSTOMER'),
  shopName: z.string().min(1).max(100).optional(),
  shopAddress: z.string().max(500).optional(),
  businessName: z.string().min(1).max(100).optional(),
  businessType: z.string().max(50).optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === 'AGENT') {
    if (!data.shopName) ctx.addIssue({ code: 'custom', path: ['shopName'], message: 'Shop name is required' });
  }
  if (data.accountType === 'MERCHANT') {
    if (!data.businessName) ctx.addIssue({ code: 'custom', path: ['businessName'], message: 'Business name is required' });
  }
});

export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  securityPin: z
    .string()
    .length(5, 'PIN must be exactly 5 digits')
    .regex(/^\d{5}$/, 'PIN must contain only digits'),
});

export const requestOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  purpose: z.enum(['RESET_PIN', 'VERIFY_PHONE']).default('VERIFY_PHONE'),
});

export const verifyOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  otpCode: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
  purpose: z.enum(['VERIFY_PHONE', 'RESET_PIN']).default('VERIFY_PHONE'),
});

export const resetPinSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  otpCode: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
  newPin: z
    .string()
    .length(5, 'PIN must be exactly 5 digits')
    .regex(/^\d{5}$/, 'PIN must contain only digits'),
});

export const changePinSchema = z.object({
  oldPin: z
    .string()
    .min(4, 'PIN must be at least 4 digits')
    .max(6, 'PIN must be at most 6 digits')
    .regex(/^\d+$/, 'PIN must contain only digits'),
  newPin: z
    .string()
    .length(5, 'New PIN must be exactly 5 digits')
    .regex(/^\d{5}$/, 'New PIN must contain only digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
