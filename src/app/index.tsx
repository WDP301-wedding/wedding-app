import { Stack } from 'expo-router/stack';
import { Link } from 'expo-router';
import { Text } from 'react-native';

import { HomeScreen } from '@/screens/home';

export default function HomeRoute() {
  return (
    <>
      <Stack.Title>Hành trình của hai bạn</Stack.Title>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="./billing">
              <Text style={{ padding: 12 }}>Thanh toán</Text>
            </Link>
          ),
        }}
      />
      <HomeScreen />
    </>
  );
}
