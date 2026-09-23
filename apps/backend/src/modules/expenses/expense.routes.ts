import { CreateExpenseSchema, UpdateExpenseSchema } from '@dhakad/shared';
import { Role } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ExpenseIdSchema, ExpenseListQuerySchema } from './expense.schemas.js';
import { createExpense, listExpenses, updateExpense } from './expense.service.js';
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields',
      result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    );
  return result.data;
};
export const expenseRouter = Router();
expenseRouter.use(requireAuth, requireRole(Role.ADMIN));
expenseRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listExpenses(parse(ExpenseListQuerySchema, req.query)));
  } catch (e) {
    next(e);
  }
});
expenseRouter.post('/', async (req, res, next) => {
  try {
    res
      .status(201)
      .json({
        expense: await createExpense(parse(CreateExpenseSchema, req.body), req.authUser!.id),
      });
  } catch (e) {
    next(e);
  }
});
expenseRouter.patch('/:id', async (req, res, next) => {
  try {
    res.json({
      expense: await updateExpense(
        parse(ExpenseIdSchema, req.params).id,
        parse(UpdateExpenseSchema, req.body),
        req.authUser!.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
