#!/usr/bin/env node

// Script to generate placeholder PWA icons
const fs = require('fs');
const path = require('path');

// Icon sizes needed
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG template for Adventure Log icon
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <circle cx="${size * 0.5}" cy="${size * 0.35}" r="${size * 0.15}" fill="white" opacity="0.9"/>
  <path d="M ${size * 0.25} ${size * 0.6} Q ${size * 0.5} ${size * 0.75} ${size * 0.75} ${size * 0.6}"
        stroke="white" stroke-width="${size * 0.02}" fill="none" opacity="0.8"/>
  <rect x="${size * 0.4}" y="${size * 0.8}" width="${size * 0.2}" height="${size * 0.08}"
        rx="${size * 0.02}" fill="white" opacity="0.7"/>
</svg>
`.trim();

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (browsers can use these directly)
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filePath = path.join(iconsDir, filename);

  fs.writeFileSync(filePath, svgContent);
  console.log(`Created ${filename}`);
});

// Create a simple PNG fallback using Canvas (if available) or just copy SVG
iconSizes.forEach(size => {
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);

  // For now, just copy the SVG as PNG (browsers will handle it)
  // In a real app, you'd use sharp or canvas to convert SVG to PNG
  const svgContent = fs.readFileSync(svgPath);
  fs.writeFileSync(pngPath, svgContent);
  console.log(`Created icon-${size}x${size}.png`);
});

// Create shortcut icons
const shortcutIcons = ['shortcut-new-album.png', 'shortcut-globe.png', 'shortcut-albums.png'];
shortcutIcons.forEach(iconName => {
  const svgContent = createSVGIcon(96);
  const iconPath = path.join(iconsDir, iconName);
  fs.writeFileSync(iconPath, svgContent);
  console.log(`Created ${iconName}`);
});

console.log('All PWA icons generated successfully!');