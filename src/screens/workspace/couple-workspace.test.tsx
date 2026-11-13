import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text as MockText, Pressable as MockPressable } from 'react-native';
import { createExperienceGateway } from '@/features/identity-access/experience-api';
import { createProposalGateway } from '@/features/booking-lifecycle/proposal-api';
import { CoupleWorkspace, initialWorkspaceTarget } from './couple-workspace';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@expo/ui', () => ({
  ...jest.requireActual('@expo/ui'),
  ...jest.requireActual('./workspace-sheet-test-support'),
}));

jest.mock('@/features/couple-workspace/realtime', () => ({
  connectWorkspaceRealtime: () => () => {},
}));
jest.mock('@/features/identity-access/experience-api', () => {
  const api = { overview: jest.fn() };
  return { createExperienceGateway: () => api };
});
jest.mock('@/features/booking-lifecycle/proposal-api', () => {
  const api = { loadProposal: jest.fn() };
  return { createProposalGateway: () => api };
});
jest.mock('@/features/notifications/notification-api', () => ({
  createNotificationGateway: () => ({ countUnread: async () => 0 }),
}));
jest.mock('./workspace-overview', () => {
  const { Page } = jest.requireActual('./workspace-common');
  return {
    WorkspaceOverview: ({ booking }: { booking: { bookingId: string } }) => (
      <Page title="Tổng quan">
        <MockText>{`overview:${booking.bookingId}`}</MockText>
      </Page>
    ),
  };
});
jest.mock('./workspace-agreement', () => ({
  WorkspaceAgreement: () => <MockText>agreement panel</MockText>,
}));
jest.mock('./workspace-payment', () => ({
  WorkspacePayment: () => <MockText>payment panel</MockText>,
}));
jest.mock('./workspace-prepare', () => ({
  WorkspacePrepare: () => <MockText>prepare panel</MockText>,
}));
jest.mock('./workspace-settlement', () => ({
  WorkspaceSettlement: () => <MockText>settlement panel</MockText>,
}));
jest.mock('./workspace-notifications', () => ({
  WorkspaceNotifications: ({
    onOpenBooking,
  }: {
    onOpenBooking: (id: string, target: { destination: 'agreement' }) => void;
  }) => (
    <MockPressable
      accessibilityRole="button"
      accessibilityLabel="Foreign booking notification"
      onPress={() => onOpenBooking('not-owned', { destination: 'agreement' })}
    >
      <MockText>foreign</MockText>
    </MockPressable>
  ),
}));
const api = jest.mocked(createExperienceGateway());
const proposal = jest.mocked(createProposalGateway());
beforeEach(() => {
  jest.clearAllMocks();
  proposal.loadProposal.mockResolvedValue(proposalFixture());
});
it('loads all pages, selects the nearest active booking and scopes proposal reads after switching', async () => {
  const old = bookingFixture({ bookingId: 'old', phase: 'COMPLETED', eventDate: '2025-01-01' });
  const next = bookingFixture({
    bookingId: 'next',
    eventDate: '2027-12-01',
    alias: 'Tiệc cuối năm',
  });
  const nearest = bookingFixture({
    bookingId: 'nearest',
    eventDate: '2027-01-01',
    alias: 'Tiệc đầu năm',
  });
  api.overview
    .mockResolvedValueOnce({ data: [old, next], nextCursor: 'page-2' })
    .mockResolvedValueOnce({ data: [nearest], nextCursor: null });
  await render(<CoupleWorkspace session={await sessionFixture()} onLogout={jest.fn()} />);
  expect(await screen.findByText('overview:nearest')).toBeOnTheScreen();
  expect(api.overview).toHaveBeenLastCalledWith('fixture-access', 'page-2');
  await fireEvent.press(screen.getByRole('tab', { name: 'Thêm' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi tiệc đang xem' }));
  await fireEvent.press(
    screen.getByRole('button', { name: `Chọn tiệc ${next.alias} ngày ${next.eventDate}` }),
  );
  expect(await screen.findByText('overview:next')).toBeOnTheScreen();
  expect(screen.queryByText('overview:nearest')).toBeNull();
  await waitFor(() =>
    expect(proposal.loadProposal).toHaveBeenLastCalledWith('fixture-access', 'next'),
  );
});
it('rejects notification navigation to a booking outside the authorized list', async () => {
  api.overview.mockResolvedValue({ data: [bookingFixture()], nextCursor: null });
  await render(<CoupleWorkspace session={await sessionFixture()} onLogout={jest.fn()} />);
  await screen.findByText(`overview:${bookingFixture().bookingId}`);
  await fireEvent.press(screen.getByRole('button', { name: /Thông báo/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Foreign booking notification' }));
  expect(screen.getByText(/hiện không có quyền xem tiệc/)).toBeOnTheScreen();
  expect(proposal.loadProposal).not.toHaveBeenCalledWith(expect.any(String), 'not-owned');
});
it('maps existing direct entries to the source four-section structure', () => {
  expect(initialWorkspaceTarget('contracts')).toEqual({
    destination: 'agreement',
    agreementStep: 'contract',
  });
  expect(initialWorkspaceTarget('appendices')).toEqual({
    destination: 'prepare',
    prepareSection: 'appendix',
  });
  expect(initialWorkspaceTarget('invoices')).toEqual({ destination: 'settlement' });
});
