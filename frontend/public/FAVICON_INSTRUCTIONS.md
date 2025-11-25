# Favicon Setup Instructions

## Current Status
An SVG favicon has been created as a placeholder. To use your custom HMS logo image:

## Steps to Add Your Custom Favicon

1. **Save your HMS logo image** (the one you provided) to this directory as:
   - `favicon.ico` (for older browsers)
   - `favicon-32x32.png` (32x32 pixels)
   - `favicon-16x16.png` (16x16 pixels)
   - `apple-touch-icon.png` (180x180 pixels for iOS)

2. **Use an online favicon generator** (recommended):
   - Go to https://realfavicongenerator.net/
   - Upload your HMS logo image
   - Download the generated favicon package
   - Extract and replace the files in this directory

3. **Or use a local tool**:
   ```bash
   # Install ImageMagick (if not already installed)
   # Then convert your image:
   convert hms-logo.png -resize 32x32 favicon-32x32.png
   convert hms-logo.png -resize 16x16 favicon-16x16.png
   convert hms-logo.png -resize 180x180 apple-touch-icon.png
   ```

## Files Needed
- `favicon.svg` ✅ (Created - SVG version)
- `favicon.ico` (Add your image here)
- `favicon-32x32.png` (Add your image here)
- `favicon-16x16.png` (Add your image here)
- `apple-touch-icon.png` (Add your image here)

## Note
The HTML file (`index.html`) is already configured to use these favicon files.
