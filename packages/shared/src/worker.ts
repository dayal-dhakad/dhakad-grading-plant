import { z } from 'zod';
import { IndianMobileSchema } from './mobile.js';

const money = z.string().regex(/^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/, 'Enter a valid amount');
export const WorkerPaymentMethodSchema = z.enum(['CASH', 'ONLINE']);
export const CreateWorkerSchema = z.strictObject({
  name: z.string().trim().min(2, 'Enter worker name').max(120),
  mobile: z
    .union([IndianMobileSchema, z.literal('')])
    .nullable()
    .optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export const CreateWorkerPaymentSchema = z.strictObject({
  paymentDate: z.iso.date(),
  amount: money,
  paymentMethod: WorkerPaymentMethodSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});
export const WorkerSchema = z.strictObject({
  id: z.uuid(),
  workerNumber: z.number().int().positive(),
  name: z.string(),
  mobile: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  totalPaid: z.string(),
  paymentCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
});
export const WorkerPaymentSchema = z.strictObject({
  id: z.uuid(),
  paymentNumber: z.number().int().positive(),
  workerId: z.uuid(),
  paymentDate: z.iso.date(),
  amount: z.string(),
  paymentMethod: WorkerPaymentMethodSchema,
  notes: z.string().nullable(),
  recordedByName: z.string(),
  createdAt: z.iso.datetime(),
});
export const WorkerListResponseSchema = z.strictObject({
  workers: z.array(WorkerSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export const WorkerDetailResponseSchema = z.strictObject({ worker: WorkerSchema });
export const WorkerPaymentListResponseSchema = z.strictObject({
  payments: z.array(WorkerPaymentSchema),
  total: z.number().int().nonnegative(),
  totalPaid: z.string(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export const WorkerPaymentResponseSchema = z.strictObject({ payment: WorkerPaymentSchema });
export const WorkerPaymentSummarySchema = z.strictObject({
  totalPaid: z.string(),
  paymentCount: z.number().int().nonnegative(),
});
export type CreateWorkerInput = z.infer<typeof CreateWorkerSchema>;
export type CreateWorkerPaymentInput = z.infer<typeof CreateWorkerPaymentSchema>;
export type Worker = z.infer<typeof WorkerSchema>;
export type WorkerPayment = z.infer<typeof WorkerPaymentSchema>;
export type WorkerPaymentMethod = z.infer<typeof WorkerPaymentMethodSchema>;
