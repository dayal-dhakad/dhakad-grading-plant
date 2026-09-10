import { CreateGradingEntrySchema, ReviseGradingEntrySchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  CancelGradingSchema,
  GradingIdParamsSchema,
  GradingListQuerySchema,
} from './grading.schemas.js';
import {
  cancelGradingEntry,
  createGradingEntry,
  getGradingReferences,
  getGradingEntry,
  listGradingEntries,
  listGradingRevisions,
  reviseGradingEntry,
} from './grading.service.js';

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
export const gradingRouter = Router();
gradingRouter.use(requireAuth);
gradingRouter.get('/references', async (_request, response, next) => {
  try {
    response.json(await getGradingReferences());
  } catch (error) {
    next(error);
  }
});
gradingRouter.get('/', async (request, response, next) => {
  try {
    const query = parse(GradingListQuerySchema, request.query);
    response.json(
      await listGradingEntries(
        query,
        request.authUser!.role === 'STAFF' ? request.authUser!.id : undefined,
      ),
    );
  } catch (error) {
    next(error);
  }
});
gradingRouter.get('/:id', async (request, response, next) => {
  try {
    const { id } = parse(GradingIdParamsSchema, request.params);
    response.json({
      gradingEntry: await getGradingEntry(
        id,
        request.authUser!.role === 'STAFF' ? request.authUser!.id : undefined,
      ),
    });
  } catch (error) {
    next(error);
  }
});
gradingRouter.post('/', async (request, response, next) => {
  try {
    const input = parse(CreateGradingEntrySchema, request.body);
    response
      .status(201)
      .json({ gradingEntry: await createGradingEntry(input, request.authUser!.id) });
  } catch (error) {
    next(error);
  }
});
gradingRouter.post('/:id/cancel', async (request, response, next) => {
  try {
    const { id } = parse(GradingIdParamsSchema, request.params);
    const { reason } = parse(CancelGradingSchema, request.body);
    response.json({
      gradingEntry: await cancelGradingEntry(
        id,
        reason,
        request.authUser!.id,
        request.authUser!.role === 'STAFF',
      ),
    });
  } catch (error) {
    next(error);
  }
});
gradingRouter.put('/:id', async (request, response, next) => {
  try {
    const { id } = parse(GradingIdParamsSchema, request.params);
    if (request.authUser!.role !== 'STAFF')
      throw new AppError(403, 'FORBIDDEN', 'Only staff can revise their own entries');
    response.json({
      gradingEntry: await reviseGradingEntry(
        id,
        parse(ReviseGradingEntrySchema, request.body),
        request.authUser!.id,
      ),
    });
  } catch (error) {
    next(error);
  }
});
gradingRouter.get('/:id/revisions', async (request, response, next) => {
  try {
    const { id } = parse(GradingIdParamsSchema, request.params);
    response.json({
      revisions: await listGradingRevisions(
        id,
        request.authUser!.id,
        request.authUser!.role === 'ADMIN',
      ),
    });
  } catch (error) {
    next(error);
  }
});
