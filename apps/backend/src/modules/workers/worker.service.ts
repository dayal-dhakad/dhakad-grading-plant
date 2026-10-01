import type { CreateWorkerInput, CreateWorkerPaymentInput } from '@dhakad/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type {
  WorkerListQuery,
  WorkerPaymentListQuery,
  WorkerPaymentSummaryQuery,
} from './worker.schemas.js';

const date = (value: Date) => value.toISOString().slice(0, 10);
const workerInclude = {
  _count: { select: { payments: true } },
  payments: { select: { amount: true } },
} as const;
type WorkerRow = Prisma.WorkerGetPayload<{ include: typeof workerInclude }>;
const presentWorker = (row: WorkerRow) => ({
  id: row.id,
  workerNumber: row.workerNumber,
  name: row.name,
  mobile: row.mobile,
  notes: row.notes,
  isActive: row.isActive,
  totalPaid: row.payments
    .reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0))
    .toFixed(2),
  paymentCount: row._count.payments,
  createdAt: row.createdAt.toISOString(),
});
const paymentInclude = { recordedBy: { select: { name: true } } } as const;
type PaymentRow = Prisma.WorkerPaymentGetPayload<{ include: typeof paymentInclude }>;
const presentPayment = (row: PaymentRow) => ({
  id: row.id,
  paymentNumber: row.paymentNumber,
  workerId: row.workerId,
  paymentDate: date(row.paymentDate),
  amount: row.amount.toFixed(2),
  paymentMethod: row.paymentMethod as 'CASH' | 'ONLINE',
  notes: row.notes,
  recordedByName: row.recordedBy.name,
  createdAt: row.createdAt.toISOString(),
});
export const listWorkers = async (query: WorkerListQuery) => {
  const where: Prisma.WorkerWhereInput = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search } },
        ],
      }
    : {};
  const [rows, total] = await prisma.$transaction([
    prisma.worker.findMany({
      where,
      include: workerInclude,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.worker.count({ where }),
  ]);
  return { workers: rows.map(presentWorker), total, page: query.page, pageSize: query.pageSize };
};
export const createWorker = async (input: CreateWorkerInput) =>
  presentWorker(
    await prisma.worker.create({
      data: { name: input.name, mobile: input.mobile || null, notes: input.notes || null },
      include: workerInclude,
    }),
  );
export const getWorker = async (id: string) => {
  const worker = await prisma.worker.findUnique({ where: { id }, include: workerInclude });
  if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker was not found');
  return presentWorker(worker);
};
export const listWorkerPayments = async (workerId: string, query: WorkerPaymentListQuery) => {
  await getWorker(workerId);
  const where = { workerId };
  const [rows, total, aggregate] = await prisma.$transaction([
    prisma.workerPayment.findMany({
      where,
      include: paymentInclude,
      orderBy: [{ paymentDate: 'desc' }, { paymentNumber: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.workerPayment.count({ where }),
    prisma.workerPayment.aggregate({ where, _sum: { amount: true } }),
  ]);
  return {
    payments: rows.map(presentPayment),
    total,
    totalPaid: (aggregate._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    page: query.page,
    pageSize: query.pageSize,
  };
};
export const createWorkerPayment = async (
  workerId: string,
  input: CreateWorkerPaymentInput,
  userId: string,
) => {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    select: { id: true, isActive: true },
  });
  if (!worker) throw new AppError(404, 'WORKER_NOT_FOUND', 'Worker was not found');
  if (!worker.isActive)
    throw new AppError(409, 'WORKER_INACTIVE', 'Payments cannot be added for an inactive worker');
  return presentPayment(
    await prisma.workerPayment.create({
      data: {
        workerId,
        paymentDate: new Date(`${input.paymentDate}T00:00:00.000Z`),
        amount: new Prisma.Decimal(input.amount),
        paymentMethod: input.paymentMethod,
        notes: input.notes || null,
        recordedById: userId,
      },
      include: paymentInclude,
    }),
  );
};
export const getWorkerPaymentSummary = async (query: WorkerPaymentSummaryQuery) => {
  const where: Prisma.WorkerPaymentWhereInput =
    query.from || query.to
      ? {
          paymentDate: {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
          },
        }
      : {};
  const [aggregate, paymentCount] = await prisma.$transaction([
    prisma.workerPayment.aggregate({ where, _sum: { amount: true } }),
    prisma.workerPayment.count({ where }),
  ]);
  return {
    totalPaid: (aggregate._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    paymentCount,
  };
};
