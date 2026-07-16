// BlogsPage.jsx
import React, { useState, useEffect } from 'react';
import config from '../config/config';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Tag, 
  ArrowRight, 
  Search,
  Filter,
  Clock,
  Eye,
  Loader,
  ChevronRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

import blogHeroImage from '/src/assets/blog1.jpg';

const BlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // API Base URL
  const API_BASE_URL = config.API_URL;

  // Fetch published blogs
  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/blogs?status=publish`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blogs: ${response.status}`);
      }

      const data = await response.json();
      setBlogs(data.blogs || data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setError('Failed to load blogs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get image URL
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

  // Helper function to clean tags
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

  // Get all unique tags
  const allTags = [...new Set(blogs.flatMap(blog => getCleanTags(blog.tags)))];

  // Filter blogs
  const filteredBlogs = blogs.filter(blog => {
    const matchesSearch = blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const blogTags = getCleanTags(blog.tags);
    const matchesTag = !selectedTag || blogTags.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  // Handle blog click
  const handleBlogClick = (blogId) => {
    navigate(`/blog/${blogId}`);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate read time
  const calculateReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content?.split(' ').length || 0;
    return Math.ceil(words / wordsPerMinute) || 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-amber-800 text-lg font-medium">Loading our latest stories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${blogHeroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-xl"></div>
          <div className="absolute top-40 right-20 w-48 h-48 rounded-full bg-white/15 blur-2xl"></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 rounded-full bg-white/25 blur-lg"></div>
        </div>

        <div className="relative container mx-auto px-4 py-16 md:py-24 z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span className="text-sm font-semibold text-white">SRI BOGAT Stories</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white drop-shadow-2xl">
              Our Blog
              <span className="block text-yellow-300 drop-shadow-2xl">Stories</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed drop-shadow-lg">
              Discover the stories behind our premium spices, traditional methods, and sustainable farming practices
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center space-x-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span className="text-white font-medium">Farm Stories</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <Tag className="w-4 h-4 text-green-300" />
                <span className="text-white font-medium">Recipes & Tips</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                <Eye className="w-4 h-4 text-blue-300" />
                <span className="text-white font-medium">Behind the Scenes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/90"
              />
            </div>

            {/* Tag Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-5 h-5" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="pl-10 pr-8 py-3 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/90 min-w-48"
              >
                <option value="">All Topics</option>
                {allTags.map((tag, index) => (
                  <option key={index} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8">
            <p>{error}</p>
          </div>
        )}

        {/* Blog Grid */}
        {filteredBlogs.length === 0 && !loading ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-amber-900 mb-2">No stories found</h3>
            <p className="text-amber-700">
              {searchTerm || selectedTag ? 'Try adjusting your search or filter' : 'No published stories available yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <article
                key={blog._id}
                onClick={() => handleBlogClick(blog._id)}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-amber-100 hover:border-amber-300 cursor-pointer hover:-translate-y-2"
              >
                {/* Image */}
                <div className="relative overflow-hidden h-48">
                  <img
                    src={getImageUrl(blog.image)}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      console.error('Blog image load error for URL:', e.target.src);
                      console.error('Original blog.image:', blog.image);
                      console.error('Blog ID:', blog._id);
                      e.target.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop';
                    }}
                    onLoad={(e) => {
                      console.log('Blog image loaded successfully:', e.target.src);
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
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
                      {getCleanTags(blog.tags).slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {getCleanTags(blog.tags).length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          +{getCleanTags(blog.tags).length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-amber-800 transition-colors">
                    {blog.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {blog.content && blog.content.length > 150 
                      ? blog.content.substring(0, 150) + '...' 
                      : blog.content
                    }
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
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
                      <span>{calculateReadTime(blog.content)} min read</span>
                    </div>
                  </div>

                  {/* Read More Button */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-600 font-medium text-sm group-hover:text-amber-700 transition-colors">
                        Read Article
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Load More Button (if needed for pagination) */}
       
      </div>
    </div>
  );
};

export default BlogsPage;
