import { io } from 'socket.io-client';
import { connectWorkspaceRealtime } from './realtime';
import { sessionFixture } from '@/screens/workspace/workspace-test-support';

const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
  disconnected: true,
};
jest.mock('socket.io-client', () => ({ io: jest.fn(() => mockSocket) }));
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

it('authenticates in the handshake, subscribes only the selected booking and coalesces duplicate events', async () => {
  jest.useFakeTimers();
  const events = new Map<string, (payload?: unknown) => void>();
  mockSocket.on.mockImplementation((event: string, handler: (payload?: unknown) => void) => {
    events.set(event, handler);
    return mockSocket;
  });
  const session = await sessionFixture();
  const refresh = jest.fn();
  const stop = connectWorkspaceRealtime(session, 'booking', refresh);
  const options = jest.mocked(io).mock.calls[0]![1]!;
  expect(options.path).toBe('/realtime');
  expect(options.query).toBeUndefined();
  const authCallback = jest.fn();
  if (typeof options.auth !== 'function') throw new Error('Expected handshake auth callback');
  options.auth(authCallback);
  await Promise.resolve();
  await Promise.resolve();
  expect(authCallback).toHaveBeenCalledWith({ token: 'fixture-access' });
  events.get('connect')!();
  expect(mockSocket.emit).toHaveBeenCalledWith('subscribe:booking', { bookingId: 'booking' });
  const raw = { schemaVersion: 1, eventId: 'event', type: 'billing.updated' };
  events.get('realtime:event')!(raw);
  events.get('realtime:event')!(raw);
  jest.advanceTimersByTime(400);
  expect(refresh).toHaveBeenCalledTimes(1);
  events.get('realtime:event')!({ ...raw, eventId: 'future', schemaVersion: 2 });
  jest.advanceTimersByTime(400);
  expect(refresh).toHaveBeenCalledTimes(1);
  stop();
  expect(mockSocket.removeAllListeners).toHaveBeenCalled();
  expect(mockSocket.disconnect).toHaveBeenCalled();
});
