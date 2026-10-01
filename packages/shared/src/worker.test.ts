import { describe, expect, it } from 'vitest';
import { CreateWorkerPaymentSchema, CreateWorkerSchema } from './worker.js';
describe('worker contracts', () => {
  it('accepts a worker with an optional Indian mobile number', () => {
    expect(
      CreateWorkerSchema.parse({ name: 'Ramesh', mobile: '9876543210', notes: null }).name,
    ).toBe('Ramesh');
  });
  it('rejects unknown worker fields and malformed mobile numbers', () => {
    expect(
      CreateWorkerSchema.safeParse({ name: 'Ramesh', mobile: '123', extra: true }).success,
    ).toBe(false);
  });
  it('accepts cash and online payments but not due payments', () => {
    expect(
      CreateWorkerPaymentSchema.safeParse({
        paymentDate: '2026-10-02',
        amount: '500.00',
        paymentMethod: 'CASH',
        notes: null,
      }).success,
    ).toBe(true);
    expect(
      CreateWorkerPaymentSchema.safeParse({
        paymentDate: '2026-10-02',
        amount: '500',
        paymentMethod: 'DUE',
        notes: null,
      }).success,
    ).toBe(false);
  });
  it('rejects zero and over-precision amounts', () => {
    expect(
      CreateWorkerPaymentSchema.safeParse({
        paymentDate: '2026-10-02',
        amount: '0',
        paymentMethod: 'CASH',
      }).success,
    ).toBe(false);
    expect(
      CreateWorkerPaymentSchema.safeParse({
        paymentDate: '2026-10-02',
        amount: '10.999',
        paymentMethod: 'ONLINE',
      }).success,
    ).toBe(false);
  });
});
