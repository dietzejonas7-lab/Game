import type { CapacitorConfig } from '@capacitor/cli';

// appId ist die eindeutige Kennung im Play Store.
// WICHTIG: Vor dem ersten Upload festlegen – danach kann sie nie mehr geändert werden!
const config: CapacitorConfig = {
  appId: 'com.squishyworld.app',
  appName: 'Squishy World',
  webDir: 'dist',
  android: {
    backgroundColor: '#fde8f0',
  },
};

export default config;
