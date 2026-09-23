import { Prisma } from '@prisma/client';
import type { CreateCropSettingInput, UpdateCropSettingInput } from '@dhakad/shared';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import { createHash } from 'node:crypto';
const include = { cleaningRateUnit: true } satisfies Prisma.CropInclude;
const present = (crop: Prisma.CropGetPayload<{ include: typeof include }>) => ({
  id: crop.id,
  code: crop.code,
  name: crop.name,
  cleaningRate: crop.cleaningRate.toFixed(2),
  unit: {
    id: crop.cleaningRateUnit.id,
    name: crop.cleaningRateUnit.name,
    symbol: crop.cleaningRateUnit.symbol,
  },
  isActive: crop.isActive,
  createdAt: crop.createdAt.toISOString(),
  updatedAt: crop.updatedAt.toISOString(),
});
const conflict = () =>
  new AppError(409, 'CROP_EXISTS', 'A crop with this name already exists', [
    { path: 'name', message: 'This crop already exists' },
  ]);
const translate = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw conflict();
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
    throw new AppError(404, 'CROP_NOT_FOUND', 'Crop was not found');
  throw error;
};
export const makeCropCode = (name: string) => {
  const readable = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 30);
  return (
    readable ||
    `CROP_${createHash('sha256').update(name.normalize('NFC')).digest('hex').slice(0, 16).toUpperCase()}`
  );
};
export const listCropSettings = async () => {
  const [crops, units] = await Promise.all([
    prisma.crop.findMany({ include, orderBy: { name: 'asc' } }),
    prisma.unit.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ]);
  return {
    crops: crops.map(present),
    units: units.map(({ id, name, symbol }) => ({ id, name, symbol })),
  };
};
export const createCropSetting = async (input: CreateCropSettingInput) => {
  const code = makeCropCode(input.name);
  try {
    return present(
      await prisma.crop.create({
        data: {
          code,
          name: input.name,
          cleaningRate: new Prisma.Decimal(input.cleaningRate),
          cleaningRateUnitId: input.unitId,
        },
        include,
      }),
    );
  } catch (error) {
    return translate(error);
  }
};
export const updateCropSetting = async (id: string, input: UpdateCropSettingInput) => {
  try {
    return present(
      await prisma.crop.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.cleaningRate !== undefined
            ? { cleaningRate: new Prisma.Decimal(input.cleaningRate) }
            : {}),
        },
        include,
      }),
    );
  } catch (error) {
    return translate(error);
  }
};
export const setCropStatus = async (id: string, isActive: boolean) => {
  try {
    return present(await prisma.crop.update({ where: { id }, data: { isActive }, include }));
  } catch (error) {
    return translate(error);
  }
};
