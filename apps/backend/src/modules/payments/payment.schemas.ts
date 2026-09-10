import { z } from 'zod';
export const PaymentIdParamsSchema = z.strictObject({ id: z.uuid('Payment ID is invalid') });
export const PaymentCustomerParamsSchema = z.strictObject({
  customerId: z.uuid('Customer ID is invalid'),
});
export const PaymentListQuerySchema = z.strictObject({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'reversed', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const ReversePaymentSchema = z.strictObject({
  reason: z.string().trim().min(3, 'Please provide a reversal reason').max(300),
});
export type PaymentListQuery = z.infer<typeof PaymentListQuerySchema>;
