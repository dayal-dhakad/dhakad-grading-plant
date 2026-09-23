import type { CreateExpenseInput, UpdateExpenseInput } from '@dhakad/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { ExpenseListQuery } from './expense.schemas.js';

const day = (value: Date) => value.toISOString().slice(0, 10);
const include = {
  createdBy: { select: { name: true } },
  _count: { select: { revisions: true } },
} as const;
type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof include }>;
type SnapshotRow = Pick<
  ExpenseRow,
  'expenseDate' | 'category' | 'otherCategory' | 'amount' | 'paidTo' | 'notes'
>;
const present = (row: ExpenseRow) => ({
  id: row.id,
  expenseNumber: row.expenseNumber,
  expenseDate: day(row.expenseDate),
  category: row.category,
  otherCategory: row.otherCategory,
  amount: row.amount.toFixed(2),
  paidTo: row.paidTo,
  notes: row.notes,
  createdByName: row.createdBy.name,
  revisionCount: row._count.revisions,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
const clean = <T extends CreateExpenseInput | UpdateExpenseInput>(input: T) => ({
  expenseDate: new Date(`${input.expenseDate}T00:00:00.000Z`),
  category: input.category,
  otherCategory: input.category === 'OTHER' ? (input.otherCategory ?? null) : null,
  amount: new Prisma.Decimal(input.amount),
  paidTo: input.paidTo || null,
  notes: input.notes || null,
});
export const listExpenses = async (query: ExpenseListQuery, createdById?: string) => {
  const where: Prisma.ExpenseWhereInput = {
    ...(createdById ? { createdById } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.from || query.to
      ? {
          expenseDate: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
          },
        }
      : {}),
  };
  const [rows, total, aggregate] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      include,
      orderBy: [{ expenseDate: 'desc' }, { expenseNumber: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);
  return {
    expenses: rows.map(present),
    total,
    totalAmount: (aggregate._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    page: query.page,
    pageSize: query.pageSize,
  };
};
export const createExpense = async (input: CreateExpenseInput, userId: string) =>
  present(await prisma.expense.create({ data: { ...clean(input), createdById: userId }, include }));
export const updateExpense = async (id: string, input: UpdateExpenseInput, userId: string) =>
  prisma.$transaction(
    async (tx) => {
      const current = await tx.expense.findUnique({ where: { id }, include });
      if (!current) throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense was not found');
      const data = clean(input);
      const snapshot = (x: SnapshotRow) => ({
        expenseDate: day(x.expenseDate),
        category: x.category,
        otherCategory: x.otherCategory,
        amount: x.amount.toFixed(2),
        paidTo: x.paidTo,
        notes: x.notes,
      });
      await tx.expenseRevision.create({
        data: {
          expenseId: id,
          revisionNumber: current._count.revisions + 1,
          reason: input.editReason,
          before: snapshot(current),
          after: snapshot(data),
          revisedById: userId,
        },
      });
      return present(await tx.expense.update({ where: { id }, data, include }));
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
