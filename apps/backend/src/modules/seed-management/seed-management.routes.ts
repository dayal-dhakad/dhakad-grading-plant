import { Role } from '@prisma/client';
import {
  AddSeedStockSchema,
  CreateSeedCategorySchema,
  CreateSeedProductSchema,
  UpdateSeedProductSchema,
} from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  SeedListQuerySchema,
  SeedMovementListQuerySchema,
  SeedProductIdSchema,
  SeedStatusSchema,
} from './seed-management.schemas.js';
import {
  addSeedStock,
  createSeedCategory,
  createSeedProduct,
  getSeedProduct,
  listSeedProducts,
  setSeedStatus,
  updateSeedProduct,
} from './seed-management.service.js';

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields',
      result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    );
  return result.data;
};

export const seedManagementRouter = Router();
seedManagementRouter.use(requireAuth);

seedManagementRouter.get('/', async (request, response, next) => {
  try {
    response.json(await listSeedProducts(parse(SeedListQuerySchema, request.query)));
  } catch (error) {
    next(error);
  }
});
seedManagementRouter.post(
  '/categories',
  requireRole(Role.ADMIN),
  async (request, response, next) => {
    try {
      const input = parse(CreateSeedCategorySchema, request.body);
      response.status(201).json({ category: await createSeedCategory(input.name) });
    } catch (error) {
      next(error);
    }
  },
);
seedManagementRouter.post('/', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    response.status(201).json({
      product: await createSeedProduct(
        parse(CreateSeedProductSchema, request.body),
        request.authUser!.id,
      ),
    });
  } catch (error) {
    next(error);
  }
});
seedManagementRouter.get('/:id', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    response.json(
      await getSeedProduct(
        parse(SeedProductIdSchema, request.params).id,
        parse(SeedMovementListQuerySchema, request.query),
      ),
    );
  } catch (error) {
    next(error);
  }
});
seedManagementRouter.patch('/:id', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    response.json({
      product: await updateSeedProduct(
        parse(SeedProductIdSchema, request.params).id,
        parse(UpdateSeedProductSchema, request.body),
      ),
    });
  } catch (error) {
    next(error);
  }
});
seedManagementRouter.patch(
  '/:id/status',
  requireRole(Role.ADMIN),
  async (request, response, next) => {
    try {
      response.json({
        product: await setSeedStatus(
          parse(SeedProductIdSchema, request.params).id,
          parse(SeedStatusSchema, request.body).isActive,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);
seedManagementRouter.post(
  '/:id/stock',
  requireRole(Role.ADMIN),
  async (request, response, next) => {
    try {
      response.status(201).json({
        product: await addSeedStock(
          parse(SeedProductIdSchema, request.params).id,
          parse(AddSeedStockSchema, request.body),
          request.authUser!.id,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);
