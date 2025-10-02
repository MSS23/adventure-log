#!/usr/bin/env node

// Diagnose PWA Manifest 401 Issues
const fs = require('fs');
const path = require('path');

console.log('🔍 Adventure Log PWA Manifest Diagnostics');
console.log('=========================================\n');

console.log('🚨 ISSUE: Manifest.json returning 401 errors in browser');
console.log('   This prevents PWA functionality and causes console spam\n');

// Check if files exist
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const screenshotsDir = path.join(publicDir, 'screenshots');
const manifestPath = path.join(publicDir, 'manifest.json');

console.log('📁 FILE EXISTENCE CHECK:');

// Check manifest.json
if (fs.existsSync(manifestPath)) {
  console.log('✅ manifest.json exists');
  const stats = fs.statSync(manifestPath);
  console.log(`   Size: ${stats.size} bytes`);
  console.log(`   Modified: ${stats.mtime.toISOString()}`);
} else {
  console.log('❌ manifest.json MISSING');
}

// Check icons directory
if (fs.existsSync(iconsDir)) {
  const iconFiles = fs.readdirSync(iconsDir);
  console.log(`✅ icons/ directory exists with ${iconFiles.length} files`);
  iconFiles.forEach(file => {
    console.log(`   📄 ${file}`);
  });
} else {
  console.log('❌ icons/ directory MISSING');
}

// Check screenshots directory
if (fs.existsSync(screenshotsDir)) {
  const screenshotFiles = fs.readdirSync(screenshotsDir);
  console.log(`✅ screenshots/ directory exists with ${screenshotFiles.length} files`);
} else {
  console.log('❌ screenshots/ directory MISSING');
}

console.log('\n🔧 POSSIBLE CAUSES OF 401 ERRORS:');
console.log('1. Server-side routing issue with static files');
console.log('2. Icon files have wrong MIME types');
console.log('3. Vercel serving configuration issue');
console.log('4. File permissions or encoding problems\n');

console.log('💡 SOLUTIONS TO TRY:');

console.log('\n📋 SOLUTION 1: Verify Vercel Deployment');
console.log('Check if these URLs return 200 (not 401):');
console.log('- https://your-app.vercel.app/manifest.json');
console.log('- https://your-app.vercel.app/icons/icon-192x192.png');
console.log('- https://your-app.vercel.app/screenshots/desktop-home.png');

console.log('\n📋 SOLUTION 2: Check vercel.json Configuration');
console.log('Ensure vercel.json has proper headers for static files:');
console.log(`{
  "headers": [
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "image/png"
        }
      ]
    }
  ]
}`);

console.log('\n📋 SOLUTION 3: Convert SVG Icons to Real PNG');
console.log('Current icons are SVG content with .png extension');
console.log('Create actual PNG files for better compatibility');

console.log('\n📋 SOLUTION 4: Simplify Manifest (Remove Complex Features)');
console.log('Temporarily remove screenshots and shortcuts to isolate issue');

console.log('\n🚀 EXPECTED RESULT AFTER FIX:');
console.log('✅ No more 401 manifest.json errors in console');
console.log('✅ PWA install prompt works');
console.log('✅ App shortcuts function correctly');
console.log('✅ Cleaner browser console output\n');

console.log('💭 NOTE: 401 errors might be cosmetic if core app functionality works');
console.log('   Focus on database and storage fixes first if those are blocking testing\n');

console.log('✨ Manifest diagnostics complete!');

// Check if manifest.json is valid JSON
if (fs.existsSync(manifestPath)) {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    JSON.parse(manifestContent);
    console.log('✅ manifest.json is valid JSON');
  } catch (error) {
    console.log('❌ manifest.json has JSON syntax errors:', error.message);
  }
}