import { useLocalSearchParams } from 'expo-router';
import { HomeScreen } from '@/screens/home';
export default function CoupleInvitationRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  return (
    <HomeScreen
      initialBookingId={typeof bookingId === 'string' ? bookingId : undefined}
      initialScreen="invite"
    />
  );
}
