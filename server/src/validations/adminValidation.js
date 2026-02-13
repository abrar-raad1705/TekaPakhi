const { z } = require('zod');

const userListQuerySchema = z.object({
  page: z.number({ coerce: true }).int().positive().optional().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  typeId: z.number({ coerce: true }).int().positive().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_KYC', 'BLOCKED']).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']),
});

const transactionListQuerySchema = z.object({
  page: z.number({ coerce: true }).int().positive().optional().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  typeId: z.number({ coerce: true }).int().positive().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

const updateTxTypeSchema = z.object({
  fee_percentage: z.number({ coerce: true }).min(0).max(100).optional(),
  fee_flat_amount: z.number({ coerce: true }).min(0).optional(),
  fee_bearer: z.enum(['SENDER', 'RECEIVER']).optional(),
  fee_min_amount: z.number({ coerce: true }).min(0).nullable().optional(),
  fee_max_amount: z.number({ coerce: true }).min(0).nullable().optional(),
});

const upsertLimitSchema = z.object({
  profileTypeId: z.number({ coerce: true }).int().positive(),
  transactionTypeId: z.number({ coerce: true }).int().positive(),
  dailyLimit: z.number({ coerce: true }).min(0).nullable().optional(),
  monthlyLimit: z.number({ coerce: true }).min(0).nullable().optional(),
  maxCountDaily: z.number({ coerce: true }).int().min(0).nullable().optional(),
  maxCountMonthly: z.number({ coerce: true }).int().min(0).nullable().optional(),
  minPerTransaction: z.number({ coerce: true }).min(0).nullable().optional(),
  maxPerTransaction: z.number({ coerce: true }).min(0).nullable().optional(),
});

const upsertCommissionSchema = z.object({
  profileTypeId: z.number({ coerce: true }).int().positive(),
  transactionTypeId: z.number({ coerce: true }).int().positive(),
  commissionShare: z.number({ coerce: true }).min(0).max(100),
});

const createProfileSchema = z.object({
  phoneNumber: z.string().regex(/^01[3-9][0-9]{8}$/, 'Invalid Bangladeshi phone number'),
  fullName: z.string().min(2).max(100),
  securityPin: z.string().length(5).regex(/^\d{5}$/, 'PIN must be 5 digits'),
  accountType: z.enum(['DISTRIBUTOR', 'BILLER']),
  // Distributor fields
  region: z.string().max(100).optional(),
  // Biller fields
  billerCode: z.string().min(1).max(20).optional(),
  serviceName: z.string().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === 'BILLER') {
    if (!data.billerCode) ctx.addIssue({ code: 'custom', path: ['billerCode'], message: 'Biller code is required' });
    if (!data.serviceName) ctx.addIssue({ code: 'custom', path: ['serviceName'], message: 'Service name is required' });
  }
});

const loadWalletSchema = z.object({
  amount: z.number({ coerce: true }).positive('Amount must be positive'),
});

const reportQuerySchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

module.exports = {
  userListQuerySchema,
  updateStatusSchema,
  createProfileSchema,
  transactionListQuerySchema,
  updateTxTypeSchema,
  upsertLimitSchema,
  upsertCommissionSchema,
  loadWalletSchema,
  reportQuerySchema,
};
