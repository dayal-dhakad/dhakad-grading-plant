import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
describe('foundation API', () => {
  it('reports health', async () => {
    const response = await request(createApp(() => Promise.resolve(1))).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'connected' });
  });
  it('formats missing routes', async () => {
    const response = await request(createApp()).get('/missing');
    const body = response.body as { error: { code: string } };
    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
  it('sets security and private-cache headers on API responses', async () => {
    const response = await request(createApp(() => Promise.resolve(1))).get('/api/v1/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
  it('returns safe errors for malformed and oversized JSON', async () => {
    const app = createApp();
    const malformed = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' },
    });

    const oversized = await request(app)
      .post('/api/v1/auth/login')
      .send({ value: 'x'.repeat(1_100_000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request payload is too large' },
    });
  });
});
