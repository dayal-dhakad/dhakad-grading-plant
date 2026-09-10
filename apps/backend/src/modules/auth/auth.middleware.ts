import { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { authenticate, SESSION_COOKIE_NAME } from './auth.service.js';

export const requireAuth = (request: Request, _response: Response, next: NextFunction) => {
  void authenticate(request.cookies[SESSION_COOKIE_NAME] as string | undefined)
    .then((user) => {
      request.authUser = user;
      next();
    })
    .catch(next);
};
export const requireRole =
  (...roles: Role[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser)
      return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
    if (!roles.includes(request.authUser.role))
      return next(
        new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'),
      );
    next();
  };
