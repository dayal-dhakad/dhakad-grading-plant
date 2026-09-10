import { z } from 'zod';
import { IndianMobileSchema } from './mobile.js';

export const StaffSchema = z.strictObject({
  id: z.uuid(),
  mobile: IndianMobileSchema,
  name: z.string(),
  isActive: z.boolean(),
  entryCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const CreateStaffSchema = z.strictObject({
  mobile: IndianMobileSchema,
  name: z.string().trim().min(1, 'Staff name is required').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});
export const StaffListResponseSchema = z.strictObject({
  staff: z.array(StaffSchema),
  pagination: z.strictObject({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export const StaffResponseSchema = z.strictObject({ staff: StaffSchema });
export type Staff = z.infer<typeof StaffSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type StaffListResponse = z.infer<typeof StaffListResponseSchema>;
