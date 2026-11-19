import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { WorkspaceGroups } from './workspace-groups';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { preparationGroups: jest.fn(), createGroup: jest.fn(), updateGroup: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
const api = jest.mocked(createWorkspaceGateway());
const active = {
  bookingId: bookingFixture().bookingId,
  guestGroupId: 'group',
  name: 'Friends',
  color: '#123456',
  revision: 3,
  status: 'ACTIVE' as const,
};
function data(groups = [active]) {
  return {
    groups,
    plan: {
      bookingId: active.bookingId,
      revision: 8,
      planningHeadcount: 95,
      sourceGuestPlanRevisionId: null,
      sourceSequence: 8,
    },
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  api.preparationGroups.mockResolvedValue(data());
});
async function props() {
  return {
    session: await sessionFixture(),
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
}

it('bounds a new group name, retains failed input and reuses its idempotency key on retry', async () => {
  api.preparationGroups.mockResolvedValue(data([]));
  api.createGroup.mockRejectedValueOnce(new Error('offline'));
  const context = await props();
  await render(<WorkspaceGroups {...context} />);
  const field = await screen.findByLabelText('Tên nhóm khách');
  await fireEvent.changeText(field, 'x'.repeat(121));
  expect(screen.getByRole('button', { name: 'Thêm nhóm' })).toBeDisabled();
  await fireEvent.changeText(field, ' Bạn thân ');
  await fireEvent.press(screen.getByRole('button', { name: 'Thêm nhóm' }));
  await screen.findByText(/Chưa rõ kết quả/);
  expect(field).toHaveProp('value', ' Bạn thân ');
  await fireEvent.press(screen.getByRole('button', { name: 'Thêm nhóm' }));
  await screen.findByText('Đã lưu nhóm khách.');
  expect(api.createGroup).toHaveBeenCalledWith(
    'fixture-access',
    active.bookingId,
    { name: 'Bạn thân', color: '#7A1F3D' },
    expect.any(String),
  );
  expect(api.createGroup.mock.calls[0]![3]).toBe(api.createGroup.mock.calls[1]![3]);
  expect(screen.getByLabelText('Tên nhóm khách')).toHaveProp('value', '');
  expect(context.refresh).toHaveBeenCalledTimes(1);
});

it('renames only the selected group with its revision and cancels local edits without sending them', async () => {
  await render(<WorkspaceGroups {...await props()} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Đổi tên Bạn bè' }));
  await fireEvent.changeText(screen.getByLabelText('Tên nhóm mới'), 'Đổi chưa lưu');
  await fireEvent.press(screen.getByRole('button', { name: 'Huỷ đổi tên' }));
  expect(api.updateGroup).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi tên Bạn bè' }));
  await fireEvent.changeText(screen.getByLabelText('Tên nhóm mới'), ' Bạn đại học ');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu tên nhóm' }));
  await waitFor(() =>
    expect(api.updateGroup).toHaveBeenCalledWith(
      'fixture-access',
      active.bookingId,
      active.guestGroupId,
      { expectedRevision: 3, name: 'Bạn đại học' },
      expect.any(String),
    ),
  );
});

it('keeps a rename draft but prevents overwriting a group revised by another client', async () => {
  const context = await props();
  const view = await render(<WorkspaceGroups {...context} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Đổi tên Bạn bè' }));
  await fireEvent.changeText(screen.getByLabelText('Tên nhóm mới'), 'Nội dung đang soạn');
  api.preparationGroups.mockResolvedValue(data([{ ...active, revision: 4 }]));
  await view.rerender(<WorkspaceGroups {...context} revision={1} />);
  await screen.findByText(/Nhóm đã thay đổi hoặc không còn tồn tại/);
  expect(screen.getByLabelText('Tên nhóm mới')).toHaveProp('value', 'Nội dung đang soạn');
  expect(screen.getByRole('button', { name: 'Lưu tên nhóm' })).toBeDisabled();
  expect(api.updateGroup).not.toHaveBeenCalled();
});

it('archives and restores a group using each latest revision', async () => {
  await render(<WorkspaceGroups {...await props()} />);
  const archive = await screen.findByRole('button', { name: 'Lưu trữ Bạn bè' });
  const archived = { ...active, revision: 4, status: 'ARCHIVED' as const };
  api.preparationGroups.mockResolvedValue({ ...data(), groups: [archived] });
  await fireEvent.press(archive);
  await waitFor(() =>
    expect(api.updateGroup).toHaveBeenCalledWith(
      'fixture-access',
      active.bookingId,
      active.guestGroupId,
      { expectedRevision: 3, status: 'ARCHIVED' },
      expect.any(String),
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Xem nhóm đã lưu trữ' }));
  const restore = await screen.findByRole('button', { name: 'Khôi phục Bạn bè' });
  api.preparationGroups.mockResolvedValue(data([{ ...active, revision: 5 }]));
  await fireEvent.press(restore);
  await waitFor(() =>
    expect(api.updateGroup).toHaveBeenLastCalledWith(
      'fixture-access',
      active.bookingId,
      active.guestGroupId,
      { expectedRevision: 4, status: 'ACTIVE' },
      expect.any(String),
    ),
  );
});

it.each(['COMPLETED', 'CANCELLED'] as const)(
  'allows read-only group inspection when the booking is %s',
  async (phase) => {
    await render(<WorkspaceGroups {...await props()} booking={bookingFixture({ phase })} />);
    await screen.findByText(/Tiệc đã đóng/);
    expect(screen.queryByRole('button', { name: 'Đổi tên Bạn bè' })).toBeNull();
    expect(screen.queryByLabelText('Tên nhóm khách')).toBeNull();
    expect(api.createGroup).not.toHaveBeenCalled();
    expect(api.updateGroup).not.toHaveBeenCalled();
  },
);
