import { describe, expect, it } from 'vitest';
import { makeCropCode } from './grading-settings.service.js';
describe('crop codes', () => {
  it('keeps readable codes for Latin names', () =>
    expect(makeCropCode('Black Gram')).toBe('BLACK_GRAM'));
  it('creates a stable code for Hindi names', () => {
    expect(makeCropCode('सरसों')).toMatch(/^CROP_[A-F0-9]{16}$/);
    expect(makeCropCode('सरसों')).toBe(makeCropCode('सरसों'));
  });
});
