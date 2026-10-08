import { Stack } from 'expo-router/stack';
import { HomeScreen } from '@/screens/home';
export default function ResetRoute() {
  return (
    <>
      <Stack.Title>Khôi phục mật khẩu</Stack.Title>
      <HomeScreen />
    </>
  );
}
