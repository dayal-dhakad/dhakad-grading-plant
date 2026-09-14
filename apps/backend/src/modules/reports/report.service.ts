import type { ReportQuery, ReportResponse } from '@dhakad/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma.js';

const zero = () => new Prisma.Decimal(0);
const sum = (values: Prisma.Decimal[]) =>
  values.reduce((total, value) => total.plus(value), zero());
const money = (value: Prisma.Decimal) => value.toFixed(2);

export const getOverviewReport = async (query: ReportQuery): Promise<ReportResponse> => {
  const serviceRange = {
    gte: new Date(`${query.from}T00:00:00.000Z`),
    lte: new Date(`${query.to}T00:00:00.000Z`),
  };
  const createdRange = {
    gte: new Date(`${query.from}T00:00:00.000Z`),
    lt: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86_400_000),
  };
  const [grading, seedBills, payments, dues, stock, users] = await prisma.$transaction([
    prisma.gradingEntry.findMany({
      where: { serviceDate: serviceRange },
      select: {
        status: true,
        quantity: true,
        calculatedAmount: true,
        paidAmount: true,
        waivedAmount: true,
        paymentMethod: true,
        paymentAccountId: true,
        createdById: true,
      },
    }),
    prisma.seedBill.findMany({
      where: { serviceDate: serviceRange },
      select: {
        status: true,
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
        paidAmount: true,
        paymentMethod: true,
        paymentAccountId: true,
        createdById: true,
        items: { select: { quantityGrams: true } },
      },
    }),
    prisma.customerPayment.findMany({
      where: { createdAt: createdRange },
      select: {
        status: true,
        amount: true,
        paymentMethod: true,
        paymentAccountId: true,
        recordedById: true,
      },
    }),
    prisma.customerLedgerEntry.groupBy({
      by: ['customerId'],
      orderBy: { customerId: 'asc' },
      _sum: { amount: true },
    }),
    prisma.seedStockMovement.groupBy({
      by: ['productId'],
      orderBy: { productId: 'asc' },
      _sum: { quantityGrams: true },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);
  const activeGrading = grading.filter((row) => row.status === 'ACTIVE');
  const activeSeeds = seedBills.filter((row) => row.status === 'ACTIVE');
  const activePayments = payments.filter((row) => row.status === 'ACTIVE');
  const dueRows = dues.filter((row) => (row._sum?.amount ?? zero()).gt(0));
  const [customers, products, accounts] = await prisma.$transaction([
    prisma.customer.findMany({
      where: { id: { in: dueRows.map((row) => row.customerId) } },
      select: { id: true, name: true, mobile: true, village: true },
    }),
    prisma.product.findMany({
      where: { id: { in: stock.map((row) => row.productId) } },
      select: { id: true, name: true },
    }),
    prisma.paymentAccount.findMany({ select: { id: true, name: true } }),
  ]);
  const collections = [
    ...activeGrading
      .filter((row) => row.paidAmount.gt(0))
      .map((row) => ({
        amount: row.paidAmount,
        method: row.paymentMethod,
        accountId: row.paymentAccountId,
        userId: row.createdById,
      })),
    ...activeSeeds
      .filter((row) => row.paidAmount.gt(0))
      .map((row) => ({
        amount: row.paidAmount,
        method: row.paymentMethod,
        accountId: row.paymentAccountId,
        userId: row.createdById,
      })),
    ...activePayments.map((row) => ({
      amount: row.amount,
      method: row.paymentMethod,
      accountId: row.paymentAccountId,
      userId: row.recordedById,
    })),
  ];
  const accountIds = [
    ...new Set(collections.filter((row) => row.method === 'ONLINE').map((row) => row.accountId)),
  ];
  return {
    period: query,
    grading: {
      count: activeGrading.length,
      quantityQuintals: sum(activeGrading.map((row) => row.quantity)).toFixed(2),
      amount: money(sum(activeGrading.map((row) => row.calculatedAmount))),
      paid: money(sum(activeGrading.map((row) => row.paidAmount))),
      waived: money(sum(activeGrading.map((row) => row.waivedAmount))),
      cancelledCount: grading.length - activeGrading.length,
    },
    seeds: {
      count: activeSeeds.length,
      gross: money(sum(activeSeeds.map((row) => row.grossAmount))),
      discount: money(sum(activeSeeds.map((row) => row.discountAmount))),
      net: money(sum(activeSeeds.map((row) => row.netAmount))),
      paid: money(sum(activeSeeds.map((row) => row.paidAmount))),
      quantityKg: new Prisma.Decimal(
        activeSeeds
          .reduce(
            (total, bill) =>
              total + bill.items.reduce((inner, item) => inner + item.quantityGrams, 0n),
            0n,
          )
          .toString(),
      )
        .div(1000)
        .toFixed(3),
      cancelledCount: seedBills.length - activeSeeds.length,
    },
    payments: {
      standalone: {
        count: activePayments.length,
        amount: money(sum(activePayments.map((row) => row.amount))),
      },
      totalCollected: money(sum(collections.map((row) => row.amount))),
      cash: money(sum(collections.filter((row) => row.method === 'CASH').map((row) => row.amount))),
      online: money(
        sum(collections.filter((row) => row.method === 'ONLINE').map((row) => row.amount)),
      ),
      reversedCount: payments.length - activePayments.length,
    },
    dues: {
      total: money(sum(dueRows.map((row) => row._sum?.amount ?? zero()))),
      customers: dueRows
        .map((row) => ({
          ...customers.find((customer) => customer.id === row.customerId)!,
          amount: money(row._sum?.amount ?? zero()),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 50),
    },
    paymentAccounts: accountIds.map((id) => {
      const rows = collections.filter((row) => row.method === 'ONLINE' && row.accountId === id);
      return {
        id,
        name: id
          ? (accounts.find((account) => account.id === id)?.name ?? 'Inactive account')
          : 'Unattributed historical online',
        amount: money(sum(rows.map((row) => row.amount))),
        transactionCount: rows.length,
      };
    }),
    staffActivity: users
      .map((user) => {
        const rows = collections.filter((row) => row.userId === user.id);
        return {
          id: user.id,
          name: user.name,
          gradingCount: activeGrading.filter((row) => row.createdById === user.id).length,
          seedBillCount: activeSeeds.filter((row) => row.createdById === user.id).length,
          paymentCount: activePayments.filter((row) => row.recordedById === user.id).length,
          collected: money(sum(rows.map((row) => row.amount))),
        };
      })
      .filter((row) => row.gradingCount || row.seedBillCount || row.paymentCount),
    stock: stock
      .map((row) => ({
        id: row.productId,
        name: products.find((product) => product.id === row.productId)?.name ?? 'Unknown seed',
        quantityKg: new Prisma.Decimal((row._sum?.quantityGrams ?? 0n).toString())
          .div(1000)
          .toFixed(3),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
};
