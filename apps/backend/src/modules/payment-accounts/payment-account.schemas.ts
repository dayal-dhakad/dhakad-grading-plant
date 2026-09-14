import { z } from 'zod';

export const PaymentAccountIdSchema = z.strictObject({
  id: z.uuid('Payment account ID is invalid'),
});
export const PaymentAccountListQuerySchema = z.strictObject({
  status: z.enum(['active', 'inactive', 'all']).default('active'),
});
export const PaymentAccountStatusSchema = z.strictObject({ isActive: z.boolean() });

export type PaymentAccountListQuery = z.infer<typeof PaymentAccountListQuerySchema>;
