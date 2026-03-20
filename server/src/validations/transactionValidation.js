import { z } from 'zod';

const bdPhoneRegex = /^01[3-9][0-9]{8}$/;

export const executeTransactionSchema = z.object({
  receiverPhone: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  amount: z
    .number({ coerce: true })
    .positive('Amount must be greater than 0')
    .max(50000000, 'Amount exceeds maximum allowed'),
  pin: z
    .string()
    .regex(/^\d{5}$/, 'PIN must be exactly 5 digits'),
  note: z
    .string()
    .max(255, 'Note must be at most 255 characters')
    .optional()
    .nullable(),
});

export const previewTransactionSchema = z.object({
  receiverPhone: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  amount: z
    .number({ coerce: true })
    .positive('Amount must be greater than 0'),
});

export const historyQuerySchema = z.object({
  page: z.number({ coerce: true }).int().positive().optional().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).optional().default(20),
  type: z.enum(['CASH_IN', 'CASH_OUT', 'SEND_MONEY', 'PAYMENT', 'PAY_BILL', 'B2B']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

export const receiptPdfSchema = z.object({
  transactionId: z.coerce.number().int().positive('Invalid transaction id'),
});

export const savedRecipientSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  nickname: z
    .string()
    .min(1, 'Nickname is required')
    .max(50, 'Nickname must be at most 50 characters'),
});
