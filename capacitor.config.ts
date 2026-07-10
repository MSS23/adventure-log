import type { CapacitorConfig } from '@capacitor/cli';

// Deep-link / OAuth scheme — must match the appId below and the native config:
//   * iOS:     ios/App/App/Info.plist → CFBundleURLTypes
//   * Android: android/app/src/main/AndroidManifest.xml → <intent-filter>
//
// Deep-link scheme for the native OAuth bridge (custom URL scheme + system
// browser handshake). Google sign-in on native uses it: GoogleSignInButton
// opens the provider URL via @capacitor/browser, Supabase redirects to
// `${OAUTH_REDIRECT_SCHEME}://auth/callback`, and NativeAppShell's appUrlOpen
// listener exchanges the PKCE code (src/lib/auth/native-oauth.ts). The exact
// callback URL must be allow-listed in Supabase Auth → Redirect URLs.
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
      // The app hides the splash itself once the WebView has mounted
      // (SplashScreen.hide() in NativeAppShell) so the launch screen never
      // disappears before first paint.
      launchAutoHide: false,
      // App is light-only — match the app background (--background / themeColor
      // #F7F9FB) so launch doesn't flash dark before the WebView paints.
      backgroundColor: '#F7F9FB',
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
    // Light-only app — WebView background must match or rotation/keyboard
    // resizes flash dark.
    backgroundColor: '#F7F9FB',
    useLegacyBridge: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
    backgroundColor: '#F7F9FB',
    // Handle the safe area automatically
    preferredContentMode: 'mobile',
  },
};

export default config;
