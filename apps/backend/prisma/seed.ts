import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const ReferenceDataSchema = z.strictObject({
  unit: z.strictObject({
    code: z.string().min(1),
    name: z.string().min(1),
    symbol: z.string().min(1),
    decimalPlaces: z.number().int().min(0).max(6),
  }),
  category: z.strictObject({ code: z.string().min(1), name: z.string().min(1) }),
  crops: z.array(
    z.strictObject({
      code: z.string().min(1),
      name: z.string().min(1),
      cleaningRate: z.string().regex(/^\d+(\.\d{1,2})?$/),
    }),
  ),
  products: z.array(
    z.strictObject({ name: z.string().min(1), variants: z.array(z.string().min(1)).min(1) }),
  ),
});

const referenceData = ReferenceDataSchema.parse({
  unit: { code: 'QUINTAL', name: 'Quintal', symbol: 'q', decimalPlaces: 2 },
  category: { code: 'SEED', name: 'Seeds' },
  crops: [
    { code: 'WHEAT', name: 'Wheat', cleaningRate: '25.00' },
    { code: 'CHANA', name: 'Chana', cleaningRate: '40.00' },
    { code: 'KALONJI', name: 'Kalonji', cleaningRate: '50.00' },
  ],
  products: [
    { name: 'अकरकरा देसी (Akarkara Desi)', variants: ['Default'] },
    { name: 'बरसीम (Barseem)', variants: ['Default'] },
    { name: 'मेथी (Methi)', variants: ['Default'] },
    { name: 'कसम (Kasam)', variants: ['Default'] },
    { name: 'तुलसी (Tulsi Black)', variants: ['Default'] },
    { name: 'कलौंजी (Kalonji)', variants: ['Default'] },
    { name: 'किनोआ सफेद (Quinoa White)', variants: ['Default'] },
    { name: 'अलसी (Alsi / Flax)', variants: ['Default'] },
    { name: 'अश्वगंधा (Ashwagandha)', variants: ['Default'] },
    { name: 'ईसबगोल (Isabgol)', variants: ['Default'] },
    { name: 'चिया (Chia Black)', variants: ['Default'] },
    { name: 'किनोआ लाल (Red Quinoa)', variants: ['Default'] },
    { name: 'Quinoa', variants: ['White Bold', 'Red'] },
    { name: 'Chia', variants: ['Z Black'] },
  ],
});

await prisma.$transaction(async (transaction) => {
  const unit = await transaction.unit.upsert({
    where: { code: referenceData.unit.code },
    update: referenceData.unit,
    create: referenceData.unit,
  });
  const category = await transaction.productCategory.upsert({
    where: { code: referenceData.category.code },
    update: referenceData.category,
    create: referenceData.category,
  });

  for (const crop of referenceData.crops) {
    await transaction.crop.upsert({
      where: { code: crop.code },
      update: {
        name: crop.name,
        cleaningRate: new Prisma.Decimal(crop.cleaningRate),
        cleaningRateUnitId: unit.id,
      },
      create: {
        ...crop,
        cleaningRate: new Prisma.Decimal(crop.cleaningRate),
        cleaningRateUnitId: unit.id,
      },
    });
  }

  for (const productData of referenceData.products) {
    const product = await transaction.product.upsert({
      where: { name: productData.name },
      update: { categoryId: category.id },
      create: { name: productData.name, categoryId: category.id },
    });
    for (const variantName of productData.variants) {
      await transaction.productVariant.upsert({
        where: { productId_name: { productId: product.id, name: variantName } },
        update: {},
        create: { productId: product.id, name: variantName },
      });
    }
  }
});

await prisma.$disconnect();
console.log('Reference data seeded successfully');
