import { describe, expect, it } from 'vitest';
import {
  CustomerIdParamsSchema,
  CustomerListQuerySchema,
  CustomerStatusSchema,
} from './customer.schemas.js';

describe('customer route schemas', () => {
  it('applies safe list defaults and coerces pagination', () => {
    expect(CustomerListQuerySchema.parse({ page: '2', pageSize: '25' })).toEqual({
      status: 'active',
      page: 2,
      pageSize: 25,
    });
  });
  it('rejects excessive page sizes and unknown filters', () => {
    expect(CustomerListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(CustomerListQuerySchema.safeParse({ sort: 'mobile' }).success).toBe(false);
  });
  it('validates UUID parameters and boolean status bodies', () => {
    expect(CustomerIdParamsSchema.safeParse({ id: 'not-an-id' }).success).toBe(false);
    expect(CustomerStatusSchema.safeParse({ isActive: 'false' }).success).toBe(false);
  });
});
