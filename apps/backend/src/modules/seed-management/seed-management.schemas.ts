import { z } from 'zod';

export const SeedProductIdSchema = z.strictObject({ id: z.uuid('Seed ID is invalid') });
export const SeedListQuerySchema = z.strictObject({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export const SeedMovementListQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export const SeedStatusSchema = z.strictObject({ isActive: z.boolean() });

export type SeedListQuery = z.infer<typeof SeedListQuerySchema>;
export type SeedMovementListQuery = z.infer<typeof SeedMovementListQuerySchema>;
