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
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#2563eb"
    },
    StatusBar: {
      style: "LIGHT_CONTENT",
      backgroundColor: "#2563eb"
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
    }
  }
};

export default config;
