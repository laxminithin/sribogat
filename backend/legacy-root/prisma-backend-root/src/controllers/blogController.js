const Blog = require('../models/Blog');
const { processUploadedFiles, deleteImages, useCloudinary } = require('../middleware/upload');

// Create a new blog post
exports.createBlog = async (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    
    console.log('📝 Creating blog post:', { title, author });
    console.log('🏪 Storage type:', useCloudinary ? 'Cloudinary' : 'Local');
    
    let imagePath = null;
    
    // ✅ Handle image upload using the upload middleware
    if (req.file) {
      console.log('📁 Processing blog image upload');
      const uploadedImage = processUploadedFiles(req.file);
      imagePath = uploadedImage[0].url || uploadedImage[0].secure_url;
      
      console.log('✅ Blog image processed:', {
        storageType: useCloudinary ? 'Cloudinary' : 'Local',
        url: imagePath
      });
    }

    const blog = new Blog({
      title,
      content,
      author,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      image: imagePath,
    });

    const saved = await blog.save();
    
    console.log('✅ Blog post created successfully:', saved._id);
    
    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      blog: saved,
      storageType: useCloudinary ? 'Cloudinary' : 'Local'
    });
    
  } catch (err) {
    console.error('❌ Blog creation error:', err);
    
    // ✅ Cleanup uploaded image if blog creation fails
    if (req.file) {
      try {
        const uploadedImage = processUploadedFiles(req.file);
        const imageUrl = uploadedImage[0].url || uploadedImage[0].secure_url;
        await deleteImages([imageUrl]);
        console.log('🧹 Cleaned up uploaded image after error');
      } catch (cleanupError) {
        console.error('Error cleaning up image:', cleanupError);
      }
    }
    
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get all blog posts
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      blogs,
      count: blogs.length
    });
  } catch (err) {
    console.error('❌ Error fetching blogs:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get single blog post by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ 
        success: false,
        error: 'Blog not found' 
      });
    }
    
    res.json({
      success: true,
      blog
    });
  } catch (err) {
    console.error('❌ Error fetching blog:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update blog post
exports.updateBlog = async (req, res) => {
  try {
    const { title, content, author, tags } = req.body;
    const blogId = req.params.id;
    
    console.log('📝 Updating blog post:', blogId);
    console.log('🏪 Storage type:', useCloudinary ? 'Cloudinary' : 'Local');
    
    // Get existing blog to handle image deletion
    const existingBlog = await Blog.findById(blogId);
    if (!existingBlog) {
      return res.status(404).json({ 
        success: false,
        error: 'Blog not found' 
      });
    }

    const updatedFields = {
      title,
      content,
      author,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    };

    // ✅ Handle new image upload
    if (req.file) {
      console.log('📁 Processing new blog image upload');
      const uploadedImage = processUploadedFiles(req.file);
      const newImageUrl = uploadedImage[0].url || uploadedImage[0].secure_url;
      
      // Delete old image if it exists
      if (existingBlog.image) {
        try {
          await deleteImages([existingBlog.image]);
          console.log('🧹 Deleted old blog image');
        } catch (deleteError) {
          console.error('Error deleting old blog image:', deleteError);
        }
      }
      
      updatedFields.image = newImageUrl;
      
      console.log('✅ Blog image updated:', {
        storageType: useCloudinary ? 'Cloudinary' : 'Local',
        url: newImageUrl
      });
    }

    const updatedBlog = await Blog.findByIdAndUpdate(blogId, updatedFields, {
      new: true,
      runValidators: true
    });

    console.log('✅ Blog post updated successfully:', updatedBlog._id);

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      blog: updatedBlog,
      storageType: useCloudinary ? 'Cloudinary' : 'Local'
    });
    
  } catch (err) {
    console.error('❌ Blog update error:', err);
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Delete a blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ 
        success: false,
        error: 'Blog not found' 
      });
    }

    // ✅ Delete associated image before deleting blog
    if (blog.image) {
      try {
        await deleteImages([blog.image]);
        console.log('🧹 Deleted blog image from storage');
      } catch (deleteError) {
        console.error('Error deleting blog image:', deleteError);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    
    console.log('✅ Blog post deleted successfully:', req.params.id);
    
    res.json({ 
      success: true,
      message: 'Blog post and associated image deleted successfully' 
    });
  } catch (err) {
    console.error('❌ Error deleting blog:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Toggle blog status (publish <-> draft)
exports.toggleBlogStatus = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ 
        success: false,
        error: 'Blog not found' 
      });
    }

    // Toggle status
    const newStatus = blog.status === 'publish' ? 'draft' : 'publish';
    blog.status = newStatus;

    await blog.save();

    console.log('✅ Blog status updated:', { id: blog._id, status: newStatus });

    res.json({ 
      success: true,
      message: `Blog status updated to ${newStatus}`, 
      blog 
    });
  } catch (err) {
    console.error('❌ Error toggling blog status:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// ✅ NEW: Get blog storage info
exports.getBlogStorageInfo = async (req, res) => {
  try {
    res.json({
      success: true,
      storageType: useCloudinary ? 'Cloudinary' : 'Local',
      maxFileSize: '5MB',
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};