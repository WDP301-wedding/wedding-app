import { useLocalSearchParams } from 'expo-router';
import { HomeScreen } from '@/screens/home';
import type { WorkspaceEntryScreen } from '@/screens/workspace/workspace-types';

export default function WorkspaceDetailRoute() {
  const params = useLocalSearchParams<{
    path?: string[];
    bookingId?: string;
    attemptId?: string;
    muc?: string;
    buoc?: string;
  }>();
  const section = Array.isArray(params.path) ? params.path[0] : params.path;
  let screen: WorkspaceEntryScreen = 'overview';
  if (section === 'thoa-thuan') screen = params.buoc === 'hop-dong' ? 'contracts' : 'schedule';
  else if (section === 'thanh-toan') screen = 'payments';
  else if (section === 'chuan-bi')
    screen =
      params.muc === 'phu-luc'
        ? 'appendices'
        : params.muc === 'thiep'
          ? 'invite'
          : params.muc === 'so-do'
            ? 'seating'
            : 'prepare';
  else if (section === 'quyet-toan') screen = 'invoices';
  else if (section === 'thong-bao') screen = 'notifications';
  else if (section === 'ho-so') screen = 'account';
  return (
    <HomeScreen
      initialBookingId={typeof params.bookingId === 'string' ? params.bookingId : undefined}
      initialScreen={screen}
      initialAttemptId={typeof params.attemptId === 'string' ? params.attemptId : undefined}
    />
  );
}
