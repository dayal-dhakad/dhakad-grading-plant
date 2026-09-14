import { z } from 'zod';
export const NotificationListQuerySchema = z.strictObject({
  customerId: z.uuid().optional(),
  status: z.enum(['all', 'pending', 'sent', 'failed']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
