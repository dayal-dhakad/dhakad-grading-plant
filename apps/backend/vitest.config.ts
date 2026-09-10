import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/dhakad_test?schema=public',
      FRONTEND_ORIGIN: 'http://localhost:5173',
    },
  },
});
