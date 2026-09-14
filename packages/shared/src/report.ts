import { z } from 'zod';

const money = z.string().regex(/^-?\d+\.\d{2}$/);
export const ReportQuerySchema = z
  .strictObject({ from: z.iso.date(), to: z.iso.date() })
  .refine((value) => value.from <= value.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
const countMoney = z.strictObject({ count: z.number().int().nonnegative(), amount: money });
export const ReportResponseSchema = z.strictObject({
  period: z.strictObject({ from: z.iso.date(), to: z.iso.date() }),
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
    quantityKg: z.string(),
    cancelledCount: z.number().int(),
  }),
  payments: z.strictObject({
    standalone: countMoney,
    totalCollected: money,
    cash: money,
    online: money,
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
});
export type ReportQuery = z.infer<typeof ReportQuerySchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
