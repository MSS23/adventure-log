# PWA Assets Generation

## ✅ Generated SVG Assets

The following SVG assets have been created:
<<<<<<< HEAD
- App icons (72x72 to 512x512px)
- Apple touch icon (180x180px) 
=======

- App icons (72x72 to 512x512px)
- Apple touch icon (180x180px)
>>>>>>> oauth-upload-fixes
- Shortcut icons for app shortcuts

## 📱 Manual Steps Required

### 1. Convert SVGs to PNGs

Use an online tool or ImageMagick to convert the SVGs to PNG:

**Option A: Online Converter**
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
1. Go to https://convertio.co/svg-png/
2. Upload each SVG file from /public/icons/
3. Download the PNG files
4. Replace the SVG files with PNG files

**Option B: ImageMagick (if installed)**
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
```bash
# In the /public/icons/ directory
for file in *.svg; do
  magick "$file" "${file%.svg}.png"
  rm "$file"
done
```

### 2. Create Screenshots

Take screenshots of your app for the PWA store listing:

**Mobile Screenshots (390x844px):**
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- `mobile-dashboard.png` - Dashboard view on mobile
- `mobile-globe.png` - Globe view on mobile

**Desktop Screenshot (1920x1080px):**
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- `desktop-dashboard.png` - Dashboard view on desktop

Save these in the `/public/screenshots/` directory.

### 3. Additional Assets

Create these additional files in `/public/`:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- `favicon-16x16.png` - 16x16 favicon
- `favicon-32x32.png` - 32x32 favicon
- `apple-touch-icon.png` - 180x180 Apple touch icon

## 🚀 Once Complete

After converting all SVGs to PNGs and adding screenshots, your PWA will be ready for mobile installation with:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
- Home screen icons
- App shortcuts
- Store-quality screenshots
- Proper favicon support

## 🎨 Customization

To customize the logos:
<<<<<<< HEAD
=======

>>>>>>> oauth-upload-fixes
1. Edit the SVG generation functions in this script
2. Re-run the script: `node scripts/generate-pwa-assets.js`
3. Convert new SVGs to PNGs
