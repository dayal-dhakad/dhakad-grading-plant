import { z } from 'zod';

const upiId = z
  .string()
  .trim()
  .min(3, 'Enter a UPI ID')
  .max(120)
  .regex(/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/, 'Enter a valid UPI ID');

export const CreatePaymentAccountSchema = z.strictObject({
  name: z.string().trim().min(1, 'Enter an account name').max(100),
  accountHolderName: z.string().trim().min(1, 'Enter the account holder name').max(120),
  upiId,
  isDefault: z.boolean().optional().default(false),
});

export const UpdatePaymentAccountSchema = CreatePaymentAccountSchema;
export const PaymentAccountSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  accountHolderName: z.string(),
  upiId: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const PaymentAccountListResponseSchema = z.strictObject({
  accounts: z.array(PaymentAccountSchema),
});
export const PaymentAccountResponseSchema = z.strictObject({ account: PaymentAccountSchema });
export const PaymentQrRequestSchema = z.strictObject({
  amount: z.string().regex(/^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
  reference: z.string().trim().max(80).optional(),
});
export const PaymentQrResponseSchema = z.strictObject({
  account: PaymentAccountSchema,
  amount: z.string(),
  upiUri: z.string().startsWith('upi://pay?'),
});

export type CreatePaymentAccountInput = z.infer<typeof CreatePaymentAccountSchema>;
export type UpdatePaymentAccountInput = z.infer<typeof UpdatePaymentAccountSchema>;
export type PaymentAccount = z.infer<typeof PaymentAccountSchema>;
