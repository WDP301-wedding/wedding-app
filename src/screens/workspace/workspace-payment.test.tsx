import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';
import { WorkspacePayment } from './workspace-payment';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';

jest.mock('./payment-qr', () => ({ PaymentQr: () => <MockText>Mã QR thanh toán</MockText> }));
jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { activeAttempts: jest.fn().mockResolvedValue({ attempts: [] }), attempt: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/payments-billing/billing-api', () => {
  const api = {
    loadContracts: jest.fn().mockResolvedValue({
      bookingId: 'booking',
      currentRevisionId: null,
      modelVersion: 'FULL_CONTRACT_V1',
      revisions: [],
    }),
    load: jest.fn().mockResolvedValue({
      bookingId: 'booking',
      billingRevision: 4,
      balancePaymentEligibility: {
        canPay: true,
        billingRevision: 4,
        reasonCode: null,
        nextAction: 'PAY_BALANCE',
      },
      history: [],
      nextCursor: null,
      totals: {
        acceptedChargesVnd: 10000000,
        paidVnd: 3000000,
        refundedVnd: 0,
        creditVnd: 0,
        netPaidVnd: 3000000,
        outstandingVnd: 7000000,
      },
    }),
  };
  return { createCoupleBillingGateway: () => api };
});
afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});

it('keeps balance disabled before COMPLETED even when the server advisory says canPay', async () => {
  const session = await sessionFixture();
  await render(
    <WorkspacePayment
      session={session}
      booking={bookingFixture()}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
    />,
  );
  expect(await screen.findByRole('button', { name: 'Thanh toán phần còn lại' })).toBeDisabled();
  expect(screen.getByText('Còn phải thanh toán')).toBeOnTheScreen();
  expect(screen.getByText('7.000.000 ₫')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Đã thanh toán: 3.000.000 ₫')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Chi tiết công nợ', expanded: false }));
  expect(screen.getByLabelText('Đã thanh toán: 3.000.000 ₫')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Thanh toán phần còn lại' })).toBeDisabled();
});

it('enables current-revision balance only after explicit completion', async () => {
  const session = await sessionFixture();
  await render(
    <WorkspacePayment
      session={session}
      booking={bookingFixture({ phase: 'COMPLETED' })}
      proposal={proposalFixture({ phase: 'COMPLETED' })}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
    />,
  );
  expect(await screen.findByRole('button', { name: 'Thanh toán phần còn lại' })).toBeEnabled();
});

it('retains paginated ledger history when the panel is closed and reopened', async () => {
  const gateway = createCoupleBillingGateway();
  const base = await gateway.load('fixture', 'booking');
  jest.mocked(gateway.load).mockClear();
  const entry = {
    ledgerEntryId: 'payment-entry',
    kind: 'PAYMENT' as const,
    amountVnd: 3000000,
    occurredAt: '2026-11-13T02:00:00Z',
    paymentAttemptId: 'attempt',
    revision: 4,
    sourceEntryId: null,
    sourceRevisionId: 'source-revision',
    sourceType: 'PAYMENT_ATTEMPT' as const,
  };
  jest
    .mocked(gateway.load)
    .mockResolvedValueOnce({ ...base, history: [entry], nextCursor: 'next-ledger-page' })
    .mockResolvedValueOnce({
      ...base,
      history: [{ ...entry, ledgerEntryId: 'refund-entry', kind: 'REFUND', amountVnd: 500000 }],
      nextCursor: null,
    });
  const session = await sessionFixture();
  await render(
    <WorkspacePayment
      session={session}
      booking={bookingFixture()}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
    />,
  );
  const history = await screen.findByRole('button', { name: 'Lịch sử giao dịch', expanded: false });
  expect(screen.queryByText('3.000.000 ₫')).toBeNull();
  await fireEvent.press(history);
  expect(screen.getByText('3.000.000 ₫')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem thêm giao dịch' }));
  expect(await screen.findByText('Hoàn tiền')).toBeOnTheScreen();
  expect(screen.getByText('500.000 ₫')).toBeOnTheScreen();
  expect(gateway.load).toHaveBeenLastCalledWith('fixture-access', bookingFixture().bookingId, {
    cursor: 'next-ledger-page',
    throughBillingRevision: 4,
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Lịch sử giao dịch', expanded: true }));
  expect(screen.queryByText('Hoàn tiền')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Lịch sử giao dịch', expanded: false }));
  expect(screen.getByText('Hoàn tiền')).toBeOnTheScreen();
  expect(gateway.load).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: 'Xem thêm giao dịch' })).toBeNull();
});

it('hides an old BALANCE QR before completion while retaining status recovery', async () => {
  jest.mocked(createWorkspaceGateway().activeAttempts).mockResolvedValueOnce({
    attempts: [
      {
        paymentAttemptId: 'attempt',
        purpose: 'BALANCE',
        status: 'UNKNOWN',
        amountVnd: 7000000,
        applicationStatus: null,
        checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        expiresAt: '2099-01-01T00:00:00Z',
      },
    ],
  });
  const session = await sessionFixture();
  await render(
    <WorkspacePayment
      session={session}
      booking={bookingFixture()}
      proposal={proposalFixture()}
      revision={0}
      refresh={jest.fn()}
      navigate={jest.fn()}
    />,
  );
  expect(await screen.findByRole('button', { name: 'Kiểm tra trạng thái' })).toBeOnTheScreen();
  expect(screen.queryByText('Mã QR thanh toán')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Mở trang VNPay' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Thanh toán phần còn lại' })).toBeDisabled();
});
