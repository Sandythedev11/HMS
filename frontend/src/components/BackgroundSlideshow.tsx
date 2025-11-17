import { useState, useEffect } from 'react';

// Fallback placeholder background images - these would normally be in public/images
const backgroundImages = [
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&h=900&q=80', // Modern hostel bedroom
  'https://images.unsplash.com/photo-1576495199011-eb94736d05d6?auto=format&fit=crop&w=1600&h=900&q=80', // Hostel common area
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&h=900&q=80', // University campus
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&h=900&q=80', // Library interior
  'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1600&h=900&q=80', // Hostel desk
];

interface BackgroundSlideshowProps {
  opacity?: number; // Allow customization of the opacity (0-1)
}

const BackgroundSlideshow = ({ opacity = 0.25 }: BackgroundSlideshowProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000); // Change image every 7 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Subtle pattern overlay for better visual distinction */}
      <div className="absolute inset-0 opacity-5 z-0 bg-pattern" />
      
      {backgroundImages.map((image, index) => (
        <div 
          key={image}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1500"
          style={{
            backgroundImage: `url(${image})`,
            opacity: index === currentImageIndex ? opacity : 0,
            zIndex: index === currentImageIndex ? 1 : 0,
            filter: 'contrast(1.15) brightness(1.1) saturate(1.15)' // Enhanced image quality
          }}
        />
      ))}
      
      {/* Color gradient overlay that preserves image visibility while ensuring text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/65 to-white/60" />
    </div>
  );
};

export default BackgroundSlideshow; 