import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  void _next;
  if (error instanceof AppError) {
    response
      .status(error.statusCode)
      .json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error && typeof error === 'object' && 'type' in error) {
    if (error.type === 'entity.too.large') {
      response.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request payload is too large' },
      });
      return;
    }
    if (error.type === 'entity.parse.failed') {
      response.status(400).json({
        error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' },
      });
      return;
    }
  }
  console.error(error);
  response
    .status(500)
    .json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } });
};
