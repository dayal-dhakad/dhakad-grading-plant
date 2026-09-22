import type { SendBulkReminderInput, SendReminderInput } from '@dhakad/shared';
import { NotificationEventType, Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { NotificationListQuery } from './notification.schemas.js';
import { sendMsg91 } from './msg91.provider.js';
import { sendFast2SmsWhatsApp } from './fast2sms.provider.js';

type Tx = Prisma.TransactionClient;
export const enqueueCustomerNotifications = async (
  tx: Tx,
  input: {
    customer: { id: string; mobile: string; smsConsent: boolean; whatsappConsent: boolean };
    eventType: NotificationEventType;
    createdById: string;
    preview: string;
    variables: Record<string, string>;
    gradingEntryId?: string;
    seedBillId?: string;
    paymentId?: string;
  },
) => {
  const channels = [
    input.customer.smsConsent ? 'SMS' : null,
    input.customer.whatsappConsent ? 'WHATSAPP' : null,
  ].filter(Boolean) as ('SMS' | 'WHATSAPP')[];
  if (!channels.length) return;
  await tx.notification.createMany({
    data: channels.map((channel) => ({
      customerId: input.customer.id,
      channel,
      eventType: input.eventType,
      recipient: `91${input.customer.mobile}`,
      templateKey: input.eventType.toLowerCase(),
      variables: input.variables,
      messagePreview: input.preview,
      createdById: input.createdById,
      ...(input.gradingEntryId ? { gradingEntryId: input.gradingEntryId } : {}),
      ...(input.seedBillId ? { seedBillId: input.seedBillId } : {}),
      ...(input.paymentId ? { paymentId: input.paymentId } : {}),
    })),
  });
};

export const sendReminder = async (input: SendReminderInput, userId: string) =>
  prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found');
    const balance =
      (
        await tx.customerLedgerEntry.aggregate({
          where: { customerId: customer.id },
          _sum: { amount: true },
        })
      )._sum.amount ?? new Prisma.Decimal(0);
    if (balance.lte(0))
      throw new AppError(409, 'NO_OUTSTANDING_DUE', 'This customer has no outstanding due');
    for (const channel of input.channels) {
      if (channel === 'WHATSAPP') continue;
      const consent = channel === 'SMS' ? customer.smsConsent : customer.whatsappConsent;
      if (!consent)
        throw new AppError(
          400,
          'CHANNEL_CONSENT_REQUIRED',
          `${channel} consent is not enabled for this customer`,
        );
    }
    await tx.notification.createMany({
      data: input.channels.map((channel) => ({
        customerId: customer.id,
        channel,
        eventType: NotificationEventType.DUE_REMINDER,
        recipient: `91${customer.mobile}`,
        templateKey: 'due_reminder',
        variables: { name: customer.name, amount: balance.toFixed(2), note: input.note ?? '' },
        messagePreview: `Reminder: ₹${balance.toFixed(2)} is due${input.note ? `. ${input.note}` : ''}`,
        createdById: userId,
      })),
    });
    return { queued: input.channels.length };
  });

export const sendBulkReminders = async (input: SendBulkReminderInput, userId: string) =>
  prisma.$transaction(async (tx) => {
    const balances = await tx.customerLedgerEntry.groupBy({
      by: ['customerId'],
      _sum: { amount: true },
    });
    const dueBalances = balances.filter((row) => row._sum.amount?.gt(0));
    if (!dueBalances.length) return { customers: 0, queued: 0, skippedNoConsent: 0 };

    const customers = await tx.customer.findMany({
      where: { id: { in: dueBalances.map((row) => row.customerId) } },
      select: { id: true, mobile: true, name: true, smsConsent: true, whatsappConsent: true },
    });
    const balanceByCustomer = new Map(
      dueBalances.map((row) => [row.customerId, row._sum.amount!.toFixed(2)]),
    );
    const notifications = customers.flatMap((customer) =>
      input.channels
        .filter((channel) => channel === 'WHATSAPP' || customer.smsConsent)
        .map((channel) => {
          const amount = balanceByCustomer.get(customer.id)!;
          return {
            customerId: customer.id,
            channel,
            eventType: NotificationEventType.DUE_REMINDER,
            recipient: `91${customer.mobile}`,
            templateKey: 'due_reminder',
            variables: { name: customer.name, amount, note: '' },
            messagePreview: `Reminder: ₹${amount} is due`,
            createdById: userId,
          };
        }),
    );
    if (notifications.length) await tx.notification.createMany({ data: notifications });
    const notifiedCustomerIds = new Set(notifications.map((row) => row.customerId));
    return {
      customers: notifiedCustomerIds.size,
      queued: notifications.length,
      skippedNoConsent: customers.length - notifiedCustomerIds.size,
    };
  });

const include = {
  customer: { select: { id: true, name: true, mobile: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.NotificationInclude;
export const listNotifications = async (q: NotificationListQuery) => {
  const where: Prisma.NotificationWhereInput = {
    ...(q.customerId ? { customerId: q.customerId } : {}),
    ...(q.status === 'all'
      ? {}
      : q.status === 'pending'
        ? { status: { in: ['PENDING', 'PROCESSING'] } }
        : q.status === 'sent'
          ? { status: { in: ['SENT', 'DELIVERED', 'READ'] } }
          : { status: 'FAILED' }),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.notification.count({ where }),
  ]);
  return {
    notifications: rows.map((n) => ({
      id: n.id,
      customer: n.customer,
      channel: n.channel,
      eventType: n.eventType,
      status: n.status,
      recipient: n.recipient,
      templateKey: n.templateKey,
      messagePreview: n.messagePreview,
      attempts: n.attempts,
      lastError: n.lastError,
      createdBy: n.createdBy,
      createdAt: n.createdAt.toISOString(),
      sentAt: n.sentAt?.toISOString() ?? null,
    })),
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize),
    },
  };
};

let working = false;
export const processNotificationOutbox = async () => {
  if (working) return;
  working = true;
  try {
    const rows = await prisma.notification.findMany({
      where: { status: 'PENDING', attempts: { lt: 3 } },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    for (const row of rows) {
      const claimed = await prisma.notification.updateMany({
        where: { id: row.id, status: 'PENDING' },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      try {
        const providerMessageId =
          row.channel === 'WHATSAPP'
            ? await sendFast2SmsWhatsApp({
                eventType: row.eventType,
                recipient: row.recipient,
                variables: row.variables as Record<string, string>,
              })
            : await sendMsg91({
                channel: 'SMS',
                recipient: row.recipient,
                variables: row.variables as Record<string, string>,
              });
        await prisma.notification.update({
          where: { id: row.id },
          data: { status: 'SENT', providerMessageId, sentAt: new Date(), lastError: null },
        });
      } catch (error) {
        await prisma.notification.update({
          where: { id: row.id },
          data: {
            status: row.attempts + 1 >= 3 ? 'FAILED' : 'PENDING',
            lastError: error instanceof Error ? error.message.slice(0, 500) : 'Provider error',
          },
        });
      }
    }
  } finally {
    working = false;
  }
};
