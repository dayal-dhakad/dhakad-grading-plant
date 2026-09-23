import type { HealthResponse } from '@dhakad/shared';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { authRouter } from './modules/auth/auth.routes.js';
import { customerRouter } from './modules/customers/customer.routes.js';
import { gradingRouter } from './modules/grading/grading.routes.js';
import { gradingSettingsRouter } from './modules/grading-settings/grading-settings.routes.js';
import { staffRouter } from './modules/staff/staff.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { seedManagementRouter } from './modules/seed-management/seed-management.routes.js';
import { seedBillingRouter } from './modules/seed-billing/seed-billing.routes.js';
import { paymentAccountRouter } from './modules/payment-accounts/payment-account.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { expenseRouter } from './modules/expenses/expense.routes.js';
import { env } from './config/env.js';
import { prisma } from './shared/database/prisma.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { notFoundHandler } from './shared/middleware/not-found.js';
const checkDatabase = async () => {
  await prisma.$queryRaw`SELECT 1`;
};
export const createApp = (databaseCheck: () => Promise<unknown> = checkDatabase) => {
  const app = express();
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      ...(env.NODE_ENV === 'production' ? {} : { strictTransportSecurity: false }),
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(
    '/api/v1',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests; try again later' },
      },
    }),
    (_request, response, next) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.get('/api/v1/health', async (_request, response) => {
    let database: HealthResponse['database'] = 'connected';
    try {
      await databaseCheck();
    } catch {
      database = 'unavailable';
    }
    const body: HealthResponse = {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'dhakad-backend',
      database,
      timestamp: new Date().toISOString(),
    };
    response.status(database === 'connected' ? 200 : 503).json(body);
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/customers', customerRouter);
  app.use('/api/v1/grading', gradingRouter);
  app.use('/api/v1/grading-settings', gradingSettingsRouter);
  app.use('/api/v1/staff', staffRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/seed-management', seedManagementRouter);
  app.use('/api/v1/seed-bills', seedBillingRouter);
  app.use('/api/v1/payment-accounts', paymentAccountRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/expenses', expenseRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
