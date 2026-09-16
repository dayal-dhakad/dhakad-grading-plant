import { z } from 'zod';

const decimal = (label: string, allowZero = false) =>
  z
    .string()
    .regex(
      allowZero ? /^\d+(\.\d{1,2})?$/ : /^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/,
      `${label} must be a valid amount with up to 2 decimal places`,
    );

export const PaymentMethodSchema = z.enum(['CASH', 'ONLINE', 'DUE']);
export const GradingQuantityUnitSchema = z.enum(['QUINTAL', 'KG']);
export const CreateGradingEntrySchema = z
  .strictObject({
    customerId: z.uuid(),
    cropId: z.uuid(),
    quantity: decimal('Quantity'),
    quantityUnit: GradingQuantityUnitSchema.optional(),
    rate: decimal('Rate').optional(),
    paidAmount: decimal('Amount paid', true),
    waiveSmallBalance: z.boolean().optional().default(false),
    paymentMethod: PaymentMethodSchema,
    paymentAccountId: z.uuid().nullable().optional(),
    serviceDate: z.iso.date(),
    notes: z.string().trim().max(500, 'Notes must not exceed 500 characters').optional(),
  })
  .superRefine((value, context) => {
    if (value.paymentMethod === 'DUE' && Number(value.paidAmount) > 0)
      context.addIssue({
        code: 'custom',
        path: ['paidAmount'],
        message: 'Due entries cannot include a payment',
      });
  });
export const ReviseGradingEntrySchema = CreateGradingEntrySchema.safeExtend({
  reason: z.string().trim().min(3, 'Please provide an edit reason').max(300),
});
export const GradingEntrySchema = z.strictObject({
  id: z.uuid(),
  entryNumber: z.number().int().positive(),
  customer: z.strictObject({ id: z.uuid(), name: z.string(), mobile: z.string() }),
  createdBy: z.strictObject({ id: z.uuid(), name: z.string() }),
  crop: z.strictObject({ id: z.uuid(), name: z.string() }),
  unit: z.strictObject({ id: z.uuid(), name: z.string(), symbol: z.string() }),
  quantity: z.string(),
  rate: z.string(),
  calculatedAmount: z.string(),
  initialPaidAmount: z.string(),
  paidAmount: z.string(),
  waivedAmount: z.string(),
  dueAmount: z.string(),
  paymentMethod: PaymentMethodSchema,
  paymentAccount: z.strictObject({ id: z.uuid(), name: z.string(), upiId: z.string() }).nullable(),
  serviceDate: z.iso.date(),
  notes: z.string().nullable(),
  status: z.enum(['ACTIVE', 'CANCELLED']),
  cancellationReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const GradingEntryResponseSchema = z.strictObject({ gradingEntry: GradingEntrySchema });
export const GradingListResponseSchema = z.strictObject({
  gradingEntries: z.array(GradingEntrySchema),
  pagination: z.strictObject({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export const GradingReferenceResponseSchema = z.strictObject({
  crops: z.array(
    z.strictObject({
      id: z.uuid(),
      name: z.string(),
      rate: z.string(),
      unit: z.strictObject({ id: z.uuid(), name: z.string(), symbol: z.string() }),
    }),
  ),
});
export const CustomerGradingDueResponseSchema = z.strictObject({ totalDue: z.string() });
export const GradingRevisionSchema = z.strictObject({
  id: z.uuid(),
  revisionNumber: z.number().int().positive(),
  reason: z.string(),
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  revisedBy: z.strictObject({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
});
export const GradingRevisionListResponseSchema = z.strictObject({
  revisions: z.array(GradingRevisionSchema),
});

export type CreateGradingEntryInput = z.infer<typeof CreateGradingEntrySchema>;
export type GradingEntry = z.infer<typeof GradingEntrySchema>;
export type GradingListResponse = z.infer<typeof GradingListResponseSchema>;
export type ReviseGradingEntryInput = z.infer<typeof ReviseGradingEntrySchema>;
