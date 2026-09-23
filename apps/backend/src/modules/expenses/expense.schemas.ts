import { ExpenseCategory } from '@prisma/client';
import { z } from 'zod';
export const ExpenseIdSchema = z.strictObject({ id: z.uuid() });
export const ExpenseListQuerySchema = z
  .strictObject({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(10).max(50).default(20),
  })
  .refine((x) => !x.from || !x.to || x.from <= x.to, {
    path: ['to'],
    message: 'End date must be on or after start date',
  });
export type ExpenseListQuery = z.infer<typeof ExpenseListQuerySchema>;
