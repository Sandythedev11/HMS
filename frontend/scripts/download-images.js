// Script to download sample hostel-related images for the background slideshow
const fs = require('fs');
const path = require('path');
const https = require('https');

// Create the images directory if it doesn't exist
const imagesDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('Created images directory:', imagesDir);
}

// Sample hostel-related image URLs
const imageUrls = [
  {
    url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&h=900&q=80',
    filename: 'hostel-bg-1.jpg',
    description: 'Modern hostel bedroom with natural light'
  },
  {
    url: 'https://images.unsplash.com/photo-1576495199011-eb94736d05d6?auto=format&fit=crop&w=1600&h=900&q=80',
    filename: 'hostel-bg-2.jpg',
    description: 'Hostel common area with comfortable seating'
  },
  {
    url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&h=900&q=80',
    filename: 'hostel-bg-3.jpg',
    description: 'University campus with students walking'
  },
  {
    url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&h=900&q=80',
    filename: 'hostel-bg-4.jpg',
    description: 'Modern library interior with students studying'
  },
  {
    url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1600&h=900&q=80',
    filename: 'hostel-bg-5.jpg',
    description: 'Hostel desk with study materials'
  }
];

// Function to download an image
function downloadImage(imageUrl, imagePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(imagePath);
    https.get(imageUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(imagePath, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
}

// Download all images
async function downloadAllImages() {
  console.log('Starting to download background images...');
  
  for (const image of imageUrls) {
    const imagePath = path.join(imagesDir, image.filename);
    console.log(`Downloading ${image.description} (${image.filename})...`);
    
    try {
      await downloadImage(image.url, imagePath);
      console.log(`✅ Successfully downloaded ${image.filename}`);
    } catch (error) {
      console.error(`❌ Failed to download ${image.filename}:`, error.message);
    }
  }
  
  console.log('Image download process completed.');
}

// Run the download function
downloadAllImages().catch(err => {
  console.error('Error in download process:', err);
}); 