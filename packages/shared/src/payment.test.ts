import { describe, expect, it } from 'vitest';
import { CreatePaymentSchema, CustomerLedgerResponseSchema } from './payment.js';
describe('payment contracts', () => {
  it('accepts a positive two-decimal payment', () => {
    expect(
      CreatePaymentSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        amount: '50.25',
        paymentMethod: 'CASH',
      }).success,
    ).toBe(true);
  });
  it('rejects zero, excessive precision, and unknown fields', () => {
    expect(
      CreatePaymentSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        amount: '0',
        paymentMethod: 'CASH',
      }).success,
    ).toBe(false);
    expect(
      CreatePaymentSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        amount: '1.234',
        paymentMethod: 'CASH',
        extra: true,
      }).success,
    ).toBe(false);
  });
  it('rejects due as a received-payment method', () => {
    expect(
      CreatePaymentSchema.safeParse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        amount: '50',
        paymentMethod: 'DUE',
      }).success,
    ).toBe(false);
  });
  it('accepts an explicit small-balance waiver choice', () => {
    expect(
      CreatePaymentSchema.parse({
        customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        amount: '50',
        paymentMethod: 'CASH',
        waiveSmallBalance: true,
      }).waiveSmallBalance,
    ).toBe(true);
  });
  it('accepts seed-sale entries in the shared customer ledger', () => {
    expect(
      CustomerLedgerResponseSchema.safeParse({
        balance: '125.00',
        entries: [
          {
            id: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
            entryType: 'SEED_SALE_CHARGE',
            amount: '125.00',
            description: 'Seed sale SEED-000001',
            gradingEntryId: null,
            paymentId: null,
            createdBy: {
              id: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5eb',
              name: 'Staff User',
            },
            createdAt: '2026-09-11T00:00:00.000Z',
          },
        ],
      }).success,
    ).toBe(true);
  });
});
