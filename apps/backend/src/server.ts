import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/database/prisma.js';
import { processNotificationOutbox } from './modules/notifications/notification.service.js';
const server = createApp().listen(env.PORT, () =>
  console.log(`Backend listening on port ${env.PORT}`),
);
const notificationTimer = setInterval(() => void processNotificationOutbox(), 10_000);
void processNotificationOutbox();
const shutdown = (signal: string) => {
  clearInterval(notificationTimer);
  console.log(`${signal} received; shutting down`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
