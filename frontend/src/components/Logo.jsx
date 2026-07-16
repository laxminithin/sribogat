import React from 'react';
import PropTypes from 'prop-types';
import logoImage from '/src/assets/Sri_Bogat_logo.png'; // Ensure this path is correct

const Logo = ({ size = 'normal', variant = 'horizontal' }) => {
  const sizes = {
    small: {
      container: "space-x-2",
      image: "w-12 h-12",         // Increased from w-8 h-8
      text: "text-sm"             // Smaller font
    },
    normal: {
      container: "space-x-3",
      image: "w-16 h-16",         // Increased from w-10 h-10
      text: "text-base"          // Smaller than text-3xl
    },
    large: {
      container: "space-x-4",
      image: "w-20 h-20",         // Increased from w-12 h-12
      text: "text-lg"            // Smaller than text-4xl
    }
  };

  const variants = {
    horizontal: "flex items-center",
    vertical: "flex flex-col items-center text-center"
  };

  const currentSize = sizes[size];

  return (
    <div className={`${variants[variant]} ${variant === 'horizontal' ? currentSize.container : 'space-y-2'}`}>
      <img
        src={logoImage}
        alt="Kissan Bandi Logo"
        className={`${currentSize.image} object-contain`}
      />
    </div>
  );
};

Logo.propTypes = {
  size: PropTypes.oneOf(['small', 'normal', 'large']),
  variant: PropTypes.oneOf(['horizontal', 'vertical'])
};

export default Logo;
