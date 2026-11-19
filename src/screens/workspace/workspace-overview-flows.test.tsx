import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { billingFixture, invoiceListFixture } from '@/test-support/workspace-fixtures';
import { WorkspaceOverview } from './workspace-overview';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = { updateAlias: jest.fn() };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/payments-billing/billing-api', () => {
  const api = { load: jest.fn(), loadFinalInvoices: jest.fn() };
  return { createCoupleBillingGateway: () => api };
});
const api = jest.mocked(createWorkspaceGateway());
const billing = jest.mocked(createCoupleBillingGateway());
beforeEach(() => {
  jest.clearAllMocks();
  billing.load.mockResolvedValue(billingFixture());
  billing.loadFinalInvoices.mockResolvedValue(invoiceListFixture());
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

it('preserves an alias on failed save and sends the same trimmed name with the current revision on retry', async () => {
  const context = await props();
  api.updateAlias.mockRejectedValueOnce(new Error('offline'));
  await render(<WorkspaceOverview {...context} booking={bookingFixture({ revision: 8 })} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Đặt tên gợi nhớ' }));
  await fireEvent.changeText(screen.getByLabelText('Tên gợi nhớ'), 'x'.repeat(81));
  expect(screen.getByRole('button', { name: 'Lưu tên gợi nhớ' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Tên gợi nhớ'), ' Tiệc gia đình ');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu tên gợi nhớ' }));
  await screen.findByText(/Chưa rõ kết quả/);
  expect(screen.getByLabelText('Tên gợi nhớ')).toHaveProp('value', ' Tiệc gia đình ');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu tên gợi nhớ' }));
  await screen.findByText('Đã lưu tên gợi nhớ.');
  expect(api.updateAlias.mock.calls).toEqual([
    ['fixture-access', context.booking.bookingId, { alias: 'Tiệc gia đình', expectedRevision: 8 }],
    ['fixture-access', context.booking.bookingId, { alias: 'Tiệc gia đình', expectedRevision: 8 }],
  ]);
  expect(screen.queryByLabelText('Tên gợi nhớ')).toBeNull();
});

it('clears an optional alias and blocks saving while the surrounding booking is being refreshed', async () => {
  const context = await props();
  const view = await render(<WorkspaceOverview {...context} contextReady={false} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Đặt tên gợi nhớ' }));
  await fireEvent.changeText(screen.getByLabelText('Tên gợi nhớ'), ' ');
  expect(screen.getByRole('button', { name: 'Lưu tên gợi nhớ' })).toBeDisabled();
  await view.rerender(<WorkspaceOverview {...context} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu tên gợi nhớ' }));
  await waitFor(() =>
    expect(api.updateAlias).toHaveBeenCalledWith('fixture-access', context.booking.bookingId, {
      alias: null,
    }),
  );
});

it('shows the restaurant preparation step when the timeline is missing and navigates to agreement', async () => {
  const context = await props();
  await render(
    <WorkspaceOverview
      {...context}
      booking={bookingFixture({ phase: 'DRAFT', hasTimeline: false, coupleApproved: false })}
      proposal={proposalFixture({ phase: 'DRAFT', timeline: null, effectiveTimeline: null })}
    />,
  );
  expect(screen.getByText('Chờ nhà hàng gửi kịch bản')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Nhập tên cô dâu chú rể' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem đề xuất' }));
  expect(context.navigate).toHaveBeenCalledWith('agreement', { agreementStep: 'timeline' });
});

it('shows contract-based deposit guidance and routes to contract and payment separately', async () => {
  const context = await props();
  await render(
    <WorkspaceOverview
      {...context}
      booking={bookingFixture({ phase: 'AWAITING_DEPOSIT' })}
      proposal={proposalFixture({ phase: 'AWAITING_DEPOSIT' })}
    />,
  );
  expect(screen.getByText(/Đặt cọc 3.000.000 ₫/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem hợp đồng' }));
  expect(context.navigate).toHaveBeenLastCalledWith('agreement', { agreementStep: 'contract' });
  await fireEvent.press(screen.getByRole('button', { name: 'Đi tới Thanh toán' }));
  expect(context.navigate).toHaveBeenLastCalledWith('payment');
});

it('retains public booking facts when proposal details are unavailable and routes preparation sections correctly', async () => {
  const context = await props();
  await render(
    <WorkspaceOverview
      {...context}
      booking={bookingFixture({
        totalVnd: 12000000,
        brideName: 'Lan',
        groomName: 'Nam',
        eventDate: '2099-01-18',
      })}
      proposal={null}
    />,
  );
  expect(screen.getByText('Tiệc cưới · Lan & Nam')).toBeOnTheScreen();
  expect(screen.getByText('Tổng 12.000.000 ₫')).toBeOnTheScreen();
  for (const [label, section] of [
    ['Mở quy mô & nhóm', 'groups'],
    ['Xếp sơ đồ', 'seating'],
    ['Mở thiệp', 'invitation'],
  ] as const) {
    await fireEvent.press(screen.getByRole('button', { name: label }));
    expect(context.navigate).toHaveBeenLastCalledWith('prepare', { prepareSection: section });
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật tổng quan' }));
  expect(context.refresh).toHaveBeenCalledTimes(1);
});

it('shows both outstanding appendix approvals after the event rather than offering normal preparation', async () => {
  const context = await props();
  await render(
    <WorkspaceOverview
      {...context}
      booking={bookingFixture({ eventDate: '2000-01-18' })}
      proposal={proposalFixture({
        completion: {
          pending: true,
          canComplete: false,
          appendixRevisionNumber: 4,
          managerApproved: false,
          coupleApproved: false,
        },
      })}
    />,
  );
  expect(screen.getByText(/đang chờ nhà hàng và hai bạn/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Mở quy mô & nhóm' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Xem phụ lục hợp đồng' }));
  expect(context.navigate).toHaveBeenCalledWith('prepare', { prepareSection: 'appendix' });
});

it.each(['settled', 'credit', 'outstanding'] as const)(
  'derives %s from the current invoice and server ledger before choosing the next action',
  async (status) => {
    const base = billingFixture();
    if (status !== 'outstanding') {
      const credit = status === 'credit' ? 300000 : 0;
      billing.load.mockResolvedValue(
        billingFixture({
          balancePaymentEligibility: {
            canPay: false,
            billingRevision: 4,
            nextAction: 'NONE',
            reasonCode: 'BILLING_BALANCE_LIMIT_EXCEEDED',
          },
          totals: {
            ...base.totals,
            outstandingVnd: 0,
            creditVnd: credit,
            paidVnd: 10200000 + credit,
            netPaidVnd: 10200000 + credit,
          },
        }),
      );
    }
    const context = await props();
    await render(
      <WorkspaceOverview
        {...context}
        booking={bookingFixture({ phase: 'COMPLETED', eventDate: '2000-01-18' })}
      />,
    );
    const label = status === 'settled' ? 'Xem hoá đơn & giao dịch' : 'Xem quyết toán';
    await fireEvent.press(await screen.findByRole('button', { name: label }));
    expect(context.navigate).toHaveBeenCalledWith(
      status === 'outstanding' ? 'payment' : 'settlement',
    );
    expect(
      screen.getByText(
        status === 'settled'
          ? 'Đã tất toán'
          : status === 'credit'
            ? 'Còn tiền thanh toán thừa'
            : 'Còn công nợ',
      ),
    ).toBeOnTheScreen();
  },
);

it('shows pending finalization when there is no invoice and never claims settlement from a missing snapshot', async () => {
  billing.loadFinalInvoices.mockResolvedValue(invoiceListFixture([]));
  billing.load.mockResolvedValue(
    billingFixture({
      balancePaymentEligibility: {
        canPay: false,
        billingRevision: 4,
        nextAction: 'WAIT_FOR_FINAL_INVOICE',
        reasonCode: 'INVOICE_FINALIZATION_REQUIRED',
      },
    }),
  );
  const context = await props();
  const view = await render(
    <WorkspaceOverview {...context} booking={bookingFixture({ phase: 'COMPLETED' })} />,
  );
  expect(await screen.findByText('Chờ nhà hàng chốt hoá đơn')).toBeOnTheScreen();
  billing.loadFinalInvoices.mockResolvedValue({
    ...invoiceListFixture(),
    currentRevisionId: 'missing-current',
  });
  await view.rerender(
    <WorkspaceOverview
      {...context}
      booking={bookingFixture({ phase: 'COMPLETED' })}
      revision={1}
    />,
  );
  expect(await screen.findByText('Kiểm tra quyết toán')).toBeOnTheScreen();
  expect(screen.queryByText('Đã tất toán')).toBeNull();
});
