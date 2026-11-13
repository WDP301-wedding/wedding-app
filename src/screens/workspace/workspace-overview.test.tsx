import { fireEvent, render, screen } from '@testing-library/react-native';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { WorkspaceOverview } from './workspace-overview';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';
jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { updateAlias: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/notifications/notification-api', () => ({
  createNotificationGateway: () => ({ listInbox: async () => ({ items: [], nextCursor: null }) }),
}));
it('retains an alias draft and refuses to overwrite a newer booking revision', async () => {
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture({ revision: 4, alias: 'Tiệc gia đình' }),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
  const view = await render(<WorkspaceOverview {...props} />);
  expect(screen.queryByText('Thông báo mới')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xem thông báo' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi tên gợi nhớ' }));
  await fireEvent.changeText(screen.getByLabelText('Tên gợi nhớ'), 'Tên đang soạn');
  await view.rerender(
    <WorkspaceOverview
      {...props}
      booking={{ ...props.booking, revision: 5, alias: 'Tên đã đổi ở nơi khác' }}
    />,
  );
  expect(screen.getByLabelText('Tên gợi nhớ')).toHaveProp('value', 'Tên đang soạn');
  expect(screen.getByRole('button', { name: 'Lưu tên gợi nhớ' })).toBeDisabled();
  expect(createWorkspaceGateway().updateAlias).not.toHaveBeenCalled();
});
it('opens the source contract section for names while the draft timeline awaits Couple approval', async () => {
  const navigate = jest.fn();
  await render(
    <WorkspaceOverview
      session={await sessionFixture()}
      booking={bookingFixture({ phase: 'DRAFT', coupleApproved: false })}
      proposal={proposalFixture({ phase: 'DRAFT' })}
      revision={0}
      refresh={jest.fn()}
      navigate={navigate}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Nhập tên cô dâu chú rể' }));
  expect(navigate).toHaveBeenCalledWith('agreement', { agreementStep: 'contract' });
});
it('shows the current journey step with expandable history and keeps preparation navigation available', async () => {
  const navigate = jest.fn();
  await render(
    <WorkspaceOverview
      session={await sessionFixture()}
      booking={bookingFixture({ eventDate: '2099-01-18' })}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={navigate}
    />,
  );
  expect(screen.getByText('Bước 4/6 · Chuẩn bị')).toBeOnTheScreen();
  expect(screen.queryByText('1. Tư vấn')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Xem toàn bộ hành trình', expanded: false }),
  );
  expect(screen.getByText('1. Tư vấn')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Mở quy mô & nhóm' }));
  expect(navigate).toHaveBeenCalledWith('prepare', { prepareSection: 'groups' });
});
it('does not claim an active journey step for a cancelled booking', async () => {
  await render(
    <WorkspaceOverview
      session={await sessionFixture()}
      booking={bookingFixture({ phase: 'CANCELLED' })}
      proposal={proposalFixture({ phase: 'CANCELLED' })}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
    />,
  );
  expect(screen.getByText('Hành trình đã dừng')).toBeOnTheScreen();
  expect(screen.queryByText(/Bước 0\/6/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Mở quy mô & nhóm' })).toBeNull();
});
