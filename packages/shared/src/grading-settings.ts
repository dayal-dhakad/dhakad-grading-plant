import { z } from 'zod';
const money = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Rate must be a valid amount with up to 2 decimal places');
export const CropSettingSchema = z.strictObject({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  cleaningRate: z.string(),
  unit: z.strictObject({ id: z.uuid(), name: z.string(), symbol: z.string() }),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const CreateCropSettingSchema = z.strictObject({
  name: z.string().trim().min(1, 'Crop name is required').max(100),
  cleaningRate: money,
  unitId: z.uuid(),
});
export const UpdateCropSettingSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    cleaningRate: money.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });
export const CropSettingListResponseSchema = z.strictObject({
  crops: z.array(CropSettingSchema),
  units: z.array(z.strictObject({ id: z.uuid(), name: z.string(), symbol: z.string() })),
});
export const CropSettingResponseSchema = z.strictObject({ crop: CropSettingSchema });
export type CropSetting = z.infer<typeof CropSettingSchema>;
export type CreateCropSettingInput = z.infer<typeof CreateCropSettingSchema>;
export type UpdateCropSettingInput = z.infer<typeof UpdateCropSettingSchema>;
