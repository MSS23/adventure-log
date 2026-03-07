import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adventurelog.app',
  appName: 'Adventure Log',
  webDir: 'out',
  server: {
    // Enable live reload during development (set DEV_SERVER_URL when running `npm run dev`)
    url: process.env.DEV_SERVER_URL,
    cleartext: !!process.env.DEV_SERVER_URL,
  },
  plugins: {
    Camera: {
      // iOS permission type
      permissionType: 'prompt',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
    backgroundColor: '#0f172a',
    // Use the WebView's built-in dark mode support
    useLegacyBridge: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    backgroundColor: '#0f172a',
    // Handle the safe area automatically
    preferredContentMode: 'mobile',
  },
};

export default config;
