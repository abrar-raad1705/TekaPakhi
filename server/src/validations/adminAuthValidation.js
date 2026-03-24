import { z } from 'zod';

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
