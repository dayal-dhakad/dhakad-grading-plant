import { describe, expect, it } from 'vitest';
import { CreateGradingEntrySchema, ReviseGradingEntrySchema } from './grading.js';

const valid = {
  customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
  cropId: '9ed31ad4-68f4-4dbf-9650-dfdac52dde1c',
  quantity: '2.50',
  paidAmount: '62.50',
  paymentMethod: 'CASH',
  serviceDate: '2026-09-08',
};
describe('grading contracts', () => {
  it('accepts a valid entry and zero payment', () => {
    expect(CreateGradingEntrySchema.parse({ ...valid, paidAmount: '0' }).paidAmount).toBe('0');
  });
  it('accepts due as an entry payment mode with zero paid', () => {
    const result = CreateGradingEntrySchema.parse({
      ...valid,
      paidAmount: '0.00',
      paymentMethod: 'DUE',
    });
    expect(result.paymentMethod).toBe('DUE');
    expect(result.paidAmount).toBe('0.00');
  });
  it('rejects a payment recorded under Due for creation and revision', () => {
    expect(CreateGradingEntrySchema.safeParse({ ...valid, paymentMethod: 'DUE' }).success).toBe(
      false,
    );
    expect(
      ReviseGradingEntrySchema.safeParse({ ...valid, paymentMethod: 'DUE', reason: 'Correction' })
        .success,
    ).toBe(false);
  });
  it('accepts an explicit small-balance waiver choice', () => {
    expect(
      CreateGradingEntrySchema.parse({ ...valid, paidAmount: '60', waiveSmallBalance: true })
        .waiveSmallBalance,
    ).toBe(true);
  });
  it('accepts an editable rate and kilogram input', () => {
    const result = CreateGradingEntrySchema.parse({
      ...valid,
      quantityUnit: 'KG',
      rate: '30.00',
    });
    expect(result.quantityUnit).toBe('KG');
    expect(result.rate).toBe('30.00');
  });
  it('rejects excessive precision and unknown fields', () => {
    expect(CreateGradingEntrySchema.safeParse({ ...valid, quantity: '1.234' }).success).toBe(false);
    expect(CreateGradingEntrySchema.safeParse({ ...valid, extra: true }).success).toBe(false);
  });
  it('requires a meaningful reason for revisions', () => {
    expect(ReviseGradingEntrySchema.safeParse({ ...valid, reason: '' }).success).toBe(false);
    expect(
      ReviseGradingEntrySchema.safeParse({ ...valid, reason: 'Corrected weight' }).success,
    ).toBe(true);
  });
});
