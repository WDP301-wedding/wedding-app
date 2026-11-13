import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { View as MockView } from 'react-native';
import type { ReactNode } from 'react';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { WorkspaceGroups } from './workspace-groups';
import { WorkspacePrepare } from './workspace-prepare';
import { WorkspaceInvitations } from './workspace-invitations';
import { WorkspaceSettlement } from './workspace-settlement';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@expo/ui', () => ({
  Host: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
  Picker: Object.assign(
    (props: {
      testID?: string;
      children?: ReactNode;
      selectedValue: string;
      onValueChange: (value: string) => void;
    }) => <MockView {...props} />,
    { Item: () => null },
  ),
}));

jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = {
    preparationGroups: jest.fn(),
    invitations: jest.fn(),
    printRequests: jest.fn().mockResolvedValue([]),
    publication: jest.fn(),
  };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/payments-billing/billing-api', () => {
  const actual = jest.requireActual('@/features/payments-billing/billing-api');
  const api = { updateGuestPlan: jest.fn().mockResolvedValue({}) };
  return { ...actual, createCoupleBillingGateway: () => api };
});
jest.mock('@/features/invitation-studio/app-invitation-api', () => {
  const api = { publishInvitation: jest.fn().mockResolvedValue({}) };
  return { createAppInvitationGateway: () => api };
});
const api = jest.mocked(createWorkspaceGateway());
beforeEach(() => jest.clearAllMocks());

it('blocks direct preparation and settlement before the source access/phase gates without loading child data', async () => {
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture({ accessLevel: 'RESTRICTED' }),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
  const view = await render(<WorkspacePrepare {...props} section="invitation" />);
  expect(
    screen.getByText(/bắt đầu chuẩn bị sau khi khoản đặt cọc được xác nhận/),
  ).toBeOnTheScreen();
  expect(api.invitations).not.toHaveBeenCalled();
  expect(screen.queryByTestId('prepare-section-picker')).toBeNull();
  await view.rerender(<WorkspaceSettlement {...props} booking={bookingFixture()} />);
  expect(screen.getByText(/Chờ nhà hàng đánh dấu tiệc đã tổ chức xong/)).toBeOnTheScreen();
  expect(screen.queryByText('Chi phí phát sinh')).toBeNull();
});

it('switches preparation through one picker, retains the headcount draft and follows direct section changes', async () => {
  api.preparationGroups.mockResolvedValue({
    groups: [],
    plan: {
      bookingId: bookingFixture().bookingId,
      revision: 8,
      planningHeadcount: 95,
      sourceGuestPlanRevisionId: null,
      sourceSequence: 8,
    },
  });
  api.invitations.mockResolvedValue([]);
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
    onSectionChange: jest.fn(),
  };
  const view = await render(<WorkspacePrepare {...props} />);
  expect(screen.getByTestId('prepare-section-picker')).toHaveProp('selectedValue', 'groups');
  expect(api.invitations).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Sơ đồ' })).toBeNull();
  await fireEvent.press(await screen.findByRole('button', { name: 'Sửa số khách dự kiến' }));
  await fireEvent.changeText(screen.getByLabelText('Số khách dự kiến'), '98');
  await fireEvent(screen.getByTestId('prepare-section-picker'), 'valueChange', 'invitation');
  expect(props.onSectionChange).toHaveBeenLastCalledWith('invitation');
  expect(await screen.findByText(/Chưa có thiệp cưới/)).toBeOnTheScreen();
  expect(screen.queryByLabelText('Số khách dự kiến')).toBeNull();
  await fireEvent(screen.getByTestId('prepare-section-picker'), 'valueChange', 'groups');
  expect(screen.getByLabelText('Số khách dự kiến')).toHaveProp('value', '98');
  expect(api.preparationGroups).toHaveBeenCalledTimes(1);
  await view.rerender(<WorkspacePrepare {...props} section="invitation" />);
  expect(screen.getByTestId('prepare-section-picker')).toHaveProp('selectedValue', 'invitation');
  expect(screen.getByText(/Chưa có thiệp cưới/)).toBeOnTheScreen();
});

it('enforces the current table capacity and sends the exact plan revision without named-guest calls', async () => {
  api.preparationGroups.mockResolvedValue({
    groups: [],
    plan: {
      bookingId: bookingFixture().bookingId,
      revision: 8,
      planningHeadcount: 95,
      sourceGuestPlanRevisionId: null,
      sourceSequence: 8,
    },
  });
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
  await render(<WorkspaceGroups {...props} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Sửa số khách dự kiến' }));
  await fireEvent.changeText(screen.getByLabelText('Số khách dự kiến'), '101');
  expect(screen.getByRole('button', { name: 'Lưu số khách' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Số khách dự kiến'), '100');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu số khách' }));
  await waitFor(() =>
    expect(createCoupleBillingGateway().updateGuestPlan).toHaveBeenCalledWith(
      'fixture-access',
      props.booking.bookingId,
      8,
      100,
      expect.any(String),
    ),
  );
});

it('preserves a headcount draft but blocks saving after another client changes the plan revision', async () => {
  const initial = {
    groups: [],
    plan: {
      bookingId: bookingFixture().bookingId,
      revision: 8,
      planningHeadcount: 95,
      sourceGuestPlanRevisionId: null,
      sourceSequence: 8,
    },
  };
  api.preparationGroups.mockResolvedValueOnce(initial).mockResolvedValueOnce({
    ...initial,
    plan: { ...initial.plan, revision: 9, planningHeadcount: 100 },
  });
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
  const view = await render(<WorkspaceGroups {...props} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Sửa số khách dự kiến' }));
  await fireEvent.changeText(screen.getByLabelText('Số khách dự kiến'), '98');
  await view.rerender(<WorkspaceGroups {...props} revision={1} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu số khách' })).toBeDisabled());
  expect(screen.getByLabelText('Số khách dự kiến')).toHaveProp('value', '98');
  expect(createCoupleBillingGateway().updateGuestPlan).not.toHaveBeenCalled();
});

it('publishes the exact design and publication revisions, but hides mutation controls for a closed booking', async () => {
  const design = {
    designId: 'design',
    revisionId: 'design-rev',
    revisionNumber: 3,
    title: 'Vườn chiều',
    updatedAt: '2026-11-12T00:00:00Z',
    includesSeating: false,
    derivedAssetIds: [],
    sections: [],
    textFields: { brideName: 'Minh Anh', groomName: 'Trọng Nghĩa' },
  } satisfies Awaited<ReturnType<typeof api.invitations>>[number];
  api.invitations.mockResolvedValue([design]);
  api.publication.mockResolvedValue({
    published: false,
    designRevisionId: null,
    publicSlug: null,
    publicationRevision: 7,
    publishedRevisionId: null,
  });
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
  const view = await render(<WorkspaceInvitations {...props} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Xuất bản thiệp · Vườn chiều' }));
  await waitFor(() =>
    expect(createAppInvitationGateway().publishInvitation).toHaveBeenCalledWith(
      'fixture-access',
      props.booking.bookingId,
      'design',
      3,
      'design-rev',
      7,
      expect.any(String),
    ),
  );
  await view.rerender(
    <WorkspaceInvitations {...props} booking={bookingFixture({ phase: 'COMPLETED' })} />,
  );
  expect(screen.queryByRole('button', { name: 'Xuất bản thiệp · Vườn chiều' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Xem thiết kế trên web' })).toBeOnTheScreen();
});
