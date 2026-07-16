import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { db, pool } from './client.js';
import { users } from './schema.js';
import { hashPassword } from '../utils/password.js';
import { createId } from '../utils/ids.js';

async function run() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.info('Skipping admin seed because ADMIN_EMAIL or ADMIN_PASSWORD is missing');
    await pool.end();
    return;
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, env.ADMIN_EMAIL.toLowerCase()),
  });

  if (existing) {
    await db
      .update(users)
      .set({
        name: existing.name || 'Admin',
        passwordHash: await hashPassword(env.ADMIN_PASSWORD),
        role: 'admin',
        isEmailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));

    logger.info(`Updated existing user as admin: ${env.ADMIN_EMAIL}`);
    await pool.end();
    return;
  }

  await db.insert(users).values({
    id: createId(),
    name: 'Admin',
    email: env.ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    role: 'admin',
    isEmailVerified: true,
  });

  logger.info(`Seeded admin user: ${env.ADMIN_EMAIL}`);
  await pool.end();
}

run().catch((error) => {
  logger.error('Seed failed', error);
  process.exit(1);
});
