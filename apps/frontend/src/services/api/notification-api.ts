import {
  NotificationListResponseSchema,
  SendBulkReminderSchema,
  SendReminderSchema,
  type SendReminderInput,
} from '@dhakad/shared';
import { baseApi } from './base-api';
export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      ReturnType<typeof NotificationListResponseSchema.parse>,
      { customerId?: string; status?: string; page?: number; pageSize?: number }
    >({
      query: (params) => ({ url: '/notifications', params }),
      transformResponse: (v: unknown) => NotificationListResponseSchema.parse(v),
      providesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    sendReminder: builder.mutation<{ queued: number }, SendReminderInput>({
      query: (body) => ({
        url: '/notifications/reminders',
        method: 'POST',
        body: SendReminderSchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    sendBulkReminders: builder.mutation<
      { customers: number; queued: number; skippedNoConsent: number },
      { channels: ('SMS' | 'WHATSAPP')[] }
    >({
      query: (body) => ({
        url: '/notifications/reminders/bulk',
        method: 'POST',
        body: SendBulkReminderSchema.parse(body),
      }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
});
export const { useGetNotificationsQuery, useSendReminderMutation, useSendBulkRemindersMutation } =
  notificationApi;
