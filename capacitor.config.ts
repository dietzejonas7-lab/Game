import type { CapacitorConfig } from '@capacitor/cli';

// appId ist die eindeutige Kennung im Play Store.
// WICHTIG: Vor dem ersten Upload festlegen – danach kann sie nie mehr geändert werden!
const config: CapacitorConfig = {
  appId: 'com.dietzejonas.kosmogenesis',
  appName: 'Kosmogenesis',
  webDir: 'dist',
  android: {
    backgroundColor: '#05030f',
  },
};

export default config;
