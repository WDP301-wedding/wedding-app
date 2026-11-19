import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import {
  billingFixture,
  expenseFixture,
  invoiceFixture,
  invoiceListFixture,
} from '@/test-support/workspace-fixtures';
import { ExpenseDecision, WorkspaceSettlement } from './workspace-settlement';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@/features/payments-billing/billing-api', () => {
  const api = { loadIncidentals: jest.fn(), loadFinalInvoices: jest.fn(), load: jest.fn() };
  return { createCoupleBillingGateway: () => api };
});
jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { decideExpenses: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
const billing = jest.mocked(createCoupleBillingGateway());
const api = jest.mocked(createWorkspaceGateway());
beforeEach(() => {
  jest.clearAllMocks();
  billing.load.mockResolvedValue(billingFixture());
  billing.loadIncidentals.mockResolvedValue(expenseFixture());
  billing.loadFinalInvoices.mockResolvedValue(invoiceListFixture());
});
async function props() {
  return {
    session: await sessionFixture(),
    booking: bookingFixture({ phase: 'COMPLETED' }),
    proposal: proposalFixture({ phase: 'COMPLETED' }),
    revision: 0,
    refresh: jest.fn(),
    navigate: jest.fn(),
  };
}

it('loads all invoice revisions, displays immutable source totals and lets the user select history', async () => {
  const current = invoiceFixture();
  const older = invoiceFixture({
    invoiceRevisionId: 'invoice-old',
    invoiceNumber: 'INV-TEST-01',
    revisionNumber: 1,
    predecessorRevisionId: null,
  });
  billing.loadFinalInvoices
    .mockResolvedValueOnce({ ...invoiceListFixture([current]), nextCursor: 'older' })
    .mockResolvedValueOnce({
      ...invoiceListFixture([older]),
      currentRevisionId: current.invoiceRevisionId,
    });
  const context = await props();
  await render(<WorkspaceSettlement {...context} />);
  await screen.findByText('INV-TEST-02 · Bản 2');
  expect(screen.getByText('Tổng hoá đơn: 10.200.000 ₫')).toBeOnTheScreen();
  expect(screen.getByText('Thực đơn đã chốt · 10 table')).toBeOnTheScreen();
  expect(screen.getByText(/Đã đối chiếu/)).toBeOnTheScreen();
  expect(billing.loadFinalInvoices).toHaveBeenLastCalledWith(
    'fixture-access',
    context.booking.bookingId,
    'older',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Xem hoá đơn bản 1' }));
  expect(screen.getByText('INV-TEST-01 · Bản 1')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán & giao dịch' }));
  expect(context.navigate).toHaveBeenCalledWith('payment');
});

it('keeps settlement actions unavailable until the current immutable expense review is approved', async () => {
  const expenses = expenseFixture();
  const review = expenses.currentReview!;
  billing.loadIncidentals.mockResolvedValue({
    ...expenses,
    finalized: false,
    currentReview: {
      ...review,
      state: 'AWAITING_APPROVAL',
      coupleAccountId: null,
      coupleApprovedAt: null,
    },
  });
  billing.loadFinalInvoices.mockResolvedValue(invoiceListFixture([]));
  billing.load.mockResolvedValue(
    billingFixture({
      balancePaymentEligibility: {
        canPay: false,
        billingRevision: 4,
        nextAction: 'WAIT_FOR_FINAL_INVOICE',
        reasonCode: 'EXPENSE_APPROVAL_REQUIRED',
      },
    }),
  );
  const context = await props();
  await render(<WorkspaceSettlement {...context} />);
  await screen.findByText(/Nhà hàng chưa chốt hoá đơn cuối/);
  await fireEvent.press(screen.getByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' }));
  await waitFor(() =>
    expect(api.decideExpenses).toHaveBeenCalledWith(
      'fixture-access',
      context.booking.bookingId,
      {
        expectedRevision: expenses.revision,
        reviewId: review.id,
        documentDigest: review.documentDigest,
        decision: 'APPROVE',
      },
      expect.any(String),
    ),
  );
  await waitFor(() => expect(context.refresh).toHaveBeenCalledTimes(1));
});

it('disables expense decisions while the booking context is unverified', async () => {
  const expenses = expenseFixture();
  billing.loadIncidentals.mockResolvedValue({
    ...expenses,
    currentReview: { ...expenses.currentReview!, state: 'AWAITING_APPROVAL' },
  });
  await render(<WorkspaceSettlement {...await props()} contextReady={false} />);
  expect(
    await screen.findByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' }),
  ).toBeDisabled();
  expect(api.decideExpenses).not.toHaveBeenCalled();
});

it('stops a cyclic invoice history cursor instead of displaying an incomplete invoice as current', async () => {
  billing.loadFinalInvoices.mockResolvedValue({ ...invoiceListFixture(), nextCursor: 'cycle' });
  await render(<WorkspaceSettlement {...await props()} />);
  await screen.findByText(/Chưa rõ kết quả/);
  expect(billing.loadFinalInvoices).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('INV-TEST-02 · Bản 2')).toBeNull();
  billing.loadFinalInvoices.mockResolvedValue(invoiceListFixture());
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText('INV-TEST-02 · Bản 2')).toBeOnTheScreen();
});

it('shows debit and credit adjustment evidence and submits the exact review decision', async () => {
  const context = await props();
  const expenses = expenseFixture();
  const review = expenses.currentReview!;
  const adjustment = {
    expectedBillingRevision: 4,
    expectedInvoiceRevisionId: 'invoice-current',
    reason: 'Đối chiếu sau tiệc',
    lines: [
      {
        kind: 'DEBIT' as const,
        name: 'Nước bổ sung',
        quantity: 1,
        unit: 'thùng',
        unitPriceVnd: 100000,
        reason: 'Có xác nhận',
      },
      {
        kind: 'CREDIT' as const,
        name: 'Hoàn món dự phòng',
        quantity: 1,
        unit: 'món',
        unitPriceVnd: 50000,
      },
    ],
  };
  await render(
    <ExpenseDecision
      session={context.session}
      bookingId={context.booking.bookingId}
      refresh={context.refresh}
      expenses={{
        ...expenses,
        currentReview: {
          ...review,
          type: 'ADJUSTMENT',
          state: 'AWAITING_APPROVAL',
          document: {
            ...review.document,
            adjustment,
            lines: [{ ...review.document.lines[0]!, reason: 'Số lượng đã xác nhận' }],
          },
        },
      }}
    />,
  );
  expect(screen.getByText('Tăng · Nước bổ sung')).toBeOnTheScreen();
  expect(screen.getByText('Giảm · Hoàn món dự phòng')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Duyệt toàn bộ điều chỉnh' }));
  await waitFor(() =>
    expect(api.decideExpenses).toHaveBeenCalledWith(
      'fixture-access',
      context.booking.bookingId,
      {
        expectedRevision: 7,
        reviewId: review.id,
        documentDigest: review.documentDigest,
        decision: 'APPROVE',
      },
      expect.any(String),
    ),
  );
});

it('shows the current absence of expenses and distinguishes an empty review from historical decisions', async () => {
  const context = await props();
  const expenses = expenseFixture();
  const review = expenses.currentReview!;
  const historical = {
    ...review,
    id: 'older-review',
    revisionNumber: 2,
    state: 'CHANGES_REQUESTED' as const,
    decisionReason: 'Sai số lượng',
  };
  const view = await render(
    <ExpenseDecision
      session={context.session}
      bookingId={context.booking.bookingId}
      refresh={context.refresh}
      expenses={{
        ...expenses,
        currentReview: { ...review, type: 'NONE', document: { lines: [], totalVnd: 0 } },
        lines: [],
        totalVnd: 0,
        reviewHistory: [historical],
      }}
    />,
  );
  expect(screen.getByText('Nhà hàng xác nhận không phát sinh')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Lịch sử gửi và duyệt' }));
  expect(screen.getByText('Sai số lượng')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Ẩn lịch sử gửi và duyệt' }));
  expect(screen.queryByText('Sai số lượng')).toBeNull();
  await view.rerender(
    <ExpenseDecision
      session={context.session}
      bookingId={context.booking.bookingId}
      refresh={context.refresh}
      expenses={{ ...expenses, currentReview: null }}
    />,
  );
  expect(
    screen.getByText('Nhà hàng chưa gửi bảng phát sinh hoặc xác nhận không phát sinh.'),
  ).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' })).toBeNull();
});
