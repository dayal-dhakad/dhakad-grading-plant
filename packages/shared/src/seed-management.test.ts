import { describe, expect, it } from 'vitest';
import { AddSeedStockSchema, CreateSeedProductSchema } from './seed-management.js';

const product = {
  name: 'सरसों Mustard',
  sellingRatePerKg: '125.50',
  discountType: 'PERCENTAGE' as const,
  discountValue: '5',
  initialStockQuantity: '2.5',
  initialStockUnit: 'KILOGRAM' as const,
};

describe('seed management contracts', () => {
  it('accepts a single Hindi and English name field', () => {
    expect(CreateSeedProductSchema.parse(product).name).toBe('सरसों Mustard');
  });

  it('rejects percentages above 100', () => {
    expect(CreateSeedProductSchema.safeParse({ ...product, discountValue: '100.01' }).success).toBe(
      false,
    );
  });

  it('requires zero value when discount is disabled', () => {
    expect(
      CreateSeedProductSchema.safeParse({
        ...product,
        discountType: 'NONE',
        discountValue: '5',
      }).success,
    ).toBe(false);
  });

  it('requires an initial-stock quantity and unit together', () => {
    expect(
      CreateSeedProductSchema.safeParse({ ...product, initialStockUnit: undefined }).success,
    ).toBe(false);
  });

  it('accepts stock in grams, kilograms, and quintals', () => {
    for (const unit of ['GRAM', 'KILOGRAM', 'QUINTAL'] as const)
      expect(
        AddSeedStockSchema.safeParse({
          movementType: 'STOCK_ADDED',
          quantity: '1',
          unit,
          reason: 'Owner added stock',
        }).success,
      ).toBe(true);
  });

  it('rejects unknown stock fields', () => {
    expect(
      AddSeedStockSchema.safeParse({
        movementType: 'STOCK_ADDED',
        quantity: '1',
        unit: 'KILOGRAM',
        reason: 'Owner added stock',
        supplier: 'Not collected',
      }).success,
    ).toBe(false);
  });
});
