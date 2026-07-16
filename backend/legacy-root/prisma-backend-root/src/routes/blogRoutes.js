const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { auth, admin } = require('../middleware/auth');
const { blogUpload, handleUploadError, useCloudinary } = require('../middleware/upload');

// ✅ Public routes
router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlogById);

// ✅ Admin routes with Cloudinary support
router.post('/', 
  auth, 
  admin, 
  blogUpload.single('image'), // Uses Cloudinary or local based on config
  handleUploadError,
  blogController.createBlog
);

router.put('/:id', 
  auth, 
  admin, 
  blogUpload.single('image'), // Uses Cloudinary or local based on config
  handleUploadError,
  blogController.updateBlog
);

router.delete('/:id', 
  auth, 
  admin, 
  blogController.deleteBlog
);

router.patch('/:id/status', 
  auth, 
  admin, 
  blogController.toggleBlogStatus
);

// ✅ NEW: Get storage info
router.get('/info/storage', blogController.getBlogStorageInfo);

// ✅ NEW: Upload image only (separate endpoint)
router.post('/upload-image', 
  auth, 
  admin, 
  blogUpload.single('image'),
  handleUploadError,
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { processUploadedFiles } = require('../middleware/upload');
      const uploadedImage = processUploadedFiles(req.file)[0];
      const imageUrl = uploadedImage.url || uploadedImage.secure_url;
      
      res.json({
        success: true,
        message: 'Image uploaded successfully',
        image: imageUrl,
        file: {
          filename: uploadedImage.filename || uploadedImage.publicId,
          originalName: uploadedImage.originalName,
          size: uploadedImage.size,
          url: imageUrl
        },
        storageType: useCloudinary ? 'Cloudinary' : 'Local'
      });
    } catch (error) {
      console.error('Blog image upload error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

module.exports = router;