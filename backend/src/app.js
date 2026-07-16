import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import router from './routes/index.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

  fs.mkdirSync(uploadDir, { recursive: true });

  app.set('trust proxy', 1);
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
    })
  );
  // cross-origin CORP so the frontend (different port/origin) can render /uploads images
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/uploads', express.static(uploadDir));

  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
