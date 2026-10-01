import {
  CreateCustomerExportSchema,
  CreateGradingExportSchema,
  CreateReportExportSchema,
} from '@dhakad/shared';
import { Role } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ExportIdSchema } from './export.schemas.js';
import {
  createCustomerExport,
  createGradingExport,
  createReportExport,
  getExportDownload,
  listExports,
} from './export.service.js';
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
export const exportRouter = Router();
exportRouter.use(requireAuth, requireRole(Role.ADMIN));
exportRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listExports(req.authUser!.id));
  } catch (e) {
    next(e);
  }
});
exportRouter.post('/customers', async (req, res, next) => {
  try {
    res.status(202).json({
      exportJob: await createCustomerExport(
        parse(CreateCustomerExportSchema, req.body),
        req.authUser!.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
exportRouter.post('/grading-entries', async (req, res, next) => {
  try {
    res.status(202).json({
      exportJob: await createGradingExport(
        parse(CreateGradingExportSchema, req.body),
        req.authUser!.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
exportRouter.post('/reports', async (req, res, next) => {
  try {
    res.status(202).json({
      exportJob: await createReportExport(
        parse(CreateReportExportSchema, req.body),
        req.authUser!.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
exportRouter.get('/:id/download', async (req, res, next) => {
  try {
    const file = await getExportDownload(parse(ExportIdSchema, req.params).id, req.authUser!.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.data);
  } catch (e) {
    next(e);
  }
});
