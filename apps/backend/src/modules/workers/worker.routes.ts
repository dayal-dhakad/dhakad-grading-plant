import { CreateWorkerPaymentSchema, CreateWorkerSchema } from '@dhakad/shared';
import { Role } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import {
  WorkerIdSchema,
  WorkerListQuerySchema,
  WorkerPaymentListQuerySchema,
  WorkerPaymentSummaryQuerySchema,
} from './worker.schemas.js';
import {
  createWorker,
  createWorkerPayment,
  getWorker,
  getWorkerPaymentSummary,
  listWorkerPayments,
  listWorkers,
} from './worker.service.js';
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
export const workerRouter = Router();
workerRouter.use(requireAuth, requireRole(Role.ADMIN));
workerRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listWorkers(parse(WorkerListQuerySchema, req.query)));
  } catch (e) {
    next(e);
  }
});
workerRouter.post('/', async (req, res, next) => {
  try {
    res.status(201).json({ worker: await createWorker(parse(CreateWorkerSchema, req.body)) });
  } catch (e) {
    next(e);
  }
});
workerRouter.get('/payment-summary', async (req, res, next) => {
  try {
    res.json(await getWorkerPaymentSummary(parse(WorkerPaymentSummaryQuerySchema, req.query)));
  } catch (e) {
    next(e);
  }
});
workerRouter.get('/:id', async (req, res, next) => {
  try {
    res.json({ worker: await getWorker(parse(WorkerIdSchema, req.params).id) });
  } catch (e) {
    next(e);
  }
});
workerRouter.get('/:id/payments', async (req, res, next) => {
  try {
    res.json(
      await listWorkerPayments(
        parse(WorkerIdSchema, req.params).id,
        parse(WorkerPaymentListQuerySchema, req.query),
      ),
    );
  } catch (e) {
    next(e);
  }
});
workerRouter.post('/:id/payments', async (req, res, next) => {
  try {
    res.status(201).json({
      payment: await createWorkerPayment(
        parse(WorkerIdSchema, req.params).id,
        parse(CreateWorkerPaymentSchema, req.body),
        req.authUser!.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
