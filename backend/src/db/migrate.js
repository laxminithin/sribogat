import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db, pool } from './client.js';
import { logger } from '../config/logger.js';

async function run() {
  await migrate(db, {
    migrationsFolder: 'drizzle',
  });
  logger.info('Database migrations applied');
  await pool.end();
}

run().catch((error) => {
  logger.error('Migration failed', error);
  process.exit(1);
});
