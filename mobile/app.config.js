const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
  expo: {
    name: 'Global Archaeology Hub',
    slug: 'global-archeology-hub',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.alexmen203.globalarcheologyhub',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      package: 'com.alexmen203.globalarcheologyhub',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    owner: 'robomak',
  },
};

try {
  const appJson = require('./app.json');
  if (appJson.expo?.extra?.eas?.projectId) {
    config.expo.extra.eas = { projectId: appJson.expo.extra.eas.projectId };
  }
  if (appJson.expo?.owner) config.expo.owner = appJson.expo.owner;
} catch (_) {}

module.exports = config;
