import { Prisma } from '@prisma/client';
import type { CreateCustomerInput, UpdateCustomerInput } from '@dhakad/shared';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { CustomerExportQuery, CustomerListQuery } from './customer.schemas.js';

const customerConflict = () =>
  new AppError(409, 'CUSTOMER_MOBILE_EXISTS', 'A customer with this mobile number already exists', [
    { path: 'mobile', message: 'This mobile number is already in use' },
  ]);

const translatePrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw customerConflict();
    if (error.code === 'P2025')
      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found');
  }
  throw error;
};

const customerWhere = (query: CustomerExportQuery): Prisma.CustomerWhereInput => {
  const search = query.search?.trim();
  return {
    ...(query.status === 'all' ? {} : { isActive: query.status === 'active' }),
    ...(search
      ? {
          OR: [
            { mobile: { contains: search } },
            { name: { contains: search, mode: 'insensitive' } },
            { village: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
};

type CustomerFinancialTotals = {
  totalAmount: string;
  totalPaid: string;
  totalWaived: string;
  totalDue: string;
};

export const getCustomerFinancialTotals = async (
  customerIds: string[],
  client: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  if (!customerIds.length) return new Map<string, CustomerFinancialTotals>();
  const customerFilter = { customerId: { in: customerIds } };
  const [balances, grading, seeds, payments] = await Promise.all([
    client.customerLedgerEntry.groupBy({
      by: ['customerId'],
      where: customerFilter,
      _sum: { amount: true },
    }),
    client.gradingEntry.groupBy({
      by: ['customerId'],
      where: { ...customerFilter, status: 'ACTIVE' },
      _sum: { calculatedAmount: true, paidAmount: true, waivedAmount: true },
    }),
    client.seedBill.groupBy({
      by: ['customerId'],
      where: { ...customerFilter, status: 'ACTIVE' },
      _sum: { netAmount: true, paidAmount: true, waivedAmount: true },
    }),
    client.customerPayment.groupBy({
      by: ['customerId'],
      where: { ...customerFilter, status: 'ACTIVE' },
      _sum: { amount: true, waivedAmount: true },
    }),
  ]);
  const zero = new Prisma.Decimal(0);
  const balanceByCustomer = new Map(
    balances.map(({ customerId, _sum }) => [customerId, _sum.amount ?? zero]),
  );
  const gradingByCustomer = new Map(grading.map((row) => [row.customerId, row._sum]));
  const seedsByCustomer = new Map(seeds.map((row) => [row.customerId, row._sum]));
  const paymentsByCustomer = new Map(payments.map((row) => [row.customerId, row._sum]));
  return new Map(
    customerIds.map((customerId) => {
      const gradingTotals = gradingByCustomer.get(customerId);
      const seedTotals = seedsByCustomer.get(customerId);
      const paymentTotals = paymentsByCustomer.get(customerId);
      return [
        customerId,
        {
          totalAmount: (gradingTotals?.calculatedAmount ?? zero)
            .plus(seedTotals?.netAmount ?? zero)
            .toFixed(2),
          totalPaid: (gradingTotals?.paidAmount ?? zero)
            .plus(seedTotals?.paidAmount ?? zero)
            .plus(paymentTotals?.amount ?? zero)
            .toFixed(2),
          totalWaived: (gradingTotals?.waivedAmount ?? zero)
            .plus(seedTotals?.waivedAmount ?? zero)
            .plus(paymentTotals?.waivedAmount ?? zero)
            .toFixed(2),
          totalDue: Prisma.Decimal.max(zero, balanceByCustomer.get(customerId) ?? zero).toFixed(2),
        },
      ];
    }),
  );
};

export const listCustomers = async (query: CustomerListQuery) => {
  const where = customerWhere(query);
  const { customers, total } = await prisma.$transaction(async (transaction) => {
    const [pageCustomers, customerCount] = await Promise.all([
      transaction.customer.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      transaction.customer.count({ where }),
    ]);
    const totals = await getCustomerFinancialTotals(
      pageCustomers.map(({ id }) => id),
      transaction,
    );
    return {
      customers: pageCustomers.map((customer) => ({
        ...customer,
        ...totals.get(customer.id)!,
      })),
      total: customerCount,
    };
  });
  return {
    customers,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};

export const exportCustomers = async (query: CustomerExportQuery) => {
  const where = customerWhere(query);
  return prisma.$transaction(async (transaction) => {
    const customers = await transaction.customer.findMany({
      where,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    });
    const totals = await getCustomerFinancialTotals(
      customers.map(({ id }) => id),
      transaction,
    );
    return {
      customers: customers.map((customer) => ({
        ...customer,
        ...totals.get(customer.id)!,
      })),
    };
  });
};

export const getCustomer = async (id: string) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found');
  return customer;
};

export const createCustomer = async (input: CreateCustomerInput) => {
  try {
    return await prisma.customer.create({
      data: {
        mobile: input.mobile,
        name: input.name,
        village: input.village,
        address: input.address || null,
        ...(input.smsConsent !== undefined ? { smsConsent: input.smsConsent } : {}),
        ...(input.whatsappConsent !== undefined ? { whatsappConsent: input.whatsappConsent } : {}),
      },
    });
  } catch (error) {
    return translatePrismaError(error);
  }
};

export const updateCustomer = async (id: string, input: UpdateCustomerInput) => {
  const data: Prisma.CustomerUpdateInput = {};
  if (input.mobile !== undefined) data.mobile = input.mobile;
  if (input.name !== undefined) data.name = input.name;
  if (input.village !== undefined) data.village = input.village;
  if (input.address !== undefined) data.address = input.address || null;
  if (input.smsConsent !== undefined) data.smsConsent = input.smsConsent;
  if (input.whatsappConsent !== undefined) data.whatsappConsent = input.whatsappConsent;
  try {
    return await prisma.customer.update({
      where: { id },
      data,
    });
  } catch (error) {
    return translatePrismaError(error);
  }
};

export const setCustomerStatus = async (id: string, isActive: boolean) => {
  try {
    return await prisma.customer.update({ where: { id }, data: { isActive } });
  } catch (error) {
    return translatePrismaError(error);
  }
};

export const getCustomerGradingDue = async (id: string) => {
  await getCustomer(id);
  const totals = await prisma.customerLedgerEntry.aggregate({
    where: { customerId: id },
    _sum: { amount: true },
  });
  return (totals._sum.amount ?? new Prisma.Decimal(0)).toFixed(2);
};

export const getCustomerDues = async (id: string) => {
  await getCustomer(id);
  const [ledger, gradingEntries, seedBills] = await prisma.$transaction([
    prisma.customerLedgerEntry.aggregate({
      where: { customerId: id },
      _sum: { amount: true },
    }),
    prisma.gradingEntry.findMany({
      where: { customerId: id, status: 'ACTIVE' },
      select: {
        calculatedAmount: true,
        paidAmount: true,
        waivedAmount: true,
        paymentAllocations: {
          where: { payment: { status: 'ACTIVE' } },
          select: { amount: true, waivedAmount: true },
        },
      },
    }),
    prisma.seedBill.findMany({
      where: { customerId: id, status: 'ACTIVE' },
      select: { netAmount: true, paidAmount: true, waivedAmount: true },
    }),
  ]);
  const zero = new Prisma.Decimal(0);
  const totalDue = Prisma.Decimal.max(zero, ledger._sum.amount ?? zero);
  const rawGradingDue = Prisma.Decimal.max(
    zero,
    gradingEntries.reduce(
      (sum, entry) =>
        sum
          .plus(entry.calculatedAmount)
          .minus(entry.paidAmount)
          .minus(entry.waivedAmount)
          .minus(
            entry.paymentAllocations.reduce(
              (allocated, item) => allocated.plus(item.amount).plus(item.waivedAmount),
              new Prisma.Decimal(0),
            ),
          ),
      new Prisma.Decimal(0),
    ),
  );
  const rawSeedDue = Prisma.Decimal.max(
    zero,
    seedBills.reduce(
      (sum, bill) => sum.plus(bill.netAmount).minus(bill.paidAmount).minus(bill.waivedAmount),
      new Prisma.Decimal(0),
    ),
  );
  const unattributedReduction = Prisma.Decimal.max(
    zero,
    rawGradingDue.plus(rawSeedDue).minus(totalDue),
  );
  const gradingDue = Prisma.Decimal.max(zero, rawGradingDue.minus(unattributedReduction));
  const seedDue = Prisma.Decimal.max(zero, totalDue.minus(gradingDue));
  return {
    totalDue: totalDue.toFixed(2),
    gradingDue: gradingDue.toFixed(2),
    seedDue: seedDue.toFixed(2),
  };
};
