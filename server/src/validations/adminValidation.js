import { z } from 'zod';

const BILLER_TYPES = [
  'Electricity', 'Gas', 'Water', 'Internet', 'Telephone',
  'TV', 'Credit Card', 'Govt. Fees', 'Insurance', 'Tracker', 'Others',
];

export const userListQuerySchema = z.object({
  page: z.number({ coerce: true }).int().positive().optional().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  typeId: z.number({ coerce: true }).int().positive().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_KYC', 'BLOCKED']).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']),
});

export const pinResetGrantSchema = z.object({
  granted: z.boolean(),
});

export const transactionListQuerySchema = z.object({
  page: z.number({ coerce: true }).int().positive().optional().default(1),
  limit: z.number({ coerce: true }).int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  typeId: z.number({ coerce: true }).int().positive().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const updateTxTypeSchema = z.object({
  fee_percentage: z.number({ coerce: true }).min(0).max(100).optional(),
  fee_flat_amount: z.number({ coerce: true }).min(0).optional(),
  fee_bearer: z.enum(['SENDER', 'RECEIVER']).optional(),
  fee_min_amount: z.number({ coerce: true }).min(0).nullable().optional(),
  fee_max_amount: z.number({ coerce: true }).min(0).nullable().optional(),
});

export const upsertLimitSchema = z.object({
  profileTypeId: z.number({ coerce: true }).int().positive(),
  transactionTypeId: z.number({ coerce: true }).int().positive(),
  dailyLimit: z.number({ coerce: true }).min(0).nullable().optional(),
  monthlyLimit: z.number({ coerce: true }).min(0).nullable().optional(),
  maxCountDaily: z.number({ coerce: true }).int().min(0).nullable().optional(),
  maxCountMonthly: z.number({ coerce: true }).int().min(0).nullable().optional(),
  minPerTransaction: z.number({ coerce: true }).min(0).nullable().optional(),
  maxPerTransaction: z.number({ coerce: true }).min(0).nullable().optional(),
});

export const upsertCommissionSchema = z.object({
  profileTypeId: z.number({ coerce: true }).int().positive(),
  transactionTypeId: z.number({ coerce: true }).int().positive(),
  commissionShare: z.number({ coerce: true }).min(0).max(100),
});

const areaPairSchema = z.object({
  district: z.string().min(1).max(100),
  area: z.string().min(1).max(100),
});

export const createProfileSchema = z
  .object({
    phoneNumber: z.string().regex(/^01[3-9][0-9]{8}$/, 'Invalid Bangladeshi phone number'),
    fullName: z.string().min(2).max(100).optional(),
    securityPin: z.string().length(5).regex(/^\d{5}$/, 'PIN must be 5 digits').optional(),
    accountType: z.enum(['DISTRIBUTOR', 'BILLER']),
    businessName: z.string().min(1).max(100).optional(),
    contactPersonName: z.string().min(2).max(100).optional(),
    email: z.union([z.string().email().max(100), z.literal('')]).optional(),
    additionalInfo: z.string().max(2000).optional(),
    areas: z.array(areaPairSchema).optional(),
    serviceName: z.string().min(1).max(100).optional(),
    billerType: z.enum(BILLER_TYPES).optional(),
    senderChargeFlat: z.number({ coerce: true }).min(0).optional().default(0),
    senderChargePercent: z.number({ coerce: true }).min(0).max(100).optional().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'BILLER') {
      if (!data.contactPersonName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['contactPersonName'], message: 'Contact person name is required' });
      }
      if (!data.serviceName) {
        ctx.addIssue({ code: 'custom', path: ['serviceName'], message: 'Service name is required' });
      }
      if (!data.billerType) {
        ctx.addIssue({ code: 'custom', path: ['billerType'], message: 'Biller type is required' });
      }
    }
    if (data.accountType === 'DISTRIBUTOR') {
      if (!data.businessName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['businessName'], message: 'Business name is required' });
      }
      if (!data.contactPersonName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['contactPersonName'], message: 'Contact person is required' });
      }
      if (!data.areas?.length) {
        ctx.addIssue({ code: 'custom', path: ['areas'], message: 'Select at least one area' });
      }
    }
  });

export const loadWalletSchema = z.object({
  amount: z.number({ coerce: true }).positive('Amount must be positive'),
});

export const updateWalletLimitSchema = z.object({
  maxBalance: z
    .number({ coerce: true })
    .positive('Limit must be positive')
    .max(999999999999.99, 'Limit too large'),
});

export const reportQuerySchema = z.object({
  fromDate: z.string(),
  toDate: z.string(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});
