import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Plus, Image as ImageIcon, Trash2, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { productsApi } from '../services/api';

const ProductForm = ({ initialData, onSubmit, categories = [], categoriesLoading = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    subcategory: '',
    price: '',
    originalPrice: '',
    unit: 'piece',
    stock: '',
    description: '',
    gst: '',
    hsn: '',
    images: [],
    status: 'active',
    brand: '',
    tags: '',
    features: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);
  const fileInputRef = useRef(null);

  // Units options
  const unitOptions = ['piece', 'kg', 'g', 'dozen', 'bunch', 'liter', 'ml', 'pack'];

  // ✅ Check storage info on component mount
  useEffect(() => {
    const fetchStorageInfo = async () => {
      try {
        const info = await productsApi.getStorageInfo();
        setStorageInfo(info);
        console.log('💾 Storage Info:', info);
      } catch (error) {
        console.error('Error fetching storage info:', error);
      }
    };

    fetchStorageInfo();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category: initialData.category || '',
        subcategory: initialData.subcategory || '',
        price: initialData.price || '',
        originalPrice: initialData.originalPrice || '',
        unit: initialData.unit || 'piece',
        stock: initialData.stock || '',
        description: initialData.description || '',
        gst: initialData.gst !== undefined ? initialData.gst.toString() : '',
        hsn: initialData.hsn || '',
        images: initialData.images || [initialData.image].filter(Boolean) || [],
        status: initialData.status || 'active',
        brand: initialData.brand || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
        features: Array.isArray(initialData.features) ? initialData.features.join(', ') : (initialData.features || '')
      });

      // Set preview images for existing product
      if (initialData.images && initialData.images.length > 0) {
        setPreviewImages(initialData.images.map((url, index) => ({
          id: `existing_${index}_${Date.now()}`, // ✅ Better ID generation for existing images
          url: url,
          file: null,
          isExisting: true
        })));
      } else if (initialData.image) {
        setPreviewImages([{
          id: `existing_0_${Date.now()}`,
          url: initialData.image,
          file: null,
          isExisting: true
        }]);
      }

      // Set subcategories for existing product category
      if (initialData.category) {
        updateSubcategories(initialData.category);
      }
    }
  }, [initialData, categories]);

  const updateSubcategories = (selectedCategory) => {
    if (!selectedCategory) {
      setAvailableSubcategories([]);
      return;
    }

    const category = categories.find(cat => cat.name === selectedCategory);
    if (category && category.subcategories) {
      setAvailableSubcategories(category.subcategories.filter(sub => sub && sub.trim()));
    } else {
      setAvailableSubcategories([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // ✅ Special handling for numeric fields to prevent invalid values
    if (name === 'gst' || name === 'price' || name === 'originalPrice' || name === 'stock') {
      // Allow empty string and valid numbers
      if (value === '' || (!isNaN(value) && !isNaN(parseFloat(value)))) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === 'hsn') {
      // HSN can contain both numbers and letters, limit to 8 characters
      if (value === '' || /^[0-9A-Za-z]{0,8}$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value.toUpperCase()
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Handle category change - update subcategories
    if (name === 'category') {
      updateSubcategories(value);
      setFormData(prev => ({
        ...prev,
        category: value,
        subcategory: ''
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    // ✅ Use storage info for file size limit (default to 10MB for products)
    const maxSizeMB = storageInfo?.maxFileSize === '10MB' ? 10 : 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const oversizedFiles = files.filter(file => file.size > maxSizeBytes);
    
    if (oversizedFiles.length > 0) {
      toast.error(`Each image must be less than ${maxSizeMB}MB`);
      return;
    }

    // ✅ Use storage info for max files (default to 10 for products)
    const maxFiles = storageInfo?.maxFilesPerProduct || 10;
    if (previewImages.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed per product`);
      return;
    }

    // ✅ Better ID generation for new images
    const timestamp = Date.now();
    const newPreviews = files.map((file, index) => ({
      id: `new_${timestamp}_${index}`, // More unique ID
      url: URL.createObjectURL(file),
      file: file,
      isExisting: false
    }));

    setPreviewImages(prev => [...prev, ...newPreviews]);
    setImageFiles(prev => [...prev, ...files]);

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ✅ Fixed handleRemoveImage function
  const handleRemoveImage = (imageId) => {
    console.log('🗑️ Removing image with ID:', imageId);
    
    setPreviewImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (!imageToRemove) {
        console.warn('Image not found with ID:', imageId);
        return prev;
      }

      console.log('Found image to remove:', imageToRemove);
      
      // Clean up blob URL if it's a new image
      if (imageToRemove.url && imageToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url);
        console.log('Revoked blob URL:', imageToRemove.url);
      }
      
      return prev.filter(img => img.id !== imageId);
    });

    // Remove from imageFiles array if it's a new file
    setImageFiles(prev => {
      const imageToRemove = previewImages.find(img => img.id === imageId);
      if (imageToRemove && imageToRemove.file) {
        console.log('Removing file from imageFiles array');
        return prev.filter(file => file !== imageToRemove.file);
      }
      return prev;
    });
  };

  const moveImage = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= previewImages.length) return;

    const newImages = [...previewImages];
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setPreviewImages(newImages);

    // Also update imageFiles order if they exist
    const newImageFiles = [...imageFiles];
    const imageFile1 = previewImages[index].file;
    const imageFile2 = previewImages[newIndex].file;
    
    if (imageFile1 && imageFile2) {
      const file1Index = imageFiles.indexOf(imageFile1);
      const file2Index = imageFiles.indexOf(imageFile2);
      if (file1Index !== -1 && file2Index !== -1) {
        [newImageFiles[file1Index], newImageFiles[file2Index]] = [newImageFiles[file2Index], newImageFiles[file1Index]];
        setImageFiles(newImageFiles);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Valid price is required';
    if (!formData.unit) newErrors.unit = 'Unit is required';
    if (!formData.stock || formData.stock < 0) newErrors.stock = 'Valid stock quantity is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (previewImages.length === 0) newErrors.images = 'At least one image is required';

    // ✅ Fixed GST validation - handle empty string and 0 value properly
    if (formData.gst === '' || formData.gst === null || formData.gst === undefined) {
      newErrors.gst = 'GST rate is required';
    } else {
      const gstValue = parseFloat(formData.gst);
      if (isNaN(gstValue) || gstValue < 0 || gstValue > 100) {
        newErrors.gst = 'GST rate must be between 0% and 100%';
      }
    }

    // Validate original price if provided
    if (formData.originalPrice && Number(formData.originalPrice) < Number(formData.price)) {
      newErrors.originalPrice = 'Original price should be greater than or equal to current price';
    }

    // HSN validation - optional but if provided should be valid format
    if (formData.hsn && formData.hsn.trim()) {
      const hsnValue = formData.hsn.trim();
      if (!/^[0-9A-Z]{4,8}$/.test(hsnValue)) {
        newErrors.hsn = 'HSN should be 4-8 characters (numbers/letters only)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    // Clean up any blob URLs before resetting
    previewImages.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });

    setFormData({
      name: '',
      category: '',
      subcategory: '',
      price: '',
      originalPrice: '',
      unit: 'piece',
      stock: '',
      description: '',
      gst: '',
      hsn: '',
      images: [],
      status: 'active',
      brand: '',
      tags: '',
      features: ''
    });
    setPreviewImages([]);
    setImageFiles([]);
    setErrors({});
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast.error('Please fix the errors below');
    return;
  }

  setIsSubmitting(true);

  try {
    // ✅ Log form state before processing
    console.log('🔍 FRONTEND DEBUG: formData before processing:', formData);
    console.log('🔍 FRONTEND DEBUG: HSN field value:', formData.hsn);
    console.log('🔍 FRONTEND DEBUG: HSN field type:', typeof formData.hsn);

    const submitData = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      subcategory: formData.subcategory.trim(),
      price: Number(formData.price),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      unit: formData.unit,
      stock: Number(formData.stock),
      description: formData.description.trim(),
      gst: Number(formData.gst),
      status: formData.status,
      brand: formData.brand.trim(),
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(f => f) : []
    };

    // ✅ FIXED: Handle HSN field correctly - don't send undefined
    console.log('🔍 HSN Processing:');
    console.log('- Original HSN:', formData.hsn);
    console.log('- HSN type:', typeof formData.hsn);
    console.log('- HSN after trim:', formData.hsn?.trim?.());
    console.log('- HSN is empty?', !formData.hsn || !formData.hsn.trim());

    if (formData.hsn && formData.hsn.trim()) {
      submitData.hsn = formData.hsn.trim().toUpperCase();
      console.log('✅ HSN will be sent:', submitData.hsn);
    } else {
      console.log('⚠️ HSN is empty, not including in request');
      // ✅ CRITICAL: Don't include hsn field at all if empty
      // Don't set submitData.hsn to anything
    }

    // Remove undefined values
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === undefined) {
        console.log(`🧹 Removing undefined field: ${key}`);
        delete submitData[key];
      }
    });

    console.log('🔍 FRONTEND DEBUG: Final submitData:', submitData);
    console.log('🔍 FRONTEND DEBUG: Keys being sent:', Object.keys(submitData));
    console.log('🔍 FRONTEND DEBUG: HSN in final data?', submitData.hasOwnProperty('hsn'));
    console.log('🔍 FRONTEND DEBUG: HSN value in final data:', submitData.hsn);

    if (initialData && initialData._id) {
      // Update existing product
      console.log('✏️ UPDATING existing product...');
      
      const existingImageUrls = previewImages
        .filter(img => img.isExisting && !img.file)
        .map(img => img.url);

      const newImageFiles = previewImages
        .filter(img => !img.isExisting && img.file)
        .map(img => img.file);

      console.log('🖼️ Existing images:', existingImageUrls.length);
      console.log('🆕 New images:', newImageFiles.length);

      const result = await productsApi.updateProduct(
        initialData._id,
        {
          ...submitData,
          images: existingImageUrls
        },
        newImageFiles,
        false
      );

      console.log('✅ Product updated successfully:', result);
      toast.success('Product updated successfully!');

      if (onSubmit) {
        await onSubmit(result.product || result);
      }

    } else {
      // Create new product
      console.log('🆕 CREATING new product...');
      console.log('🔍 FRONTEND DEBUG: About to call createProductWithImages with:', {
        submitData,
        imageFilesCount: imageFiles.length,
        hsnValue: submitData.hsn,
        hsnExists: submitData.hasOwnProperty('hsn')
      });
      
      const result = await productsApi.createProductWithImages(submitData, imageFiles);

      console.log('✅ Product created successfully:', result);
      toast.success(`Product created successfully with ${result.uploadedImages || imageFiles.length} images!`);

      // Clean up blob URLs
      previewImages.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });

      resetForm();

      if (onSubmit) {
        await onSubmit(result.product || result);
      }
    }

  } catch (error) {
    console.error('❌ Form submission error:', error);
    console.error('❌ Error response:', error.response?.data);
    
    let errorMessage = 'Failed to save product';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};

// ✅ Add this debug function to your component for testing
const debugHSNField = () => {
  console.log('🧪 === HSN FIELD DEBUG ===');
  console.log('- formData.hsn value:', formData.hsn);
  console.log('- formData.hsn type:', typeof formData.hsn);
  console.log('- formData.hsn length:', formData.hsn?.length);
  console.log('- formData.hsn after trim:', formData.hsn?.trim?.());
  console.log('- formData.hsn is truthy:', !!formData.hsn);
  console.log('- formData.hsn trim is truthy:', !!(formData.hsn && formData.hsn.trim()));
  console.log('- All formData keys:', Object.keys(formData));
  console.log('- HSN exists in formData?', formData.hasOwnProperty('hsn'));
  
  // Test submit data preparation
  const testSubmitData = {};
  if (formData.hsn && formData.hsn.trim()) {
    testSubmitData.hsn = formData.hsn.trim().toUpperCase();
  }
  console.log('- Test submitData:', testSubmitData);
  console.log('- HSN would be included?', testSubmitData.hasOwnProperty('hsn'));
  console.log('🧪 === END HSN DEBUG ===');
};
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ✅ Storage Info Display */}
      {storageInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-blue-800">
              Storage: {storageInfo.storageType}
            </span>
            <span className="text-blue-600">
              Max Size: {storageInfo.maxFileSize}
            </span>
            <span className="text-blue-600">
              Max Files: {storageInfo.maxFilesPerProduct}
            </span>
          </div>
        </div>
      )}

      {/* Product Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Images *
        </label>
        
        {previewImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {previewImages.map((image, index) => (
              <div
                key={image.id}
                className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
              >
                <img
                  src={image.url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Main
                  </div>
                )}

                {/* ✅ Enhanced storage indicator */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                  {image.isExisting ? (storageInfo?.storageType === 'Cloudinary' ? '☁️' : '💾') : 'New'}
                </div>

                <div className="absolute top-2 right-12 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'up')}
                    disabled={index === 0}
                    className="bg-black bg-opacity-50 text-white p-1 rounded disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'down')}
                    disabled={index === previewImages.length - 1}
                    className="bg-black bg-opacity-50 text-white p-1 rounded disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* ✅ Fixed remove button with better event handling */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Remove button clicked for image ID:', image.id);
                    handleRemoveImage(image.id);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200" />
              </div>
            ))}
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center space-y-2 text-gray-500 hover:text-amber-600 transition-colors"
          >
            <Upload className="w-8 h-8" />
            <span className="text-sm font-medium">
              {previewImages.length === 0 ? 'Upload Product Images' : 'Add More Images'}
            </span>
            <span className="text-xs text-gray-400">
              {storageInfo ? (
                `${storageInfo.supportedFormats?.join(', ').toUpperCase()} up to ${storageInfo.maxFileSize} each (Max ${storageInfo.maxFilesPerProduct} images)`
              ) : (
                'JPEG, PNG, WebP up to 10MB each (Max 10 images)'
              )}
            </span>
          </button>
        </div>

        {errors.images && (
          <p className="text-red-500 text-sm mt-1">{errors.images}</p>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          • First image will be used as the main product image
          • Use arrow buttons to reorder images
          • Images will be stored in {storageInfo?.storageType || 'cloud storage'} for fast loading
        </p>
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter product name"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      {/* Category and Subcategory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.category ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id || cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategory
          </label>
          <select
            name="subcategory"
            value={formData.subcategory}
            onChange={handleInputChange}
            disabled={!formData.category || availableSubcategories.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {!formData.category 
                ? 'Select category first' 
                : availableSubcategories.length === 0 
                  ? 'No subcategories available' 
                  : 'Select subcategory'
              }
            </option>
            {availableSubcategories.map((subcategory, index) => (
              <option key={index} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
          {!formData.category && (
            <p className="text-xs text-gray-500 mt-1">Select a category to see available subcategories</p>
          )}
        </div>
      </div>

      {/* Brand and Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter brand name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="Enter tags separated by commas"
          />
          <p className="text-xs text-gray-500 mt-1">Example: organic, fresh, premium</p>
        </div>
      </div>

      {/* Features */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Features
        </label>
        <input
          type="text"
          name="features"
          value={formData.features}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Enter features separated by commas"
        />
        <p className="text-xs text-gray-500 mt-1">Example: gluten-free, non-GMO, locally sourced</p>
      </div>

      {/* Pricing, GST and HSN */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price (₹) *
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.price ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Price (₹)
          </label>
          <input
            type="number"
            name="originalPrice"
            value={formData.originalPrice}
            onChange={handleInputChange}
            min="0"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.originalPrice ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          {errors.originalPrice && <p className="text-red-500 text-sm mt-1">{errors.originalPrice}</p>}
          <p className="text-xs text-gray-500 mt-1">For showing discounts</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GST Rate (%) *
          </label>
          <input
            type="number"
            name="gst"
            value={formData.gst}
            onChange={handleInputChange}
            min="0"
            max="100"
            step="0.01"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.gst ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter GST rate (e.g., 0, 5, 12, 18, 28)"
          />
          {errors.gst && <p className="text-red-500 text-sm mt-1">{errors.gst}</p>}
          <p className="text-xs text-gray-500 mt-1">Common rates: 0%, 5%, 12%, 18%, 28%</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HSN Code
          </label>
          <input
            type="text"
            name="hsn"
            value={formData.hsn}
            onChange={handleInputChange}
            maxLength="8"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.hsn ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., 1001, 2208"
          />
          {errors.hsn && <p className="text-red-500 text-sm mt-1">{errors.hsn}</p>}
          <p className="text-xs text-gray-500 mt-1">4-8 digit HSN classification code</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit *
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.unit ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {unitOptions.map(unit => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {errors.unit && <p className="text-red-500 text-sm mt-1">{errors.unit}</p>}
        </div>
      </div>

      {/* Stock and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock Quantity *
          </label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleInputChange}
            min="0"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
              errors.stock ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows="4"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter product description"
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-8 py-3 rounded-xl hover:from-amber-700 hover:to-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>{initialData ? 'Updating...' : 'Creating...'}</span>
            </>
          ) : (
            <span>{initialData ? 'Update Product' : 'Create Product'}</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;