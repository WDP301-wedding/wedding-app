import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { HomeScreen } from '@/screens/home';

export default function BillingRoute() {
  const params = useLocalSearchParams<{ bookingId?: string; attemptId?: string }>();
  return (
    <>
      <Stack.Title>Thanh toán</Stack.Title>
      <HomeScreen
        initialBookingId={typeof params.bookingId === 'string' ? params.bookingId : ''}
        initialAttemptId={typeof params.attemptId === 'string' ? params.attemptId : ''}
        initialScreen="payments"
      />
    </>
  );
}
