import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  listCropSettings: vi.fn(),
  createCropSetting: vi.fn(),
  updateCropSetting: vi.fn(),
  setCropStatus: vi.fn(),
}));
vi.mock('./grading-settings.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (_request: unknown, _response: unknown, next: () => void) => next(),
  requireRole: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));
import { createApp } from '../../app.js';
describe('grading settings routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('creates a validated crop setting', async () => {
    const input = {
      name: 'Mustard',
      cleaningRate: '35.50',
      unitId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
    };
    mocks.createCropSetting.mockResolvedValue({ id: 'crop' });
    const response = await request(createApp()).post('/api/v1/grading-settings').send(input);
    expect(response.status).toBe(201);
    expect(mocks.createCropSetting).toHaveBeenCalledWith(input);
  });
  it('rejects unknown fields', async () => {
    const response = await request(createApp()).post('/api/v1/grading-settings').send({
      name: 'Mustard',
      cleaningRate: '35.50',
      unitId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
      extra: true,
    });
    expect(response.status).toBe(400);
  });
});
