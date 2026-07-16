const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5013/api';
const IMAGE_URL = import.meta.env.VITE_IMAGE_URL || API_URL.replace(/\/api$/, '');

export const config = {
  API_URL,
  IMAGE_URL,
  DEFAULT_ERROR_MESSAGE: 'Something went wrong. Please try again later.',
  TOKEN_KEY: 'kissanbandi_token',
  USER_KEY: 'kissanbandi_user',
};

// Inline SVG data URI: always renders, can never 404 or trigger an onError loop.
export const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
      '<rect width="100%" height="100%" fill="#f3f4f6"/>' +
      '<text x="50%" y="50%" fill="#9ca3af" font-family="sans-serif" font-size="16" ' +
      'text-anchor="middle" dominant-baseline="middle">No Image</text></svg>'
  );

export function resolveImageUrl(imagePath, fallback = FALLBACK_IMAGE) {
  if (!imagePath) return fallback;
  if (imagePath.startsWith('data:')) return imagePath;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/uploads')) return `${IMAGE_URL}${imagePath}`;

  const filename = imagePath.split('/').pop();
  return `${IMAGE_URL}/uploads/products/${filename}`;
}

export default config;
