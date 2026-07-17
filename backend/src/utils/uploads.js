import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const productsUploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'products');

// Maps a stored image path (e.g. "/uploads/products/169-foo.png") back to its
// location on disk. Returns null for anything that isn't a local product upload
// (external URLs, blank values) so we never touch files we didn't create.
function resolveLocalUploadPath(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.includes('/uploads/products/')) {
    return null;
  }

  const filename = path.basename(imageUrl); // basename guards against path traversal
  if (!filename) return null;

  return path.join(productsUploadDir, filename);
}

// Best-effort removal of product image files from disk. A missing file is not an
// error (the row may reference an already-deleted upload); anything else is logged
// and swallowed so image cleanup never fails the request that triggered it.
export async function deleteProductImages(imageUrls = []) {
  const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  await Promise.all(
    urls.map(async (imageUrl) => {
      const filePath = resolveLocalUploadPath(imageUrl);
      if (!filePath) return;

      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn('Failed to delete product image', filePath, error.message);
        }
      }
    })
  );
}
