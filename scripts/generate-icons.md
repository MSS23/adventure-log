# App Icon Generation Guide

## Quick Icon Setup

### Option 1: Using Online Tools (Easiest)

1. **Create your icon** (1024x1024 PNG with transparent background)
   - Use a globe/travel theme
   - Recommended colors: #667eea (purple) or #2563eb (blue)
   - Add "AL" text or compass icon

2. **Generate icons automatically:**
   - Visit: https://icon.kitchen
   - Upload your 1024x1024 PNG
   - Download Android and iOS icon packs
   - Extract to respective folders:
     - Android: `android/app/src/main/res/`
     - iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Option 2: Using Capacitor Assets (Automated)

```bash
# Install the generator
npm install -g @capacitor/assets

# Place your icon as icon.png (1024x1024) in project root
# Place your splash screen as splash.png (2732x2732) in project root

# Generate all assets
npx @capacitor/assets generate
```

### Option 3: Manual Creation

Create these sizes manually using Photoshop/Figma/etc:

#### Android Icons (mipmap)
Place in `android/app/src/main/res/`:

- `mipmap-mdpi/ic_launcher.png` - 48x48
- `mipmap-hdpi/ic_launcher.png` - 72x72
- `mipmap-xhdpi/ic_launcher.png` - 96x96
- `mipmap-xxhdpi/ic_launcher.png` - 144x144
- `mipmap-xxxhdpi/ic_launcher.png` - 192x192

Repeat for `ic_launcher_round.png` (circular icons)

#### iOS Icons
Use Xcode:
1. Open `ios/App/App.xcodeproj` in Xcode
2. Click on `Assets.xcassets`
3. Click on `AppIcon`
4. Drag and drop icons for each size

Required sizes:
- iPhone: 60pt (2x, 3x), 76pt, 83.5pt, 1024pt
- iPad: 76pt (1x, 2x), 83.5pt (2x)

## Design Recommendations

### Icon Design
```
Background: Gradient (#667eea to #764ba2)
Foreground: White globe icon or "AL" text
Style: Flat design with subtle shadow
Format: PNG with transparency (except background)
```

### Sample Designs

**Minimalist Globe:**
- Blue/purple gradient background
- White simplified globe outline
- Optional pin marker in the center

**Text-Based:**
- Purple gradient background
- White "AL" text (bold, modern font)
- Small globe icon as accent

**Icon + Text:**
- Globe icon on top
- "Adventure Log" text below (very small)
- Gradient background

## Testing Your Icons

After generating icons:

```bash
# Sync to native projects
npm run mobile:sync

# Open to verify
npm run mobile:open:android  # Check in Android Studio
npm run mobile:open:ios      # Check in Xcode
```

## Splash Screen

Edit `capacitor.config.ts`:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: "#667eea", // Your brand color
    androidScaleType: "CENTER_CROP",
    showSpinner: true,
    spinnerColor: "#ffffff"
  }
}
```

For custom splash screen images:
- Android: `android/app/src/main/res/drawable-*/splash.png`
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`

## Resources

- Icon Kitchen: https://icon.kitchen
- App Icon Generator: https://appicon.co
- Capacitor Assets: https://github.com/ionic-team/capacitor-assets
- Material Design Icons: https://fonts.google.com/icons
