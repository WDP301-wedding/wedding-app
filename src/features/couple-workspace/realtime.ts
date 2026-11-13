import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import { readPublicEnv } from '@/lib/env';

const knownEvents = new Set([
  'booking.updated',
  'proposal.updated',
  'timeline.updated',
  'contract.updated',
  'deposit.received',
  'billing.updated',
  'guest.updated',
  'seating.updated',
  'print_order.updated',
  'notification.received',
]);
/** The same event contract as PRM-app. Events trigger authorized reads, never client ledger updates. */
export function connectWorkspaceRealtime(
  session: AndroidIdentitySession,
  bookingId: string | null,
  refresh: () => void,
): () => void {
  let active = true;
  let renewing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const seen = new Set<string>();
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (active) refresh();
    }, 400);
  };
  const socket = io(new URL(readPublicEnv().EXPO_PUBLIC_API_BASE_URL).origin, {
    path: '/realtime',
    transports: ['websocket'],
    forceNew: true,
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    auth: (callback) => {
      void session
        .authorize(async (token) => ({ token }))
        .then((auth) => {
          if (active) callback(auth);
        })
        .catch(() => {
          if (active) callback({ token: '' });
        });
    },
  });
  socket.on('connect', () => {
    if (bookingId) socket.emit('subscribe:booking', { bookingId });
    schedule();
  });
  socket.on('realtime:resync', schedule);
  socket.on('subscription:confirmed', schedule);
  socket.on('realtime:event', (raw: unknown) => {
    if (
      !raw ||
      typeof raw !== 'object' ||
      !('schemaVersion' in raw) ||
      raw.schemaVersion !== 1 ||
      !('eventId' in raw) ||
      typeof raw.eventId !== 'string' ||
      !('type' in raw) ||
      typeof raw.type !== 'string' ||
      seen.has(raw.eventId)
    )
      return;
    if (seen.size >= 2000) seen.delete(seen.values().next().value!);
    seen.add(raw.eventId);
    if (raw.type === 'session.revoked') {
      void session.discardRevokedSession();
      return;
    }
    if (knownEvents.has(raw.type)) schedule();
  });
  socket.on('connect_error', (error: Error) => {
    if (!/AUTHENTICATION|TOKEN|REVOKED|UNAUTHORIZED/i.test(error.message) || renewing || !active)
      return;
    renewing = true;
    void session
      .refresh()
      .then(() => {
        if (active && socket.disconnected) socket.connect();
      })
      .catch(() => {})
      .finally(() => {
        renewing = false;
      });
  });
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || !active) return;
    if (socket.disconnected) socket.connect();
    else schedule();
  });
  socket.connect();
  return () => {
    active = false;
    clearTimeout(timer);
    subscription.remove();
    socket.removeAllListeners();
    socket.disconnect();
  };
}
