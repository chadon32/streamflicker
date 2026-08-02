import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.streamflicker.app',
  appName: 'StreamFlicker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
