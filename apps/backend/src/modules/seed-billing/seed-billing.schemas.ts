import { z } from 'zod';
export const SeedBillIdSchema = z.strictObject({ id: z.uuid() });
export const SeedBillListQuerySchema = z.strictObject({
  search: z.string().trim().max(120).optional(),
  customerId: z.uuid().optional(),
  status: z.enum(['active', 'cancelled', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type SeedBillListQuery = z.infer<typeof SeedBillListQuerySchema>;
