import { z } from 'zod';

export const ExpenseCategorySchema = z.enum([
  'WORKER_PAYMENT',
  'ELECTRICITY_BILL',
  'MACHINE_PARTS',
  'TEA_REFRESHMENTS',
  'OTHER',
]);
const amount = z.string().regex(/^(?!0+(?:\.0{1,2})?$)\d+(\.\d{1,2})?$/, 'Enter a valid amount');
const fields = {
  expenseDate: z.iso.date(),
  category: ExpenseCategorySchema,
  otherCategory: z.string().trim().max(100).nullable().optional(),
  amount,
  paidTo: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
};
const validateOther = (
  value: { category: string; otherCategory?: string | null | undefined },
  ctx: z.RefinementCtx,
) => {
  if (value.category === 'OTHER' && !value.otherCategory)
    ctx.addIssue({
      code: 'custom',
      path: ['otherCategory'],
      message: 'Describe the other category',
    });
};
export const CreateExpenseSchema = z.strictObject(fields).superRefine(validateOther);
export const UpdateExpenseSchema = z
  .strictObject({
    ...fields,
    editReason: z.string().trim().min(3, 'Enter a reason for the edit').max(300),
  })
  .superRefine(validateOther);
export const ExpenseSchema = z.strictObject({
  id: z.uuid(),
  expenseNumber: z.number().int().positive(),
  expenseDate: z.iso.date(),
  category: ExpenseCategorySchema,
  otherCategory: z.string().nullable(),
  amount: z.string(),
  paidTo: z.string().nullable(),
  notes: z.string().nullable(),
  createdByName: z.string(),
  revisionCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const ExpenseListResponseSchema = z.strictObject({
  expenses: z.array(ExpenseSchema),
  total: z.number().int().nonnegative(),
  totalAmount: z.string(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export const ExpenseResponseSchema = z.strictObject({ expense: ExpenseSchema });
export type Expense = z.infer<typeof ExpenseSchema>;
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
