import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listCustomers: vi.fn(),
  getCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  setCustomerStatus: vi.fn(),
  getCustomerGradingDue: vi.fn(),
  getCustomerDues: vi.fn(),
}));
vi.mock('./customer.service.js', () => mocks);
vi.mock('../auth/auth.middleware.js', () => ({
  requireAuth: (_request: unknown, _response: unknown, next: () => void) => next(),
  requireRole: () => (_request: unknown, _response: unknown, next: () => void) => next(),
}));

import { createApp } from '../../app.js';

const customer = {
  id: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
  mobile: '9876543210',
  name: 'Mohan',
  village: 'Rampura',
  address: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const customerListItem = { ...customer, totalDue: '125.50' };

describe('customer routes', () => {
  beforeEach(() => vi.clearAllMocks());
  it('lists customers with validated filters', async () => {
    mocks.listCustomers.mockResolvedValue({
      customers: [customerListItem],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const response = await request(createApp()).get('/api/v1/customers?search=9876');
    const body = response.body as { customers: Array<{ totalDue: string }> };
    expect(response.status).toBe(200);
    expect(body.customers[0]?.totalDue).toBe('125.50');
    expect(mocks.listCustomers).toHaveBeenCalledWith({
      search: '9876',
      status: 'active',
      page: 1,
      pageSize: 20,
    });
  });
  it('creates a normalized customer', async () => {
    mocks.createCustomer.mockResolvedValue(customer);
    const response = await request(createApp())
      .post('/api/v1/customers')
      .send({ mobile: customer.mobile, name: '  Mohan  ', village: '  Rampura  ' });
    expect(response.status).toBe(201);
    expect(mocks.createCustomer).toHaveBeenCalledWith({
      mobile: customer.mobile,
      name: 'Mohan',
      village: 'Rampura',
    });
  });
  it('returns field-addressable errors for invalid input', async () => {
    const response = await request(createApp())
      .post('/api/v1/customers')
      .send({ mobile: '123', name: '', village: '' });
    const body = response.body as { error: { code: string; details: Array<{ path: string }> } };
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'mobile' }),
        expect.objectContaining({ path: 'name' }),
      ]),
    );
  });
  it('updates status without deleting the customer', async () => {
    mocks.setCustomerStatus.mockResolvedValue({ ...customer, isActive: false });
    const response = await request(createApp())
      .patch(`/api/v1/customers/${customer.id}/status`)
      .send({ isActive: false });
    expect(response.status).toBe(200);
    expect(mocks.setCustomerStatus).toHaveBeenCalledWith(customer.id, false);
  });
  it('returns the customer dues breakdown', async () => {
    mocks.getCustomerDues.mockResolvedValue({
      totalDue: '2900.00',
      gradingDue: '900.00',
      seedDue: '2000.00',
    });
    const response = await request(createApp()).get(`/api/v1/customers/${customer.id}/dues`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalDue: '2900.00',
      gradingDue: '900.00',
      seedDue: '2000.00',
    });
    expect(mocks.getCustomerDues).toHaveBeenCalledWith(customer.id);
  });
});
