import { z } from 'zod';
import { SeedDiscountTypeSchema, SeedQuantityUnitSchema } from './seed-management.js';
import { PaymentMethodSchema } from './grading.js';

const amount = z.string().regex(/^\d+(\.\d{1,2})?$/);
export const CreateSeedBillSchema = z.strictObject({
  customerId: z.uuid(),
  items: z
    .array(
      z.strictObject({
        productId: z.uuid(),
        quantity: z.string().regex(/^\d+(\.\d{1,5})?$/),
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
  waiveSmallBalance: z.boolean().default(false),
  serviceDate: z.iso.date(),
  notes: z.string().trim().max(500).optional(),
});
export const CancelSeedBillSchema = z.strictObject({ reason: z.string().trim().min(1).max(300) });
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
export type SeedBill = z.infer<typeof SeedBillSchema>;
