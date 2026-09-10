import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGradingReferences: vi.fn(),
  listGradingEntries: vi.fn(),
  getGradingEntry: vi.fn(),
  createGradingEntry: vi.fn(),
  cancelGradingEntry: vi.fn(),
  reviseGradingEntry: vi.fn(),
  listGradingRevisions: vi.fn(),
}));
vi.mock('./grading.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (
    request: { authUser?: { id: string; role: string } },
    _response: unknown,
    next: () => void,
  ) => {
    request.authUser = { id: 'dc2e08c4-3ebc-4273-a846-ece725b4133f', role: 'STAFF' };
    next();
  },
  requireRole: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));
import { createApp } from '../../app.js';

const input = {
  customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
  cropId: '9ed31ad4-68f4-4dbf-9650-dfdac52dde1c',
  quantity: '2.50',
  paidAmount: '62.50',
  paymentMethod: 'CASH',
  serviceDate: '2026-09-08',
};
describe('grading routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('creates a validated grading entry for the authenticated user', async () => {
    mocks.createGradingEntry.mockResolvedValue({ id: 'entry' });
    const response = await request(createApp()).post('/api/v1/grading').send(input);
    expect(response.status).toBe(201);
    expect(mocks.createGradingEntry).toHaveBeenCalledWith(
      { ...input, waiveSmallBalance: false },
      'dc2e08c4-3ebc-4273-a846-ece725b4133f',
    );
  });
  it('rejects malformed quantities and unknown fields', async () => {
    const response = await request(createApp())
      .post('/api/v1/grading')
      .send({ ...input, quantity: '1.234', unexpected: true });
    expect(response.status).toBe(400);
    expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });
  it('requires a cancellation reason', async () => {
    const response = await request(createApp())
      .post('/api/v1/grading/4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea/cancel')
      .send({ reason: '' });
    expect(response.status).toBe(400);
    expect(mocks.cancelGradingEntry).not.toHaveBeenCalled();
  });
  it('accepts a reason-required revision for staff', async () => {
    mocks.reviseGradingEntry.mockResolvedValue({ id: 'entry' });
    const response = await request(createApp())
      .put('/api/v1/grading/4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea')
      .send({ ...input, reason: 'Corrected customer weight' });
    expect(response.status).toBe(200);
    expect(mocks.reviseGradingEntry).toHaveBeenCalledWith(
      '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
      { ...input, waiveSmallBalance: false, reason: 'Corrected customer weight' },
      'dc2e08c4-3ebc-4273-a846-ece725b4133f',
    );
  });
});
