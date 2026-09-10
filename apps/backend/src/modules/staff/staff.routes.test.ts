import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  listStaff: vi.fn(),
  getStaff: vi.fn(),
  createStaff: vi.fn(),
  setStaffStatus: vi.fn(),
}));
vi.mock('./staff.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (_request: unknown, _response: unknown, next: () => void) => next(),
  requireRole: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));
import { createApp } from '../../app.js';
describe('staff routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('creates only validated staff input', async () => {
    const input = { name: 'Ramesh', mobile: '9876543212', password: 'StrongPass1' };
    mocks.createStaff.mockResolvedValue({ id: 'staff' });
    const response = await request(createApp()).post('/api/v1/staff').send(input);
    expect(response.status).toBe(201);
    expect(mocks.createStaff).toHaveBeenCalledWith(input);
  });
  it('rejects a caller-supplied admin role', async () => {
    const response = await request(createApp())
      .post('/api/v1/staff')
      .send({ name: 'Ramesh', mobile: '9876543212', password: 'StrongPass1', role: 'ADMIN' });
    expect(response.status).toBe(400);
    expect(mocks.createStaff).not.toHaveBeenCalled();
  });
});
