import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { BackHandler, Text } from 'react-native';
import { WorkspaceNavigation } from './workspace-navigation';
import { Page } from './workspace-common';

jest.mock('@expo/ui', () => jest.requireActual('./workspace-sheet-test-support'));

it('provides the Flutter navigation destinations and blocks settlement before completion', async () => {
  const navigate = jest.fn();
  await render(
    <WorkspaceNavigation
      destination="overview"
      phase="CONFIRMED"
      navigate={navigate}
      onSwitchBooking={jest.fn()}
      canSwitch
      unreadCount={8}
    >
      <Page title="Tổng quan">
        <Text>Hồ sơ hiện tại</Text>
      </Page>
    </WorkspaceNavigation>,
  );
  for (const name of ['Tổng quan', 'Thoả thuận', 'Thanh toán', 'Chuẩn bị', 'Thêm'])
    expect(screen.getByRole('tab', { name })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Thông báo' }));
  expect(navigate).toHaveBeenCalledWith('notifications');
  expect(screen.getByText('8')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  expect(screen.getByRole('button', { name: 'Quyết toán' })).toBeDisabled();
  expect(
    within(screen.getByTestId('workspace-more-menu')).queryByRole('button', { name: 'Thông báo' }),
  ).toBeNull();
});

it('updates the header unread badge and keeps notifications separate from More selection', async () => {
  const props = {
    destination: 'notifications' as const,
    phase: 'CONFIRMED',
    navigate: jest.fn(),
    onSwitchBooking: jest.fn(),
    canSwitch: false,
  };
  const view = await render(
    <WorkspaceNavigation {...props} unreadCount={120}>
      <Page title="Thông báo">
        <Text>Hộp thư</Text>
      </Page>
    </WorkspaceNavigation>,
  );
  expect(screen.getByText('99+')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Thông báo', selected: true })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Thêm', selected: false })).toBeOnTheScreen();
  await view.rerender(
    <WorkspaceNavigation {...props} unreadCount={0}>
      <Page title="Thông báo">
        <Text>Hộp thư</Text>
      </Page>
    </WorkspaceNavigation>,
  );
  expect(screen.queryByText('99+')).toBeNull();
  expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveProp(
    'accessibilityHint',
    'Mở hộp thư thông báo',
  );
});

it('does not show account notification controls on a page outside the signed-in workspace', async () => {
  await render(
    <Page title="Hỷ Yến">
      <Text>Đăng nhập</Text>
    </Page>,
  );
  expect(screen.queryByRole('button', { name: 'Thông báo' })).toBeNull();
});
it('closes More before leaving a section and lets Android handle Back at overview', async () => {
  let back: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
  const event = { type: 'hardwareBackPress', timeStamp: 123 };
  const remove = jest.fn();
  const listener = jest
    .spyOn(BackHandler, 'addEventListener')
    .mockImplementation((_event, callback) => {
      back = callback;
      return { remove };
    });
  const navigate = jest.fn();
  const view = await render(
    <WorkspaceNavigation
      destination="payment"
      phase="CONFIRMED"
      navigate={navigate}
      onSwitchBooking={jest.fn()}
      canSwitch={false}
    >
      <Text>Content</Text>
    </WorkspaceNavigation>,
  );
  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  await act(async () => {
    expect(back!(event)).toBe(true);
  });
  expect(navigate).not.toHaveBeenCalled();
  await act(async () => {
    expect(back!(event)).toBe(true);
  });
  expect(navigate).toHaveBeenCalledWith('overview');
  await view.rerender(
    <WorkspaceNavigation
      destination="overview"
      phase="CONFIRMED"
      navigate={navigate}
      onSwitchBooking={jest.fn()}
      canSwitch={false}
    >
      <Text>Content</Text>
    </WorkspaceNavigation>,
  );
  expect(back!(event)).toBe(false);
  await view.unmount();
  expect(remove).toHaveBeenCalled();
  listener.mockRestore();
});

it('opens settlement after explicit server completion', async () => {
  const navigate = jest.fn();
  await render(
    <WorkspaceNavigation
      destination="payment"
      phase="COMPLETED"
      navigate={navigate}
      onSwitchBooking={jest.fn()}
      canSwitch={false}
    >
      <Text>Hoá đơn</Text>
    </WorkspaceNavigation>,
  );
  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Quyết toán' }));
  expect(navigate).toHaveBeenCalledWith('settlement');
});

it('dismisses the native sheet without navigation and reopens it with the same actions', async () => {
  const navigate = jest.fn();
  const onSwitchBooking = jest.fn();
  await render(
    <WorkspaceNavigation
      destination="overview"
      phase="COMPLETED"
      navigate={navigate}
      onSwitchBooking={onSwitchBooking}
      canSwitch
    >
      <Text>Hồ sơ hiện tại</Text>
    </WorkspaceNavigation>,
  );
  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  await fireEvent(screen.getByTestId('native-more-sheet'), 'requestClose');
  expect(screen.queryByRole('button', { name: 'Hồ sơ' })).toBeNull();
  expect(navigate).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Hồ sơ' }));
  expect(navigate).toHaveBeenCalledWith('profile');
  expect(screen.queryByRole('button', { name: 'Hồ sơ' })).toBeNull();

  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi tiệc đang xem' }));
  expect(onSwitchBooking).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Hồ sơ' })).toBeNull();
});
