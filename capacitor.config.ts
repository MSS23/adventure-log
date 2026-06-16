import type { CapacitorConfig } from '@capacitor/cli';

// Deep-link / OAuth scheme — must match the appId below and the native config:
//   * iOS:     ios/App/App/Info.plist → CFBundleURLTypes
//   * Android: android/app/src/main/AndroidManifest.xml → <intent-filter>
//
// The Capacitor-side OAuth bridge (custom URL scheme + system browser
// handshake) was prototyped in src/lib/auth/clerk-capacitor.ts and removed
// pending an active wire-up — see the Clerk + Capacitor section of the auth
// audit for the exact native snippets and recreate from git history when
// native OAuth is needed.
const OAUTH_REDIRECT_SCHEME = 'com.adventurelog.app';

// Hostnames the WebView is allowed to navigate to without leaving the app.
// SSO providers (Google/Apple/Discord) need to be reachable for the OAuth
// redirect; Supabase for queries/auth; Mapbox for the tile API.
const ALLOWED_NAVIGATION = [
  'accounts.google.com',
  'appleid.apple.com',
  'discord.com',
  '*.supabase.co',
  '*.mapbox.com',
];

const config: CapacitorConfig = {
  appId: 'com.adventurelog.app',
  appName: 'Adventure Log',
  webDir: 'out',
  server: {
    // Enable live reload during development (set DEV_SERVER_URL when running `npm run dev`)
    url: process.env.DEV_SERVER_URL,
    cleartext: !!process.env.DEV_SERVER_URL,
    // The WebView will allow top-level navigation to these hosts. Anything
    // else (e.g. external blog links the user taps) opens in the system
    // browser via @capacitor/browser if you wire it; otherwise it stays in
    // the WebView and looks like a deadlock. Be deliberate about this list.
    allowNavigation: ALLOWED_NAVIGATION,
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
    // The App plugin (when installed via `npm i @capacitor/app`) emits the
    // `appUrlOpen` event whenever the OS hands a deep link to our app — this
    // is how the Clerk OAuth callback re-enters the app after the user signs
    // in via the system browser. The custom URL scheme below must be
    // registered in Info.plist (iOS) and AndroidManifest.xml (Android).
    App: {
      // No runtime config keys, but listing the plugin here documents the
      // dependency. The actual scheme registration happens natively.
      launchUrl: `${OAUTH_REDIRECT_SCHEME}://`,
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
