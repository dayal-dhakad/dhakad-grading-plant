import { z } from 'zod';

export const CustomerIdParamsSchema = z.strictObject({ id: z.uuid('Customer ID is invalid') });

export const CustomerListQuerySchema = z.strictObject({
  search: z.string().trim().max(120, 'Search must not exceed 120 characters').optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const CustomerStatusSchema = z.strictObject({ isActive: z.boolean() });

export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
