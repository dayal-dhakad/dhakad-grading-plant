import { z } from 'zod';

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount');
const quantity = z.string().regex(/^\d+(\.\d{1,5})?$/, 'Enter a valid quantity');
const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max);

export const SeedDiscountTypeSchema = z.enum(['NONE', 'FIXED', 'PERCENTAGE']);
export const SeedQuantityUnitSchema = z.enum(['GRAM', 'KILOGRAM', 'QUINTAL']);
export const SeedStockMovementTypeSchema = z.enum([
  'OPENING_STOCK',
  'STOCK_ADDED',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
  'EXTERNAL_SALE',
  'SALE',
  'SALE_REVERSAL',
]);

export const SeedCategorySchema = z.strictObject({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});

export const SeedProductSchema = z.strictObject({
  id: z.uuid(),
  code: z.string().nullable(),
  name: z.string(),
  category: SeedCategorySchema,
  sellingRatePerKg: z.string(),
  discountType: SeedDiscountTypeSchema,
  discountValue: z.string(),
  lowStockGrams: z.string(),
  stockGrams: z.string(),
  isLowStock: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const SeedStockMovementSchema = z.strictObject({
  id: z.uuid(),
  movementType: SeedStockMovementTypeSchema,
  quantityGrams: z.string(),
  enteredQuantity: z.string(),
  enteredUnit: SeedQuantityUnitSchema,
  reason: z.string(),
  createdBy: z.strictObject({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
});

export const CreateSeedCategorySchema = z.strictObject({
  name: requiredText('Type name', 100),
});

const productFields = {
  name: requiredText('Seed name', 120),
  code: z.string().trim().max(50).optional(),
  sellingRatePerKg: money,
  discountType: SeedDiscountTypeSchema,
  discountValue: money,
};

export const CreateSeedProductSchema = z
  .strictObject({
    ...productFields,
    initialStockQuantity: quantity.optional(),
    initialStockUnit: SeedQuantityUnitSchema.optional(),
  })
  .refine((value) => value.discountType !== 'NONE' || Number(value.discountValue) === 0, {
    path: ['discountValue'],
    message: 'No-discount products must use 0',
  })
  .refine((value) => value.discountType !== 'PERCENTAGE' || Number(value.discountValue) <= 100, {
    path: ['discountValue'],
    message: 'Percentage cannot exceed 100',
  })
  .refine(
    (value) =>
      (value.initialStockQuantity === undefined) === (value.initialStockUnit === undefined),
    { path: ['initialStockQuantity'], message: 'Provide both initial stock quantity and unit' },
  );

export const UpdateSeedProductSchema = z
  .strictObject({
    name: productFields.name.optional(),
    code: productFields.code,
    sellingRatePerKg: productFields.sellingRatePerKg.optional(),
    discountType: productFields.discountType.optional(),
    discountValue: productFields.discountValue.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field');

export const AddSeedStockSchema = z.strictObject({
  action: z.enum(['ADD', 'CORRECT', 'EXTERNAL_SALE']),
  quantity,
  unit: SeedQuantityUnitSchema,
  reason: requiredText('Reason', 300),
});

const pagination = z.strictObject({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const SeedProductListResponseSchema = z.strictObject({
  products: z.array(SeedProductSchema),
  categories: z.array(SeedCategorySchema),
  pagination,
});
export const SeedProductResponseSchema = z.strictObject({ product: SeedProductSchema });
export const SeedProductDetailResponseSchema = z.strictObject({
  product: SeedProductSchema,
  movements: z.array(SeedStockMovementSchema),
  pagination,
});

export type SeedProduct = z.infer<typeof SeedProductSchema>;
export type CreateSeedProductInput = z.infer<typeof CreateSeedProductSchema>;
export type UpdateSeedProductInput = z.infer<typeof UpdateSeedProductSchema>;
export type AddSeedStockInput = z.infer<typeof AddSeedStockSchema>;
