import { z } from 'zod';

const bdPhoneRegex = /^01[3-9][0-9]{8}$/;

export const registerSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number (e.g., 01712345678)'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  securityPin: z
    .string()
    .length(5, 'PIN must be exactly 5 digits')
    .regex(/^\d{5}$/, 'PIN must contain only digits'),
  otpCode: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
  accountType: z
    .enum(['CUSTOMER', 'AGENT', 'MERCHANT'])
    .default('CUSTOMER'),
  shopName: z.string().min(1).max(100).optional(),
  shopAddress: z.string().max(500).optional(),
  district: z.string().min(1).max(100).optional(),
  area: z.string().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === 'AGENT') {
    if (!data.shopName) ctx.addIssue({ code: 'custom', path: ['shopName'], message: 'Shop name is required' });
    if (!data.district) ctx.addIssue({ code: 'custom', path: ['district'], message: 'District is required' });
    if (!data.area) ctx.addIssue({ code: 'custom', path: ['area'], message: 'Area is required' });
  }
  if (data.accountType === 'MERCHANT') {
    if (!data.shopName) ctx.addIssue({ code: 'custom', path: ['shopName'], message: 'Shop name is required' });
    if (!data.district) ctx.addIssue({ code: 'custom', path: ['district'], message: 'District is required' });
    if (!data.area) ctx.addIssue({ code: 'custom', path: ['area'], message: 'Area is required' });
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
  isCheckOnly: z.boolean().optional(),
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

export const checkPhoneSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
});

export const finalizeDistributorPinSchema = z
  .object({
    newPin: z.string().length(5).regex(/^\d{5}$/, 'PIN must be 5 digits'),
    confirmPin: z.string().length(5).regex(/^\d{5}$/, 'PIN must be 5 digits'),
  })
  .refine((d) => d.newPin === d.confirmPin, {
    message: 'PINs do not match',
    path: ['confirmPin'],
  });
