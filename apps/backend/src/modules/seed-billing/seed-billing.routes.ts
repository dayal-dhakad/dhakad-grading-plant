import { CreateSeedBillSchema, CancelSeedBillSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import { SeedBillIdSchema, SeedBillListQuerySchema } from './seed-billing.schemas.js';
import { cancelSeedBill, createSeedBill, listSeedBills } from './seed-billing.service.js';
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
    res.json(await listSeedBills(q, req.authUser!.role === 'STAFF' ? req.authUser!.id : undefined));
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
