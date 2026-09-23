import { z } from 'zod';

const money = z.string().regex(/^-?\d+\.\d{2}$/);
const cents = (value: string) => {
  const [whole, fraction] = value.split('.');
  return BigInt(whole!) * 100n + BigInt(whole!.startsWith('-') ? `-${fraction!}` : fraction!);
};
export const ReportQuerySchema = z
  .strictObject({ from: z.iso.date(), to: z.iso.date() })
  .refine((value) => value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
const countMoney = z.strictObject({ count: z.number().int().nonnegative(), amount: money });
export const ReportResponseSchema = z
  .strictObject({
    period: z.strictObject({ from: z.iso.date(), to: z.iso.date() }),
    totalBilled: money,
    totalWaived: money,
    expenses: z.strictObject({
      count: z.number().int().nonnegative(),
      total: money,
      gradingMargin: money,
      categories: z.array(
        z.strictObject({
          category: z.string(),
          label: z.string(),
          count: z.number().int().nonnegative(),
          amount: money,
        }),
      ),
    }),
    grading: z.strictObject({
      count: z.number().int(),
      quantityQuintals: z.string(),
      amount: money,
      paid: money,
      waived: money,
      cancelledCount: z.number().int(),
    }),
    seeds: z.strictObject({
      count: z.number().int(),
      gross: money,
      discount: money,
      net: money,
      paid: money,
      waived: money,
      quantityKg: z.string(),
      cancelledCount: z.number().int(),
    }),
    payments: z.strictObject({
      standalone: countMoney,
      standaloneWaived: money,
      totalCollected: money,
      cash: money,
      online: money,
      unclassified: money,
      unclassifiedRecords: z.array(
        z.strictObject({
          kind: z.enum(['grading', 'seed', 'payment']),
          id: z.uuid(),
          number: z.number().int().positive(),
          amount: money,
        }),
      ),
      reversedCount: z.number().int(),
    }),
    dues: z.strictObject({
      total: money,
      customers: z.array(
        z.strictObject({
          id: z.uuid(),
          name: z.string(),
          mobile: z.string(),
          village: z.string(),
          amount: money,
        }),
      ),
    }),
    paymentAccounts: z.array(
      z.strictObject({
        id: z.uuid().nullable(),
        name: z.string(),
        amount: money,
        transactionCount: z.number().int(),
      }),
    ),
    staffActivity: z.array(
      z.strictObject({
        id: z.uuid(),
        name: z.string(),
        gradingCount: z.number().int(),
        seedBillCount: z.number().int(),
        paymentCount: z.number().int(),
        collected: money,
      }),
    ),
    stock: z.array(z.strictObject({ id: z.uuid(), name: z.string(), quantityKg: z.string() })),
  })
  .superRefine((report, context) => {
    if (cents(report.totalBilled) !== cents(report.grading.amount) + cents(report.seeds.net))
      context.addIssue({
        code: 'custom',
        path: ['totalBilled'],
        message: 'Billed total does not match grading and seed charges',
      });
    const collected = cents(report.payments.totalCollected);
    const byMode =
      cents(report.payments.cash) +
      cents(report.payments.online) +
      cents(report.payments.unclassified);
    const bySource =
      cents(report.grading.paid) +
      cents(report.seeds.paid) +
      cents(report.payments.standalone.amount);
    if (collected !== byMode || collected !== bySource)
      context.addIssue({
        code: 'custom',
        path: ['payments', 'totalCollected'],
        message: 'Collections breakdown does not match total',
      });
    const waived =
      cents(report.grading.waived) +
      cents(report.seeds.waived) +
      cents(report.payments.standaloneWaived);
    if (cents(report.totalWaived) !== waived)
      context.addIssue({
        code: 'custom',
        path: ['totalWaived'],
        message: 'Waiver breakdown does not match total',
      });
    const categoryExpenses = report.expenses.categories.reduce(
      (total, row) => total + cents(row.amount),
      0n,
    );
    if (cents(report.expenses.total) !== categoryExpenses)
      context.addIssue({
        code: 'custom',
        path: ['expenses', 'total'],
        message: 'Expense category breakdown does not match total',
      });
    if (
      cents(report.expenses.gradingMargin) !==
      cents(report.grading.amount) - cents(report.expenses.total)
    )
      context.addIssue({
        code: 'custom',
        path: ['expenses', 'gradingMargin'],
        message: 'Grading margin does not match grading charges minus expenses',
      });
  });
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
