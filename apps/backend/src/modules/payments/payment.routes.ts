import { CreatePaymentSchema } from '@dhakad/shared';
import { Router } from 'express';
import type { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  PaymentCustomerParamsSchema,
  PaymentIdParamsSchema,
  PaymentListQuerySchema,
  ReversePaymentSchema,
} from './payment.schemas.js';
import {
  createPayment,
  getCustomerLedger,
  listPayments,
  reversePayment,
} from './payment.service.js';
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
export const paymentRouter = Router();
paymentRouter.use(requireAuth);
paymentRouter.get('/', async (request, response, next) => {
  try {
    response.json(
      await listPayments(
        parse(PaymentListQuerySchema, request.query),
        request.authUser!.role === 'STAFF' ? request.authUser!.id : undefined,
      ),
    );
  } catch (error) {
    next(error);
  }
});
paymentRouter.post('/', async (request, response, next) => {
  try {
    response.status(201).json({
      payment: await createPayment(parse(CreatePaymentSchema, request.body), request.authUser!.id),
    });
  } catch (error) {
    next(error);
  }
});
paymentRouter.get('/customers/:customerId/ledger', async (request, response, next) => {
  try {
    response.json(
      await getCustomerLedger(parse(PaymentCustomerParamsSchema, request.params).customerId),
    );
  } catch (error) {
    next(error);
  }
});
paymentRouter.post('/:id/reverse', async (request, response, next) => {
  try {
    response.json({
      payment: await reversePayment(
        parse(PaymentIdParamsSchema, request.params).id,
        parse(ReversePaymentSchema, request.body).reason,
        request.authUser!.id,
        request.authUser!.role === 'STAFF',
      ),
    });
  } catch (error) {
    next(error);
  }
});
