import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { createProposalGateway } from '@/features/booking-lifecycle/proposal-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { downloadContractPdf, openContractPdf } from '@/features/couple-workspace/contract-files';
import { ApiClientError } from '@/lib/api/client';
import { confirmModal } from '@/lib/confirm';
import { ContractDetails, WorkspaceAgreement } from './workspace-agreement';
import {
  bookingFixture,
  contractFixture,
  contractListFixture,
  proposalFixture,
  sessionFixture,
} from './workspace-test-support';

jest.mock('@/features/payments-billing/billing-api', () => {
  const api = { loadContracts: jest.fn() };
  return { createCoupleBillingGateway: () => api };
});
jest.mock('@/features/booking-lifecycle/proposal-api', () => {
  const api = { loadCoupleProfile: jest.fn(), updateCoupleProfile: jest.fn() };
  return { createProposalGateway: () => api };
});
jest.mock('@/features/restored-flows/restored-flows-api', () => {
  const api = { approveContract: jest.fn(), withdrawContract: jest.fn() };
  return { createRestoredFlowsGateway: () => api };
});
jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { requestContractChanges: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/couple-workspace/contract-files', () => ({
  downloadContractPdf: jest.fn(),
  openContractPdf: jest.fn(),
}));
const billing = jest.mocked(createCoupleBillingGateway());
const profile = jest.mocked(createProposalGateway());
const commercial = jest.mocked(createRestoredFlowsGateway());
const api = jest.mocked(createWorkspaceGateway());
const pdf = new Uint8Array([37, 80, 68, 70, 45]);
beforeEach(() => {
  jest.clearAllMocks();
  billing.loadContracts.mockResolvedValue(contractListFixture());
  profile.loadCoupleProfile.mockResolvedValue({
    consultationId: bookingFixture().consultationId,
    displayName: 'Tài khoản thử nghiệm',
    brideName: null,
    groomName: null,
    revision: 3,
  });
  jest.mocked(downloadContractPdf).mockResolvedValue(pdf);
  jest.mocked(openContractPdf).mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());
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

it('saves trimmed couple names with the captured profile revision and retains them after a failed save', async () => {
  billing.loadContracts.mockResolvedValue({
    ...contractListFixture(),
    currentRevisionId: null,
    revisions: [],
  });
  profile.updateCoupleProfile.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
    consultationId: bookingFixture().consultationId,
    displayName: 'Tài khoản thử nghiệm',
    brideName: 'Lan',
    groomName: 'Nam',
    revision: 4,
  });
  const context = await props();
  await render(<WorkspaceAgreement {...context} step="contract" />);
  await screen.findByText(/Nhà hàng đang chuẩn bị hợp đồng/);
  await fireEvent.changeText(await screen.findByLabelText('Tên cô dâu'), ' Lan ');
  await fireEvent.changeText(screen.getByLabelText('Tên chú rể'), ' Nam ');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu tên cô dâu & chú rể' }));
  await screen.findByText(/Chưa rõ kết quả/);
  expect(screen.getByLabelText('Tên cô dâu')).toHaveProp('value', ' Lan ');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu tên cô dâu & chú rể' }));
  await screen.findByText('Đã lưu tên cô dâu & chú rể.');
  expect(profile.updateCoupleProfile).toHaveBeenLastCalledWith(
    'fixture-access',
    context.booking.consultationId,
    { brideName: 'Lan', groomName: 'Nam', expectedRevision: 3 },
    expect.any(String),
  );
  expect(profile.updateCoupleProfile.mock.calls[0]![3]).toBe(
    profile.updateCoupleProfile.mock.calls[1]![3],
  );
  expect(context.refresh).toHaveBeenCalledTimes(1);
});

it('loads contract history pages and downloads the exact historical and readable revisions', async () => {
  const current = contractFixture();
  const older = contractFixture({
    revisionId: 'older-contract',
    revisionNumber: 2,
    state: 'SUPERSEDED',
  });
  const unsent = contractFixture({
    revisionId: 'unsent',
    revisionNumber: 1,
    state: 'DRAFT',
    submittedAt: null,
  });
  billing.loadContracts
    .mockResolvedValueOnce({ ...contractListFixture(current), nextCursor: 'history' })
    .mockResolvedValueOnce({ ...contractListFixture(current), revisions: [older, unsent] });
  const context = await props();
  await render(<WorkspaceAgreement {...context} step="contract" />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Lịch sử hợp đồng' }));
  expect(billing.loadContracts).toHaveBeenLastCalledWith(
    'fixture-access',
    context.booking.bookingId,
    'history',
  );
  expect(screen.queryByRole('button', { name: 'Mở PDF hợp đồng bản 1' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Mở PDF hợp đồng bản 2' }));
  await waitFor(() => expect(openContractPdf).toHaveBeenCalledWith(pdf, older.revisionId));
  await fireEvent.press(screen.getByRole('button', { name: 'Mở PDF dễ đọc' }));
  await waitFor(() => expect(openContractPdf).toHaveBeenCalledWith(pdf, current.revisionId, true));
  expect(downloadContractPdf).toHaveBeenLastCalledWith(
    'fixture-access',
    context.booking.bookingId,
    current.revisionId,
    true,
  );
});

it('stops a cyclic history cursor and allows an explicit retry', async () => {
  billing.loadContracts.mockResolvedValue({ ...contractListFixture(), nextCursor: 'same-page' });
  const context = await props();
  await render(<WorkspaceAgreement {...context} step="contract" />);
  await screen.findByText(/Chưa rõ kết quả/);
  expect(billing.loadContracts).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: 'Mở PDF chính thức' })).toBeNull();
  billing.loadContracts.mockResolvedValue(contractListFixture());
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByRole('button', { name: 'Mở PDF chính thức' })).toBeOnTheScreen();
});

it.each([403, 404])(
  'discards contract actions when a refreshed read is denied with %s',
  async (status) => {
    const context = await props();
    const view = await render(<WorkspaceAgreement {...context} step="contract" />);
    await screen.findByRole('button', { name: 'Mở PDF chính thức' });
    billing.loadContracts.mockRejectedValue(
      new ApiClientError({
        kind: 'api',
        status,
        code: 'NOT_FOUND',
        message: 'denied',
        requestId: 'fixture-request',
      }),
    );
    await view.rerender(<WorkspaceAgreement {...context} revision={1} step="contract" />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Mở PDF chính thức' })).toBeNull(),
    );
    expect(commercial.approveContract).not.toHaveBeenCalled();
  },
);

it('honors confirmation cancellation and retries approval with the same immutable revision and key', async () => {
  jest.spyOn(confirmModal, 'confirm').mockResolvedValueOnce(false).mockResolvedValue(true);
  commercial.approveContract.mockRejectedValueOnce(new Error('offline'));
  const contract = contractFixture({ state: 'AWAITING_APPROVAL', approvals: [] });
  const context = await props();
  await render(
    <ContractDetails {...context} contracts={contractListFixture(contract)} contract={contract} />,
  );
  const button = screen.getByRole('button', { name: 'Đồng ý & duyệt hợp đồng' });
  await fireEvent.press(button);
  await waitFor(() => expect(confirmModal.confirm).toHaveBeenCalledTimes(1));
  expect(commercial.approveContract).not.toHaveBeenCalled();
  await fireEvent.press(button);
  await screen.findByText(/Chưa rõ kết quả/);
  await fireEvent.press(button);
  await screen.findByText('Đã ghi nhận hai bạn duyệt hợp đồng.');
  const [first, second] = commercial.approveContract.mock.calls;
  expect(first).toEqual([
    'fixture-access',
    context.booking.bookingId,
    contract.revisionId,
    { expectedRevision: 4 },
    expect.any(String),
  ]);
  expect(second).toEqual(first);
});

it('bounds and trims a request to change a submitted contract', async () => {
  const context = await props();
  const contract = contractFixture({ state: 'AWAITING_APPROVAL', approvals: [] });
  await render(
    <ContractDetails {...context} contracts={contractListFixture(contract)} contract={contract} />,
  );
  const button = screen.getByRole('button', { name: 'Yêu cầu nhà hàng chỉnh sửa' });
  expect(button).toBeDisabled();
  await fireEvent.changeText(
    screen.getByLabelText('Lý do yêu cầu chỉnh sửa hợp đồng'),
    'x'.repeat(501),
  );
  expect(button).toBeDisabled();
  await fireEvent.changeText(
    screen.getByLabelText('Lý do yêu cầu chỉnh sửa hợp đồng'),
    ' Sai số bàn ',
  );
  await fireEvent.press(button);
  await waitFor(() =>
    expect(api.requestContractChanges).toHaveBeenCalledWith(
      'fixture-access',
      context.booking.bookingId,
      contract.revisionId,
      { expectedRevision: 4, reason: 'Sai số bàn' },
      expect.any(String),
    ),
  );
});

it('permits withdrawing an approved legacy contract before deposit without changing the standard contract policy', async () => {
  const context = await props();
  const standard = contractFixture();
  const { standardTerms, ...document } = standard.document;
  expect(standardTerms).toBeDefined();
  const legacy = { ...standard, document };
  const contracts = contractListFixture(legacy);
  await render(
    <ContractDetails
      {...context}
      booking={bookingFixture({ phase: 'AWAITING_DEPOSIT' })}
      contracts={contracts}
      contract={legacy}
    />,
  );
  await fireEvent.changeText(screen.getByLabelText('Lý do rút duyệt hợp đồng'), ' Cần điều chỉnh ');
  await fireEvent.press(screen.getByRole('button', { name: 'Rút duyệt hợp đồng' }));
  await waitFor(() =>
    expect(commercial.withdrawContract).toHaveBeenCalledWith(
      'fixture-access',
      context.booking.bookingId,
      legacy.revisionId,
      { expectedRevision: 4, reason: 'Cần điều chỉnh' },
      expect.any(String),
    ),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
  expect(context.navigate).toHaveBeenCalledWith('payment');
});
