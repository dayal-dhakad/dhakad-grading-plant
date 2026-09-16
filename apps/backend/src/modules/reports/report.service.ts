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
        id: true,
        entryNumber: true,
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
        id: true,
        billNumber: true,
        status: true,
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
        paidAmount: true,
        waivedAmount: true,
        paymentMethod: true,
        paymentAccountId: true,
        createdById: true,
        items: { where: { isCurrent: true }, select: { quantityGrams: true } },
      },
    }),
    prisma.customerPayment.findMany({
      where: { createdAt: createdRange },
      select: {
        id: true,
        receiptNumber: true,
        status: true,
        amount: true,
        waivedAmount: true,
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
  const unclassifiedRecords = [
    ...activeGrading
      .filter((row) => row.paymentMethod === 'DUE' && row.paidAmount.gt(0))
      .map((row) => ({
        kind: 'grading' as const,
        id: row.id,
        number: row.entryNumber,
        amount: money(row.paidAmount),
      })),
    ...activeSeeds
      .filter((row) => row.paymentMethod === 'DUE' && row.paidAmount.gt(0))
      .map((row) => ({
        kind: 'seed' as const,
        id: row.id,
        number: row.billNumber,
        amount: money(row.paidAmount),
      })),
    ...activePayments
      .filter((row) => row.paymentMethod === 'DUE' && row.amount.gt(0))
      .map((row) => ({
        kind: 'payment' as const,
        id: row.id,
        number: row.receiptNumber,
        amount: money(row.amount),
      })),
  ];
  const totalWaived = sum([
    ...activeGrading.map((row) => row.waivedAmount),
    ...activeSeeds.map((row) => row.waivedAmount),
    ...activePayments.map((row) => row.waivedAmount),
  ]);
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
    totalBilled: money(
      sum([
        ...activeGrading.map((row) => row.calculatedAmount),
        ...activeSeeds.map((row) => row.netAmount),
      ]),
    ),
    totalWaived: money(totalWaived),
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
      waived: money(sum(activeSeeds.map((row) => row.waivedAmount))),
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
      standaloneWaived: money(sum(activePayments.map((row) => row.waivedAmount))),
      totalCollected: money(sum(collections.map((row) => row.amount))),
      cash: money(sum(collections.filter((row) => row.method === 'CASH').map((row) => row.amount))),
      online: money(
        sum(collections.filter((row) => row.method === 'ONLINE').map((row) => row.amount)),
      ),
      unclassified: money(
        sum(collections.filter((row) => row.method === 'DUE').map((row) => row.amount)),
      ),
      unclassifiedRecords,
      reversedCount: payments.length - activePayments.length,
    },
    dues: {
      total: money(sum(dueRows.map((row) => row._sum?.amount ?? zero()))),
      customers: dueRows
        .map((row) => ({
          ...customers.find((customer) => customer.id === row.customerId)!,
          amount: money(row._sum?.amount ?? zero()),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount)),
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
