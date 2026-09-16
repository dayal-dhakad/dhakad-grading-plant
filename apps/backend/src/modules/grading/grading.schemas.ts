import { z } from 'zod';

export const GradingIdParamsSchema = z.strictObject({ id: z.uuid('Grading entry ID is invalid') });
export const GradingListQuerySchema = z
  .strictObject({
    search: z.string().trim().max(120).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    status: z.enum(['active', 'cancelled', 'all']).default('active'),
    customerId: z.uuid().optional(),
    staffId: z.uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
export const CancelGradingSchema = z.strictObject({
  reason: z.string().trim().min(3, 'Please provide a reason').max(300),
});
export type GradingListQuery = z.infer<typeof GradingListQuerySchema>;
