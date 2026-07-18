import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'products');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image uploads are allowed'));
    return;
  }

  cb(null, true);
}

export const productUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

const settingsDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'settings');

fs.mkdirSync(settingsDir, { recursive: true });

const settingsStorage = multer.diskStorage({
  destination: settingsDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const FONT_EXTENSIONS = new Set(['.ttf', '.woff', '.woff2']);

function settingsFileFilter(req, file, cb) {
  if (file.fieldname === 'logo' || /^slide(Image|Bg)_\d+$/.test(file.fieldname)) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Logo and slide uploads must be images (PNG, JPG or SVG)'));
      return;
    }
    cb(null, true);
    return;
  }

  if (file.fieldname === 'font') {
    if (!FONT_EXTENSIONS.has(path.extname(file.originalname).toLowerCase())) {
      cb(new Error('Font must be a .ttf, .woff or .woff2 file'));
      return;
    }
    cb(null, true);
    return;
  }

  cb(new Error('Unexpected upload field'));
}

export const settingsUpload = multer({
  storage: settingsStorage,
  fileFilter: settingsFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    // logo + font + product/background image per slide (6 slides max)
    files: 14,
  },
});
