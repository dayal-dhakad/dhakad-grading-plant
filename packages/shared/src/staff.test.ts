import { describe, expect, it } from 'vitest';
import { CreateStaffSchema } from './staff.js';
describe('staff contracts', () => {
  it('normalizes valid staff creation input', () => {
    expect(
      CreateStaffSchema.parse({ name: '  Ramesh  ', mobile: '9876543212', password: 'StrongPass1' })
        .name,
    ).toBe('Ramesh');
  });
  it('rejects short passwords and unknown fields', () => {
    expect(
      CreateStaffSchema.safeParse({ name: 'Ramesh', mobile: '9876543212', password: 'short' })
        .success,
    ).toBe(false);
    expect(
      CreateStaffSchema.safeParse({
        name: 'Ramesh',
        mobile: '9876543212',
        password: 'StrongPass1',
        role: 'ADMIN',
      }).success,
    ).toBe(false);
  });
});
