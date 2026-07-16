const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

console.log('Loading enhanced upload middleware with Cloudinary support...');

// ✅ STEP 1: Debug environment variables
console.log('🔍 Environment Debug:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
console.log('USE_CLOUDINARY:', process.env.USE_CLOUDINARY);
console.log('NODE_ENV:', process.env.NODE_ENV);

// ✅ STEP 2: Check if Cloudinary is properly configured
const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET
);

console.log('✅ Cloudinary configured:', cloudinaryConfigured);

// Configure Cloudinary
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('☁️ Cloudinary configured successfully');
} else {
  console.warn('⚠️ Cloudinary not configured - using local storage');
}

// Ensure uploads directories exist (for local fallback)
const blogUploadDir = path.join(__dirname, '../uploads/blog');
const reviewUploadDir = path.join(__dirname, '../uploads/reviews');
const productUploadDir = path.join(__dirname, '../uploads/product');

[blogUploadDir, reviewUploadDir, productUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created directory:', dir);
  }
});

// File filter for images (shared)
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG, PNG, WEBP, and GIF files are allowed'), false);
  }
};

// ==================== CLOUDINARY STORAGE CONFIGURATIONS ====================

// Product Cloudinary storage
const productCloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomNum = Math.round(Math.random() * 1e9);
      const originalName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      return `product_${timestamp}_${randomNum}_${originalName}`;
    },
  },
});

// Blog Cloudinary storage
const blogCloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 800, crop: 'limit', quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      return `blog_${timestamp}_${originalName}`;
    },
  },
});

// Review Cloudinary storage
const reviewCloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'reviews',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    public_id: (req, file) => {
      const userId = req.user?.userId || req.user?._id || 'anonymous';
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
      return `review_${timestamp}_${userId}_${originalName}`;
    },
  },
});

// ==================== LOCAL STORAGE CONFIGURATIONS (FALLBACK) ====================

// Product storage config
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productUploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNum = Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `product-${timestamp}-${randomNum}${extension}`;
    cb(null, filename);
  }
});

// Blog storage config
const blogStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, blogUploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Review storage config
const reviewStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, reviewUploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user?.userId || req.user?._id || 'anonymous';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `review-${timestamp}-${userId}${extension}`;
    cb(null, filename);
  }
});

// ==================== STORAGE SELECTION ====================

// ✅ STEP 3: Force Cloudinary if configured, otherwise use local
const useCloudinary = cloudinaryConfigured;

console.log('🏪 Final storage decision:', useCloudinary ? 'Cloudinary' : 'Local');
console.log('📝 Reason:', cloudinaryConfigured ? 'Cloudinary credentials found' : 'Missing Cloudinary credentials');

// ==================== MULTER INSTANCES ====================

// Product upload instance
const productUpload = multer({
  storage: useCloudinary ? productCloudinaryStorage : productStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files per product
  }
});

// Blog upload instance
const blogUpload = multer({
  storage: useCloudinary ? blogCloudinaryStorage : blogStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Review upload instance
const reviewUpload = multer({
  storage: useCloudinary ? reviewCloudinaryStorage : reviewStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5 // Maximum 5 files per review
  }
});

// ==================== MIDDLEWARE FUNCTIONS ====================

// Middleware for handling multiple product images
const uploadProductImages = productUpload.array('images', 10);

// Middleware for handling single product image
const uploadSingleProductImage = productUpload.single('image');

// Middleware for handling multiple review images
const uploadReviewImages = reviewUpload.array('images', 5);

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  console.log('Upload error handler called:', err?.message);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB per image for products, 5MB for reviews/blogs.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 images allowed per product, 5 for reviews.'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
};

// ==================== HELPER FUNCTIONS ====================

// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (url) => {
  if (!useCloudinary || !url || !url.includes('cloudinary.com')) return null;
  
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
      const pathParts = parts.slice(uploadIndex + 2);
      const fullPath = pathParts.join('/');
      return fullPath.replace(/\.[^/.]+$/, '');
    }
    return null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Helper function to delete image from Cloudinary
const deleteCloudinaryImage = async (publicId) => {
  if (!useCloudinary || !publicId) return null;
  
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Deleted from Cloudinary:', publicId, result);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', publicId, error);
    throw error;
  }
};

// ✅ STEP 4: Fixed processUploadedFiles function
const processUploadedFiles = (files) => {
  if (!files) return [];
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  return fileArray.map(file => {
    if (useCloudinary) {
      // ✅ For Cloudinary uploads
      console.log('🔄 Processing Cloudinary file:', {
        path: file.path,
        secure_url: file.secure_url,
        filename: file.filename,
        originalname: file.originalname
      });
      
      return {
        url: file.secure_url || file.path, // Use secure_url for Cloudinary
        secure_url: file.secure_url || file.path,
        publicId: file.filename, // This is the public_id from Cloudinary
        originalName: file.originalname,
        size: file.size
      };
    } else {
      // ✅ For local uploads
      const baseUrl = process.env.BASE_URL || 'https://bogat.onrender.com';
      const folder = file.destination ? file.destination.split('/').pop() : 'product';
      
      console.log('🔄 Processing local file:', {
        filename: file.filename,
        folder: folder,
        destination: file.destination
      });
      
      return {
        url: `${baseUrl}/uploads/${folder}/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        path: file.path
      };
    }
  });
};

// Helper function to delete images (works for both local and Cloudinary)
const deleteImages = async (imageUrls) => {
  if (!Array.isArray(imageUrls)) imageUrls = [imageUrls];
  
  const results = [];
  
  for (const url of imageUrls) {
    try {
      if (useCloudinary && url.includes('cloudinary.com')) {
        const publicId = extractPublicId(url);
        if (publicId) {
          const result = await deleteCloudinaryImage(publicId);
          results.push({ url, success: true, result });
        }
      } else {
        // Delete local file
        const filename = url.split('/').pop();
        // Try different folder structures
        const possiblePaths = [
          path.join(__dirname, '../uploads/product', filename),
          path.join(__dirname, '../uploads', filename),
          path.join(__dirname, '../uploads/blog', filename),
          path.join(__dirname, '../uploads/reviews', filename)
        ];
        
        let deleted = false;
        for (const filePath of possiblePaths) {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            results.push({ url, success: true, deleted: filePath });
            deleted = true;
            break;
          }
        }
        
        if (!deleted) {
          results.push({ url, success: false, error: 'File not found' });
        }
      }
    } catch (error) {
      console.error('Error deleting image:', url, error);
      results.push({ url, success: false, error: error.message });
    }
  }
  
  return results;
};

// Cleanup function for local files
const cleanupFiles = (filePaths) => {
  if (!useCloudinary && Array.isArray(filePaths)) {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Cleaned up local file:', filePath);
        }
      } catch (error) {
        console.error('Error deleting local file:', filePath, error);
      }
    });
  }
};

// ✅ STEP 5: Log final configuration
console.log('==========================================');
console.log('Upload middleware loaded successfully');
console.log('Storage mode:', useCloudinary ? '☁️ Cloudinary' : '💾 Local');
console.log('Cloudinary configured:', cloudinaryConfigured);
if (cloudinaryConfigured) {
  console.log('Cloudinary cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
}
console.log('==========================================');

// ==================== EXPORTS ====================

// Default export (for existing blog functionality)
module.exports = blogUpload;

// Named exports for all functionality
module.exports.uploadReviewImages = uploadReviewImages;
module.exports.uploadProductImages = uploadProductImages;
module.exports.uploadSingleProductImage = uploadSingleProductImage;
module.exports.handleUploadError = handleUploadError;
module.exports.cleanupFiles = cleanupFiles;
module.exports.blogUpload = blogUpload;
module.exports.productUpload = productUpload;
module.exports.reviewUpload = reviewUpload;

// Cloudinary-specific exports
module.exports.deleteImages = deleteImages;
module.exports.deleteCloudinaryImage = deleteCloudinaryImage;
module.exports.extractPublicId = extractPublicId;
module.exports.processUploadedFiles = processUploadedFiles;
module.exports.useCloudinary = useCloudinary;
module.exports.cloudinary = cloudinary;