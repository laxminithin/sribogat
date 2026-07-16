const { cloudinary, deleteImage, extractPublicId, optimizeImageUrl } = require('../config/cloudinary');

class ImageService {
  
  // Process uploaded files and return URLs
  static processUploadedImages(files) {
    if (!files) return [];
    
    if (Array.isArray(files)) {
      return files.map(file => ({
        url: file.path,
        publicId: file.filename,
        secure_url: file.secure_url || file.path
      }));
    }
    
    // Single file
    return [{
      url: files.path,
      publicId: files.filename,
      secure_url: files.secure_url || files.path
    }];
  }
  
  // Delete single image
  static async deleteImageByUrl(imageUrl) {
    try {
      const publicId = extractPublicId(imageUrl);
      if (!publicId) {
        throw new Error('Could not extract public ID from URL');
      }
      
      const result = await deleteImage(publicId);
      return result;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
  
  // Delete multiple images
  static async deleteMultipleImages(imageUrls) {
    try {
      const deletePromises = imageUrls.map(url => this.deleteImageByUrl(url));
      const results = await Promise.allSettled(deletePromises);
      
      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');
      
      return {
        successful: successful.length,
        failed: failed.length,
        errors: failed.map(result => result.reason.message)
      };
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      throw error;
    }
  }
  
  // Get optimized image URLs for different sizes
  static getOptimizedUrls(originalUrl) {
    return {
      thumbnail: optimizeImageUrl(originalUrl, { width: 300, height: 300 }),
      medium: optimizeImageUrl(originalUrl, { width: 600, height: 600 }),
      large: optimizeImageUrl(originalUrl, { width: 1200, height: 1200 }),
      original: originalUrl
    };
  }
  
  // Upload image from URL (useful for migrations)
  static async uploadFromUrl(imageUrl, options = {}) {
    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        folder: 'products',
        ...options
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error('Error uploading from URL:', error);
      throw error;
    }
  }
  
  // Upload base64 image
  static async uploadBase64(base64String, options = {}) {
    try {
      const result = await cloudinary.uploader.upload(base64String, {
        folder: 'products',
        ...options
      });
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };
    } catch (error) {
      console.error('Error uploading base64:', error);
      throw error;
    }
  }
  
  // Generate image variants (thumbnails, etc.)
  static async generateVariants(publicId, variants = []) {
    try {
      const defaultVariants = [
        { suffix: '_thumb', width: 300, height: 300, crop: 'fill' },
        { suffix: '_medium', width: 600, height: 600, crop: 'limit' },
        { suffix: '_large', width: 1200, height: 1200, crop: 'limit' }
      ];
      
      const variantsToCreate = variants.length > 0 ? variants : defaultVariants;
      const results = {};
      
      for (const variant of variantsToCreate) {
        const url = cloudinary.url(publicId, {
          width: variant.width,
          height: variant.height,
          crop: variant.crop || 'limit',
          quality: 'auto:good',
          fetch_format: 'auto'
        });
        
        results[variant.suffix.replace('_', '')] = url;
      }
      
      return results;
    } catch (error) {
      console.error('Error generating variants:', error);
      throw error;
    }
  }
  
  // Validate image file
  static validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }
    
    return true;
  }
  
  // Get image info from Cloudinary
  static async getImageInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Error getting image info:', error);
      throw error;
    }
  }
}

module.exports = ImageService;