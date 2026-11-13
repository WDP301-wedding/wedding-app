import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import {
  createCoupleBillingGateway,
  type AttemptView,
} from '@/features/payments-billing/billing-api';
import { ApiClientError } from '@/lib/api/client';
import { confirmModal } from '@/lib/confirm';
import { WorkspacePayment } from './workspace-payment';
import {
  bookingFixture,
  contractFixture,
  contractListFixture,
  proposalFixture,
  sessionFixture,
} from './workspace-test-support';

jest.mock('./payment-qr', () => ({ PaymentQr: () => <MockText>Mã QR thanh toán</MockText> }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: async (_algorithm: string, value: string) =>
    jest.requireActual('node:crypto').createHash('sha256').update(value).digest('hex'),
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { activeAttempts: jest.fn(), attempt: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/payments-billing/billing-api', () => {
  const billing = {
    loadContracts: jest.fn(),
    load: jest.fn(),
    startBalance: jest.fn(),
    startDeposit: jest.fn(),
  };
  return { createCoupleBillingGateway: () => billing };
});

const api = jest.mocked(createWorkspaceGateway());
const billing = jest.mocked(createCoupleBillingGateway());
const attempt = {
  paymentAttemptId: '00000000-0000-4000-8000-000000000701',
  purpose: 'BALANCE',
  status: 'UNKNOWN',
  applicationStatus: null,
  amountVnd: 7000000,
  checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  expiresAt: '2099-01-01T00:00:00Z',
} satisfies AttemptView;
const view = (revision = 4) => ({
  bookingId: bookingFixture().bookingId,
  billingRevision: revision,
  balancePaymentEligibility: {
    canPay: true as const,
    billingRevision: revision,
    reasonCode: null,
    nextAction: 'PAY_BALANCE' as const,
  },
  history: [],
  charges: [],
  payments: [],
  refunds: [],
  nextCursor: null,
  totals: {
    acceptedChargesVnd: 10000000,
    paidVnd: 3000000,
    refundedVnd: 0,
    creditVnd: 0,
    netPaidVnd: 3000000,
    outstandingVnd: 7000000,
  },
});
const apiError = (status: number, code: string) =>
  new ApiClientError({ kind: 'api', status, code, message: code, requestId: 'fixture-request' });

beforeEach(() => {
  const records = new Map<string, string>();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => records.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    records.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    records.delete(key);
  });
  api.activeAttempts.mockReset();
  api.attempt.mockReset();
  billing.loadContracts.mockReset();
  billing.load.mockReset();
  billing.startBalance.mockReset();
  billing.startDeposit.mockReset();
  api.activeAttempts.mockResolvedValue({ attempts: [] });
  api.attempt.mockResolvedValue(attempt);
  billing.loadContracts.mockResolvedValue(contractListFixture());
  billing.load.mockResolvedValue(view());
  billing.startBalance.mockResolvedValue({
    paymentAttemptId: attempt.paymentAttemptId,
    status: attempt.status,
    checkoutUrl: attempt.checkoutUrl,
    expiresAt: attempt.expiresAt,
  });
  jest.spyOn(confirmModal, 'confirm').mockResolvedValue(true);
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

async function paymentProps() {
  return {
    session: await sessionFixture(),
    booking: bookingFixture({ phase: 'COMPLETED' }),
    proposal: proposalFixture({ phase: 'COMPLETED' }),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
}

it('retries a rate-limited balance checkout with the same key and captured revision', async () => {
  billing.startBalance.mockRejectedValueOnce(apiError(429, 'RATE_LIMIT_EXCEEDED'));
  const props = await paymentProps();
  await render(<WorkspacePayment {...props} />);
  const pay = await screen.findByRole('button', { name: 'Thanh toán phần còn lại' });
  await fireEvent.press(pay);
  await screen.findByText('Bạn đã gửi quá nhiều yêu cầu. Hãy chờ rồi thử lại.');
  const first = billing.startBalance.mock.calls[0]!;
  await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán phần còn lại' }));
  await waitFor(() => expect(billing.startBalance).toHaveBeenCalledTimes(2));
  expect(billing.startBalance.mock.calls[1]).toEqual(first);
  expect(first).toEqual([
    'fixture-access',
    props.booking.bookingId,
    { expectedBillingRevision: 4 },
    expect.stringMatching(/^[0-9a-f-]{36}$/),
  ]);
  expect(await screen.findByText('Mã QR thanh toán')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Mở trang VNPay' })).toBeNull();
});

it('explains QR creation for the contract deposit and keeps payment status separate from QR creation', async () => {
  const timelineRevisionId = '00000000-0000-4000-8000-000000000801';
  const contract = contractFixture({
    document: { ...contractFixture().document, timelineRevisionId },
  });
  billing.loadContracts.mockResolvedValue(contractListFixture(contract));
  api.attempt.mockResolvedValue({ ...attempt, purpose: 'DEPOSIT', status: 'CREATED' });
  billing.startDeposit.mockResolvedValue({
    paymentAttemptId: attempt.paymentAttemptId,
    status: 'CREATED',
    checkoutUrl: attempt.checkoutUrl,
    expiresAt: attempt.expiresAt,
  });
  const props = {
    ...(await paymentProps()),
    booking: bookingFixture({ phase: 'AWAITING_DEPOSIT' }),
    proposal: proposalFixture({ phase: 'AWAITING_DEPOSIT' }),
  };
  await render(<WorkspacePayment {...props} />);
  const deposit = await screen.findByRole('button', { name: 'Đặt cọc qua VNPay' });
  await waitFor(() => expect(deposit).toBeEnabled());
  await fireEvent.press(deposit);
  expect(confirmModal.confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Tạo mã QR đặt cọc',
      confirmText: 'Tạo mã QR',
      message: expect.stringMatching(/Khoản đặt cọc là 3\.000\.000\s₫/u),
    }),
  );
  expect(await screen.findByText('Mã QR thanh toán')).toBeOnTheScreen();
  expect(
    screen.getByText(
      'Quét mã QR bên dưới để thanh toán. Khi thanh toán xong, chọn “Kiểm tra trạng thái” để xem kết quả.',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Kiểm tra trạng thái' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Mở trang VNPay' })).toBeNull();
  expect(screen.queryByText('Đã xác nhận thanh toán')).toBeNull();
  expect(billing.startDeposit).toHaveBeenCalledWith(
    'fixture-access',
    props.booking.bookingId,
    {
      timelineRevisionId,
      contractRevisionId: contract.revisionId,
      documentDigest: contract.documentDigest,
    },
    expect.any(String),
  );
  expect(billing.startBalance).not.toHaveBeenCalled();
});

it('keeps the original checkout revision after timeout and a newer billing read', async () => {
  billing.startBalance.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'timeout',
      code: 'REQUEST_TIMEOUT',
      message: 'timeout',
      requestId: 'r',
    }),
  );
  const props = await paymentProps();
  const result = await render(<WorkspacePayment {...props} />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Thanh toán phần còn lại' }));
  await waitFor(() => expect(billing.startBalance).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Thanh toán phần còn lại' })).toBeEnabled(),
  );
  const first = billing.startBalance.mock.calls[0]!;
  billing.load.mockResolvedValue(view(5));
  await result.rerender(<WorkspacePayment {...props} revision={1} />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Thanh toán phần còn lại' })).toBeEnabled(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán phần còn lại' }));
  await waitFor(() => expect(billing.startBalance).toHaveBeenCalledTimes(2));
  expect(billing.startBalance.mock.calls[1]).toEqual(first);
  expect(first[2]).toEqual({ expectedBillingRevision: 4 });
});

it.each(['UNKNOWN', 'SUCCEEDED'] as const)(
  'blocks another payment while %s is unresolved or not yet applied',
  async (status) => {
    const unresolved = { ...attempt, status, applicationStatus: null };
    api.activeAttempts.mockResolvedValue({ attempts: [unresolved] });
    api.attempt.mockResolvedValue(unresolved);
    await render(<WorkspacePayment {...await paymentProps()} />);
    expect(await screen.findByRole('button', { name: 'Kiểm tra trạng thái' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Thanh toán phần còn lại' })).toBeDisabled();
    expect(billing.startBalance).not.toHaveBeenCalled();
  },
);

it.each([401, 403, 404])('removes stale balances after a %s read denial', async (status) => {
  const props = await paymentProps();
  const result = await render(<WorkspacePayment {...props} />);
  await screen.findByText('7.000.000 ₫');
  billing.load.mockRejectedValueOnce(apiError(status, 'FORBIDDEN'));
  await result.rerender(<WorkspacePayment {...props} revision={1} />);
  await waitFor(() => expect(screen.queryByText('7.000.000 ₫')).toBeNull());
  expect(screen.queryByRole('button', { name: 'Thanh toán phần còn lại' })).toBeNull();
  expect(billing.startBalance).not.toHaveBeenCalled();
});

it('does not offer collection when a linked attempt cannot be recovered', async () => {
  api.attempt.mockRejectedValueOnce(apiError(503, 'SERVICE_UNAVAILABLE'));
  await render(
    <WorkspacePayment {...await paymentProps()} initialAttemptId={attempt.paymentAttemptId} />,
  );
  await screen.findByText('Dịch vụ tạm thời bận hoặc bảo trì. Vui lòng thử lại sau.');
  expect(api.attempt).toHaveBeenCalledWith(
    'fixture-access',
    bookingFixture().bookingId,
    attempt.paymentAttemptId,
    false,
  );
  expect(screen.queryByRole('button', { name: 'Thanh toán phần còn lại' })).toBeNull();
  expect(billing.startBalance).not.toHaveBeenCalled();
});
