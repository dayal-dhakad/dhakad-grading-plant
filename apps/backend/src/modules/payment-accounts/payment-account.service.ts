import type { CreatePaymentAccountInput, UpdatePaymentAccountInput } from '@dhakad/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { PaymentAccountListQuery } from './payment-account.schemas.js';

const present = (account: {
  id: string;
  name: string;
  accountHolderName: string;
  upiId: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: account.id,
  name: account.name,
  accountHolderName: account.accountHolderName,
  upiId: account.upiId,
  isDefault: account.isDefault,
  isActive: account.isActive,
  createdAt: account.createdAt.toISOString(),
  updatedAt: account.updatedAt.toISOString(),
});

export const listPaymentAccounts = async (query: PaymentAccountListQuery) => ({
  accounts: (
    await prisma.paymentAccount.findMany({
      where: query.status === 'all' ? {} : { isActive: query.status === 'active' },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  ).map(present),
});

const save = async (
  id: string | undefined,
  input: CreatePaymentAccountInput | UpdatePaymentAccountInput,
  userId: string,
) =>
  prisma.$transaction(
    async (tx) => {
      if (input.isDefault) await tx.paymentAccount.updateMany({ data: { isDefault: false } });
      try {
        const account = id
          ? await tx.paymentAccount.update({ where: { id }, data: input })
          : await tx.paymentAccount.create({ data: { ...input, createdById: userId } });
        return present(account);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
          throw new AppError(409, 'UPI_ID_EXISTS', 'That UPI ID is already configured', [
            { path: 'upiId', message: 'UPI ID already exists' },
          ]);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
          throw new AppError(404, 'PAYMENT_ACCOUNT_NOT_FOUND', 'Payment account was not found');
        throw error;
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

export const createPaymentAccount = (input: CreatePaymentAccountInput, userId: string) =>
  save(undefined, input, userId);
export const updatePaymentAccount = (
  id: string,
  input: UpdatePaymentAccountInput,
  userId: string,
) => save(id, input, userId);

export const setPaymentAccountStatus = async (id: string, isActive: boolean) => {
  const existing = await prisma.paymentAccount.findUnique({ where: { id } });
  if (!existing)
    throw new AppError(404, 'PAYMENT_ACCOUNT_NOT_FOUND', 'Payment account was not found');
  if (!isActive && existing.isDefault)
    throw new AppError(
      400,
      'DEFAULT_ACCOUNT_REQUIRED',
      'Choose another default account before deactivating this one',
    );
  return present(await prisma.paymentAccount.update({ where: { id }, data: { isActive } }));
};

export const createPaymentQrPayload = async (
  id: string,
  amountInput: string,
  reference?: string,
) => {
  const account = await prisma.paymentAccount.findFirst({ where: { id, isActive: true } });
  if (!account)
    throw new AppError(404, 'PAYMENT_ACCOUNT_UNAVAILABLE', 'Active payment account was not found');
  const amount = new Prisma.Decimal(amountInput).toFixed(2);
  const params = new URLSearchParams({
    pa: account.upiId,
    pn: account.accountHolderName,
    am: amount,
    cu: 'INR',
  });
  if (reference) params.set('tn', reference);
  return { account: present(account), amount, upiUri: `upi://pay?${params.toString()}` };
};
