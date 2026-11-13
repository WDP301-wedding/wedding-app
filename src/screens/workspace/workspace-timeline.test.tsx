import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { confirmModal } from '@/lib/confirm';
import { WorkspaceTimeline } from './workspace-timeline';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@/features/restored-flows/restored-flows-api', () => {
  const gateway = {
    createTimeline: jest.fn().mockResolvedValue({}),
    requestCancellation: jest.fn().mockResolvedValue({}),
  };
  return { createRestoredFlowsGateway: () => gateway };
});
const api = jest.mocked(createRestoredFlowsGateway());
afterEach(() => jest.restoreAllMocks());

it('saves the exact predecessor and booking revision; preserves an edited timeline on stale updates', async () => {
  const session = await sessionFixture();
  const proposal = proposalFixture();
  const editable = {
    ...proposal,
    phase: 'DRAFT' as const,
    capabilities: { ...proposal.capabilities, canEditTimeline: true },
  };
  const props = {
    session,
    booking: bookingFixture({ phase: 'DRAFT' }),
    proposal: editable,
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
    locked: false,
    onContract: jest.fn(),
  };
  const view = await render(<WorkspaceTimeline {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Chỉnh sửa kịch bản' }));
  await fireEvent.changeText(screen.getByLabelText('Tên mốc 1'), 'Đón khách mới');
  await view.rerender(<WorkspaceTimeline {...props} proposal={{ ...editable, revision: 5 }} />);
  expect(screen.getByLabelText('Tên mốc 1')).toHaveProp('value', 'Đón khách mới');
  expect(screen.getByRole('button', { name: 'Lưu bản kịch bản mới' })).toBeDisabled();
  expect(api.createTimeline).not.toHaveBeenCalled();
  await view.rerender(<WorkspaceTimeline {...props} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản kịch bản mới' }));
  await waitFor(() =>
    expect(api.createTimeline).toHaveBeenCalledWith(
      'fixture-access',
      props.booking.bookingId,
      expect.objectContaining({
        expectedRevision: 4,
        predecessorRevisionId: proposal.timeline!.revisionId,
        items: [expect.objectContaining({ title: 'Đón khách mới', order: 0 })],
      }),
      expect.any(String),
    ),
  );
});

it('locks standard-contract timeline editing and sends a cancellation request rather than claiming the booking cancelled', async () => {
  jest.spyOn(confirmModal, 'confirm').mockResolvedValue(true);
  const session = await sessionFixture();
  await render(
    <WorkspaceTimeline
      session={session}
      booking={bookingFixture()}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
      locked
      onContract={jest.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Chỉnh sửa kịch bản' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Lý do huỷ tiệc'), 'Đổi kế hoạch gia đình');
  await fireEvent.press(screen.getByRole('button', { name: 'Gửi yêu cầu huỷ' }));
  await waitFor(() =>
    expect(api.requestCancellation).toHaveBeenCalledWith(
      'fixture-access',
      bookingFixture().bookingId,
      { expectedRevision: 4, reason: 'Đổi kế hoạch gia đình' },
      expect.any(String),
    ),
  );
  expect(await screen.findByText('Đã gửi yêu cầu huỷ để nhà hàng xem xét.')).toBeOnTheScreen();
});
