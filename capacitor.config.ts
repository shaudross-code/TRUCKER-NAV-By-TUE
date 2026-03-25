import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tue.truckersnav',
  appName: 'TRUCKERS NAV By TUE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#050505',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050505'
    }
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
