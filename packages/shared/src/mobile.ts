import { z } from 'zod';
export const IndianMobileSchema = z
  .string()
  .regex(/^\d{10}$/, 'Mobile number must contain exactly 10 digits')
  .brand<'IndianMobile'>();
export type IndianMobile = z.infer<typeof IndianMobileSchema>;
