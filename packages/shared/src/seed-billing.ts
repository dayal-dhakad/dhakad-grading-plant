import { z } from 'zod';
import { SeedDiscountTypeSchema, SeedQuantityUnitSchema } from './seed-management.js';
import { PaymentMethodSchema } from './grading.js';

const amount = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount');
export const CreateSeedBillSchema = z
  .strictObject({
    customerId: z.uuid(),
    items: z
      .array(
        z.strictObject({
          productId: z.uuid(),
          quantity: z
            .string()
            .regex(/^(?!0+(?:\.0{1,5})?$)\d+(\.\d{1,5})?$/, 'Quantity must be greater than zero'),
          unit: SeedQuantityUnitSchema,
          ratePerKg: amount,
          discountType: SeedDiscountTypeSchema,
          discountValue: amount,
        }),
      )
      .min(1)
      .max(50),
    paidAmount: amount,
    paymentMethod: PaymentMethodSchema,
    paymentAccountId: z.uuid().nullable().optional(),
    waiveSmallBalance: z.boolean().default(false),
    serviceDate: z.iso.date(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.paymentMethod === 'DUE' && Number(value.paidAmount) > 0)
      context.addIssue({
        code: 'custom',
        path: ['paidAmount'],
        message: 'Due bills cannot include a payment',
      });
    if (new Set(value.items.map((item) => item.productId)).size !== value.items.length)
      context.addIssue({ code: 'custom', path: ['items'], message: 'Add each seed only once' });
    for (const [index, item] of value.items.entries()) {
      if (Number(item.ratePerKg) <= 0)
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'ratePerKg'],
          message: 'Rate must be greater than zero',
        });
      if (item.discountType === 'NONE' && Number(item.discountValue) !== 0)
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'discountValue'],
          message: 'No discount must use zero',
        });
      if (item.discountType === 'PERCENTAGE' && Number(item.discountValue) > 100)
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'discountValue'],
          message: 'Percentage cannot exceed 100',
        });
    }
  });
export const CancelSeedBillSchema = z.strictObject({ reason: z.string().trim().min(1).max(300) });
export const ReviseSeedBillSchema = CreateSeedBillSchema.safeExtend({
  reason: z.string().trim().min(1).max(300),
});
const user = z.strictObject({ id: z.uuid(), name: z.string() });
const customer = z.strictObject({ id: z.uuid(), name: z.string(), mobile: z.string() });
export const SeedBillSchema = z.strictObject({
  id: z.uuid(),
  billNumber: z.number().int().positive(),
  customer,
  grossAmount: z.string(),
  discountAmount: z.string(),
  netAmount: z.string(),
  paidAmount: z.string(),
  dueAmount: z.string(),
  waivedAmount: z.string(),
  paymentMethod: PaymentMethodSchema,
  paymentAccount: z.strictObject({ id: z.uuid(), name: z.string(), upiId: z.string() }).nullable(),
  status: z.enum(['ACTIVE', 'CANCELLED']),
  serviceDate: z.iso.date(),
  notes: z.string().nullable(),
  createdBy: user,
  cancellationReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  items: z.array(
    z.strictObject({
      id: z.uuid(),
      product: z.strictObject({ id: z.uuid(), name: z.string() }),
      enteredQuantity: z.string(),
      enteredUnit: SeedQuantityUnitSchema,
      quantityGrams: z.string(),
      ratePerKg: z.string(),
      discountType: SeedDiscountTypeSchema,
      discountValue: z.string(),
      grossAmount: z.string(),
      discountAmount: z.string(),
      netAmount: z.string(),
    }),
  ),
});
export const SeedBillResponseSchema = z.strictObject({ bill: SeedBillSchema });
export const SeedBillRevisionListResponseSchema = z.strictObject({
  revisions: z.array(
    z.strictObject({
      id: z.uuid(),
      revisionNumber: z.number().int().positive(),
      reason: z.string(),
      before: z.unknown(),
      after: z.unknown(),
      revisedBy: user,
      createdAt: z.iso.datetime(),
    }),
  ),
});
export const SeedBillListResponseSchema = z.strictObject({
  bills: z.array(SeedBillSchema),
  pagination: z.strictObject({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type CreateSeedBillInput = z.infer<typeof CreateSeedBillSchema>;
export type ReviseSeedBillInput = z.infer<typeof ReviseSeedBillSchema>;
export type SeedBill = z.infer<typeof SeedBillSchema>;
