import { z } from 'zod';
import { ReportQuerySchema } from './report.js';
export const CreateCustomerExportSchema = z.strictObject({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
});
export const CreateGradingExportSchema = z
  .strictObject({
    search: z.string().trim().max(120).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    status: z.enum(['active', 'cancelled', 'all']).default('all'),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
export const CreateReportExportSchema = ReportQuerySchema;
export const ExportJobSchema = z.strictObject({
  id: z.uuid(),
  type: z.enum(['CUSTOMERS', 'GRADING_ENTRIES', 'REPORT']),
  format: z.literal('PDF'),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']),
  filters: z.union([
    CreateCustomerExportSchema,
    CreateGradingExportSchema,
    CreateReportExportSchema,
  ]),
  fileName: z.string().nullable(),
  recordCount: z.number().int().nonnegative().nullable(),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
export const ExportJobResponseSchema = z.strictObject({ exportJob: ExportJobSchema });
export const ExportJobListResponseSchema = z.strictObject({ exportJobs: z.array(ExportJobSchema) });
export type CreateCustomerExportInput = z.infer<typeof CreateCustomerExportSchema>;
export type CreateGradingExportInput = z.infer<typeof CreateGradingExportSchema>;
export type CreateReportExportInput = z.infer<typeof CreateReportExportSchema>;
export type ExportJob = z.infer<typeof ExportJobSchema>;
