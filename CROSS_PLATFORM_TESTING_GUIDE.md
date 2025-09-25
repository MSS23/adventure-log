# Cross-Platform Testing Guide for Adventure Log

## Prerequisites

### Required Software
- Node.js 18+ with npm
- Android Studio with SDK (for Android testing)
- Xcode (for iOS testing, macOS only)
- Google Chrome (for web testing)
- Capacitor CLI: `npm install -g @capacitor/cli`

### Device Requirements
- Android device with developer options enabled OR Android emulator
- iOS device with developer profile OR iOS Simulator
- Desktop/laptop for web testing

## Platform Setup

### 1. Web Platform Testing

#### Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in browsers:
- Chrome (primary)
- Safari (iOS compatibility)
- Firefox (cross-browser validation)
- Edge (Windows compatibility)

#### PWA Testing
```bash
npm run build
npm run start
```
Test PWA features:
- Service worker registration
- Offline functionality
- Install prompts
- Push notifications

### 2. Android Platform Testing

#### Build and Sync
```bash
# Install dependencies
npm install

# Build for mobile
npm run mobile:build

# Sync with Capacitor
npm run mobile:sync

# Open Android Studio
npm run mobile:open:android
```

#### Run on Device/Emulator
```bash
# Direct run (if device connected)
npm run mobile:run:android

# Or build APK in Android Studio
```

#### APK Generation
1. Open Android Studio from `npm run mobile:open:android`
2. Build → Generate Signed Bundle/APK
3. Choose APK
4. Create/use signing key
5. Select release build
6. Generate APK

### 3. iOS Platform Testing

#### Build and Sync (macOS only)
```bash
# Build for mobile
npm run mobile:build

# Sync with Capacitor
npm run mobile:sync

# Open Xcode
npm run mobile:open:ios
```

#### Run on Device/Simulator
```bash
# Direct run (if device connected)
npm run mobile:run:ios

# Or run from Xcode
```

#### App Store Build
1. Open Xcode from `npm run mobile:open:ios`
2. Product → Archive
3. Distribute App
4. App Store Connect
5. Upload to App Store

## Testing Checklist

### Core Functionality Tests

#### 1. Authentication
- [ ] **Web**: Login/logout with email
- [ ] **Android**: Login/logout with email
- [ ] **iOS**: Login/logout with email
- [ ] **All**: Password reset functionality
- [ ] **All**: Session persistence across app restarts

#### 2. Album Management
- [ ] **Web**: Create, edit, delete albums
- [ ] **Android**: Create, edit, delete albums
- [ ] **iOS**: Create, edit, delete albums
- [ ] **All**: Album sharing functionality
- [ ] **All**: Privacy settings

#### 3. Photo Upload & Management
- [ ] **Web**: Upload via drag-drop and file picker
- [ ] **Android**: Upload via camera and gallery
- [ ] **iOS**: Upload via camera and gallery
- [ ] **All**: Photo editing and captions
- [ ] **All**: EXIF data extraction
- [ ] **All**: Geolocation tagging

#### 4. Navigation & Globe
- [ ] **Web**: Interactive globe with mouse
- [ ] **Android**: Interactive globe with touch
- [ ] **iOS**: Interactive globe with touch
- [ ] **All**: Location-based filtering
- [ ] **All**: Travel route visualization

### Platform-Specific Features

#### Web Browser Tests
- [ ] PWA installation prompt
- [ ] Offline functionality
- [ ] Service worker updates
- [ ] Desktop notifications
- [ ] Keyboard shortcuts
- [ ] Browser back/forward navigation
- [ ] URL sharing
- [ ] Print functionality

#### Android Tests
- [ ] Camera permissions
- [ ] Location permissions
- [ ] Storage permissions
- [ ] Native sharing
- [ ] Back button handling
- [ ] App icon and splash screen
- [ ] Push notifications
- [ ] Deep linking
- [ ] App shortcuts
- [ ] Status bar styling

#### iOS Tests
- [ ] Camera permissions
- [ ] Location permissions
- [ ] Photo library permissions
- [ ] Native sharing
- [ ] Safe area handling
- [ ] App icon and splash screen
- [ ] Push notifications
- [ ] Deep linking
- [ ] App shortcuts
- [ ] Status bar styling

### Performance Tests

#### Load Times
- [ ] **Web**: Initial page load < 3 seconds
- [ ] **Android**: App launch < 2 seconds
- [ ] **iOS**: App launch < 2 seconds
- [ ] **All**: Photo upload < 30 seconds for 10MB image
- [ ] **All**: Album loading < 5 seconds for 50 photos

#### Memory Usage
- [ ] **Web**: < 100MB RAM usage
- [ ] **Android**: < 200MB RAM usage
- [ ] **iOS**: < 200MB RAM usage
- [ ] **All**: No memory leaks during extended use

#### Battery Usage
- [ ] **Android**: Minimal background battery drain
- [ ] **iOS**: Minimal background battery drain
- [ ] **All**: Efficient GPS usage for location tagging

### User Interface Tests

#### Responsive Design
- [ ] **Web**: Desktop (1920x1080)
- [ ] **Web**: Tablet (768x1024)
- [ ] **Web**: Mobile (375x812)
- [ ] **Android**: Various screen sizes
- [ ] **iOS**: Various screen sizes
- [ ] **All**: Landscape and portrait orientations

#### Touch Interactions
- [ ] **Android**: Smooth scrolling and gestures
- [ ] **iOS**: Smooth scrolling and gestures
- [ ] **All**: Touch targets ≥ 44px
- [ ] **All**: Pinch-to-zoom on photos
- [ ] **All**: Swipe gestures for navigation

#### Theme Support
- [ ] **Web**: Light/dark theme switching
- [ ] **Android**: System theme detection
- [ ] **iOS**: System theme detection
- [ ] **All**: High contrast mode
- [ ] **All**: Theme persistence

### Connectivity Tests

#### Network Conditions
- [ ] **All**: Offline mode functionality
- [ ] **All**: Slow network (3G) performance
- [ ] **All**: Network interruption recovery
- [ ] **All**: Background sync when online
- [ ] **All**: Error handling for network failures

#### Data Synchronization
- [ ] **All**: Real-time updates across devices
- [ ] **All**: Conflict resolution
- [ ] **All**: Offline changes sync when online
- [ ] **All**: Consistent data across platforms

## Testing Commands

### Automated Tests
```bash
# Run all tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build validation
npm run build
```

### Manual Testing Scripts

#### Platform Detection Test
```javascript
// Run in browser console or app
console.log(Platform.getDeviceInfo())
console.log('Web:', Platform.isWeb())
console.log('Android:', Platform.isAndroid())
console.log('iOS:', Platform.isIOS())
```

#### Storage Test
```javascript
// Test cross-platform storage
import { crossPlatformStorage } from '@/lib/utils/cross-platform-storage'
await crossPlatformStorage.set('test', 'value')
console.log(await crossPlatformStorage.get('test'))
```

#### Native Features Test
```javascript
// Test native API availability
import { Native } from '@/lib/utils/native'
console.log('Camera available:', Platform.isCapabilityAvailable('camera'))
console.log('Location available:', Platform.isCapabilityAvailable('geolocation'))
```

## Common Issues & Solutions

### Android Issues
- **Build fails**: Check Android SDK and build tools versions
- **App crashes**: Check logs with `adb logcat`
- **Permissions denied**: Verify AndroidManifest.xml permissions
- **Network errors**: Check network security config

### iOS Issues
- **Build fails**: Check Xcode version and iOS deployment target
- **App crashes**: Check Xcode console logs
- **Code signing**: Verify developer certificates
- **App Store upload**: Check provisioning profiles

### Web Issues
- **PWA not installing**: Check manifest.json and HTTPS
- **Service worker errors**: Check browser dev tools
- **CORS errors**: Verify API endpoints configuration
- **Performance issues**: Use Lighthouse for analysis

## Performance Monitoring

### Metrics to Track
- Bundle size (< 5MB total)
- First Contentful Paint (< 2s)
- Time to Interactive (< 5s)
- Core Web Vitals scores
- App startup time
- Memory usage patterns

### Tools
- Chrome DevTools
- Lighthouse
- Web Vitals extension
- Android Studio Profiler
- Xcode Instruments

## Test Data

### Sample Test Accounts
Create test accounts for each platform with:
- Different user levels (free, premium)
- Various album sizes (empty, small, large)
- Different privacy settings
- Multiple photo formats and sizes

### Test Albums
- Empty album
- Album with 1-5 photos
- Album with 50+ photos
- Mixed media formats
- Albums with/without locations
- Private and public albums

## Deployment Testing

### Staging Environment
Test on staging servers before production:
- Database migrations
- API compatibility
- Third-party integrations
- Environment variables
- SSL certificates

### Production Deployment
- [ ] Web: Vercel deployment working
- [ ] Android: Play Store upload successful
- [ ] iOS: App Store submission accepted
- [ ] All: Analytics tracking functional
- [ ] All: Error reporting active

## Documentation Updates

After testing, update:
- [ ] README.md with setup instructions
- [ ] API documentation
- [ ] User guide
- [ ] Troubleshooting guide
- [ ] Change log

## Testing Schedule

### Pre-Release Testing (1-2 weeks)
- Core functionality tests
- Platform-specific feature tests
- Performance benchmarks
- User acceptance testing

### Release Testing (1-3 days)
- Smoke tests on all platforms
- Critical path testing
- Production environment validation
- Rollback procedure verification

### Post-Release Monitoring (ongoing)
- Error rate monitoring
- Performance metrics tracking
- User feedback collection
- Crash report analysis

This comprehensive testing approach ensures Adventure Log delivers a consistent, high-quality experience across web, Android, and iOS platforms.