import { describe, expect, it } from 'vitest';
import { GradingListQuerySchema } from './grading.schemas.js';

describe('grading list date filters', () => {
  it('accepts inclusive, one-sided, and empty service-date ranges', () => {
    expect(GradingListQuerySchema.parse({ from: '2026-09-01', to: '2026-09-16' })).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-16',
    });
    expect(GradingListQuerySchema.safeParse({ from: '2026-09-16' }).success).toBe(true);
    expect(GradingListQuerySchema.safeParse({}).success).toBe(true);
  });
  it('rejects invalid and reversed dates', () => {
    expect(GradingListQuerySchema.safeParse({ from: '2026-09-31' }).success).toBe(false);
    expect(GradingListQuerySchema.safeParse({ from: '2026-09-17', to: '2026-09-16' }).success).toBe(
      false,
    );
  });
});
