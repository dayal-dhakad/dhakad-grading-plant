import { LedgerEntryType, PaymentStatus, Prisma } from '@prisma/client';
import type { CreatePaymentInput } from '@dhakad/shared';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { PaymentListQuery } from './payment.schemas.js';
import { enqueueCustomerNotifications } from '../notifications/notification.service.js';
const include = {
  customer: { select: { id: true, name: true, mobile: true } },
  recordedBy: { select: { id: true, name: true } },
  reversedBy: { select: { id: true, name: true } },
  paymentAccount: { select: { id: true, name: true, upiId: true } },
} satisfies Prisma.CustomerPaymentInclude;
const present = (payment: Prisma.CustomerPaymentGetPayload<{ include: typeof include }>) => ({
  id: payment.id,
  receiptNumber: payment.receiptNumber,
  customer: payment.customer,
  amount: payment.amount.toFixed(2),
  waivedAmount: payment.waivedAmount.toFixed(2),
  paymentMethod: payment.paymentMethod,
  paymentAccount: payment.paymentAccount,
  status: payment.status,
  recordedBy: payment.recordedBy,
  reversedBy: payment.reversedBy,
  reversalReason: payment.reversalReason,
  createdAt: payment.createdAt.toISOString(),
  reversedAt: payment.reversedAt?.toISOString() ?? null,
});
export const customerBalance = async (
  customerId: string,
  transaction: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  const aggregate = await transaction.customerLedgerEntry.aggregate({
    where: { customerId },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? new Prisma.Decimal(0);
};
export const createPayment = async (input: CreatePaymentInput, userId: string) =>
  prisma.$transaction(
    async (transaction) => {
      const customer = await transaction.customer.findFirst({
        where: { id: input.customerId, isActive: true },
      });
      if (!customer) throw new AppError(400, 'CUSTOMER_UNAVAILABLE', 'Select an active customer');
      const amount = new Prisma.Decimal(input.amount);
      const paymentAccount = input.paymentAccountId
        ? await transaction.paymentAccount.findFirst({
            where: { id: input.paymentAccountId, isActive: true },
          })
        : null;
      if (input.paymentMethod === 'ONLINE' && !paymentAccount)
        throw new AppError(400, 'PAYMENT_ACCOUNT_REQUIRED', 'Select an active payment account', [
          { path: 'paymentAccountId', message: 'Select an active payment account' },
        ]);
      const balance = await customerBalance(input.customerId, transaction);
      if (balance.lte(0))
        throw new AppError(409, 'NO_OUTSTANDING_DUE', 'This customer has no outstanding due');
      if (amount.gt(balance))
        throw new AppError(400, 'PAYMENT_EXCEEDS_DUE', 'Payment cannot exceed the customer due', [
          { path: 'amount', message: `Enter an amount up to ${balance.toFixed(2)}` },
        ]);
      const remainder = balance.minus(amount);
      const waivedAmount =
        input.waiveSmallBalance && remainder.gt(0) ? remainder : new Prisma.Decimal(0);
      const payment = await transaction.customerPayment.create({
        data: {
          customerId: input.customerId,
          amount,
          waivedAmount,
          paymentMethod: input.paymentMethod,
          paymentAccountId: input.paymentMethod === 'ONLINE' ? paymentAccount!.id : null,
          recordedById: userId,
        },
        include,
      });
      let remaining = amount;
      let waiverRemaining = waivedAmount;
      const entries = await transaction.gradingEntry.findMany({
        where: { customerId: input.customerId, status: 'ACTIVE' },
        include: { paymentAllocations: { where: { payment: { status: PaymentStatus.ACTIVE } } } },
        orderBy: [{ serviceDate: 'asc' }, { entryNumber: 'asc' }],
      });
      for (const entry of entries) {
        if (remaining.lte(0) && waiverRemaining.lte(0)) break;
        const allocated = entry.paymentAllocations.reduce(
          (sum, item) => sum.plus(item.amount).plus(item.waivedAmount),
          new Prisma.Decimal(0),
        );
        const outstanding = entry.calculatedAmount.minus(entry.paidAmount).minus(allocated);
        if (outstanding.lte(0)) continue;
        const allocation = Prisma.Decimal.min(remaining, outstanding);
        const waiverAllocation = Prisma.Decimal.min(waiverRemaining, outstanding.minus(allocation));
        await transaction.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            gradingEntryId: entry.id,
            amount: allocation,
            waivedAmount: waiverAllocation,
          },
        });
        remaining = remaining.minus(allocation);
        waiverRemaining = waiverRemaining.minus(waiverAllocation);
      }
      await transaction.customerLedgerEntry.create({
        data: {
          customerId: input.customerId,
          entryType: LedgerEntryType.CUSTOMER_PAYMENT,
          amount: amount.negated(),
          paymentId: payment.id,
          description: `Payment RCPT-${String(payment.receiptNumber).padStart(6, '0')}`,
          createdById: userId,
        },
      });
      if (waivedAmount.gt(0))
        await transaction.customerLedgerEntry.create({
          data: {
            customerId: input.customerId,
            entryType: LedgerEntryType.SMALL_BALANCE_WAIVER,
            amount: waivedAmount.negated(),
            paymentId: payment.id,
            description: `Small-balance waiver with RCPT-${String(payment.receiptNumber).padStart(6, '0')}`,
            createdById: userId,
          },
        });
      await enqueueCustomerNotifications(transaction, {
        customer,
        eventType: 'PAYMENT_RECEIVED',
        createdById: userId,
        paymentId: payment.id,
        variables: {
          name: customer.name,
          number: `RCPT-${String(payment.receiptNumber).padStart(6, '0')}`,
          amount: amount.toFixed(2),
          balance: Prisma.Decimal.max(0, remainder.minus(waivedAmount)).toFixed(2),
        },
        preview: `Payment RCPT-${String(payment.receiptNumber).padStart(6, '0')} of ₹${amount.toFixed(2)} received.`,
      });
      return present(payment);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
export const listPayments = async (query: PaymentListQuery, recorderId?: string) => {
  const where: Prisma.CustomerPaymentWhereInput = {
    ...(recorderId ? { recordedById: recorderId } : {}),
    ...(query.status === 'all'
      ? {}
      : { status: query.status === 'active' ? PaymentStatus.ACTIVE : PaymentStatus.REVERSED }),
    ...(query.search
      ? {
          OR: [
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            { customer: { mobile: { contains: query.search } } },
          ],
        }
      : {}),
  };
  const [payments, total] = await prisma.$transaction([
    prisma.customerPayment.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.customerPayment.count({ where }),
  ]);
  return {
    payments: payments.map(present),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};
export const reversePayment = async (id: string, reason: string, userId: string) =>
  prisma.$transaction(
    async (transaction) => {
      const payment = await transaction.customerPayment.findUnique({ where: { id }, include });
      if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found');
      if (payment.status === PaymentStatus.REVERSED)
        throw new AppError(409, 'PAYMENT_ALREADY_REVERSED', 'Payment is already reversed');
      const updated = await transaction.customerPayment.update({
        where: { id },
        data: {
          status: PaymentStatus.REVERSED,
          reversedAt: new Date(),
          reversedById: userId,
          reversalReason: reason,
        },
        include,
      });
      await transaction.customerLedgerEntry.create({
        data: {
          customerId: payment.customerId,
          entryType: LedgerEntryType.PAYMENT_REVERSAL,
          amount: payment.amount,
          paymentId: payment.id,
          description: `Reversal: ${reason}`,
          createdById: userId,
        },
      });
      if (payment.waivedAmount.gt(0))
        await transaction.customerLedgerEntry.create({
          data: {
            customerId: payment.customerId,
            entryType: LedgerEntryType.WAIVER_REVERSAL,
            amount: payment.waivedAmount,
            paymentId: payment.id,
            description: `Waiver reversal: ${reason}`,
            createdById: userId,
          },
        });
      const customer = await transaction.customer.findUniqueOrThrow({
        where: { id: payment.customerId },
      });
      await enqueueCustomerNotifications(transaction, {
        customer,
        eventType: 'PAYMENT_REVERSED',
        createdById: userId,
        paymentId: payment.id,
        variables: {
          name: customer.name,
          number: `RCPT-${String(payment.receiptNumber).padStart(6, '0')}`,
          amount: payment.amount.toFixed(2),
        },
        preview: `Payment RCPT-${String(payment.receiptNumber).padStart(6, '0')} of ₹${payment.amount.toFixed(2)} was reversed.`,
      });
      return present(updated);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
export const getCustomerLedger = async (customerId: string) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found');
  const [balance, entries] = await Promise.all([
    customerBalance(customerId),
    prisma.customerLedgerEntry.findMany({
      where: { customerId },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  return {
    balance: balance.toFixed(2),
    entries: entries.map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      amount: entry.amount.toFixed(2),
      description: entry.description,
      gradingEntryId: entry.gradingEntryId,
      paymentId: entry.paymentId,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
};
