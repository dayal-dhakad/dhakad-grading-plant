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
});
