import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock('./auth.service.js', () => ({ ...mocks, SESSION_COOKIE_NAME: 'dhakad_session' }));

import { createApp } from '../../app.js';

const user = {
  id: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
  mobile: '9876543210',
  name: 'Admin',
  role: 'ADMIN',
};
describe('authentication routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('sets an HTTP-only session cookie after login without exposing a hash', async () => {
    mocks.login.mockResolvedValue({
      token: 'secret-token',
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ mobile: user.mobile, password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('SameSite=Strict');
    expect(response.body).toEqual({ user });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
  it('returns field-addressable validation errors', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ mobile: '123', password: 'short', extra: true });
    expect(response.status).toBe(400);
    const body = response.body as { error: { code: string; details: unknown[] } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'mobile' })]),
    );
  });
  it('requires a valid session for the current user', async () => {
    mocks.authenticate.mockResolvedValue(user);
    const response = await request(createApp())
      .get('/api/v1/auth/me')
      .set('Cookie', 'dhakad_session=secret-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user });
  });
  it('revokes the server session and clears its cookie on logout', async () => {
    mocks.logout.mockResolvedValue(undefined);
    const response = await request(createApp())
      .post('/api/v1/auth/logout')
      .set('Cookie', 'dhakad_session=secret-token');
    expect(response.status).toBe(204);
    expect(mocks.logout).toHaveBeenCalledWith('secret-token');
    expect(response.headers['set-cookie']?.[0]).toContain('dhakad_session=;');
  });
});
