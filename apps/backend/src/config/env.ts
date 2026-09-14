import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SMS_FLOW_ID: z.string().optional(),
  MSG91_WHATSAPP_INTEGRATED_NUMBER: z
    .union([z.literal(''), z.string().regex(/^91[6-9]\d{9}$/)])
    .optional(),
  MSG91_WHATSAPP_TEMPLATE_NAME: z.string().optional(),
  MSG91_WHATSAPP_TEMPLATE_LANGUAGE: z.string().min(2).default('en'),
});
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid backend environment', z.treeifyError(result.error));
  throw new Error('Backend environment configuration is invalid');
}
export const env = result.data;
