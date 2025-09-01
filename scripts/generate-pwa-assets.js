#!/usr/bin/env node
/**
 * Generate PWA assets for Adventure Log
 * Creates placeholder icons and documentation for required assets
 */

const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SHORTCUT_ICONS = ['shortcut-new-album', 'shortcut-globe', 'shortcut-social'];

// Simple SVG logo for Adventure Log
const createLogoSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="100" cy="100" r="90" fill="#3b82f6" stroke="#1e40af" stroke-width="4"/>
  
  <!-- Globe/Earth representation -->
  <circle cx="100" cy="100" r="60" fill="#059669" opacity="0.8"/>
  
  <!-- Continents (simple shapes) -->
  <path d="M70 80 Q85 70 95 80 Q90 90 85 95 Q75 90 70 80Z" fill="#065f46"/>
  <path d="M105 75 Q120 70 130 80 Q125 85 115 90 Q110 85 105 75Z" fill="#065f46"/>
  <path d="M80 110 Q95 105 100 115 Q90 125 85 120 Q80 115 80 110Z" fill="#065f46"/>
  
  <!-- Location pin -->
  <path d="M100 60 Q110 60 110 70 Q110 75 100 85 Q90 75 90 70 Q90 60 100 60Z" fill="#dc2626"/>
  <circle cx="100" cy="70" r="3" fill="white"/>
  
  <!-- Adventure compass points -->
  <g stroke="#fbbf24" stroke-width="2" fill="none">
    <line x1="100" y1="30" x2="100" y2="45"/>
    <line x1="100" y1="155" x2="100" y2="170"/>
    <line x1="170" y1="100" x2="155" y2="100"/>
    <line x1="45" y1="100" x2="30" y2="100"/>
  </g>
  
  <!-- Camera icon (bottom right) -->
  <g transform="translate(140, 140)">
    <rect x="0" y="5" width="20" height="15" rx="2" fill="white" opacity="0.9"/>
    <rect x="3" y="2" width="6" height="3" rx="1" fill="white" opacity="0.9"/>
    <circle cx="10" cy="12" r="4" fill="#3b82f6"/>
    <circle cx="10" cy="12" r="2" fill="white"/>
  </g>
</svg>
`;

// Create directories
const publicDir = path.join(process.cwd(), 'public');
const iconsDir = path.join(publicDir, 'icons');
const screenshotsDir = path.join(publicDir, 'screenshots');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

console.log('🎨 Generating PWA assets for Adventure Log...\n');

// Generate app icons
SIZES.forEach(size => {
  const svgContent = createLogoSVG(size);
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ Created icon-${size}x${size}.svg`);
});

// Create Apple touch icon
const appleSvg = createLogoSVG(180);
fs.writeFileSync(path.join(iconsDir, 'apple-icon-180x180.svg'), appleSvg);
console.log('✅ Created apple-icon-180x180.svg');

// Generate shortcut icons
SHORTCUT_ICONS.forEach(iconName => {
  let iconContent = '';
  if (iconName.includes('album')) {
    iconContent = createAlbumIcon();
  } else if (iconName.includes('globe')) {
    iconContent = createGlobeIcon();
  } else if (iconName.includes('social')) {
    iconContent = createSocialIcon();
  }
  
  fs.writeFileSync(path.join(iconsDir, `${iconName}.svg`), iconContent);
  console.log(`✅ Created ${iconName}.svg`);
});

// Create README for manual steps
const readmeContent = `# PWA Assets Generation

## ✅ Generated SVG Assets

The following SVG assets have been created:
- App icons (72x72 to 512x512px)
- Apple touch icon (180x180px) 
- Shortcut icons for app shortcuts

## 📱 Manual Steps Required

### 1. Convert SVGs to PNGs

Use an online tool or ImageMagick to convert the SVGs to PNG:

**Option A: Online Converter**
1. Go to https://convertio.co/svg-png/
2. Upload each SVG file from /public/icons/
3. Download the PNG files
4. Replace the SVG files with PNG files

**Option B: ImageMagick (if installed)**
\`\`\`bash
# In the /public/icons/ directory
for file in *.svg; do
  magick "$file" "\${file%.svg}.png"
  rm "$file"
done
\`\`\`

### 2. Create Screenshots

Take screenshots of your app for the PWA store listing:

**Mobile Screenshots (390x844px):**
- \`mobile-dashboard.png\` - Dashboard view on mobile
- \`mobile-globe.png\` - Globe view on mobile

**Desktop Screenshot (1920x1080px):**
- \`desktop-dashboard.png\` - Dashboard view on desktop

Save these in the \`/public/screenshots/\` directory.

### 3. Additional Assets

Create these additional files in \`/public/\`:
- \`favicon-16x16.png\` - 16x16 favicon
- \`favicon-32x32.png\` - 32x32 favicon
- \`apple-touch-icon.png\` - 180x180 Apple touch icon

## 🚀 Once Complete

After converting all SVGs to PNGs and adding screenshots, your PWA will be ready for mobile installation with:
- Home screen icons
- App shortcuts
- Store-quality screenshots
- Proper favicon support

## 🎨 Customization

To customize the logos:
1. Edit the SVG generation functions in this script
2. Re-run the script: \`node scripts/generate-pwa-assets.js\`
3. Convert new SVGs to PNGs
`;

fs.writeFileSync(path.join(iconsDir, 'README.md'), readmeContent);

console.log('\n📋 Created README.md with conversion instructions');
console.log('\n🎉 PWA asset generation complete!');
console.log('\nNext steps:');
console.log('1. Convert SVG files to PNG using an online converter');
console.log('2. Take screenshots of your app (mobile and desktop)');
console.log('3. Test PWA installation on mobile devices');

function createAlbumIcon() {
  return `
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <circle cx="96" cy="96" r="80" fill="#3b82f6"/>
  <rect x="60" y="70" width="72" height="52" rx="4" fill="white"/>
  <rect x="66" y="76" width="60" height="40" rx="2" fill="#f3f4f6"/>
  <circle cx="96" cy="96" r="12" fill="#3b82f6"/>
  <circle cx="96" cy="96" r="6" fill="white"/>
  <path d="M72 106 Q96 90 120 106" stroke="#3b82f6" stroke-width="2" fill="none"/>
</svg>
`;
}

function createGlobeIcon() {
  return `
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <circle cx="96" cy="96" r="80" fill="#3b82f6"/>
  <circle cx="96" cy="96" r="50" fill="#059669"/>
  <path d="M60 90 Q80 80 90 90 Q85 100 80 105 Q70 100 60 90Z" fill="#065f46"/>
  <path d="M105 85 Q125 80 135 90 Q130 95 120 100 Q110 95 105 85Z" fill="#065f46"/>
  <g stroke="#fbbf24" stroke-width="2" fill="none">
    <line x1="96" y1="36" x2="96" y2="46"/>
    <line x1="96" y1="146" x2="96" y2="156"/>
    <line x1="156" y1="96" x2="146" y2="96"/>
    <line x1="46" y1="96" x2="36" y2="96"/>
  </g>
</svg>
`;
}

function createSocialIcon() {
  return `
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <circle cx="96" cy="96" r="80" fill="#3b82f6"/>
  <circle cx="75" cy="80" r="18" fill="white"/>
  <circle cx="117" cy="80" r="18" fill="white"/>
  <circle cx="96" cy="125" r="18" fill="white"/>
  <line x1="87" y1="90" x2="105" y2="115" stroke="white" stroke-width="4"/>
  <line x1="105" y1="90" x2="87" y2="115" stroke="white" stroke-width="4"/>
  <line x1="75" y1="98" x2="96" y2="107" stroke="white" stroke-width="4"/>
  <line x1="117" y1="98" x2="96" y2="107" stroke="white" stroke-width="4"/>
</svg>
`;
}