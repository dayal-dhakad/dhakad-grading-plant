import { z } from 'zod';
export const HealthResponseSchema = z.strictObject({
  status: z.enum(['ok', 'degraded']),
  service: z.literal('dhakad-backend'),
  database: z.enum(['connected', 'unavailable']),
  timestamp: z.iso.datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
