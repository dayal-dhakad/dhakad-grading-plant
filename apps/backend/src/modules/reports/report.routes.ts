import { ReportQuerySchema } from '@dhakad/shared';
import { Role } from '@prisma/client';
import { Router } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { getOverviewReport } from './report.service.js';
export const reportRouter = Router();
reportRouter.use(requireAuth, requireRole(Role.ADMIN));
reportRouter.get('/overview', async (request, response, next) => {
  try {
    const parsed = ReportQuerySchema.safeParse(request.query);
    if (!parsed.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Select a valid report period',
        parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      );
    response.json(await getOverviewReport(parsed.data));
  } catch (error) {
    next(error);
  }
});
