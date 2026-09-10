import { describe, expect, it } from 'vitest';
import { LoginSchema } from './auth.schemas.js';

describe('LoginSchema', () => {
  it('accepts the documented wire format', () =>
    expect(LoginSchema.safeParse({ mobile: '9876543210', password: 'password123' }).success).toBe(
      true,
    ));
  it.each([
    [{ mobile: '98765', password: 'password123' }],
    [{ mobile: '9876543210', password: 'short' }],
    [{ mobile: '9876543210', password: 'password123', role: 'ADMIN' }],
  ])('rejects malformed or unknown input %#', (input) =>
    expect(LoginSchema.safeParse(input).success).toBe(false),
  );
  it('returns a user-friendly password error', () => {
    const result = LoginSchema.safeParse({ mobile: '9876543210', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters');
    }
  });
});
