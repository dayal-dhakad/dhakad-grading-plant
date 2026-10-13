import { describe, expect, it } from 'vitest';
import { PaymentListQuerySchema } from './payment.schemas.js';

describe('PaymentListQuerySchema', () => {
  it('defaults to all recorders', () => {
    expect(PaymentListQuerySchema.parse({})).toMatchObject({ recordedBy: 'all' });
  });

  it.each(['all', 'admin', 'staff'] as const)('accepts the %s recorder filter', (recordedBy) => {
    expect(PaymentListQuerySchema.parse({ recordedBy }).recordedBy).toBe(recordedBy);
  });

  it('rejects an unknown recorder filter', () => {
    expect(PaymentListQuerySchema.safeParse({ recordedBy: 'owner' }).success).toBe(false);
  });
});
