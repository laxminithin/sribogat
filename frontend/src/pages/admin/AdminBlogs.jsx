import React, { useState, useEffect } from 'react';
import config from '../../config/config';
import { 
 Plus, 
 Edit, 
 Trash2, 
 Eye, 
 EyeOff, 
 Calendar, 
 User, 
 Tag,
 Save,
 X,
 Search,
 Filter,
 ImageIcon,
 Upload,
 Loader
} from 'lucide-react';

const AdminBlogs = () => {
 const [blogs, setBlogs] = useState([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [showCreateForm, setShowCreateForm] = useState(false);
 const [editingBlog, setEditingBlog] = useState(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterStatus, setFilterStatus] = useState('all');
 const [error, setError] = useState('');
 const [formData, setFormData] = useState({
   title: '',
   content: '',
   image: '',
   imageFile: null,
   tags: [],
   tagInput: '',
   author: 'Admin',
   status: 'draft'
 });

 // API Base URL - Update this to match your backend
 const API_BASE_URL = config.API_URL;
 
 // Helper function to get auth headers
 const getAuthHeaders = () => {
   const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
   return {
     'Authorization': token ? `Bearer ${token}` : '',
   };
 };

 // Fetch blogs from database
 useEffect(() => {
   fetchBlogs();
 }, []);

 const fetchBlogs = async () => {
   try {
     setLoading(true);
     setError('');
     
     const response = await fetch(`${API_BASE_URL}/blogs`, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
         ...getAuthHeaders()
       }
     });

     if (response.status === 401) {
       setError('Authentication failed. Please login again.');
       return;
     }

     if (!response.ok) {
       throw new Error(`Failed to fetch blogs: ${response.status} ${response.statusText}`);
     }

     const data = await response.json();
     setBlogs(data.blogs || data || []);
   } catch (error) {
     console.error('Error fetching blogs:', error);
     setError(error.message || 'Failed to fetch blogs. Please check your connection.');
   } finally {
     setLoading(false);
   }
 };

 const handleSubmit = async (e) => {
   e.preventDefault();
   setSubmitting(true);
   setError('');

   try {
     const tagsArray = Array.isArray(formData.tags) ? formData.tags : [];
     
     const submitData = new FormData();
     submitData.append('title', formData.title);
     submitData.append('content', formData.content);
     submitData.append('tags', JSON.stringify(tagsArray));
     submitData.append('author', formData.author);
     submitData.append('status', formData.status);
     
     if (formData.imageFile) {
       submitData.append('image', formData.imageFile);
     } else if (formData.image) {
       submitData.append('imageUrl', formData.image);
     }

     const url = editingBlog 
       ? `${API_BASE_URL}/blogs/${editingBlog._id}`
       : `${API_BASE_URL}/blogs`;
     
     const method = editingBlog ? 'PUT' : 'POST';

     const response = await fetch(url, {
       method: method,
       headers: {
         ...getAuthHeaders()
       },
       body: submitData
     });

     if (response.status === 401) {
       setError('Authentication failed. Please login again.');
       return;
     }

     if (response.status === 404) {
       setError('Blog not found. It may have been deleted.');
       return;
     }

     if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
     }

     const result = await response.json();
     
     if (editingBlog) {
       setBlogs(blogs.map(blog => 
         blog._id === editingBlog._id ? (result.blog || result) : blog
       ));
     } else {
       setBlogs([(result.blog || result), ...blogs]);
     }

     resetForm();
     
   } catch (error) {
     console.error('Error saving blog:', error);
     setError(error.message || 'Failed to save blog. Please try again.');
   } finally {
     setSubmitting(false);
   }
 };

 const resetForm = () => {
   setFormData({
     title: '',
     content: '',
     image: '',
     imageFile: null,
     tags: [],
     tagInput: '',
     author: 'Admin',
     status: 'draft'
   });
   setShowCreateForm(false);
   setEditingBlog(null);
   setError('');
 };

 const handleEdit = (blog) => {
   setEditingBlog(blog);
   
   let tagsArray = [];
   if (blog.tags && Array.isArray(blog.tags)) {
     tagsArray = blog.tags.map(tag => cleanTagText(tag)).filter(tag => tag);
   }
   
   setFormData({
     title: blog.title,
     content: blog.content,
     image: blog.image || '',
     imageFile: null,
     tags: tagsArray,
     tagInput: '',
     author: blog.author,
     status: blog.status || 'draft'
   });
   
   setShowCreateForm(true);
   setError('');
 };

 const handleDelete = async (id) => {
   if (!window.confirm('Are you sure you want to delete this blog?')) {
     return;
   }

   try {
     const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
       method: 'DELETE',
       headers: {
         'Content-Type': 'application/json',
         ...getAuthHeaders()
       }
     });

     if (response.status === 401) {
       setError('Authentication failed. Please login again.');
       return;
     }

     if (response.status === 404) {
       setError('Blog not found. It may have already been deleted.');
       setBlogs(blogs.filter(blog => blog._id !== id));
       return;
     }

     if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
     }

     setBlogs(blogs.filter(blog => blog._id !== id));
   } catch (error) {
     console.error('Error deleting blog:', error);
     setError(error.message || 'Failed to delete blog. Please try again.');
   }
 };

 const togglePublish = async (id) => {
   try {
     const blog = blogs.find(b => b._id === id);
     if (!blog) {
       setError('Blog not found.');
       return;
     }

     const response = await fetch(`${API_BASE_URL}/blogs/${id}/status`, {
       method: 'PATCH',
       headers: {
         'Content-Type': 'application/json',
         ...getAuthHeaders()
       }
     });

     if (response.status === 401) {
       setError('Authentication failed. Please login again.');
       return;
     }

     if (response.status === 404) {
       setError('Blog not found. It may have been deleted.');
       setBlogs(blogs.filter(blog => blog._id !== id));
       return;
     }

     if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.message || `Server error: ${response.status} ${response.statusText}`);
     }

     const result = await response.json();
     setBlogs(blogs.map(blog => 
       blog._id === id ? (result.blog || result) : blog
     ));
   } catch (error) {
     console.error('Error updating blog status:', error);
     setError(error.message || 'Failed to update blog status. Please try again.');
   }
 };

 const handleImageUpload = (e) => {
   const file = e.target.files[0];
   if (file) {
     if (!file.type.startsWith('image/')) {
       setError('Please select an image file');
       return;
     }
     
     if (file.size > 5 * 1024 * 1024) {
       setError('File size should be less than 5MB');
       return;
     }
     
     setFormData({
       ...formData,
       imageFile: file,
       image: ''
     });
     setError('');
   }
 };

 const getImageUrl = (imagePath) => {
   if (!imagePath) return null;
   
   if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
     return imagePath;
   }
   
   if (imagePath.includes('uploads/blog/') || imagePath.includes('uploads\\blog\\')) {
     const filename = imagePath.split(/[/\\]/).pop();
     return `${config.IMAGE_URL}/uploads/blog/${filename}`;
   }
   
   if (!imagePath.includes('/') && !imagePath.includes('\\')) {
     return `${config.IMAGE_URL}/uploads/blog/${imagePath}`;
   }
   
   return `${config.IMAGE_URL}/${imagePath}`;
 };

 const addTag = () => {
   const trimmedTag = formData.tagInput.trim();
   if (trimmedTag && !formData.tags.includes(trimmedTag)) {
     setFormData({
       ...formData,
       tags: [...formData.tags, trimmedTag],
       tagInput: ''
     });
   }
 };

 const removeTag = (indexToRemove) => {
   setFormData({
     ...formData,
     tags: formData.tags.filter((_, index) => index !== indexToRemove)
   });
 };

 const handleTagInputKeyPress = (e) => {
   if (e.key === 'Enter') {
     e.preventDefault();
     addTag();
   }
 };

 const cleanTagText = (tag) => {
   if (!tag) return '';
   
   let cleanTag = String(tag)
     .replace(/[\[\]"'`]/g, '')
     .replace(/[^\w\s-]/g, '')
     .trim();
   
   return cleanTag;
 };

 const removeImage = () => {
   setFormData({
     ...formData,
     imageFile: null,
     image: ''
   });
 };

 const filteredBlogs = blogs.filter(blog => {
   const matchesSearch = blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        blog.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (Array.isArray(blog.tags) && blog.tags.some(tag => 
                          cleanTagText(tag).toLowerCase().includes(searchTerm.toLowerCase())
                        ));
   
   const matchesFilter = filterStatus === 'all' || 
                        (filterStatus === 'published' && blog.status === 'publish') ||
                        (filterStatus === 'draft' && blog.status === 'draft');
   
   return matchesSearch && matchesFilter;
 });

 if (loading) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-3 sm:p-6 flex items-center justify-center">
       <div className="text-center">
         <div className="relative">
           <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-amber-200 border-t-amber-600"></div>
           <div className="absolute inset-0 animate-pulse rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-amber-300 opacity-20"></div>
         </div>
         <p className="text-amber-700 mt-4 font-medium text-sm sm:text-base">Loading blogs...</p>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
     <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6 sm:space-y-8">
       {/* Header */}
       <div className="mb-6 sm:mb-8">
         <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
           Blog Management
         </h1>
         <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Create, edit, and manage your blog posts</p>
       </div>

       {/* Error Message */}
       {error && (
         <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-2xl mb-4 sm:mb-6 shadow-lg">
           <div className="flex items-start justify-between gap-3">
             <p className="text-sm sm:text-base flex-1">{error}</p>
             <button 
               onClick={() => setError('')}
               className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
         </div>
       )}

       {/* Action Bar */}
       <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-3 sm:p-6 mb-4 sm:mb-6">
         <div className="flex flex-col gap-3 sm:gap-4">
           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
             {/* Search */}
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-4 h-4" />
               <input
                 type="text"
                 placeholder="Search blogs..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
               />
             </div>

             {/* Filter */}
             <div className="relative">
               <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-4 h-4" />
               <select
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="w-full sm:w-auto pl-10 pr-8 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
               >
                 <option value="all">All Blogs</option>
                 <option value="published">Published</option>
                 <option value="draft">Drafts</option>
               </select>
             </div>
           </div>

           {/* Create Button */}
           <button
             onClick={() => setShowCreateForm(true)}
             className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
           >
             <Plus className="w-4 h-4" />
             Create Blog
           </button>
         </div>
       </div>

       {/* Create/Edit Form */}
       {showCreateForm && (
         <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-3 sm:p-6 mb-4 sm:mb-6">
           <div className="flex items-center justify-between mb-4 sm:mb-6">
             <h2 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
               {editingBlog ? 'Edit Blog' : 'Create New Blog'}
             </h2>
             <button
               onClick={resetForm}
               className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 p-2 rounded-lg transition-colors"
             >
               <X className="w-4 h-4 sm:w-5 sm:h-5" />
             </button>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
             {/* Title */}
             <div>
               <label className="block text-sm font-medium text-amber-800 mb-2">
                 Title *
               </label>
               <input
                 type="text"
                 required
                 value={formData.title}
                 onChange={(e) => setFormData({...formData, title: e.target.value})}
                 className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                 placeholder="Enter blog title"
                 disabled={submitting}
               />
             </div>

             {/* Content */}
             <div>
               <label className="block text-sm font-medium text-amber-800 mb-2">
                 Content *
               </label>
               <textarea
                 required
                 rows={6}
                 value={formData.content}
                 onChange={(e) => setFormData({...formData, content: e.target.value})}
                 className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base resize-none"
                 placeholder="Write your blog content here..."
                 disabled={submitting}
               />
             </div>

             {/* Image Upload */}
             <div>
               <label className="block text-sm font-medium text-amber-800 mb-2">
                 Blog Image
               </label>
               
               {/* Image Preview */}
               {(formData.imageFile || formData.image) && (
                 <div className="mb-4 relative inline-block">
                   <img
                     src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : getImageUrl(formData.image)}
                     alt="Preview"
                     className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-amber-200 shadow-md"
                     onError={(e) => {
                       e.target.style.display = 'none';
                     }}
                   />
                   <button
                     type="button"
                     onClick={removeImage}
                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                     disabled={submitting}
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               )}
               
               <div className="space-y-3 sm:space-y-4">
                 {/* File Upload */}
                 <div>
                   <label className="flex items-center justify-center w-full h-24 sm:h-32 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                     <div className="text-center">
                       <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 mx-auto mb-2" />
                       <p className="text-xs sm:text-sm text-amber-600 font-medium">Upload from device</p>
                       <p className="text-xs text-amber-500">PNG, JPG, GIF up to 5MB</p>
                     </div>
                     <input
                       type="file"
                       accept="image/*"
                       onChange={handleImageUpload}
                       className="hidden"
                       disabled={submitting}
                     />
                   </label>
                 </div>
                 
                 {/* URL Input */}
                 <div className="relative">
                   <span className="text-xs text-amber-600 mb-2 block font-medium">Or paste image URL:</span>
                   <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500 w-4 h-4" />
                   <input
                     type="url"
                     value={formData.image}
                     onChange={(e) => setFormData({...formData, image: e.target.value, imageFile: null})}
                     className="w-full pl-10 pr-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                     placeholder="https://example.com/image.jpg"
                     disabled={!!formData.imageFile || submitting}
                   />
                 </div>
               </div>
             </div>

             {/* Tags */}
             <div>
               <label className="block text-sm font-medium text-amber-800 mb-2">
                 Tags
               </label>
               
               {/* Display existing tags */}
               {formData.tags.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 p-3 sm:p-4 bg-amber-50 rounded-xl border border-amber-200">
                   {formData.tags.map((tag, index) => (
                     <span
                       key={index}
                       className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-amber-100 text-amber-700 text-xs sm:text-sm rounded-full shadow-sm"
                     >
                       {tag}
                       <button
                         type="button"
                         onClick={() => removeTag(index)}
                         className="ml-1 text-amber-500 hover:text-amber-700 transition-colors"
                         disabled={submitting}
                       >
                         <X className="w-3 h-3" />
                       </button>
                     </span>
                   ))}
                 </div>
               )}
               
               {/* Add new tag input */}
               <div className="flex flex-col sm:flex-row gap-2">
                 <input
                   type="text"
                   value={formData.tagInput}
                   onChange={(e) => setFormData({...formData, tagInput: e.target.value})}
                   onKeyPress={handleTagInputKeyPress}
                   className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                   placeholder="Enter a tag and press Enter"
                   disabled={submitting}
                 />
                 <button
                   type="button"
                   onClick={addTag}
                   disabled={!formData.tagInput.trim() || submitting}
                   className="w-full sm:w-auto px-4 py-2 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
                 >
                   <Plus className="w-4 h-4" />
                   Add
                 </button>
               </div>
               
               <p className="text-xs text-amber-600 mt-2">
                 Type a tag and press Enter or click Add button. Click × to remove tags.
               </p>
             </div>

             {/* Status */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
               <div>
                 <label className="block text-sm font-medium text-amber-800 mb-2">
                   Author
                 </label>
                 <input
                   type="text"
                   value={formData.author}
                   onChange={(e) => setFormData({...formData, author: e.target.value})}
                   className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                   disabled={submitting}
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-amber-800 mb-2">
                   Status
                 </label>
                 <select
                   value={formData.status}
                   onChange={(e) => setFormData({...formData, status: e.target.value})}
                   className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all duration-200 text-sm sm:text-base"
                   disabled={submitting}
                 >
                   <option value="draft">Draft</option>
                   <option value="publish">Publish</option>
                 </select>
               </div>
             </div>

             {/* Submit Button */}
             <div className="flex flex-col sm:flex-row gap-3 pt-4">
               <button
                 type="submit"
                 disabled={submitting}
                 className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
               >
                 {submitting ? (
                   <Loader className="w-4 h-4 animate-spin" />
                 ) : (
                   <Save className="w-4 h-4" />
                 )}
                 {submitting 
                   ? (editingBlog ? 'Updating...' : 'Creating...') 
                   : (editingBlog ? 'Update Blog' : 'Create Blog')
                 }
               </button>
               <button
                 type="button"
                 onClick={resetForm}
                 disabled={submitting}
                 className="w-full sm:w-auto bg-gray-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm sm:text-base"
               >
                 Cancel
               </button>
             </div>
           </form>
         </div>
       )}

       {/* Blogs List */}
       <div className="grid gap-4 sm:gap-6">
         {filteredBlogs.length === 0 ? (
           <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-6 sm:p-12 text-center">
             <div className="text-amber-600 mb-4">
               <Search className="w-8 h-8 sm:w-12 sm:h-12 mx-auto" />
             </div>
             <h3 className="text-base sm:text-lg font-medium text-amber-900 mb-2">No blogs found</h3>
             <p className="text-amber-700 text-sm sm:text-base">
               {searchTerm || filterStatus !== 'all' 
                 ? 'Try adjusting your search or filter criteria'
                 : 'Create your first blog post to get started'
               }
             </p>
           </div>
         ) : (
           filteredBlogs.map((blog) => (
             <div key={blog._id} className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden hover:shadow-xl transition-all duration-300">
               <div className="p-3 sm:p-6">
                 <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 sm:mb-6 space-y-4 lg:space-y-0">
                   <div className="flex-1 lg:mr-6">
                     <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                       <h3 className="text-base sm:text-lg lg:text-xl font-bold text-amber-900 break-words">{blog.title}</h3>
                       <span className={`self-start px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
                         blog.status === 'publish'
                           ? 'bg-green-100 text-green-700 border border-green-200' 
                           : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                       }`}>
                         {blog.status === 'publish' ? 'Published' : 'Draft'}
                       </span>
                     </div>
                     
                     {/* Meta Info */}
                     <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-amber-600 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1">
                         <User className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="truncate">{blog.author}</span>
                       </div>
                       <div className="flex items-center gap-1">
                         <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="truncate">{new Date(blog.createdAt).toLocaleDateString()}</span>
                       </div>
                     </div>

                     {/* Content Preview */}
                     <p className="text-amber-800 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-3">
                       {blog.content && blog.content.length > 100 
                         ? blog.content.substring(0, 100) + '...' 
                         : blog.content
                       }
                     </p>

                     {/* Tags */}
                     {blog.tags && blog.tags.length > 0 && (
                       <div className="flex items-start gap-2 mb-3 sm:mb-4">
                         <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 mt-1 flex-shrink-0" />
                         <div className="flex flex-wrap gap-1 sm:gap-2">
                           {blog.tags
                             .map(tag => cleanTagText(tag))
                             .filter(tag => tag)
                             .slice(0, 3)
                             .map((tag, index) => (
                               <span
                                 key={index}
                                 className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200 truncate max-w-20 sm:max-w-none"
                               >
                                 {tag}
                               </span>
                             ))
                           }
                           {blog.tags.length > 3 && (
                             <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200">
                               +{blog.tags.length - 3}
                             </span>
                           )}
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Blog Image */}
                   {blog.image && (
                     <div className="w-full lg:w-auto flex justify-center lg:justify-end flex-shrink-0">
                       <img
                         src={getImageUrl(blog.image)}
                         alt={blog.title}
                         className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-amber-200 shadow-md"
                         onError={(e) => {
                           e.target.style.display = 'none';
                         }}
                       />
                     </div>
                   )}
                 </div>

                 {/* Action Buttons */}
                 <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-3 sm:pt-4 border-t border-amber-100">
                   <button
                     onClick={() => handleEdit(blog)}
                     className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-xl transition-colors border border-amber-200 hover:border-amber-300"
                   >
                     <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                     Edit
                   </button>
                   
                   <button
                     onClick={() => togglePublish(blog._id)}
                     className={`flex items-center justify-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-xl transition-colors border ${
                       blog.status === 'publish'
                         ? 'text-yellow-700 hover:bg-yellow-50 border-yellow-200 hover:border-yellow-300'
                         : 'text-green-700 hover:bg-green-50 border-green-200 hover:border-green-300'
                     }`}
                   >
                     {blog.status === 'publish' ? (
                       <>
                         <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span className="hidden sm:inline">Unpublish</span>
                         <span className="sm:hidden">Draft</span>
                       </>
                     ) : (
                       <>
                         <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                         Publish
                       </>
                     )}
                   </button>
                   
                   <button
                     onClick={() => handleDelete(blog._id)}
                     className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200 hover:border-red-300"
                   >
                     <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                     Delete
                   </button>
                 </div>
               </div>
             </div>
           ))
         )}
       </div>
     </div>
   </div>
 );
};

export default AdminBlogs;
