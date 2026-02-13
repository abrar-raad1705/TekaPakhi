const { z } = require('zod');

const bdPhoneRegex = /^01[3-9][0-9]{8}$/;

const executeTransactionSchema = z.object({
  receiverPhone: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  amount: z
    .number({ coerce: true })
    .positive('Amount must be greater than 0')
    .max(50000000, 'Amount exceeds maximum allowed'),
  pin: z
    .string()
    .min(4, 'PIN must be at least 4 digits')
    .max(6, 'PIN must be at most 6 digits')
    .regex(/^\d+$/, 'PIN must contain only digits'),
  note: z
    .string()
    .max(255, 'Note must be at most 255 characters')
    .optional()
    .nullable(),
});

const previewTransactionSchema = z.object({
  receiverPhone: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  amount: z
    .number({ coerce: true })
    .positive('Amount must be greater than 0'),
});

const historyQuerySchema = z.object({
  page: z.number({ coerce: true }).int().positive().optional().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).optional().default(20),
  type: z.enum(['CASH_IN', 'CASH_OUT', 'SEND_MONEY', 'PAYMENT', 'PAY_BILL', 'B2B']).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

const savedRecipientSchema = z.object({
  phoneNumber: z
    .string()
    .regex(bdPhoneRegex, 'Invalid Bangladeshi phone number'),
  nickname: z
    .string()
    .min(1, 'Nickname is required')
    .max(50, 'Nickname must be at most 50 characters'),
});

module.exports = {
  executeTransactionSchema,
  previewTransactionSchema,
  historyQuerySchema,
  savedRecipientSchema,
};
