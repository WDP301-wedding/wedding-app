import '@/lib/alert';
import { ToastProvider } from '@/lib/toast/toast-host';
import { ConfirmHost } from '@/components/hy-confirm-host';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { hy } from '@/theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    HyBody: require('../../assets/fonts/BeVietnamPro-Regular.ttf'),
    HyBody500: require('../../assets/fonts/BeVietnamPro-Medium.ttf'),
    HyBody600: require('../../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    HyBody700: require('../../assets/fonts/BeVietnamPro-Bold.ttf'),
    HyDisplay: require('../../assets/fonts/PlayfairDisplay.ttf'),
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: hy.canvas,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color={hy.primary} />
      </View>
    );
  return (
    <ToastProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: hy.canvas },
          headerTintColor: hy.primary,
          headerTitleStyle: { fontFamily: hy.display },
          contentStyle: { backgroundColor: hy.canvas },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="reset" options={{ headerShown: false }} />
      </Stack>
      <ConfirmHost />
    </ToastProvider>
  );
}
