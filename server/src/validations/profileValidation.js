const { z } = require('zod');

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable(),
  nidNumber: z
    .string()
    .min(10, 'NID must be at least 10 characters')
    .max(20, 'NID must be at most 20 characters')
    .optional()
    .nullable(),
}).refine(
  (data) => data.fullName || data.email !== undefined || data.nidNumber !== undefined,
  { message: 'At least one field must be provided for update' }
);

module.exports = {
  updateProfileSchema,
};
