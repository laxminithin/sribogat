import React, { useState, useEffect } from 'react';
import config from '../../config/config';
import { 
  Calendar, 
  User, 
  Tag, 
  ArrowRight, 
  Clock,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation functions
  const handleBlogClick = (blogId) => {
    window.location.href = `/blog/${blogId}`;
  };

  const handleViewAllBlogs = () => {
    window.location.href = '/blogs';
  };

  // API Base URL
  const API_BASE_URL = config.API_URL;

  // Fetch latest published blogs for homepage preview
  useEffect(() => {
    fetchLatestBlogs();
  }, []);

  const fetchLatestBlogs = async () => {
    try {
      setLoading(true);
      
      // Explicitly fetch only published blogs
      const response = await fetch(`${API_BASE_URL}/blogs?status=publish&limit=3`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let fetchedBlogs = data.blogs || data || [];
        
        // Additional client-side filtering to ensure only published blogs
        const publishedBlogs = fetchedBlogs.filter(blog => 
          blog.status === 'publish' || blog.status === 'published'
        );
        
        console.log('Total blogs fetched:', fetchedBlogs.length);
        console.log('Published blogs filtered:', publishedBlogs.length);
        
        setBlogs(publishedBlogs);
      } else {
        console.error('Failed to fetch blogs:', response.status, response.statusText);
        setBlogs([]);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop';
    
    console.log('Processing image path:', imagePath); // Debug log
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If it's a local file path with full system path, extract filename
    if (imagePath.includes('uploads/blog/') || imagePath.includes('uploads\\blog\\')) {
      const filename = imagePath.split(/[/\\]/).pop(); // Handle both / and \ separators
      const imageUrl = `${config.IMAGE_URL}/uploads/blog/${filename}`;
      console.log('Converted image URL:', imageUrl); // Debug log
      return imageUrl;
    }
    
    // If it's just a filename, construct full URL
    if (!imagePath.includes('/') && !imagePath.includes('\\')) {
      const imageUrl = `${config.IMAGE_URL}/uploads/blog/${imagePath}`;
      console.log('Filename to URL:', imageUrl); // Debug log
      return imageUrl;
    }
    
    // Default case - assume it's a relative path
    const imageUrl = `${config.IMAGE_URL}/${imagePath}`;
    console.log('Default case URL:', imageUrl); // Debug log
    return imageUrl;
  };

  const getCleanTags = (tags) => {
    if (!tags) return [];
    
    // If already an array, clean each tag
    if (Array.isArray(tags)) {
      return tags.map(tag => {
        if (typeof tag === 'string') {
          return tag.replace(/[\[\]"']/g, '').trim();
        }
        return String(tag).trim();
      }).filter(tag => tag && tag.length > 0);
    }
    
    if (typeof tags === 'string') {
      // Remove outer brackets and quotes first
      let cleanedTags = tags.replace(/^[\[\]"']+|[\[\]"']+$/g, '');
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(cleanedTags);
        if (Array.isArray(parsed)) {
          return parsed.map(tag => String(tag).replace(/[\[\]"']/g, '').trim())
                      .filter(tag => tag && tag.length > 0);
        }
      } catch (e) {
        // If JSON parsing fails, treat as comma-separated string
        return cleanedTags
          .split(',')
          .map(tag => tag.replace(/[\[\]"']/g, '').trim())
          .filter(tag => tag && tag.length > 0);
      }
    }
    
    return [];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content?.split(' ').length || 0;
    return Math.ceil(words / wordsPerMinute) || 1;
  };

  return (
    <section className="py-16 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-amber-100 rounded-full px-6 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">BOGAT Stories</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Latest from Our
            <span className="block text-amber-600">Blog</span>
          </h2>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Discover stories about traditional farming, spice cultivation, and the journey from our family farms to your kitchen
          </p>

          {/* View All Blogs Button */}
          <button
            onClick={handleViewAllBlogs}
            className="group inline-flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-full font-semibold hover:from-amber-700 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <BookOpen className="w-4 h-4" />
            <span>View All Stories</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          /* No Blogs State */
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No published stories yet</h3>
            <p className="text-gray-600">Our latest published stories will appear here soon!</p>
          </div>
        ) : (
          /* Blog Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog, index) => (
              <article
                key={blog._id}
                onClick={() => handleBlogClick(blog._id)}
                className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-amber-100 hover:border-amber-300 cursor-pointer hover:-translate-y-2 ${
                  index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {/* Image */}
                <div className="relative overflow-hidden h-48">
                  <img
                    src={getImageUrl(blog.image)}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      console.error('Image load error for URL:', e.target.src);
                      console.error('Original blog.image:', blog.image);
                      console.error('Blog ID:', blog._id);
                      e.target.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop';
                    }}
                    onLoad={(e) => {
                      console.log('Image loaded successfully:', e.target.src);
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Featured Badge for First Blog */}
                  {index === 0 && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Featured Story
                      </span>
                    </div>
                  )}
                  
                  {/* Published Status Indicator */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      Published
                    </span>
                  </div>
                  
                  {/* Read More Indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                      <ArrowRight className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Tags */}
                  {getCleanTags(blog.tags).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getCleanTags(blog.tags).slice(0, 2).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <h3 className={`font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-amber-800 transition-colors ${
                    index === 0 ? 'text-xl' : 'text-lg'
                  }`}>
                    {blog.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {blog.content && blog.content.length > 120 
                      ? blog.content.substring(0, 120) + '...' 
                      : blog.content
                    }
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{blog.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(blog.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{calculateReadTime(blog.content)} min</span>
                    </div>
                  </div>

                  {/* Read More Link */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-amber-600 font-medium text-sm group-hover:text-amber-700 transition-colors">
                      Read Full Story
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        {blogs.length > 0 && (
          <div className="text-center mt-12">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-amber-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Discover More Stories
              </h3>
              <p className="text-gray-600 mb-6">
                Explore our complete collection of published articles about sustainable farming and traditional spice cultivation
              </p>
              <button
                onClick={handleViewAllBlogs}
                className="group inline-flex items-center space-x-2 bg-white text-amber-600 px-8 py-3 rounded-full font-semibold border-2 border-amber-600 hover:bg-amber-600 hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <span>Explore All Published Articles</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Blogs;
