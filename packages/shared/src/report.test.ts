import { describe, expect, it } from 'vitest';
import { ReportQuerySchema, ReportResponseSchema } from './report.js';
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
  it('requires collection and waiver breakdowns to reconcile exactly', () => {
    const report = {
      period: { from: '2026-09-01', to: '2026-09-16' },
      totalBilled: '118.00',
      totalWaived: '5.50',
      expenses: {
        count: 1,
        total: '25.00',
        gradingMargin: '75.00',
        categories: [
          { category: 'WORKER_PAYMENT', label: 'Worker payment', count: 1, amount: '25.00' },
        ],
      },
      grading: {
        count: 1,
        quantityQuintals: '1.00',
        amount: '100.00',
        paid: '80.50',
        waived: '3.00',
        cancelledCount: 0,
      },
      seeds: {
        count: 1,
        gross: '20.00',
        discount: '2.00',
        net: '18.00',
        paid: '15.00',
        waived: '2.00',
        quantityKg: '1.000',
        cancelledCount: 0,
      },
      payments: {
        standalone: { count: 1, amount: '4.00' },
        standaloneWaived: '0.50',
        totalCollected: '99.50',
        cash: '90.00',
        online: '8.50',
        unclassified: '1.00',
        unclassifiedRecords: [],
        reversedCount: 0,
      },
      dues: { total: '0.00', customers: [] },
      paymentAccounts: [],
      staffActivity: [],
      stock: [],
    };
    expect(ReportResponseSchema.safeParse(report).success).toBe(true);
    expect(
      ReportResponseSchema.safeParse({
        ...report,
        payments: { ...report.payments, unclassified: '0.00' },
      }).success,
    ).toBe(false);
    expect(ReportResponseSchema.safeParse({ ...report, totalWaived: '5.49' }).success).toBe(false);
  });
});
