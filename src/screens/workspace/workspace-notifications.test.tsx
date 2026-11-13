import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  createNotificationGateway,
  type InboxItem,
} from '@/features/notifications/notification-api';
import { WorkspaceNotifications } from './workspace-notifications';
import { sessionFixture } from './workspace-test-support';
jest.mock('@/features/notifications/notification-api', () => {
  const api = {
    listInbox: jest.fn(),
    readNotification: jest.fn(),
    readAllNotifications: jest.fn().mockResolvedValue(undefined),
  };
  return { createNotificationGateway: () => api };
});
const api = jest.mocked(createNotificationGateway());
const item = {
  id: 'notice-1',
  notificationIntentId: 'intent-1',
  purpose: 'CONTRACT',
  title: 'Hợp đồng mới',
  message: 'Xem hợp đồng.',
  revision: 7,
  createdAt: '2026-11-12T03:00:00Z',
  readAt: null,
  resource: { bookingId: 'owned-booking', data: {}, owner: 'payments-billing' },
} satisfies InboxItem;
beforeEach(() => jest.clearAllMocks());
it('opens the resource even when marking read fails and keeps pagination within the supplied cursor', async () => {
  api.listInbox
    .mockResolvedValueOnce({ items: [item], nextCursor: 'opaque-page-2' })
    .mockResolvedValueOnce({
      items: [{ ...item, id: 'notice-2', title: 'Thông báo trước đó' }],
      nextCursor: null,
    });
  api.readNotification.mockRejectedValueOnce(new Error('offline'));
  const onOpenBooking = jest.fn();
  await render(
    <WorkspaceNotifications
      session={await sessionFixture()}
      revision={0}
      onOpenBooking={onOpenBooking}
      onUnreadChanged={jest.fn()}
    />,
  );
  await fireEvent.press(await screen.findByRole('button', { name: item.title }));
  expect(onOpenBooking).toHaveBeenCalledWith('owned-booking', {
    destination: 'agreement',
    agreementStep: 'contract',
  });
  await waitFor(() =>
    expect(api.readNotification).toHaveBeenCalledWith(
      'fixture-access',
      item.id,
      7,
      expect.any(String),
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Xem thêm thông báo' }));
  expect(await screen.findByRole('button', { name: 'Thông báo trước đó' })).toBeOnTheScreen();
  expect(api.listInbox).toHaveBeenLastCalledWith('fixture-access', {
    limit: 25,
    cursor: 'opaque-page-2',
  });
  expect(screen.queryByRole('button', { name: 'Xem thêm thông báo' })).toBeNull();
});
it('marks read through a fixed timestamp without requesting unrelated device-push APIs', async () => {
  api.listInbox.mockResolvedValue({ items: [item], nextCursor: null });
  const onUnreadChanged = jest.fn();
  await render(
    <WorkspaceNotifications
      session={await sessionFixture()}
      revision={0}
      onOpenBooking={jest.fn()}
      onUnreadChanged={onUnreadChanged}
    />,
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Đánh dấu tất cả đã đọc' }));
  await waitFor(() =>
    expect(api.readAllNotifications).toHaveBeenCalledWith(
      'fixture-access',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      expect.any(String),
    ),
  );
  expect(await screen.findByText('Đã đọc hết danh sách đang xem')).toBeOnTheScreen();
  expect(onUnreadChanged).toHaveBeenCalled();
});
