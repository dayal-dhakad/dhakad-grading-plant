import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const userId = 'dc2e08c4-3ebc-4273-a846-ece725b4133f';
const customerId = '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea';
const mocks = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  sendReminder: vi.fn(),
  sendBulkReminders: vi.fn(),
}));

vi.mock('./notification.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (
    request: { authUser?: { id: string; role: string } },
    _response: unknown,
    next: () => void,
  ) => {
    request.authUser = { id: userId, role: 'ADMIN' };
    next();
  },
  requireRole: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));

import { createApp } from '../../app.js';

describe('notification reminder routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queues one WhatsApp due reminder', async () => {
    mocks.sendReminder.mockResolvedValue({ queued: 1 });
    const response = await request(createApp())
      .post('/api/v1/notifications/reminders')
      .send({ customerId, channels: ['WHATSAPP'] });

    expect(response.status).toBe(202);
    expect(mocks.sendReminder).toHaveBeenCalledWith({ customerId, channels: ['WHATSAPP'] }, userId);
  });

  it('queues bulk WhatsApp reminders with strict input validation', async () => {
    mocks.sendBulkReminders.mockResolvedValue({ customers: 2, queued: 2, skippedNoConsent: 0 });
    const response = await request(createApp())
      .post('/api/v1/notifications/reminders/bulk')
      .send({ channels: ['WHATSAPP'] });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ customers: 2, queued: 2, skippedNoConsent: 0 });
    expect(mocks.sendBulkReminders).toHaveBeenCalledWith({ channels: ['WHATSAPP'] }, userId);

    const invalid = await request(createApp())
      .post('/api/v1/notifications/reminders/bulk')
      .send({ channels: ['WHATSAPP'], extra: true });
    expect(invalid.status).toBe(400);
  });
});
