import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { CommercialContractView } from '@/features/payments-billing/billing-api';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { confirmModal } from '@/lib/confirm';
import { menuLine } from '@/test-support/workspace-fixtures';
import { CommercialEditor } from './commercial-editor';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@/features/couple-workspace/workspace-api', () => {
  const api = {
    selectionChoices: jest.fn(),
    previewSelection: jest.fn(),
    saveSelection: jest.fn(),
    submitSelection: jest.fn(),
  };
  return { createWorkspaceGateway: () => api };
});
jest.mock('@/features/restored-flows/restored-flows-api', () => {
  const api = { createAppendix: jest.fn() };
  return { createRestoredFlowsGateway: () => api };
});
const api = jest.mocked(createWorkspaceGateway());
const commercial = jest.mocked(createRestoredFlowsGateway());
const draft: NonNullable<CommercialContractView['customerSelection']> = {
  revisionId: 'selection',
  revisionNumber: 1,
  status: 'DRAFT',
  lines: [menuLine],
  totalVnd: 10000000,
  submittedAt: null,
};
beforeEach(() => {
  jest.clearAllMocks();
  api.selectionChoices.mockResolvedValue([menuLine]);
  api.previewSelection.mockResolvedValue({ bookingRevision: 4, selection: draft });
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
    bookingRevision: 4,
    baseLines: [menuLine],
  };
}

it('previews the selected quantities on the server before saving a revision-bound draft', async () => {
  const context = await props();
  const saved = jest.fn();
  await render(<CommercialEditor {...context} onSaved={saved} />);
  const field = await screen.findByLabelText('Số bàn · Thực đơn đã chốt');
  await fireEvent.changeText(field, '11x');
  expect(field).toHaveProp('value', '10');
  api.previewSelection.mockResolvedValue({
    bookingRevision: 4,
    selection: {
      ...draft,
      lines: [{ ...menuLine, quantity: 11, lineTotalVnd: 11000000 }],
      totalVnd: 11000000,
    },
  });
  await fireEvent.changeText(field, '11');
  await screen.findByText('Tổng theo giá nhà hàng: 11.000.000 ₫');
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu nháp' }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  const body = {
    expectedRevision: 4,
    lines: [
      {
        category: 'MENU',
        sourceId: menuLine.sourceId,
        sourceRevisionId: menuLine.sourceRevisionId,
        quantity: 11,
      },
    ],
  };
  expect(api.previewSelection).toHaveBeenLastCalledWith(
    'fixture-access',
    context.booking.bookingId,
    body,
  );
  expect(api.saveSelection).toHaveBeenCalledWith(
    'fixture-access',
    context.booking.bookingId,
    body,
    expect.any(String),
  );
});

it('separates submitting an unchanged selection from approving a contract and honors cancel', async () => {
  const confirm = jest
    .spyOn(confirmModal, 'confirm')
    .mockResolvedValueOnce(false)
    .mockResolvedValue(true);
  const context = await props();
  await render(<CommercialEditor {...context} selection={draft} />);
  const button = await screen.findByRole('button', { name: 'Gửi lựa chọn cho nhà hàng' });
  await waitFor(() => expect(button).toBeEnabled());
  await fireEvent.press(button);
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  expect(api.submitSelection).not.toHaveBeenCalled();
  await fireEvent.press(button);
  await screen.findByText('Đã gửi lựa chọn cho nhà hàng.');
  expect(api.submitSelection).toHaveBeenCalledWith(
    'fixture-access',
    context.booking.bookingId,
    { expectedRevision: 4, selectionRevisionId: 'selection' },
    expect.any(String),
  );
  expect(api.saveSelection).not.toHaveBeenCalled();
});

it('keeps saving blocked after a failed preview until an explicit successful price retry', async () => {
  api.previewSelection.mockRejectedValueOnce(new Error('offline'));
  await render(<CommercialEditor {...await props()} />);
  await screen.findByText(/Chưa xem trước được giá/);
  expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại xem giá' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeEnabled());
  expect(api.previewSelection).toHaveBeenCalledTimes(2);
  expect(api.saveSelection).not.toHaveBeenCalled();
});

it('recovers a failed catalog read and blocks a draft with missing capacity context', async () => {
  api.selectionChoices.mockRejectedValueOnce(new Error('offline'));
  const context = await props();
  const view = await render(<CommercialEditor {...context} />);
  await screen.findByText('Chưa tải được danh mục. Hãy tải lại thực đơn và dịch vụ.');
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeEnabled());
  await view.rerender(<CommercialEditor {...context} proposal={null} />);
  expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled();
  expect(
    screen.getByText('Chưa tải được giới hạn bàn. Hãy tải lại thông tin tiệc.'),
  ).toBeOnTheScreen();
  await view.rerender(<CommercialEditor {...context} contextReady={false} />);
  expect(
    screen.getByText('Hãy cập nhật thông tin tiệc trước khi lưu hoặc gửi duyệt.'),
  ).toBeOnTheScreen();
});

it('preserves frozen print lines and requires explicit current-price consent when changing menu quantity in an appendix', async () => {
  const context = await props();
  const print = {
    ...menuLine,
    category: 'PRINT' as const,
    sourceId: 'print',
    sourceRevisionId: 'print-version',
    name: 'Thiệp giấy',
    unit: 'thiệp',
    quantity: 100,
    unitPriceVnd: 1000,
    lineTotalVnd: 100000,
  };
  api.selectionChoices.mockResolvedValue([
    { ...menuLine, sourceRevisionId: 'new-price', unitPriceVnd: 1200000 },
  ]);
  await render(
    <CommercialEditor
      {...context}
      baseLines={[menuLine, print]}
      predecessorRevisionId="contract"
    />,
  );
  await screen.findByText(/Giá hiện hành: 1.200.000/);
  expect(screen.queryByLabelText('Số lượng · Thiệp giấy')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Bỏ Thiệp giấy' })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Lý do thay đổi'), ' Tăng một bàn ');
  await fireEvent.changeText(screen.getByLabelText('Số bàn · Thực đơn đã chốt'), '11');
  expect(screen.getByRole('button', { name: 'Lưu phụ lục nháp' })).toBeDisabled();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Dùng giá hiện hành · Thực đơn đã chốt' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Lưu phụ lục nháp' }));
  await waitFor(() => expect(commercial.createAppendix).toHaveBeenCalledTimes(1));
  expect(commercial.createAppendix).toHaveBeenCalledWith(
    'fixture-access',
    context.booking.bookingId,
    {
      expectedRevision: 4,
      predecessorRevisionId: 'contract',
      reason: 'Tăng một bàn',
      lines: [
        { category: 'PRINT', sourceId: 'print', sourceRevisionId: 'print-version', quantity: 100 },
        { category: 'MENU', sourceId: 'menu', sourceRevisionId: 'new-price', quantity: 11 },
      ],
    },
    expect.any(String),
  );
  expect(api.previewSelection).not.toHaveBeenCalled();
});

it('requires confirmation before discarding a stale edit and restores the original quantities on local cancel', async () => {
  const context = await props();
  const reload = jest.fn();
  const confirm = jest
    .spyOn(confirmModal, 'confirm')
    .mockResolvedValueOnce(false)
    .mockResolvedValue(true);
  const view = await render(<CommercialEditor {...context} onReload={reload} />);
  await fireEvent.changeText(await screen.findByLabelText('Số bàn · Thực đơn đã chốt'), '11');
  await fireEvent.press(screen.getByRole('button', { name: 'Huỷ thay đổi chưa lưu' }));
  expect(screen.getByLabelText('Số bàn · Thực đơn đã chốt')).toHaveProp('value', '10');
  await view.rerender(<CommercialEditor {...context} onReload={reload} bookingRevision={5} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Tải lại và bỏ thay đổi chưa lưu' }));
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  expect(reload).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Tải lại và bỏ thay đổi chưa lưu' }));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  expect(api.saveSelection).not.toHaveBeenCalled();
});
