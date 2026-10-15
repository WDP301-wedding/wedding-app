import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hỷ Yến',
  slug: 'wedding-app',
  version: '0.1.0',
  platforms: ['android', 'ios', 'web'],
  orientation: 'portrait',
  icon: './assets/images/hy-yen-icon.png',
  scheme: 'weddingapp',
  userInterfaceStyle: 'light',
  ios: {
    ...config.ios,
    icon: './assets/images/hy-yen-icon.png',
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      backgroundColor: '#FFF8F1',
      foregroundImage: './assets/images/hy-yen-foreground.png',
      monochromeImage: './assets/images/hy-yen-foreground.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...config.web,
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/hy-yen-icon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFF8F1',
        image: './assets/images/hy-yen-foreground.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
