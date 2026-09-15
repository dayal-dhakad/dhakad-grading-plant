import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  createPayment: vi.fn(),
  listPayments: vi.fn(),
  reversePayment: vi.fn(),
  getCustomerLedger: vi.fn(),
}));
vi.mock('./payment.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (
    request: { authUser?: { id: string; role: string } },
    _response: unknown,
    next: () => void,
  ) => {
    request.authUser = { id: 'dc2e08c4-3ebc-4273-a846-ece725b4133f', role: 'STAFF' };
    next();
  },
  requireRole: () => ($request: unknown, $response: unknown, next: () => void) => next(),
}));
import { createApp } from '../../app.js';
describe('payment routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('creates a validated payment for the authenticated recorder', async () => {
    const input = {
      customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
      amount: '25.00',
      paymentMethod: 'CASH',
    };
    mocks.createPayment.mockResolvedValue({ id: 'payment' });
    const response = await request(createApp()).post('/api/v1/payments').send(input);
    expect(response.status).toBe(201);
    expect(mocks.createPayment).toHaveBeenCalledWith(
      { ...input, waiveSmallBalance: false },
      'dc2e08c4-3ebc-4273-a846-ece725b4133f',
    );
  });
  it('rejects zero payments', async () => {
    const response = await request(createApp()).post('/api/v1/payments').send({
      customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
      amount: '0',
      paymentMethod: 'CASH',
    });
    expect(response.status).toBe(400);
  });
  it('allows staff to reverse a payment while enforcing recorder ownership', async () => {
    const paymentId = '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea';
    mocks.reversePayment.mockResolvedValue({ id: paymentId, status: 'REVERSED' });
    const response = await request(createApp())
      .post(`/api/v1/payments/${paymentId}/reverse`)
      .send({ reason: 'Wrong amount entered' });
    expect(response.status).toBe(200);
    expect(mocks.reversePayment).toHaveBeenCalledWith(
      paymentId,
      'Wrong amount entered',
      'dc2e08c4-3ebc-4273-a846-ece725b4133f',
      true,
    );
  });
});
