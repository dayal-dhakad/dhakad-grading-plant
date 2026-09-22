import { describe, expect, it } from 'vitest';
import { SendBulkReminderSchema, SendReminderSchema } from './notification.js';
describe('notification contracts', () => {
  it('accepts approved reminder variables and unique channels', () => {
    expect(
      SendReminderSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        channels: ['SMS', 'WHATSAPP'],
        note: 'Please visit the office',
      }).success,
    ).toBe(true);
  });
  it('rejects free-form overflow, duplicates, and unknown fields', () => {
    expect(
      SendReminderSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        channels: ['SMS', 'SMS'],
      }).success,
    ).toBe(false);
    expect(
      SendReminderSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        channels: ['SMS'],
        note: 'x'.repeat(121),
        extra: true,
      }).success,
    ).toBe(false);
  });
  it('accepts a strict bulk reminder channel selection', () => {
    expect(SendBulkReminderSchema.safeParse({ channels: ['WHATSAPP'] }).success).toBe(true);
    expect(SendBulkReminderSchema.safeParse({ channels: [] }).success).toBe(false);
    expect(
      SendBulkReminderSchema.safeParse({ channels: ['WHATSAPP'], customerId: 'unexpected' })
        .success,
    ).toBe(false);
  });
});
