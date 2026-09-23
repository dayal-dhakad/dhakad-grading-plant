import { describe, expect, it } from 'vitest';
import { CreateExpenseSchema, UpdateExpenseSchema } from './expense.js';
describe('expense contracts', () => {
  const valid = {
    expenseDate: '2026-09-23',
    category: 'WORKER_PAYMENT',
    amount: '500.00',
  } as const;
  it('accepts a valid expense', () =>
    expect(CreateExpenseSchema.safeParse(valid).success).toBe(true));
  it('requires a description for Other', () =>
    expect(CreateExpenseSchema.safeParse({ ...valid, category: 'OTHER' }).success).toBe(false));
  it('requires an edit reason', () =>
    expect(UpdateExpenseSchema.safeParse(valid).success).toBe(false));
  it('rejects unknown fields', () =>
    expect(CreateExpenseSchema.safeParse({ ...valid, unexpected: true }).success).toBe(false));
});
