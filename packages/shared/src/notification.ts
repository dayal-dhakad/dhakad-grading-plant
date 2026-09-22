import { z } from 'zod';

export const NotificationChannelSchema = z.enum(['SMS', 'WHATSAPP']);
export const NotificationStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
]);
export const NotificationEventTypeSchema = z.enum([
  'GRADING_CREATED',
  'GRADING_CANCELLED',
  'SEED_BILL_CREATED',
  'SEED_BILL_CANCELLED',
  'PAYMENT_RECEIVED',
  'PAYMENT_REVERSED',
  'DUE_REMINDER',
]);
export const SendReminderSchema = z.strictObject({
  customerId: z.uuid(),
  channels: z
    .array(NotificationChannelSchema)
    .min(1)
    .max(2)
    .refine((v) => new Set(v).size === v.length, 'Select each channel once'),
  note: z.string().trim().max(120).optional(),
});
export const SendBulkReminderSchema = z.strictObject({
  channels: z
    .array(NotificationChannelSchema)
    .min(1)
    .max(2)
    .refine((v) => new Set(v).size === v.length, 'Select each channel once'),
});
export const NotificationSchema = z.strictObject({
  id: z.uuid(),
  customer: z.strictObject({ id: z.uuid(), name: z.string(), mobile: z.string() }),
  channel: NotificationChannelSchema,
  eventType: NotificationEventTypeSchema,
  status: NotificationStatusSchema,
  recipient: z.string(),
  templateKey: z.string(),
  messagePreview: z.string(),
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  createdBy: z.strictObject({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
  sentAt: z.iso.datetime().nullable(),
});
export const NotificationListResponseSchema = z.strictObject({
  notifications: z.array(NotificationSchema),
  pagination: z.strictObject({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type SendReminderInput = z.infer<typeof SendReminderSchema>;
export type SendBulkReminderInput = z.infer<typeof SendBulkReminderSchema>;
