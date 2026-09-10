import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
});
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid backend environment', z.treeifyError(result.error));
  throw new Error('Backend environment configuration is invalid');
}
export const env = result.data;
