import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listSeedBills: vi.fn(),
  getSeedBill: vi.fn(),
  createSeedBill: vi.fn(),
  reviseSeedBill: vi.fn(),
  listSeedBillRevisions: vi.fn(),
  cancelSeedBill: vi.fn(),
}));
vi.mock('./seed-billing.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (
    req: { authUser?: { id: string; role: string } },
    _res: unknown,
    next: () => void,
  ) => {
    req.authUser = { id: 'dc2e08c4-3ebc-4273-a846-ece725b4133f', role: 'STAFF' };
    next();
  },
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
import { createApp } from '../../app.js';

const id = '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ef';
const input = {
  customerId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
  items: [
    {
      productId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5eb',
      quantity: '2',
      unit: 'KILOGRAM',
      ratePerKg: '100',
      discountType: 'NONE',
      discountValue: '0',
    },
  ],
  paidAmount: '100',
  paymentMethod: 'CASH',
  serviceDate: '2026-09-16',
};
describe('seed bill revision routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('rejects missing reason and unknown fields', async () => {
    expect((await request(createApp()).put(`/api/v1/seed-bills/${id}`).send(input)).status).toBe(
      400,
    );
    expect(
      (
        await request(createApp())
          .put(`/api/v1/seed-bills/${id}`)
          .send({ ...input, reason: 'Correction', extra: true })
      ).status,
    ).toBe(400);
    expect(mocks.reviseSeedBill).not.toHaveBeenCalled();
  });
  it('passes a validated revision and authenticated owner to the service', async () => {
    mocks.reviseSeedBill.mockResolvedValue({ id });
    const response = await request(createApp())
      .put(`/api/v1/seed-bills/${id}`)
      .send({ ...input, reason: 'Corrected weight' });
    expect(response.status).toBe(200);
    expect(mocks.reviseSeedBill).toHaveBeenCalledWith(
      id,
      { ...input, waiveSmallBalance: false, reason: 'Corrected weight' },
      'dc2e08c4-3ebc-4273-a846-ece725b4133f',
    );
  });
});
