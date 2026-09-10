import { describe, expect, it } from 'vitest';
import { SeedListQuerySchema, SeedMovementListQuerySchema } from './seed-management.schemas.js';

describe('seed management query schemas', () => {
  it('coerces pagination and applies safe defaults', () => {
    expect(SeedListQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({
      status: 'active',
      page: 2,
      pageSize: 50,
    });
  });

  it('rejects unsupported table page sizes above the API limit', () => {
    expect(SeedMovementListQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
  });
});
