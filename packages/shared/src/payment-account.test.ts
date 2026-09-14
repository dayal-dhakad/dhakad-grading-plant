import { describe, expect, it } from 'vitest';
import { CreatePaymentAccountSchema, PaymentQrRequestSchema } from './payment-account.js';

describe('payment account contracts', () => {
  it('accepts valid UPI account details', () => {
    expect(
      CreatePaymentAccountSchema.parse({
        name: 'Main counter',
        accountHolderName: 'Dhakad Grading Plant',
        upiId: 'dhakad.plant@bank',
      }),
    ).toMatchObject({ upiId: 'dhakad.plant@bank', isDefault: false });
  });

  it('rejects malformed UPI IDs and unknown fields', () => {
    expect(
      CreatePaymentAccountSchema.safeParse({
        name: 'Main',
        accountHolderName: 'Dhakad',
        upiId: 'not-a-upi-id',
        secret: 'unexpected',
      }).success,
    ).toBe(false);
  });

  it('accepts positive QR amounts with at most two decimal places', () => {
    expect(
      PaymentQrRequestSchema.safeParse({ amount: '125.50', reference: 'GR-000001' }).success,
    ).toBe(true);
    expect(PaymentQrRequestSchema.safeParse({ amount: '0' }).success).toBe(false);
    expect(PaymentQrRequestSchema.safeParse({ amount: '1.234' }).success).toBe(false);
  });
});
