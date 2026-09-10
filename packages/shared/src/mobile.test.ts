import { describe, expect, it } from 'vitest';
import { IndianMobileSchema } from './mobile.js';
describe('IndianMobileSchema', () => {
  it('accepts exactly 10 digits', () =>
    expect(IndianMobileSchema.parse('9876543210')).toBe('9876543210'));
  it.each(['987654321', '98765432101', '+919876543210', '98765 43210', 'abcdefghij'])(
    'rejects %s',
    (value) => expect(IndianMobileSchema.safeParse(value).success).toBe(false),
  );
});
