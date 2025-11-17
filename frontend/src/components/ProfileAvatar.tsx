import React, { useState } from 'react';
import { User } from 'lucide-react';
import { API_URL } from '../utils/api';

interface ProfileAvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  alt = 'Profile',
  size = 'md',
  className = '',
  fallbackClassName = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40
  };

  const baseClasses = `${sizeClasses[size]} rounded-full object-cover ${className}`;
  const fallbackClasses = `${sizeClasses[size]} rounded-full bg-gray-100 flex items-center justify-center ${fallbackClassName}`;

  const getImageUrl = (url: string) => {
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it starts with /api, remove it since API_URL already includes it
    if (url.startsWith('/api/')) {
      url = url.substring(4);
    }
    
    // If it starts with a slash, remove it
    if (url.startsWith('/')) {
      url = url.substring(1);
    }
    
    // Return the full URL
    return `${API_URL}/${url}`;
  };

  const handleImageError = () => {
    console.log('ProfileAvatar: Failed to load image:', src);
    console.log('ProfileAvatar: Showing fallback. No src:', !src, 'Image error:', imageError, 'Empty src:', src === '');
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Show fallback if there's no src, or if there was an error loading the image
  if (!src || imageError) {
    return (
      <div className={fallbackClasses}>
        <User size={iconSizes[size]} className="text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={getImageUrl(src)}
      alt={alt}
      className={baseClasses}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  );
};

export default ProfileAvatar; 