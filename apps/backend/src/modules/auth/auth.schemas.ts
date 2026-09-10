import { IndianMobileSchema } from '@dhakad/shared';
import { z } from 'zod';
export const LoginSchema = z.strictObject({
  mobile: IndianMobileSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});
export type LoginInput = z.infer<typeof LoginSchema>;
