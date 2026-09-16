import { CreateSeedBillSchema, CancelSeedBillSchema, ReviseSeedBillSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import { SeedBillIdSchema, SeedBillListQuerySchema } from './seed-billing.schemas.js';
import {
  cancelSeedBill,
  createSeedBill,
  getSeedBill,
  listSeedBills,
  listSeedBillRevisions,
  reviseSeedBill,
} from './seed-billing.service.js';
const parse = <T>(s: z.ZodType<T>, v: unknown) => {
  const r = s.safeParse(v);
  if (!r.success)
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  return r.data;
};
export const seedBillingRouter = Router();
seedBillingRouter.use(requireAuth);
seedBillingRouter.get('/', async (req, res, next) => {
  try {
    const q = parse(SeedBillListQuerySchema, req.query);
    res.json(
      await listSeedBills(
        q,
        req.authUser!.role === 'STAFF' && !q.customerId ? req.authUser!.id : undefined,
      ),
    );
  } catch (e) {
    next(e);
  }
});
seedBillingRouter.post('/', async (req, res, next) => {
  try {
    res.status(201).json({
      bill: await createSeedBill(parse(CreateSeedBillSchema, req.body), req.authUser!.id),
    });
  } catch (e) {
    next(e);
  }
});
seedBillingRouter.get('/:id', async (req, res, next) => {
  try {
    res.json({
      bill: await getSeedBill(
        parse(SeedBillIdSchema, req.params).id,
        req.authUser!.role === 'STAFF' ? req.authUser!.id : undefined,
      ),
    });
  } catch (e) {
    next(e);
  }
});
seedBillingRouter.put('/:id', async (req, res, next) => {
  try {
    if (req.authUser!.role !== 'STAFF')
      throw new AppError(403, 'FORBIDDEN', 'Only staff can revise their own seed bills');
    res.json({
      bill: await reviseSeedBill(
        parse(SeedBillIdSchema, req.params).id,
        parse(ReviseSeedBillSchema, req.body),
        req.authUser!.id,
      ),
    });
  } catch (e) {
    next(e);
  }
});
seedBillingRouter.get('/:id/revisions', async (req, res, next) => {
  try {
    res.json({
      revisions: await listSeedBillRevisions(
        parse(SeedBillIdSchema, req.params).id,
        req.authUser!.role === 'STAFF' ? req.authUser!.id : undefined,
      ),
    });
  } catch (e) {
    next(e);
  }
});
seedBillingRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    res.json({
      bill: await cancelSeedBill(
        parse(SeedBillIdSchema, req.params).id,
        parse(CancelSeedBillSchema, req.body).reason,
        req.authUser!.id,
        req.authUser!.role === 'STAFF',
      ),
    });
  } catch (e) {
    next(e);
  }
});
