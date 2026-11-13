import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import type { IncidentalExpensesView } from '@/features/payments-billing/billing-api';
import { ExpenseDecision } from './workspace-settlement';

jest.mock('@/features/couple-workspace/workspace-api', () => {
  const decideExpenses = jest.fn().mockResolvedValue({});
  return { createWorkspaceGateway: () => ({ decideExpenses }) };
});
const expenses: IncidentalExpensesView = {
  bookingId: 'booking',
  revision: 7,
  approvalRequired: true,
  canFinalize: false,
  finalized: false,
  pricing: [],
  lines: [],
  totalVnd: 0,
  reviewHistory: [],
  currentReview: {
    id: 'review',
    documentDigest: 'digest',
    draftRevision: 6,
    revisionNumber: 3,
    type: 'EXPENSES',
    state: 'AWAITING_APPROVAL',
    decisionReason: null,
    createdAt: '2026-11-12T00:00:00Z',
    managerAccountId: 'manager',
    managerApprovedAt: '2026-11-12T00:00:00Z',
    coupleAccountId: null,
    coupleApprovedAt: null,
    document: { lines: [], totalVnd: 350000 },
  },
};
const session = { authorize: <T,>(operation: (token: string) => Promise<T>) => operation('token') };
beforeEach(() => jest.clearAllMocks());

it('shows immutable review total and approves that exact review with a stable key', async () => {
  const gateway = createWorkspaceGateway();
  const reload = jest.fn();
  jest.mocked(gateway.decideExpenses).mockRejectedValueOnce(new Error('Mất kết nối'));
  await render(
    <ExpenseDecision session={session} bookingId="booking" expenses={expenses} refresh={reload} />,
  );
  expect(screen.getByText('Tổng bảng gửi duyệt: 350.000 ₫')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' }));
  await screen.findByText(/Chưa rõ kết quả. Giữ nguyên yêu cầu/);
  await fireEvent.press(screen.getByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' }));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  const calls = jest.mocked(gateway.decideExpenses).mock.calls;
  expect(calls[0]![2]).toEqual({
    expectedRevision: 7,
    reviewId: 'review',
    documentDigest: 'digest',
    decision: 'APPROVE',
  });
  expect(calls[0]![3]).toBe(calls[1]![3]);
});

it('requires a reason for changes and does not expose decisions for legacy policy', async () => {
  const result = await render(
    <ExpenseDecision
      session={session}
      bookingId="booking"
      expenses={expenses}
      refresh={jest.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'Yêu cầu chỉnh sửa' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Lý do yêu cầu chỉnh sửa'), 'Sai số lượng nước');
  await fireEvent.press(screen.getByRole('button', { name: 'Yêu cầu chỉnh sửa' }));
  await waitFor(() =>
    expect(createWorkspaceGateway().decideExpenses).toHaveBeenCalledWith(
      'token',
      'booking',
      expect.objectContaining({ decision: 'REQUEST_CHANGES', reason: 'Sai số lượng nước' }),
      expect.any(String),
    ),
  );
  await result.rerender(
    <ExpenseDecision
      session={session}
      bookingId="booking"
      expenses={{ ...expenses, approvalRequired: false }}
      refresh={jest.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' })).toBeNull();
});
