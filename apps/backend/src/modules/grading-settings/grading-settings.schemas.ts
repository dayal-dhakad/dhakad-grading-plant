import { z } from 'zod';
export const CropIdParamsSchema = z.strictObject({ id: z.uuid('Crop ID is invalid') });
export const CropStatusSchema = z.strictObject({ isActive: z.boolean() });
