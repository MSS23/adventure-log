import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adventurelog.app',
  appName: 'Adventure Log',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#2563eb",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "LIGHT_CONTENT",
      backgroundColor: "#2563eb",
      overlaysWebView: false
    },
    Camera: {
      permissions: ["camera", "photos"]
    },
    Geolocation: {
      permissions: ["location"]
    },
    Filesystem: {
      permissions: ["storage"]
    },
    Preferences: {
      group: "adventure-log-preferences"
    },
    Keyboard: {
      resize: "ionic",
      style: "dark",
      resizeOnFullScreen: true
    },
    Device: {},
    App: {
      additionalStatements: [
        "<uses-permission android:name=\"android.permission.READ_EXTERNAL_STORAGE\" />",
        "<uses-permission android:name=\"android.permission.WRITE_EXTERNAL_STORAGE\" android:maxSdkVersion=\"28\" />",
        "<uses-permission android:name=\"android.permission.MANAGE_EXTERNAL_STORAGE\" tools:ignore=\"ScopedStorage\" />"
      ]
    }
  }
};

export default config;
