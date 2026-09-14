import { describe, expect, it } from 'vitest';
import { ReportQuerySchema } from './report.js';
describe('report contracts', () => {
  it('accepts an inclusive date range', () =>
    expect(ReportQuerySchema.safeParse({ from: '2026-09-01', to: '2026-09-30' }).success).toBe(
      true,
    ));
  it('rejects reversed ranges and unknown fields', () => {
    expect(ReportQuerySchema.safeParse({ from: '2026-10-01', to: '2026-09-30' }).success).toBe(
      false,
    );
    expect(
      ReportQuerySchema.safeParse({ from: '2026-09-01', to: '2026-09-30', extra: true }).success,
    ).toBe(false);
  });
});
