import {
  CreatePaymentAccountSchema,
  PaymentQrRequestSchema,
  UpdatePaymentAccountSchema,
} from '@dhakad/shared';
import { Role } from '@prisma/client';
import { Router } from 'express';
import type { z } from 'zod';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import {
  PaymentAccountIdSchema,
  PaymentAccountListQuerySchema,
  PaymentAccountStatusSchema,
} from './payment-account.schemas.js';
import {
  createPaymentAccount,
  createPaymentQrPayload,
  listPaymentAccounts,
  setPaymentAccountStatus,
  updatePaymentAccount,
} from './payment-account.service.js';

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

export const paymentAccountRouter = Router();
paymentAccountRouter.use(requireAuth);
paymentAccountRouter.get('/', async (request, response, next) => {
  try {
    response.json(await listPaymentAccounts(parse(PaymentAccountListQuerySchema, request.query)));
  } catch (error) {
    next(error);
  }
});
paymentAccountRouter.post('/', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    response.status(201).json({
      account: await createPaymentAccount(
        parse(CreatePaymentAccountSchema, request.body),
        request.authUser!.id,
      ),
    });
  } catch (error) {
    next(error);
  }
});
paymentAccountRouter.patch('/:id', requireRole(Role.ADMIN), async (request, response, next) => {
  try {
    response.json({
      account: await updatePaymentAccount(
        parse(PaymentAccountIdSchema, request.params).id,
        parse(UpdatePaymentAccountSchema, request.body),
        request.authUser!.id,
      ),
    });
  } catch (error) {
    next(error);
  }
});
paymentAccountRouter.patch(
  '/:id/status',
  requireRole(Role.ADMIN),
  async (request, response, next) => {
    try {
      response.json({
        account: await setPaymentAccountStatus(
          parse(PaymentAccountIdSchema, request.params).id,
          parse(PaymentAccountStatusSchema, request.body).isActive,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);
paymentAccountRouter.post('/:id/qr', async (request, response, next) => {
  try {
    const input = parse(PaymentQrRequestSchema, request.body);
    response.json(
      await createPaymentQrPayload(
        parse(PaymentAccountIdSchema, request.params).id,
        input.amount,
        input.reference,
      ),
    );
  } catch (error) {
    next(error);
  }
});
