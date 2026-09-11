import { z } from 'zod';
import { PaymentMethodSchema } from './grading.js';
const amount = z
  .string()
  .regex(
    /^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/,
    'Amount must be greater than zero with up to 2 decimal places',
  );
export const CreatePaymentSchema = z.strictObject({
  customerId: z.uuid(),
  amount,
  paymentMethod: PaymentMethodSchema,
  waiveSmallBalance: z.boolean().optional().default(false),
});
export const PaymentSchema = z.strictObject({
  id: z.uuid(),
  receiptNumber: z.number().int().positive(),
  customer: z.strictObject({ id: z.uuid(), name: z.string(), mobile: z.string() }),
  amount: z.string(),
  waivedAmount: z.string(),
  paymentMethod: PaymentMethodSchema,
  status: z.enum(['ACTIVE', 'REVERSED']),
  recordedBy: z.strictObject({ id: z.uuid(), name: z.string() }),
  reversedBy: z.strictObject({ id: z.uuid(), name: z.string() }).nullable(),
  reversalReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  reversedAt: z.iso.datetime().nullable(),
});
export const PaymentResponseSchema = z.strictObject({ payment: PaymentSchema });
export const PaymentListResponseSchema = z.strictObject({
  payments: z.array(PaymentSchema),
  pagination: z.strictObject({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export const CustomerBalanceSchema = z.strictObject({ customerId: z.uuid(), balance: z.string() });
export const LedgerEntrySchema = z.strictObject({
  id: z.uuid(),
  entryType: z.enum([
    'GRADING_CHARGE',
    'GRADING_PAYMENT',
    'GRADING_ADJUSTMENT',
    'CUSTOMER_PAYMENT',
    'PAYMENT_REVERSAL',
    'GRADING_REVERSAL',
    'SMALL_BALANCE_WAIVER',
    'WAIVER_REVERSAL',
    'SEED_SALE_CHARGE',
    'SEED_SALE_PAYMENT',
    'SEED_SALE_REVERSAL',
  ]),
  amount: z.string(),
  description: z.string(),
  gradingEntryId: z.uuid().nullable(),
  paymentId: z.uuid().nullable(),
  createdBy: z.strictObject({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
});
export const CustomerLedgerResponseSchema = z.strictObject({
  balance: z.string(),
  entries: z.array(LedgerEntrySchema),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentListResponse = z.infer<typeof PaymentListResponseSchema>;
