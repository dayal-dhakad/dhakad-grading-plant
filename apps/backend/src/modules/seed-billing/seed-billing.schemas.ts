import { z } from 'zod';
export const SeedBillIdSchema = z.strictObject({ id: z.uuid() });
export const SeedBillListQuerySchema = z
  .strictObject({
    search: z.string().trim().max(120).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    customerId: z.uuid().optional(),
    status: z.enum(['active', 'cancelled', 'all']).default('active'),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
export type SeedBillListQuery = z.infer<typeof SeedBillListQuerySchema>;
