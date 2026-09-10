import { Role } from '@prisma/client';
import { CreateStaffSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import { StaffIdParamsSchema, StaffListQuerySchema, StaffStatusSchema } from './staff.schemas.js';
import { createStaff, getStaff, listStaff, setStaffStatus } from './staff.service.js';
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
export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole(Role.ADMIN));
staffRouter.get('/', async (request, response, next) => {
  try {
    response.json(await listStaff(parse(StaffListQuerySchema, request.query)));
  } catch (error) {
    next(error);
  }
});
staffRouter.get('/:id', async (request, response, next) => {
  try {
    response.json({ staff: await getStaff(parse(StaffIdParamsSchema, request.params).id) });
  } catch (error) {
    next(error);
  }
});
staffRouter.post('/', async (request, response, next) => {
  try {
    response.status(201).json({ staff: await createStaff(parse(CreateStaffSchema, request.body)) });
  } catch (error) {
    next(error);
  }
});
staffRouter.patch('/:id/status', async (request, response, next) => {
  try {
    const { id } = parse(StaffIdParamsSchema, request.params);
    response.json({
      staff: await setStaffStatus(id, parse(StaffStatusSchema, request.body).isActive),
    });
  } catch (error) {
    next(error);
  }
});
