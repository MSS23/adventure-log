import type { CapacitorConfig } from '@capacitor/cli';

// Deep-link / OAuth scheme — must match the appId below and the native config:
//   * iOS:     ios/App/App/Info.plist → CFBundleURLTypes
//   * Android: android/app/src/main/AndroidManifest.xml → <intent-filter>
//
// Deep-link scheme for a future native OAuth bridge (custom URL scheme +
// system browser handshake). Auth today is Supabase email/password with no
// social providers wired, so no native OAuth round-trip is active yet — keep
// the scheme registered for when one is.
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
      // 'native' = resize the WebView itself (Android adjustResize). The app
      // shell is h-[100dvh], so shrinking the viewport lifts bottom-anchored
      // inputs and the tab bar above the keyboard.
      resize: 'native',
      resizeOnFullScreen: true,
    },
    // The App plugin emits the `appUrlOpen` event whenever the OS hands a
    // deep link to our app (scheme: OAUTH_REDIRECT_SCHEME, registered in
    // Info.plist / AndroidManifest.xml). NativeAppShell also uses it for the
    // Android hardware back button.
    App: {},
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    // Enable Chrome remote debugging of the WebView (chrome://inspect). The
    // mobile bundle is compiled with NODE_ENV=production, so gating on
    // 'development' left it permanently off and made on-device issues (e.g. a
    // blank screen) impossible to inspect. Debug APKs are for debugging; a
    // hardened release build should turn this back off.
    webContentsDebuggingEnabled: true,
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
