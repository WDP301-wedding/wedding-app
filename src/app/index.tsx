import { Stack } from 'expo-router/stack';

import { HomeScreen } from '@/screens/home';

export default function HomeRoute() {
  return (
    <>
      <Stack.Title>Hành trình của hai bạn</Stack.Title>
      <HomeScreen />
    </>
  );
}
