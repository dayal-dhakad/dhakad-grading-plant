import { z } from 'zod';
export const WorkerIdSchema = z.strictObject({ id: z.uuid() });
export const WorkerListQuerySchema = z.strictObject({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(20),
});
export const WorkerPaymentListQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(50).default(20),
});
export const WorkerPaymentSummaryQuerySchema = z
  .strictObject({ from: z.iso.date().optional(), to: z.iso.date().optional() })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
export type WorkerListQuery = z.infer<typeof WorkerListQuerySchema>;
export type WorkerPaymentListQuery = z.infer<typeof WorkerPaymentListQuerySchema>;
export type WorkerPaymentSummaryQuery = z.infer<typeof WorkerPaymentSummaryQuerySchema>;
