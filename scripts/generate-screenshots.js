#!/usr/bin/env node

// Script to generate placeholder PWA screenshots
const fs = require('fs');
const path = require('path');

// Screenshot specs from manifest.json
const screenshots = [
  { name: 'desktop-home.png', width: 1280, height: 720, label: 'Adventure Log Home Screen' },
  { name: 'mobile-home.png', width: 375, height: 812, label: 'Adventure Log Mobile View' }
];

// SVG template for screenshots
const createScreenshotSVG = (width, height, label) => `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>

  <!-- Header -->
  <rect x="0" y="0" width="${width}" height="${height * 0.1}" fill="#3b82f6"/>
  <text x="${width * 0.05}" y="${height * 0.06}" font-family="Arial, sans-serif"
        font-size="${Math.min(width, height) * 0.025}" fill="white" font-weight="bold">
    Adventure Log
  </text>

  <!-- Content Area -->
  <rect x="${width * 0.05}" y="${height * 0.15}" width="${width * 0.9}" height="${height * 0.3}"
        rx="${width * 0.01}" fill="white" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Globe Placeholder -->
  <circle cx="${width * 0.5}" cy="${height * 0.3}" r="${Math.min(width, height) * 0.08}"
          fill="#3b82f6" opacity="0.7"/>

  <!-- Card placeholders -->
  <rect x="${width * 0.1}" y="${height * 0.55}" width="${width * 0.25}" height="${height * 0.25}"
        rx="${width * 0.01}" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="${width * 0.375}" y="${height * 0.55}" width="${width * 0.25}" height="${height * 0.25}"
        rx="${width * 0.01}" fill="white" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="${width * 0.65}" y="${height * 0.55}" width="${width * 0.25}" height="${height * 0.25}"
        rx="${width * 0.01}" fill="white" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Label -->
  <text x="${width * 0.5}" y="${height * 0.9}" font-family="Arial, sans-serif"
        font-size="${Math.min(width, height) * 0.02}" fill="#64748b" text-anchor="middle">
    ${label}
  </text>
</svg>
`.trim();

// Create screenshots directory
const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Generate screenshots
screenshots.forEach(({ name, width, height, label }) => {
  const svgContent = createScreenshotSVG(width, height, label);
  const filePath = path.join(screenshotsDir, name);

  fs.writeFileSync(filePath, svgContent);
  console.log(`Created ${name} (${width}x${height})`);
});

console.log('All PWA screenshots generated successfully!');