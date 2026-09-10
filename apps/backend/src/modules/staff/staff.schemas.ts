import { z } from 'zod';
export const StaffIdParamsSchema = z.strictObject({ id: z.uuid('Staff ID is invalid') });
export const StaffListQuerySchema = z.strictObject({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const StaffStatusSchema = z.strictObject({ isActive: z.boolean() });
export type StaffListQuery = z.infer<typeof StaffListQuerySchema>;
