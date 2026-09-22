import { SendBulkReminderSchema, SendReminderSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { NotificationListQuerySchema } from './notification.schemas.js';
import { listNotifications, sendBulkReminders, sendReminder } from './notification.service.js';
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields',
      result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    );
  return result.data;
};
export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get('/', async (request, response, next) => {
  try {
    response.json(await listNotifications(parse(NotificationListQuerySchema, request.query)));
  } catch (error) {
    next(error);
  }
});
notificationRouter.post('/reminders', async (request, response, next) => {
  try {
    response
      .status(202)
      .json(await sendReminder(parse(SendReminderSchema, request.body), request.authUser!.id));
  } catch (error) {
    next(error);
  }
});
notificationRouter.post(
  '/reminders/bulk',
  requireRole('ADMIN'),
  async (request, response, next) => {
    try {
      response
        .status(202)
        .json(
          await sendBulkReminders(
            parse(SendBulkReminderSchema, request.body),
            request.authUser!.id,
          ),
        );
    } catch (error) {
      next(error);
    }
  },
);
