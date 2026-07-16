import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { verifyDatabaseConnection, pool } from './db/client.js';

async function bootstrap() {
  await verifyDatabaseConnection();

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`backend listening on http://${env.HOST}:${env.PORT}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down server');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
