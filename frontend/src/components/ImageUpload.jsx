import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

const ImageUpload = ({ value, onChange, error }) => {
    const [preview, setPreview] = useState(value);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Update preview when value changes (for edit mode)
        setPreview(value);
    }, [value]);

    const handleFileChange = async (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        try {
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setPreview(previewUrl);

            // Convert to base64 for storage/upload
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange(reader.result);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Error processing image:', err);
            toast.error('Error processing image. Please try again.');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        handleFileChange(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRemoveImage = (e) => {
        e.stopPropagation();
        setPreview('');
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Product Image</label>
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors duration-200 ease-in-out min-h-[200px] flex items-center justify-center
          ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-500'}
          ${error ? 'border-red-500' : ''}
        `}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileChange(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                />

                {preview ? (
                    <div className="relative group w-full h-full min-h-[200px]">
                        <img
                            src={preview}
                            alt="Product preview"
                            className="mx-auto max-h-[200px] rounded-lg object-contain"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:flex hidden items-center justify-center rounded-lg">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    className="text-white p-2 hover:text-green-500 transition-colors"
                                    title="Change Image"
                                >
                                    <Upload className="w-6 h-6" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="text-white p-2 hover:text-red-500 transition-colors"
                                    title="Remove Image"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-500 space-y-2">
                        <Upload className="w-8 h-8 mx-auto" />
                        <div>
                            <p className="text-sm">Drag and drop an image here, or click to select</p>
                            <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
};

ImageUpload.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    error: PropTypes.string
};

export default ImageUpload; 