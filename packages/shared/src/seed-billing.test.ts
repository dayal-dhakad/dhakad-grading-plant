import { describe, expect, it } from 'vitest';
import { CreateSeedBillSchema } from './seed-billing.js';

const valid = {
  customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
  items: [
    {
      productId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5eb',
      quantity: '2.5',
      unit: 'KILOGRAM',
      ratePerKg: '100',
      discountType: 'PERCENTAGE',
      discountValue: '5',
    },
  ],
  paidAmount: '200',
  paymentMethod: 'CASH',
  waiveSmallBalance: false,
  serviceDate: '2026-09-10',
};

describe('seed billing contract', () => {
  it('accepts multi-item bills and discount overrides', () =>
    expect(
      CreateSeedBillSchema.safeParse({
        ...valid,
        items: [
          ...valid.items,
          {
            ...valid.items[0],
            productId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ec',
            unit: 'QUINTAL',
          },
        ],
      }).success,
    ).toBe(true));

  it('rejects empty bills', () =>
    expect(CreateSeedBillSchema.safeParse({ ...valid, items: [] }).success).toBe(false));

  it('rejects unknown fields', () =>
    expect(CreateSeedBillSchema.safeParse({ ...valid, tax: '18' }).success).toBe(false));

  it('rejects duplicate products and zero selling rates before submission', () => {
    expect(
      CreateSeedBillSchema.safeParse({ ...valid, items: [...valid.items, valid.items[0]] }).success,
    ).toBe(false);
    expect(
      CreateSeedBillSchema.safeParse({
        ...valid,
        items: [{ ...valid.items[0], ratePerKg: '0' }],
      }).success,
    ).toBe(false);
  });
});
