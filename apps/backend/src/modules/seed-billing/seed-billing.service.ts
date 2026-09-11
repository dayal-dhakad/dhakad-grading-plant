import {
  LedgerEntryType,
  Prisma,
  SeedBillStatus,
  SeedQuantityUnit,
  SeedStockMovementType,
} from '@prisma/client';
import type { CreateSeedBillInput } from '@dhakad/shared';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { SeedBillListQuery } from './seed-billing.schemas.js';

const include = {
  customer: { select: { id: true, name: true, mobile: true } },
  createdBy: { select: { id: true, name: true } },
  items: { include: { product: { select: { id: true, name: true } } } },
} satisfies Prisma.SeedBillInclude;
type Full = Prisma.SeedBillGetPayload<{ include: typeof include }>;
const present = (b: Full) => ({
  id: b.id,
  billNumber: b.billNumber,
  customer: b.customer,
  grossAmount: b.grossAmount.toFixed(2),
  discountAmount: b.discountAmount.toFixed(2),
  netAmount: b.netAmount.toFixed(2),
  paidAmount: b.paidAmount.toFixed(2),
  dueAmount:
    b.status === 'CANCELLED'
      ? '0.00'
      : b.netAmount.minus(b.paidAmount).minus(b.waivedAmount).toFixed(2),
  waivedAmount: b.waivedAmount.toFixed(2),
  paymentMethod: b.paymentMethod,
  status: b.status,
  serviceDate: b.serviceDate.toISOString().slice(0, 10),
  notes: b.notes,
  createdBy: b.createdBy,
  cancellationReason: b.cancellationReason,
  createdAt: b.createdAt.toISOString(),
  items: b.items.map((i) => ({
    id: i.id,
    product: i.product,
    enteredQuantity: i.enteredQuantity.toFixed(5).replace(/\.?0+$/, ''),
    enteredUnit: i.enteredUnit,
    quantityGrams: i.quantityGrams.toString(),
    ratePerKg: i.ratePerKg.toFixed(2),
    discountType: i.discountType,
    discountValue: i.discountValue.toFixed(2),
    grossAmount: i.grossAmount.toFixed(2),
    discountAmount: i.discountAmount.toFixed(2),
    netAmount: i.netAmount.toFixed(2),
  })),
});
const grams = (q: string, u: SeedQuantityUnit) => {
  const d = new Prisma.Decimal(q).mul(u === 'GRAM' ? 1 : u === 'KILOGRAM' ? 1000 : 100000);
  if (!d.isInteger() || d.lte(0))
    throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must resolve to whole grams');
  return BigInt(d.toFixed(0));
};

export const createSeedBill = async (input: CreateSeedBillInput, userId: string) =>
  prisma.$transaction(
    async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, isActive: true },
      });
      if (!customer) throw new AppError(400, 'CUSTOMER_UNAVAILABLE', 'Select an active customer');
      const ids = [...new Set(input.items.map((i) => i.productId))];
      if (ids.length !== input.items.length)
        throw new AppError(400, 'DUPLICATE_SEED', 'Add each seed only once');
      const products = await tx.product.findMany({ where: { id: { in: ids }, isActive: true } });
      if (products.length !== ids.length)
        throw new AppError(400, 'SEED_UNAVAILABLE', 'One or more seeds are unavailable');
      const sums = await tx.seedStockMovement.groupBy({
        by: ['productId'],
        where: { productId: { in: ids } },
        _sum: { quantityGrams: true },
      });
      const stock = new Map(sums.map((s) => [s.productId, s._sum.quantityGrams ?? 0n]));
      const lines = input.items.map((raw) => {
        const p = products.find((x) => x.id === raw.productId)!;
        const qg = grams(raw.quantity, raw.unit);
        if ((stock.get(p.id) ?? 0n) < qg)
          throw new AppError(400, 'INSUFFICIENT_STOCK', `Insufficient stock for ${p.name}`);
        const rate = new Prisma.Decimal(raw.ratePerKg);
        const gross = new Prisma.Decimal(qg.toString()).div(1000).mul(rate).toDecimalPlaces(2);
        const dv = new Prisma.Decimal(raw.discountValue);
        const discount =
          raw.discountType === 'NONE'
            ? new Prisma.Decimal(0)
            : raw.discountType === 'PERCENTAGE'
              ? gross.mul(dv).div(100).toDecimalPlaces(2)
              : dv;
        if (dv.lt(0) || (raw.discountType === 'PERCENTAGE' && dv.gt(100)) || discount.gt(gross))
          throw new AppError(400, 'INVALID_DISCOUNT', `Invalid discount for ${p.name}`);
        return { raw, qg, rate, gross, discount, net: gross.minus(discount) };
      });
      const gross = lines.reduce((s, l) => s.plus(l.gross), new Prisma.Decimal(0)),
        discount = lines.reduce((s, l) => s.plus(l.discount), new Prisma.Decimal(0)),
        net = gross.minus(discount),
        paid = new Prisma.Decimal(input.paidAmount);
      if (paid.gt(net))
        throw new AppError(400, 'PAYMENT_EXCEEDS_TOTAL', 'Payment cannot exceed bill total');
      const remainder = net.minus(paid);
      const waived = input.waiveSmallBalance && remainder.gt(0) ? remainder : new Prisma.Decimal(0);
      const bill = await tx.seedBill.create({
        data: {
          customerId: input.customerId,
          grossAmount: gross,
          discountAmount: discount,
          netAmount: net,
          paidAmount: paid,
          waivedAmount: waived,
          paymentMethod: input.paymentMethod,
          serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`),
          notes: input.notes ?? null,
          createdById: userId,
        },
        include,
      });
      for (const l of lines) {
        const item = await tx.seedBillItem.create({
          data: {
            seedBillId: bill.id,
            productId: l.raw.productId,
            enteredQuantity: new Prisma.Decimal(l.raw.quantity),
            enteredUnit: l.raw.unit,
            quantityGrams: l.qg,
            ratePerKg: l.rate,
            discountType: l.raw.discountType,
            discountValue: new Prisma.Decimal(l.raw.discountValue),
            grossAmount: l.gross,
            discountAmount: l.discount,
            netAmount: l.net,
          },
        });
        await tx.seedStockMovement.create({
          data: {
            productId: l.raw.productId,
            movementType: SeedStockMovementType.SALE,
            quantityGrams: -l.qg,
            enteredQuantity: new Prisma.Decimal(l.raw.quantity),
            enteredUnit: l.raw.unit,
            reason: `Seed sale SEED-${String(bill.billNumber).padStart(6, '0')}`,
            createdById: userId,
            seedBillItemId: item.id,
          },
        });
      }
      await tx.customerLedgerEntry.create({
        data: {
          customerId: input.customerId,
          entryType: LedgerEntryType.SEED_SALE_CHARGE,
          amount: net,
          seedBillId: bill.id,
          description: `Seed bill SEED-${String(bill.billNumber).padStart(6, '0')}`,
          createdById: userId,
        },
      });
      if (paid.gt(0))
        await tx.customerLedgerEntry.create({
          data: {
            customerId: input.customerId,
            entryType: LedgerEntryType.SEED_SALE_PAYMENT,
            amount: paid.negated(),
            seedBillId: bill.id,
            description: 'Payment recorded with seed bill',
            createdById: userId,
          },
        });
      if (waived.gt(0))
        await tx.customerLedgerEntry.create({
          data: {
            customerId: input.customerId,
            entryType: LedgerEntryType.SMALL_BALANCE_WAIVER,
            amount: waived.negated(),
            seedBillId: bill.id,
            description: 'Small-balance waiver with seed bill',
            createdById: userId,
          },
        });
      return present(await tx.seedBill.findUniqueOrThrow({ where: { id: bill.id }, include }));
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

export const listSeedBills = async (q: SeedBillListQuery, staffId?: string) => {
  const where: Prisma.SeedBillWhereInput = {
    ...(staffId ? { createdById: staffId } : {}),
    ...(q.status === 'all'
      ? {}
      : { status: q.status === 'active' ? SeedBillStatus.ACTIVE : SeedBillStatus.CANCELLED }),
    ...(q.search
      ? {
          OR: [
            { customer: { name: { contains: q.search, mode: 'insensitive' } } },
            { customer: { mobile: { contains: q.search } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.seedBill.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.seedBill.count({ where }),
  ]);
  return {
    bills: rows.map(present),
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.ceil(total / q.pageSize),
    },
  };
};
export const cancelSeedBill = async (
  id: string,
  reason: string,
  userId: string,
  isStaff: boolean,
) =>
  prisma.$transaction(
    async (tx) => {
      const bill = await tx.seedBill.findFirst({
        where: { id, status: SeedBillStatus.ACTIVE, ...(isStaff ? { createdById: userId } : {}) },
        include,
      });
      if (!bill) throw new AppError(404, 'SEED_BILL_NOT_FOUND', 'Active seed bill was not found');
      for (const i of bill.items)
        await tx.seedStockMovement.create({
          data: {
            productId: i.productId,
            movementType: SeedStockMovementType.SALE_REVERSAL,
            quantityGrams: i.quantityGrams,
            enteredQuantity: i.enteredQuantity,
            enteredUnit: i.enteredUnit,
            reason: `Bill cancellation: ${reason}`,
            createdById: userId,
            seedBillItemId: i.id,
          },
        });
      const net = bill.netAmount.minus(bill.paidAmount).minus(bill.waivedAmount);
      if (!net.isZero())
        await tx.customerLedgerEntry.create({
          data: {
            customerId: bill.customerId,
            entryType: LedgerEntryType.SEED_SALE_REVERSAL,
            amount: net.negated(),
            seedBillId: bill.id,
            description: `Seed bill cancellation: ${reason}`,
            createdById: userId,
          },
        });
      return present(
        await tx.seedBill.update({
          where: { id },
          data: {
            status: SeedBillStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledById: userId,
            cancellationReason: reason,
          },
          include,
        }),
      );
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
