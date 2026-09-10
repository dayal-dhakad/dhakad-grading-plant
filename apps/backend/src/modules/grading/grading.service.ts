import { GradingStatus, LedgerEntryType, PaymentStatus, Prisma } from '@prisma/client';
import type { CreateGradingEntryInput, ReviseGradingEntryInput } from '@dhakad/shared';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { GradingListQuery } from './grading.schemas.js';

const include = {
  customer: { select: { id: true, name: true, mobile: true } },
  crop: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true, symbol: true } },
  createdBy: { select: { id: true, name: true } },
  paymentAllocations: {
    where: { payment: { status: PaymentStatus.ACTIVE } },
    select: { amount: true, waivedAmount: true },
  },
} satisfies Prisma.GradingEntryInclude;

const present = (entry: Prisma.GradingEntryGetPayload<{ include: typeof include }>) => {
  const allocated = entry.paymentAllocations.reduce(
    (sum, item) => sum.plus(item.amount).plus(item.waivedAmount),
    new Prisma.Decimal(0),
  );
  const totalPaid = entry.paidAmount.plus(allocated);
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    customer: entry.customer,
    createdBy: entry.createdBy,
    crop: entry.crop,
    unit: entry.unit,
    quantity: entry.quantity.toFixed(2),
    rate: entry.rate.toFixed(2),
    calculatedAmount: entry.calculatedAmount.toFixed(2),
    initialPaidAmount: entry.paidAmount.toFixed(2),
    paidAmount: totalPaid.toFixed(2),
    waivedAmount: entry.waivedAmount.toFixed(2),
    dueAmount: entry.calculatedAmount.minus(totalPaid).minus(entry.waivedAmount).toFixed(2),
    paymentMethod: entry.paymentMethod,
    serviceDate: entry.serviceDate.toISOString().slice(0, 10),
    notes: entry.notes,
    status: entry.status,
    cancellationReason: entry.cancellationReason,
    createdAt: entry.createdAt.toISOString(),
  };
};

const quantityInQuintals = (quantity: string, unit?: 'QUINTAL' | 'KG') =>
  unit === 'KG' ? new Prisma.Decimal(quantity).div(100) : new Prisma.Decimal(quantity);

export const calculateGradingAmount = (
  quantity: string,
  rate: Prisma.Decimal,
  unit?: 'QUINTAL' | 'KG',
) => quantityInQuintals(quantity, unit).mul(rate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export const SMALL_BALANCE_WAIVER_LIMIT = new Prisma.Decimal(10);
export const calculateSmallBalanceWaiver = (
  total: Prisma.Decimal,
  paid: Prisma.Decimal,
  requested: boolean,
) => {
  const remainder = total.minus(paid);
  if (!requested) return new Prisma.Decimal(0);
  if (remainder.lte(0) || remainder.gt(SMALL_BALANCE_WAIVER_LIMIT))
    throw new AppError(
      400,
      'SMALL_BALANCE_WAIVER_NOT_ALLOWED',
      `Only a remaining balance up to ₹${SMALL_BALANCE_WAIVER_LIMIT.toFixed(2)} can be waived`,
      [
        {
          path: 'waiveSmallBalance',
          message: 'The remaining balance must be between ₹0.01 and ₹10.00',
        },
      ],
    );
  return remainder;
};

export const getGradingReferences = async () => ({
  crops: (
    await prisma.crop.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { cleaningRateUnit: true },
    })
  ).map((crop) => ({
    id: crop.id,
    name: crop.name,
    rate: crop.cleaningRate.toFixed(2),
    unit: {
      id: crop.cleaningRateUnit.id,
      name: crop.cleaningRateUnit.name,
      symbol: crop.cleaningRateUnit.symbol,
    },
  })),
});

export const listGradingEntries = async (query: GradingListQuery, creatorId?: string) => {
  const where: Prisma.GradingEntryWhereInput = {
    ...(query.status === 'all'
      ? {}
      : { status: query.status === 'active' ? GradingStatus.ACTIVE : GradingStatus.CANCELLED }),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(creatorId
      ? { createdById: creatorId }
      : query.staffId
        ? { createdById: query.staffId }
        : {}),
    ...(query.search
      ? {
          OR: [
            { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            { customer: { mobile: { contains: query.search } } },
            { crop: { name: { contains: query.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [entries, total] = await prisma.$transaction([
    prisma.gradingEntry.findMany({
      where,
      include,
      orderBy: [{ serviceDate: 'desc' }, { entryNumber: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.gradingEntry.count({ where }),
  ]);
  return {
    gradingEntries: entries.map(present),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};

export const getGradingEntry = async (id: string, creatorId?: string) => {
  const entry = await prisma.gradingEntry.findFirst({
    where: { id, ...(creatorId ? { createdById: creatorId } : {}) },
    include,
  });
  if (!entry) throw new AppError(404, 'GRADING_NOT_FOUND', 'Grading entry was not found');
  return present(entry);
};

export const createGradingEntry = async (input: CreateGradingEntryInput, userId: string) => {
  const [customer, crop] = await Promise.all([
    prisma.customer.findFirst({ where: { id: input.customerId, isActive: true } }),
    prisma.crop.findFirst({
      where: { id: input.cropId, isActive: true },
      include: { cleaningRateUnit: true },
    }),
  ]);
  if (!customer)
    throw new AppError(400, 'CUSTOMER_UNAVAILABLE', 'Select an active customer', [
      { path: 'customerId', message: 'Customer is unavailable' },
    ]);
  if (!crop)
    throw new AppError(400, 'CROP_UNAVAILABLE', 'Select an active crop', [
      { path: 'cropId', message: 'Crop is unavailable' },
    ]);
  const quantity = quantityInQuintals(input.quantity, input.quantityUnit);
  const rate = input.rate ? new Prisma.Decimal(input.rate) : crop.cleaningRate;
  const calculatedAmount = calculateGradingAmount(input.quantity, rate, input.quantityUnit);
  const paidAmount = new Prisma.Decimal(input.paidAmount);
  if (paidAmount.gt(calculatedAmount))
    throw new AppError(
      400,
      'PAYMENT_EXCEEDS_TOTAL',
      'Amount paid cannot exceed the calculated total',
      [{ path: 'paidAmount', message: `Enter an amount up to ${calculatedAmount.toFixed(2)}` }],
    );
  const waivedAmount = calculateSmallBalanceWaiver(
    calculatedAmount,
    paidAmount,
    input.waiveSmallBalance,
  );
  const entry = await prisma.$transaction(async (transaction) => {
    const created = await transaction.gradingEntry.create({
      data: {
        customerId: customer.id,
        cropId: crop.id,
        unitId: crop.cleaningRateUnitId,
        quantity,
        rate,
        calculatedAmount,
        paidAmount,
        waivedAmount,
        paymentMethod: input.paymentMethod,
        serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`),
        notes: input.notes || null,
        createdById: userId,
      },
      include,
    });
    await transaction.customerLedgerEntry.create({
      data: {
        customerId: customer.id,
        entryType: LedgerEntryType.GRADING_CHARGE,
        amount: calculatedAmount,
        gradingEntryId: created.id,
        description: `Grading charge GR-${String(created.entryNumber).padStart(6, '0')}`,
        createdById: userId,
      },
    });
    if (paidAmount.gt(0))
      await transaction.customerLedgerEntry.create({
        data: {
          customerId: customer.id,
          entryType: LedgerEntryType.GRADING_PAYMENT,
          amount: paidAmount.negated(),
          gradingEntryId: created.id,
          description: 'Payment recorded with grading entry',
          createdById: userId,
        },
      });
    if (waivedAmount.gt(0))
      await transaction.customerLedgerEntry.create({
        data: {
          customerId: customer.id,
          entryType: LedgerEntryType.SMALL_BALANCE_WAIVER,
          amount: waivedAmount.negated(),
          gradingEntryId: created.id,
          description: `Small-balance waiver for GR-${String(created.entryNumber).padStart(6, '0')}`,
          createdById: userId,
        },
      });
    return created;
  });
  return present(entry);
};

export const cancelGradingEntry = async (
  id: string,
  reason: string,
  userId: string,
  enforceOwner = false,
) => {
  return prisma.$transaction(
    async (transaction) => {
      const current = await transaction.gradingEntry.findFirst({
        where: { id, ...(enforceOwner ? { createdById: userId } : {}) },
        include: { paymentAllocations: { where: { payment: { status: PaymentStatus.ACTIVE } } } },
      });
      if (!current)
        throw new AppError(
          404,
          'GRADING_NOT_EDITABLE',
          'This entry is not available in your entries',
        );
      if (current.status === GradingStatus.CANCELLED)
        throw new AppError(409, 'GRADING_ALREADY_CANCELLED', 'Grading entry is already cancelled');
      if (current.paymentAllocations.length)
        throw new AppError(
          409,
          'GRADING_HAS_ALLOCATED_PAYMENTS',
          'Reverse allocated customer payments before cancelling this entry',
        );
      const updated = await transaction.gradingEntry.update({
        where: { id },
        data: {
          status: GradingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: userId,
          cancellationReason: reason,
        },
        include,
      });
      const net = current.calculatedAmount.minus(current.paidAmount).minus(current.waivedAmount);
      if (!net.isZero())
        await transaction.customerLedgerEntry.create({
          data: {
            customerId: current.customerId,
            entryType: LedgerEntryType.GRADING_REVERSAL,
            amount: net.negated(),
            gradingEntryId: id,
            description: `Grading cancellation: ${reason}`,
            createdById: userId,
          },
        });
      return present(updated);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

const snapshot = (entry: {
  customerId: string;
  cropId: string;
  unitId: string;
  quantity: Prisma.Decimal;
  rate: Prisma.Decimal;
  calculatedAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  waivedAmount: Prisma.Decimal;
  paymentMethod: string;
  serviceDate: Date;
  notes: string | null;
}) => ({
  customerId: entry.customerId,
  cropId: entry.cropId,
  unitId: entry.unitId,
  quantity: entry.quantity.toFixed(2),
  rate: entry.rate.toFixed(2),
  calculatedAmount: entry.calculatedAmount.toFixed(2),
  paidAmount: entry.paidAmount.toFixed(2),
  waivedAmount: entry.waivedAmount.toFixed(2),
  paymentMethod: entry.paymentMethod,
  serviceDate: entry.serviceDate.toISOString().slice(0, 10),
  notes: entry.notes,
});

export const reviseGradingEntry = async (
  id: string,
  input: ReviseGradingEntryInput,
  userId: string,
) =>
  prisma.$transaction(
    async (transaction) => {
      const current = await transaction.gradingEntry.findFirst({
        where: { id, createdById: userId, status: GradingStatus.ACTIVE },
        include: { crop: true },
      });
      if (!current)
        throw new AppError(
          404,
          'GRADING_NOT_EDITABLE',
          'This active grading entry was not found in your entries',
        );
      const customer = await transaction.customer.findFirst({
        where: {
          id: input.customerId,
          ...(input.customerId === current.customerId ? {} : { isActive: true }),
        },
      });
      if (!customer)
        throw new AppError(400, 'CUSTOMER_UNAVAILABLE', 'Select an active customer', [
          { path: 'customerId', message: 'Customer is unavailable' },
        ]);
      const crop =
        input.cropId === current.cropId
          ? null
          : await transaction.crop.findFirst({ where: { id: input.cropId, isActive: true } });
      if (input.cropId !== current.cropId && !crop)
        throw new AppError(400, 'CROP_UNAVAILABLE', 'Select an active crop', [
          { path: 'cropId', message: 'Crop is unavailable' },
        ]);
      const rate = input.rate
        ? new Prisma.Decimal(input.rate)
        : (crop?.cleaningRate ?? current.rate);
      const unitId = crop?.cleaningRateUnitId ?? current.unitId;
      const quantity = quantityInQuintals(input.quantity, input.quantityUnit);
      const calculatedAmount = calculateGradingAmount(input.quantity, rate, input.quantityUnit);
      const paidAmount = new Prisma.Decimal(input.paidAmount);
      if (paidAmount.gt(calculatedAmount))
        throw new AppError(
          400,
          'PAYMENT_EXCEEDS_TOTAL',
          'Amount paid cannot exceed the calculated total',
          [{ path: 'paidAmount', message: `Enter an amount up to ${calculatedAmount.toFixed(2)}` }],
        );
      const waivedAmount = calculateSmallBalanceWaiver(
        calculatedAmount,
        paidAmount,
        input.waiveSmallBalance,
      );
      const next = {
        customerId: input.customerId,
        cropId: input.cropId,
        unitId,
        quantity,
        rate,
        calculatedAmount,
        paidAmount,
        waivedAmount,
        paymentMethod: input.paymentMethod,
        serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`),
        notes: input.notes || null,
      };
      const revisionNumber =
        (await transaction.gradingEntryRevision.count({ where: { gradingEntryId: id } })) + 1;
      await transaction.gradingEntryRevision.create({
        data: {
          gradingEntryId: id,
          revisionNumber,
          reason: input.reason,
          before: snapshot(current),
          after: snapshot(next),
          revisedById: userId,
        },
      });
      const oldNet = current.calculatedAmount.minus(current.paidAmount).minus(current.waivedAmount);
      const newNet = calculatedAmount.minus(paidAmount).minus(waivedAmount);
      if (current.customerId === input.customerId) {
        const delta = newNet.minus(oldNet);
        if (!delta.isZero())
          await transaction.customerLedgerEntry.create({
            data: {
              customerId: current.customerId,
              entryType: LedgerEntryType.GRADING_ADJUSTMENT,
              amount: delta,
              gradingEntryId: id,
              description: `Entry revision ${revisionNumber}: ${input.reason}`,
              createdById: userId,
            },
          });
      } else {
        if (!oldNet.isZero())
          await transaction.customerLedgerEntry.create({
            data: {
              customerId: current.customerId,
              entryType: LedgerEntryType.GRADING_ADJUSTMENT,
              amount: oldNet.negated(),
              gradingEntryId: id,
              description: `Entry moved to another customer: ${input.reason}`,
              createdById: userId,
            },
          });
        if (!newNet.isZero())
          await transaction.customerLedgerEntry.create({
            data: {
              customerId: input.customerId,
              entryType: LedgerEntryType.GRADING_ADJUSTMENT,
              amount: newNet,
              gradingEntryId: id,
              description: `Entry moved from another customer: ${input.reason}`,
              createdById: userId,
            },
          });
      }
      return present(await transaction.gradingEntry.update({ where: { id }, data: next, include }));
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

export const listGradingRevisions = async (id: string, userId: string, isAdmin: boolean) => {
  const entry = await prisma.gradingEntry.findFirst({
    where: { id, ...(isAdmin ? {} : { createdById: userId }) },
  });
  if (!entry) throw new AppError(404, 'GRADING_NOT_FOUND', 'Grading entry was not found');
  return (
    await prisma.gradingEntryRevision.findMany({
      where: { gradingEntryId: id },
      include: { revisedBy: { select: { id: true, name: true } } },
      orderBy: { revisionNumber: 'desc' },
    })
  ).map((revision) => ({
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    reason: revision.reason,
    before: revision.before,
    after: revision.after,
    revisedBy: revision.revisedBy,
    createdAt: revision.createdAt.toISOString(),
  }));
};
