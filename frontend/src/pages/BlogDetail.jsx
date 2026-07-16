// BlogDetail.jsx
import React, { useState, useEffect } from 'react';
import config from '../config/config';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  User, 
  Tag, 
  ArrowLeft, 
  Clock,
  Share2,
  Bookmark,
  Heart,
  Loader,
  ChevronRight,
  Coffee,
  Sparkles,
  Copy,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react';

const BlogDetail = () => {
  const { id } = useParams(); // Get blog ID from URL
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // API Base URL
  const API_BASE_URL = config.API_URL;

  // Fetch blog details
  useEffect(() => {
    if (id) {
      fetchBlogDetail();
      fetchRelatedBlogs();
    }
  }, [id]);

  const fetchBlogDetail = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Blog not found');
        }
        throw new Error(`Failed to fetch blog: ${response.status}`);
      }

      const data = await response.json();
      setBlog(data.blog || data);
    } catch (error) {
      console.error('Error fetching blog:', error);
      setError(error.message || 'Failed to load blog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedBlogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/blogs?status=publish&limit=3`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const blogs = data.blogs || data || [];
        setRelatedBlogs(blogs.filter(b => b._id !== id).slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching related blogs:', error);
    }
  };

  // Helper functions
  const getImageUrl = (imagePath) => {
    if (!imagePath) return 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=400&fit=crop';
    
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
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateReadTime = (content) => {
    const wordsPerMinute = 200;
    const words = content?.split(' ').length || 0;
    return Math.ceil(words / wordsPerMinute) || 1;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.title,
          text: blog.title,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      setShowShareMenu(!showShareMenu);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
    setShowShareMenu(false);
  };

  const shareToSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(blog.title);
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
    setShowShareMenu(false);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // Here you would typically send a request to your backend
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    // Here you would typically send a request to your backend
  };

  const navigateToRelatedBlog = (blogId) => {
    navigate(`/blog/${blogId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <Loader className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
          <p className="text-amber-800 text-lg font-medium">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center pt-20">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/blogs')}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Back to Blogs
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">Blog not found</h2>
          <button
            onClick={() => navigate('/blogs')}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Back to Blogs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pt-20">
      {/* Article Content */}
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button - Now inline with content */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/blogs')}
            className="flex items-center space-x-2 text-amber-600 hover:text-amber-800 transition-colors bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Blog</span>
          </button>
        </div>

        {/* Hero Image */}
<div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden mb-8 shadow-2xl mx-auto">
          <img
            src={getImageUrl(blog.image)}
            alt={blog.title}
              className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=400&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
          
          {/* Share Button Only */}
          <div className="absolute bottom-4 right-4">
            <div className="relative">
              <button
                onClick={handleShare}
                className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:bg-white/30 transition-all duration-300"
              >
                <Share2 className="w-5 h-5" />
              </button>
              
              {/* Share Menu */}
              {showShareMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-48">
                  <button
                    onClick={copyToClipboard}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                    <span>Twitter</span>
                  </button>
                  <button
                    onClick={() => shareToSocial('linkedin')}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Article Header */}
        <header className="mb-8">
          {/* Tags */}
          {getCleanTags(blog.tags).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {getCleanTags(blog.tags).map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {blog.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="font-medium">{blog.author}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(blog.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{calculateReadTime(blog.content)} min read</span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-20 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></div>
        </header>

        {/* Article Body */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-amber-200">
            <div className="text-gray-800 leading-relaxed text-lg whitespace-pre-wrap">
              {blog.content}
            </div>
          </div>
        </div>

        {/* Article Footer */}
        <footer className="mt-12 pt-8 border-t border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Share this article:</span>
              <button
                onClick={handleShare}
                className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {formatDate(blog.updatedAt)}
            </div>
          </div>
        </footer>
      </article>

      {/* Related Articles */}
      {relatedBlogs.length > 0 && (
        <section className="bg-white/50 backdrop-blur-sm border-t border-amber-200 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              More Stories You Might Like
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {relatedBlogs.map((relatedBlog) => (
                <article
                  key={relatedBlog._id}
                  onClick={() => navigateToRelatedBlog(relatedBlog._id)}
                  className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-amber-100 hover:border-amber-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="relative overflow-hidden h-40">
                    <img
                      src={getImageUrl(relatedBlog.image)}
                      alt={relatedBlog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        console.error('Related blog image load error for URL:', e.target.src);
                        console.error('Original relatedBlog.image:', relatedBlog.image);
                        console.error('Related Blog ID:', relatedBlog._id);
                        e.target.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=200&fit=crop';
                      }}
                      onLoad={(e) => {
                        console.log('Related blog image loaded successfully:', e.target.src);
                      }}
                    />
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-amber-800 transition-colors">
                      {relatedBlog.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {relatedBlog.content?.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(relatedBlog.createdAt)}</span>
                      <div className="flex items-center space-x-1 text-amber-600">
                        <span className="font-medium">Read more</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter Signup Section */}
      <section className="bg-gradient-to-r from-amber-600 to-orange-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-semibold text-white">Stay Updated</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Never Miss Our Stories
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Get the latest updates about our farm, new recipes, and traditional cooking methods delivered to your inbox.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button className="bg-white text-amber-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap">
                Subscribe Now
              </button>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
};

export default BlogDetail;
