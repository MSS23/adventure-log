# Mobile App Deployment Guide

## Overview

The Adventure Log mobile app is built using Capacitor with Next.js static export. This guide explains how to build, deploy, and troubleshoot the mobile application.

## Solution Summary

We've solved the blank/black screen issue in the Capacitor WebView by:

1. **Creating a Mobile App Wrapper** (`dist/mobile-app.html`) that properly loads Next.js pages in an iframe with HTML processing
2. **Mobile Loader Script** (`dist/mobile-loader.js`) that fixes React hydration issues
3. **HTML Processing Script** (`scripts/fix-mobile-html.js`) that removes visibility:hidden styles and injects the mobile loader
4. **Updated Entry Point** (`dist/index.html`) that redirects to the mobile app wrapper

## Build and Deployment Steps

### 1. Build the Mobile App

```bash
# This builds Next.js static export and fixes HTML files
npm run mobile:build
```

### 2. Sync with Native Platform

```bash
# For Android
npx cap sync android

# For iOS
npx cap sync ios
```

### 3. Open in IDE

```bash
# For Android Studio
npx cap open android

# For Xcode
npx cap open ios
```

### 4. Build and Run

#### Android
1. In Android Studio, wait for Gradle sync to complete
2. Select a device/emulator from the device dropdown
3. Click the "Run" button (green play icon) or press Shift+F10
4. The app will build and deploy to your device

#### iOS
1. In Xcode, select your development team
2. Select a simulator or connected device
3. Click the "Run" button or press Cmd+R
4. The app will build and deploy to your device

## Features Included

All desktop features are preserved in the mobile app:

### Core Features
- ✅ User authentication (login/signup)
- ✅ Dashboard with user stats
- ✅ Album creation and management
- ✅ Photo uploads with EXIF extraction
- ✅ 3D Globe visualization
- ✅ Social features (likes, comments, follows)
- ✅ Stories (24-hour ephemeral content)
- ✅ Search functionality
- ✅ User profiles
- ✅ Settings management

### Capacitor Native Features
- ✅ Camera integration for photos
- ✅ GPS/Geolocation for location tagging
- ✅ File system access for uploads
- ✅ Network status detection
- ✅ Local storage preferences
- ✅ Share functionality
- ✅ Toast notifications

## Architecture

### File Structure
```
dist/
├── index.html              # Entry point (redirects to mobile-app.html)
├── mobile-app.html         # Mobile wrapper with iframe loader
├── mobile-loader.js        # Hydration fixer and navigation handler
├── dashboard.html          # Main app page
├── login.html              # Authentication page
├── [other pages].html      # All other app pages
└── _next/                  # Next.js assets (JS, CSS, images)
```

### How It Works

1. **Entry Point**: `index.html` redirects to `mobile-app.html`
2. **Mobile Wrapper**: `mobile-app.html` creates an iframe to load Next.js pages
3. **HTML Processing**: Content is fetched and processed to remove visibility:hidden
4. **Hydration Fix**: `mobile-loader.js` ensures React hydrates properly
5. **Navigation**: Links are intercepted to navigate between HTML files
6. **Authentication**: Supabase auth tokens are checked from localStorage

## Troubleshooting

### Black/Blank Screen Issues

If you see a blank screen after deployment:

1. **Check the build output**:
   ```bash
   ls -la dist/
   # Ensure all HTML files exist
   ```

2. **Verify the fix script ran**:
   ```bash
   npm run mobile:fix
   # This should process all HTML files
   ```

3. **Check Android logs**:
   ```bash
   adb logcat | grep -i "adventure"
   ```

4. **Inspect WebView console**:
   - In Android Studio, open Chrome and go to `chrome://inspect`
   - Find your app and click "Inspect"
   - Check for JavaScript errors

### Authentication Issues

If authentication isn't working:

1. **Check Supabase credentials** in `mobile-app.html`:
   ```javascript
   const SUPABASE_URL = 'your-url-here';
   ```

2. **Verify localStorage access**:
   - The app uses localStorage for auth tokens
   - Ensure WebView has localStorage enabled

### Navigation Problems

If navigation between pages fails:

1. **Check route mappings** in `mobile-app.html`
2. **Verify HTML files exist** in `dist/` directory
3. **Check console for navigation errors**

### Performance Issues

To improve performance:

1. **Enable production mode**:
   ```bash
   NODE_ENV=production npm run mobile:build
   ```

2. **Minimize bundle size**:
   - The build already uses code splitting
   - Globe visualization is lazy-loaded

3. **Cache static assets**:
   - Assets in `_next/static/` are immutable
   - Can be cached indefinitely

## Testing Checklist

Before releasing, test these critical flows:

- [ ] App opens without blank screen
- [ ] Login/signup works
- [ ] Dashboard loads with user data
- [ ] Can create new album
- [ ] Can upload photos (camera and gallery)
- [ ] Globe visualization renders
- [ ] Navigation between pages works
- [ ] Logout works properly
- [ ] Deep linking works
- [ ] Android back button handled
- [ ] Offline mode shows appropriate message

## Deployment to App Stores

### Android (Google Play)

1. **Generate signed APK**:
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Choose APK or App Bundle (recommended)
   - Use your keystore file

2. **Test the release build**:
   ```bash
   npx cap run android --release
   ```

3. **Upload to Play Console**:
   - Create new release in Play Console
   - Upload the signed APK/AAB
   - Fill in release notes

### iOS (App Store)

1. **Configure signing**:
   - Select your Apple Developer Team in Xcode
   - Configure provisioning profiles

2. **Archive the app**:
   - Product → Archive in Xcode
   - Validate the archive

3. **Upload to App Store Connect**:
   - Use Xcode Organizer to upload
   - Submit for review

## Environment Variables

Ensure these are set in your build environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
MOBILE_BUILD=true
```

## Quick Commands Reference

```bash
# Full rebuild and deploy to Android
npm run mobile:build && npx cap sync android && npx cap run android

# Fix HTML files only (after manual build)
npm run mobile:fix

# Open in Android Studio
npx cap open android

# Run on specific device
npx cap run android --target [device-id]

# Check connected devices
adb devices
```

## Support

For issues or questions:
1. Check the console logs in Chrome DevTools
2. Review the [Capacitor documentation](https://capacitorjs.com/docs)
3. Check Supabase connection and credentials
4. Ensure all native permissions are granted

## Version History

- **v1.0.0** - Initial mobile app with basic features
- **v1.1.0** - Fixed hydration issues and blank screen problem
  - Added mobile-app.html wrapper
  - Implemented mobile-loader.js for hydration fixes
  - Created fix-mobile-html.js script
  - All desktop features now working in mobile