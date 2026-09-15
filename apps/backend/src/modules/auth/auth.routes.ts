import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { requireAuth } from './auth.middleware.js';
import { LoginSchema } from './auth.schemas.js';
import { login, logout, SESSION_COOKIE_NAME } from './auth.service.js';

export const authRouter = Router();
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (request, response, _next, options) => {
    const rateLimitInfo = (request as typeof request & { rateLimit?: { resetTime?: Date } })
      .rateLimit;
    const resetTime = rateLimitInfo?.resetTime?.getTime();
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(((resetTime ?? Date.now() + options.windowMs) - Date.now()) / 1000),
    );
    response.status(options.statusCode).json({
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
        message: 'Too many login attempts; try again later',
        retryAfterSeconds,
      },
    });
  },
});
authRouter.post('/login', loginLimiter, async (request, response, next) => {
  try {
    const result = LoginSchema.safeParse(request.body);
    if (!result.success)
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Request validation failed',
        result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      );
    const session = await login(result.data);
    response.cookie(SESSION_COOKIE_NAME, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
    response.status(200).json({ user: session.user });
  } catch (error) {
    next(error);
  }
});
authRouter.post('/logout', async (request, response, next) => {
  try {
    const cookies = request.cookies as Record<string, unknown>;
    const token =
      typeof cookies[SESSION_COOKIE_NAME] === 'string' ? cookies[SESSION_COOKIE_NAME] : undefined;
    await logout(token);
    response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
authRouter.get('/me', requireAuth, (request, response) =>
  response.status(200).json({ user: request.authUser }),
);
