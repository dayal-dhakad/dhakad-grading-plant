import { z } from 'zod';
export const ExportIdSchema = z.strictObject({ id: z.uuid() });
