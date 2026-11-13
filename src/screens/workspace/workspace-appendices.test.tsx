import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  createCoupleBillingGateway,
  type CommercialAppendixView,
} from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { confirmModal } from '@/lib/confirm';
import { WorkspaceAppendices } from './workspace-appendices';
import {
  bookingFixture,
  contractListFixture,
  proposalFixture,
  sessionFixture,
} from './workspace-test-support';
jest.mock('@/features/payments-billing/billing-api', () => {
  const api = { loadAppendices: jest.fn(), loadContracts: jest.fn() };
  return { createCoupleBillingGateway: () => api };
});
jest.mock('@/features/restored-flows/restored-flows-api', () => {
  const api = {
    submitAppendix: jest.fn().mockResolvedValue({}),
    approveAppendix: jest.fn().mockResolvedValue({}),
  };
  return { createRestoredFlowsGateway: () => api };
});
const api = jest.mocked(createCoupleBillingGateway());
const appendix = {
  revisionId: 'appendix',
  revisionNumber: 2,
  state: 'DRAFT',
  documentDigest: 'digest',
  createdAt: '2026-11-12T00:00:00Z',
  submittedAt: null,
  approvedAt: null,
  approvals: [],
  document: {
    bookingId: 'booking',
    contractRevisionId: 'contract',
    predecessorRevisionId: 'contract',
    brideName: 'Minh Anh',
    groomName: 'Trọng Nghĩa',
    tableCount: 10,
    reason: 'Bổ sung dịch vụ',
    beforeLines: [],
    afterLines: [],
    beforeTotalVnd: 10000000,
    afterTotalVnd: 11000000,
    deltaVnd: 1000000,
  },
} satisfies CommercialAppendixView['revisions'][number];
const list = {
  bookingId: 'booking',
  bookingRevision: 8,
  currentRevisionId: 'appendix',
  effectiveRevisionId: 'contract',
  effectiveTotalVnd: 10000000,
  revisions: [appendix],
  nextCursor: null,
} satisfies CommercialAppendixView;
beforeEach(() => {
  jest.clearAllMocks();
  api.loadContracts.mockResolvedValue(contractListFixture());
  api.loadAppendices.mockResolvedValue(list);
  jest.spyOn(confirmModal, 'confirm').mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());
it('requires resolving the current draft and submits its exact booking revision', async () => {
  const props = {
    session: await sessionFixture(),
    booking: bookingFixture(),
    proposal: proposalFixture(),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
  await render(<WorkspaceAppendices {...props} />);
  const submit = await screen.findByRole('button', { name: 'Gửi phụ lục duyệt' });
  expect(screen.queryByRole('button', { name: 'Tạo phụ lục thay đổi' })).toBeNull();
  expect(screen.getByText('Chênh lệch: 1.000.000 ₫')).toBeOnTheScreen();
  await fireEvent.press(submit);
  await waitFor(() =>
    expect(createRestoredFlowsGateway().submitAppendix).toHaveBeenCalledWith(
      'fixture-access',
      props.booking.bookingId,
      'appendix',
      { expectedRevision: 8 },
      expect.any(String),
    ),
  );
});
it('keeps print-linked appendices out of generic submit/approve/cancel controls', async () => {
  api.loadAppendices.mockResolvedValue({
    ...list,
    revisions: [{ ...appendix, printOrderId: 'print-order' }],
  });
  await render(
    <WorkspaceAppendices
      session={await sessionFixture()}
      booking={bookingFixture()}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
    />,
  );
  expect(await screen.findByText(/Phụ lục này thuộc yêu cầu in thiệp/)).toBeOnTheScreen();
  for (const name of ['Gửi phụ lục duyệt', 'Duyệt phụ lục', 'Huỷ phụ lục đang chờ'])
    expect(screen.queryByRole('button', { name })).toBeNull();
});
