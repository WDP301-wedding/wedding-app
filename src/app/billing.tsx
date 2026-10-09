import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { AndroidBillingPage } from '@/screens/billing';

export default function BillingRoute() {
  const params = useLocalSearchParams<{ bookingId?: string; attemptId?: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Title>Thanh toán</Stack.Title>
      <AndroidBillingPage
        initialBookingId={typeof params.bookingId === 'string' ? params.bookingId : ''}
        initialAttemptId={typeof params.attemptId === 'string' ? params.attemptId : ''}
        onAttemptCreated={(bookingId, attemptId) => router.setParams({ bookingId, attemptId })}
      />
    </>
  );
}
