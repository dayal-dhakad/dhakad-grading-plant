import { Prisma, Role } from '@prisma/client';
import type { CreateStaffInput } from '@dhakad/shared';
import argon2 from 'argon2';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { StaffListQuery } from './staff.schemas.js';

const select = {
  id: true,
  mobile: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { gradingEntriesCreated: true } },
} satisfies Prisma.UserSelect;
const present = (user: Prisma.UserGetPayload<{ select: typeof select }>) => ({
  id: user.id,
  mobile: user.mobile,
  name: user.name,
  isActive: user.isActive,
  entryCount: user._count.gradingEntriesCreated,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});
const translate = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new AppError(
      409,
      'STAFF_MOBILE_EXISTS',
      'A user with this mobile number already exists',
      [{ path: 'mobile', message: 'This mobile number is already in use' }],
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
    throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member was not found');
  throw error;
};
export const listStaff = async (query: StaffListQuery) => {
  const where: Prisma.UserWhereInput = {
    role: Role.STAFF,
    ...(query.status === 'all' ? {} : { isActive: query.status === 'active' }),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { mobile: { contains: query.search } },
          ],
        }
      : {}),
  };
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    staff: users.map(present),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};
export const getStaff = async (id: string) => {
  const user = await prisma.user.findFirst({ where: { id, role: Role.STAFF }, select });
  if (!user) throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff member was not found');
  return present(user);
};
export const createStaff = async (input: CreateStaffInput) => {
  try {
    return present(
      await prisma.user.create({
        data: {
          mobile: input.mobile,
          name: input.name,
          passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
          role: Role.STAFF,
        },
        select,
      }),
    );
  } catch (error) {
    return translate(error);
  }
};
export const setStaffStatus = async (id: string, isActive: boolean) => {
  try {
    const user = await prisma.user.update({
      where: { id, role: Role.STAFF },
      data: {
        isActive,
        ...(!isActive
          ? {
              sessions: {
                updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } },
              },
            }
          : {}),
      },
      select,
    });
    return present(user);
  } catch (error) {
    return translate(error);
  }
};
