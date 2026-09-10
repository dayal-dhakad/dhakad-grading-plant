import { describe, expect, it } from 'vitest';
import { CreateCustomerSchema, UpdateCustomerSchema } from './customer.js';

describe('customer input schemas', () => {
  it('trims accepted customer fields', () => {
    expect(
      CreateCustomerSchema.parse({
        mobile: '9876543210',
        name: '  Mohan  ',
        village: '  Rampura  ',
        address: '  Main road  ',
      }),
    ).toEqual({ mobile: '9876543210', name: 'Mohan', village: 'Rampura', address: 'Main road' });
  });
  it.each([
    [{ mobile: '98765', name: 'Mohan', village: 'Rampura' }],
    [{ mobile: '9876543210', name: ' ', village: 'Rampura' }],
    [{ mobile: '9876543210', name: 'Mohan', village: ' ' }],
    [{ mobile: '9876543210', name: 'Mohan', village: 'Rampura', extra: true }],
  ])('rejects malformed customer input %#', (input) => {
    expect(CreateCustomerSchema.safeParse(input).success).toBe(false);
  });
  it('requires at least one update field', () => {
    expect(UpdateCustomerSchema.safeParse({}).success).toBe(false);
  });
});
