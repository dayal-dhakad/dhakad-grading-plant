import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { calculateGradingAmount, calculateSmallBalanceWaiver } from './grading.service.js';

describe('grading calculations', () => {
  it('calculates and rounds the charge using decimal arithmetic', () => {
    expect(calculateGradingAmount('2.55', new Prisma.Decimal('25.25')).toFixed(2)).toBe('64.39');
  });
  it('converts kilograms to quintals before applying the per-quintal rate', () => {
    expect(calculateGradingAmount('250', new Prisma.Decimal('30'), 'KG').toFixed(2)).toBe('75.00');
  });
  it('waives any explicitly requested positive remainder', () => {
    expect(
      calculateSmallBalanceWaiver(
        new Prisma.Decimal('505'),
        new Prisma.Decimal('500'),
        true,
      ).toFixed(2),
    ).toBe('5.00');
    expect(
      calculateSmallBalanceWaiver(
        new Prisma.Decimal('505'),
        new Prisma.Decimal('500'),
        false,
      ).toFixed(2),
    ).toBe('0.00');
  });
  it('allows a requested waiver above ten rupees', () => {
    expect(
      calculateSmallBalanceWaiver(
        new Prisma.Decimal('700'),
        new Prisma.Decimal('500'),
        true,
      ).toFixed(2),
    ).toBe('200.00');
  });
  it('treats a waiver with no remaining balance as zero', () => {
    expect(
      calculateSmallBalanceWaiver(
        new Prisma.Decimal('500'),
        new Prisma.Decimal('500'),
        true,
      ).toFixed(2),
    ).toBe('0.00');
  });
});
