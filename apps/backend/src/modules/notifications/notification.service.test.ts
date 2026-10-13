import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { enqueueCustomerNotifications } from './notification.service.js';

describe('enqueueCustomerNotifications', () => {
  it('can restrict an automatic notification to consented WhatsApp only', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { notification: { createMany } } as unknown as Prisma.TransactionClient;

    await enqueueCustomerNotifications(tx, {
      customer: {
        id: 'customer-1',
        mobile: '9876543210',
        smsConsent: true,
        whatsappConsent: true,
      },
      eventType: 'GRADING_CREATED',
      createdById: 'staff-1',
      gradingEntryId: 'grading-1',
      channels: ['WHATSAPP'],
      variables: { number: 'GR-000001' },
      preview: 'Updated grading entry',
    });

    expect(createMany).toHaveBeenCalledOnce();
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          channel: 'WHATSAPP',
          recipient: '919876543210',
          gradingEntryId: 'grading-1',
        }),
      ],
    });
  });

  it('does not queue a WhatsApp-only notification without WhatsApp consent', async () => {
    const createMany = vi.fn();
    const tx = { notification: { createMany } } as unknown as Prisma.TransactionClient;

    await enqueueCustomerNotifications(tx, {
      customer: {
        id: 'customer-1',
        mobile: '9876543210',
        smsConsent: true,
        whatsappConsent: false,
      },
      eventType: 'SEED_BILL_CREATED',
      createdById: 'staff-1',
      channels: ['WHATSAPP'],
      variables: { number: 'SEED-000001' },
      preview: 'Updated seed bill',
    });

    expect(createMany).not.toHaveBeenCalled();
  });
});
