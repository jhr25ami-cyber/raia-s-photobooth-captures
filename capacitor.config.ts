import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.raia.photobooth',
  appName: 'Raia Photobooth',
  webDir: 'www',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      androidxCameraCore: '1.3.0',
    },
  },
};

export default config;
