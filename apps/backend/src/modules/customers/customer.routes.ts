import { CreateCustomerSchema, UpdateCustomerSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  createCustomer,
  getCustomer,
  getCustomerDues,
  getCustomerGradingDue,
  listCustomers,
  setCustomerStatus,
  updateCustomer,
} from './customer.service.js';
import {
  CustomerIdParamsSchema,
  CustomerListQuerySchema,
  CustomerStatusSchema,
} from './customer.schemas.js';

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

export const customerRouter = Router();
customerRouter.use(requireAuth);

customerRouter.get('/', async (request, response, next) => {
  try {
    response.json(await listCustomers(parse(CustomerListQuerySchema, request.query)));
  } catch (error) {
    next(error);
  }
});
customerRouter.get('/:id', async (request, response, next) => {
  try {
    const { id } = parse(CustomerIdParamsSchema, request.params);
    response.json({ customer: await getCustomer(id) });
  } catch (error) {
    next(error);
  }
});
customerRouter.get('/:id/grading-due', async (request, response, next) => {
  try {
    const { id } = parse(CustomerIdParamsSchema, request.params);
    response.json({ totalDue: await getCustomerGradingDue(id) });
  } catch (error) {
    next(error);
  }
});
customerRouter.get('/:id/dues', async (request, response, next) => {
  try {
    const { id } = parse(CustomerIdParamsSchema, request.params);
    response.json(await getCustomerDues(id));
  } catch (error) {
    next(error);
  }
});
customerRouter.post('/', async (request, response, next) => {
  try {
    const customer = await createCustomer(parse(CreateCustomerSchema, request.body));
    response.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
});
customerRouter.patch('/:id', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    const { id } = parse(CustomerIdParamsSchema, request.params);
    const customer = await updateCustomer(id, parse(UpdateCustomerSchema, request.body));
    response.json({ customer });
  } catch (error) {
    next(error);
  }
});
customerRouter.patch('/:id/status', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    const { id } = parse(CustomerIdParamsSchema, request.params);
    const { isActive } = parse(CustomerStatusSchema, request.body);
    response.json({ customer: await setCustomerStatus(id, isActive) });
  } catch (error) {
    next(error);
  }
});
