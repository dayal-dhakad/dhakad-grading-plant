import { z } from 'zod';
const schema = z.object({ VITE_API_BASE_URL: z.string().min(1).default('/api/v1') });
export const frontendEnv = schema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL as unknown,
});
