import { describe, expect, it } from 'vitest';
import { CreateCropSettingSchema } from './grading-settings.js';
describe('grading settings contracts', () => {
  it('accepts a crop and two-decimal rate', () => {
    expect(
      CreateCropSettingSchema.safeParse({
        name: 'Mustard',
        cleaningRate: '35.50',
        unitId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
      }).success,
    ).toBe(true);
  });
  it('rejects unknown fields and excessive precision', () => {
    expect(
      CreateCropSettingSchema.safeParse({
        name: 'Mustard',
        cleaningRate: '35.555',
        unitId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
        active: true,
      }).success,
    ).toBe(false);
  });
  it('accepts a Hindi crop name', () => {
    expect(
      CreateCropSettingSchema.safeParse({
        name: 'सरसों',
        cleaningRate: '35.50',
        unitId: '4ea4f8dc-9f72-4fb3-99a4-fdfc40ced5ea',
      }).success,
    ).toBe(true);
  });
});
