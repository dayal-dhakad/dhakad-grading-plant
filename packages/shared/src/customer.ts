import { z } from 'zod';
import { IndianMobileSchema } from './mobile.js';

const requiredText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maximum, `${label} must not exceed ${maximum} characters`);

export const CustomerSchema = z.strictObject({
  id: z.uuid(),
  mobile: IndianMobileSchema,
  name: z.string(),
  address: z.string().nullable(),
  village: z.string(),
  isActive: z.boolean(),
  smsConsent: z.boolean().default(false),
  whatsappConsent: z.boolean().default(true),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const CustomerListItemSchema = CustomerSchema.extend({
  totalDue: z.string().regex(/^\d+\.\d{2}$/),
});
export const CreateCustomerSchema = z.strictObject({
  mobile: IndianMobileSchema,
  name: requiredText('Customer name', 120),
  village: requiredText('Village', 120),
  address: z.string().trim().max(300, 'Address must not exceed 300 characters').optional(),
  smsConsent: z.boolean().optional(),
  whatsappConsent: z.boolean().optional(),
});
export const UpdateCustomerSchema = CreateCustomerSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: 'Provide at least one field to update' },
);
export const CustomerListResponseSchema = z.strictObject({
  customers: z.array(CustomerListItemSchema),
  pagination: z.strictObject({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export const CustomerResponseSchema = z.strictObject({ customer: CustomerSchema });
const DueAmountSchema = z.string().regex(/^\d+\.\d{2}$/);
export const CustomerDuesResponseSchema = z.strictObject({
  totalDue: DueAmountSchema,
  gradingDue: DueAmountSchema,
  seedDue: DueAmountSchema,
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;
