import React from 'react';

const LoadingSpinner = ({ size = 'md', color = 'green' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    green: 'border-green-500',
    white: 'border-white'
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-t-transparent ${colorClasses[color]}`}
      />
    </div>
  );
};

export default LoadingSpinner; 