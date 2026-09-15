import { describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, AuthResponseSchema, LoginInputSchema } from './auth-api';

describe('LoginInputSchema', () => {
  it('accepts the backend wire format', () => {
    expect(LoginInputSchema.parse({ mobile: '9876543210', password: 'password123' })).toEqual({
      mobile: '9876543210',
      password: 'password123',
    });
  });
  it('rejects formatted numbers and unknown fields', () => {
    expect(
      LoginInputSchema.safeParse({ mobile: '+919876543210', password: 'password123' }).success,
    ).toBe(false);
    expect(
      LoginInputSchema.safeParse({ mobile: '9876543210', password: 'password123', role: 'ADMIN' })
        .success,
    ).toBe(false);
  });
  it('provides a user-friendly password error', () => {
    const result = LoginInputSchema.safeParse({ mobile: '9876543210', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters');
    }
  });
});
describe('AuthResponseSchema', () => {
  it('rejects unexpected roles', () => {
    expect(
      AuthResponseSchema.safeParse({
        user: { id: '1', mobile: '9876543210', name: 'User', role: 'OWNER' },
      }).success,
    ).toBe(false);
  });
});
describe('ApiErrorResponseSchema', () => {
  it('accepts login rate-limit countdown details', () => {
    const result = ApiErrorResponseSchema.parse({
      status: 429,
      data: {
        error: {
          code: 'TOO_MANY_LOGIN_ATTEMPTS',
          message: 'Too many login attempts; try again later',
          retryAfterSeconds: 321,
        },
      },
    });
    expect(result.data.error.retryAfterSeconds).toBe(321);
  });
});
