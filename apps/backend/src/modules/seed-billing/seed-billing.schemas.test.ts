import { describe, expect, it } from 'vitest';
import { SeedBillListQuerySchema } from './seed-billing.schemas.js';

describe('seed bill list query', () => {
  it('coerces paging values and supplies the default status', () =>
    expect(SeedBillListQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({
      status: 'active',
      page: 2,
      pageSize: 50,
    }));

  it('rejects oversized pages', () =>
    expect(SeedBillListQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false));

  it('accepts inclusive and one-sided service-date filters', () => {
    expect(SeedBillListQuerySchema.parse({ from: '2026-09-01', to: '2026-09-16' })).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-16',
    });
    expect(SeedBillListQuerySchema.safeParse({ to: '2026-09-16' }).success).toBe(true);
  });

  it('rejects invalid and reversed service-date filters', () => {
    expect(SeedBillListQuerySchema.safeParse({ to: 'not-a-date' }).success).toBe(false);
    expect(
      SeedBillListQuerySchema.safeParse({ from: '2026-09-17', to: '2026-09-16' }).success,
    ).toBe(false);
  });
});
