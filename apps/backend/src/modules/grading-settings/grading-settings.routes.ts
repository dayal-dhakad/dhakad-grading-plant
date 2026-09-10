import { Role } from '@prisma/client';
import { CreateCropSettingSchema, UpdateCropSettingSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import { CropIdParamsSchema, CropStatusSchema } from './grading-settings.schemas.js';
import {
  createCropSetting,
  listCropSettings,
  setCropStatus,
  updateCropSetting,
} from './grading-settings.service.js';
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
export const gradingSettingsRouter = Router();
gradingSettingsRouter.use(requireAuth, requireRole(Role.ADMIN));
gradingSettingsRouter.get('/', async (_request, response, next) => {
  try {
    response.json(await listCropSettings());
  } catch (error) {
    next(error);
  }
});
gradingSettingsRouter.post('/', async (request, response, next) => {
  try {
    response
      .status(201)
      .json({ crop: await createCropSetting(parse(CreateCropSettingSchema, request.body)) });
  } catch (error) {
    next(error);
  }
});
gradingSettingsRouter.patch('/:id', async (request, response, next) => {
  try {
    response.json({
      crop: await updateCropSetting(
        parse(CropIdParamsSchema, request.params).id,
        parse(UpdateCropSettingSchema, request.body),
      ),
    });
  } catch (error) {
    next(error);
  }
});
gradingSettingsRouter.patch('/:id/status', async (request, response, next) => {
  try {
    response.json({
      crop: await setCropStatus(
        parse(CropIdParamsSchema, request.params).id,
        parse(CropStatusSchema, request.body).isActive,
      ),
    });
  } catch (error) {
    next(error);
  }
});
