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
});
