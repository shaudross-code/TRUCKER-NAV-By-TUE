import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tue.truckersnav',
  appName: 'TRUCKERS NAV By TUE',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
