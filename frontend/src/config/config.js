const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5013/api';
const IMAGE_URL = import.meta.env.VITE_IMAGE_URL || API_URL.replace(/\/api$/, '');

export const config = {
  API_URL,
  IMAGE_URL,
  DEFAULT_ERROR_MESSAGE: 'Something went wrong. Please try again later.',
  TOKEN_KEY: 'kissanbandi_token',
  USER_KEY: 'kissanbandi_user',
};

export function resolveImageUrl(imagePath, fallback = '/api/placeholder/300/200') {
  if (!imagePath) return fallback;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/uploads')) return `${IMAGE_URL}${imagePath}`;

  const filename = imagePath.split('/').pop();
  return `${IMAGE_URL}/uploads/product/${filename}`;
}

export default config;
