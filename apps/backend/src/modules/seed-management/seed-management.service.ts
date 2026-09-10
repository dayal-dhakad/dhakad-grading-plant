import { Prisma, SeedDiscountType, SeedQuantityUnit, SeedStockMovementType } from '@prisma/client';
import type {
  AddSeedStockInput,
  CreateSeedProductInput,
  UpdateSeedProductInput,
} from '@dhakad/shared';
import { prisma } from '../../shared/database/prisma.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { SeedListQuery, SeedMovementListQuery } from './seed-management.schemas.js';

const productInclude = { category: true } satisfies Prisma.ProductInclude;
type ProductWithCategory = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const toGrams = (quantity: string, unit: SeedQuantityUnit) => {
  const value = new Prisma.Decimal(quantity);
  const multiplier =
    unit === SeedQuantityUnit.GRAM ? 1 : unit === SeedQuantityUnit.KILOGRAM ? 1000 : 100000;
  const grams = value.mul(multiplier);
  if (!grams.isInteger() || grams.lte(0))
    throw new AppError(400, 'INVALID_SEED_QUANTITY', 'Quantity must resolve to whole grams', [
      { path: 'quantity', message: 'Enter at least one whole gram' },
    ]);
  return BigInt(grams.toFixed(0));
};

const present = (product: ProductWithCategory, stockGrams: bigint) => ({
  id: product.id,
  code: product.code,
  name: product.name,
  category: {
    id: product.category.id,
    code: product.category.code,
    name: product.category.name,
    isActive: product.category.isActive,
  },
  sellingRatePerKg: product.sellingRatePerKg.toFixed(2),
  discountType: product.discountType,
  discountValue: product.discountValue.toFixed(2),
  lowStockGrams: product.lowStockGrams.toString(),
  stockGrams: stockGrams.toString(),
  isLowStock: stockGrams <= product.lowStockGrams,
  isActive: product.isActive,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
});

const categories = () =>
  prisma.productCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

const balancesFor = async (
  productIds: string[],
  transaction: Prisma.TransactionClient = prisma,
) => {
  if (!productIds.length) return new Map<string, bigint>();
  const rows = await transaction.seedStockMovement.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _sum: { quantityGrams: true },
  });
  return new Map(rows.map((row) => [row.productId, row._sum.quantityGrams ?? 0n]));
};

export const listSeedProducts = async (query: SeedListQuery) => {
  const search = query.search?.trim();
  const where: Prisma.ProductWhereInput = {
    ...(query.status === 'all' ? {} : { isActive: query.status === 'active' }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [products, total, categoryRows] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.product.count({ where }),
    categories(),
  ]);
  const balances = await balancesFor(products.map(({ id }) => id));
  return {
    products: products.map((product) => present(product, balances.get(product.id) ?? 0n)),
    categories: categoryRows.map(({ id, code, name, isActive }) => ({ id, code, name, isActive })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
};

export const createSeedCategory = async (name: string) => {
  const codeBase = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 20);
  const code = codeBase || `SEED_${Date.now()}`;
  try {
    const category = await prisma.productCategory.create({ data: { name, code } });
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      isActive: category.isActive,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new AppError(409, 'SEED_TYPE_EXISTS', 'This seed type already exists');
    throw error;
  }
};

const productData = (input: CreateSeedProductInput, categoryId: string) => ({
  name: input.name,
  code: input.code || null,
  categoryId,
  sellingRatePerKg: new Prisma.Decimal(input.sellingRatePerKg),
  discountType: input.discountType,
  discountValue: new Prisma.Decimal(input.discountValue),
  lowStockGrams: 0n,
});

export const createSeedProduct = async (input: CreateSeedProductInput, userId: string) => {
  try {
    const initialStock: { quantity: string; unit: SeedQuantityUnit } | undefined =
      input.initialStockQuantity && input.initialStockUnit
        ? { quantity: input.initialStockQuantity, unit: input.initialStockUnit }
        : undefined;
    const product = await prisma.$transaction(async (transaction) => {
      const category = await transaction.productCategory.findUnique({ where: { code: 'SEED' } });
      if (!category)
        throw new AppError(500, 'SEED_TYPE_MISSING', 'The Seeds product type is not configured');
      const created = await transaction.product.create({
        data: productData(input, category.id),
        include: productInclude,
      });
      await transaction.productVariant.create({
        data: { productId: created.id, name: 'Default' },
      });
      if (initialStock) {
        await transaction.seedStockMovement.create({
          data: {
            productId: created.id,
            movementType: SeedStockMovementType.OPENING_STOCK,
            quantityGrams: toGrams(initialStock.quantity, initialStock.unit),
            enteredQuantity: new Prisma.Decimal(initialStock.quantity),
            enteredUnit: initialStock.unit,
            reason: 'Opening stock entered during product creation',
            createdById: userId,
          },
        });
      }
      return created;
    });
    const stock = initialStock ? toGrams(initialStock.quantity, initialStock.unit) : 0n;
    return present(product, stock);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new AppError(409, 'SEED_EXISTS', 'A seed with this name or code already exists');
    throw error;
  }
};

export const updateSeedProduct = async (id: string, input: UpdateSeedProductInput) => {
  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'SEED_NOT_FOUND', 'Seed was not found');
  const discountType = input.discountType ?? current.discountType;
  const discountValue = new Prisma.Decimal(input.discountValue ?? current.discountValue);
  if (discountType === SeedDiscountType.NONE && !discountValue.isZero())
    throw new AppError(400, 'INVALID_DISCOUNT', 'No-discount products must use zero');
  if (discountType === SeedDiscountType.PERCENTAGE && discountValue.gt(100))
    throw new AppError(400, 'INVALID_DISCOUNT', 'Percentage cannot exceed 100');
  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.code !== undefined ? { code: input.code || null } : {}),
      ...(input.sellingRatePerKg !== undefined
        ? { sellingRatePerKg: new Prisma.Decimal(input.sellingRatePerKg) }
        : {}),
      discountType,
      discountValue,
    },
    include: productInclude,
  });
  const balance = (await balancesFor([id])).get(id) ?? 0n;
  return present(updated, balance);
};

export const setSeedStatus = async (id: string, isActive: boolean) => {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive },
    include: productInclude,
  });
  const balance = (await balancesFor([id])).get(id) ?? 0n;
  return present(product, balance);
};

export const addSeedStock = async (id: string, input: AddSeedStockInput, userId: string) => {
  const enteredUnit = input.unit;
  const absoluteGrams = toGrams(input.quantity, enteredUnit);
  const decrease = input.movementType === SeedStockMovementType.ADJUSTMENT_DECREASE;
  const signedGrams = decrease ? -absoluteGrams : absoluteGrams;
  return prisma.$transaction(
    async (transaction) => {
      const product = await transaction.product.findUnique({
        where: { id },
        include: productInclude,
      });
      if (!product) throw new AppError(404, 'SEED_NOT_FOUND', 'Seed was not found');
      if (!product.isActive)
        throw new AppError(400, 'SEED_INACTIVE', 'Reactivate this seed before adding stock');
      const movements = await transaction.seedStockMovement.count({ where: { productId: id } });
      if (input.movementType === SeedStockMovementType.OPENING_STOCK && movements > 0)
        throw new AppError(409, 'OPENING_STOCK_EXISTS', 'Opening stock has already been recorded');
      const balance = (await balancesFor([id], transaction)).get(id) ?? 0n;
      if (balance + signedGrams < 0n)
        throw new AppError(400, 'INSUFFICIENT_STOCK', 'Stock cannot become negative');
      await transaction.seedStockMovement.create({
        data: {
          productId: id,
          movementType: input.movementType,
          quantityGrams: signedGrams,
          enteredQuantity: new Prisma.Decimal(input.quantity),
          enteredUnit,
          reason: input.reason,
          createdById: userId,
        },
      });
      return present(product, balance + signedGrams);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

export const getSeedProduct = async (id: string, query: SeedMovementListQuery) => {
  const [product, movements, movementCount] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: productInclude }),
    prisma.seedStockMovement.findMany({
      where: { productId: id },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.seedStockMovement.count({ where: { productId: id } }),
  ]);
  if (!product) throw new AppError(404, 'SEED_NOT_FOUND', 'Seed was not found');
  const balance = (await balancesFor([id])).get(id) ?? 0n;
  return {
    product: present(product, balance),
    movements: movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantityGrams: movement.quantityGrams.toString(),
      enteredQuantity: movement.enteredQuantity.toFixed(5).replace(/\.?0+$/, ''),
      enteredUnit: movement.enteredUnit,
      reason: movement.reason,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: movementCount,
      totalPages: Math.ceil(movementCount / query.pageSize),
    },
  };
};
