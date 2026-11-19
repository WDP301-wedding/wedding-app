import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { openWebPrepare } from '@/features/couple-workspace/links';
import { seatingFixture, tableFixture } from '@/test-support/workspace-fixtures';
import { seatingBounds, WorkspaceSeating } from './workspace-seating';
import { bookingFixture, proposalFixture, sessionFixture } from './workspace-test-support';

jest.mock('@/features/payments-billing/billing-api', () => {
  const api = { loadCurrentSeatingPlan: jest.fn() };
  return { createCoupleBillingGateway: () => api };
});
jest.mock('@/features/couple-workspace/links', () => ({
  ...jest.requireActual('@/features/couple-workspace/links'),
  openWebPrepare: jest.fn(),
}));
const api = jest.mocked(createCoupleBillingGateway());
beforeEach(() => {
  jest.clearAllMocks();
  api.loadCurrentSeatingPlan!.mockResolvedValue(seatingFixture());
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

it('frames empty, translated and rotated tables without cutting off their edges', () => {
  expect(seatingBounds([])).toEqual([0, 0, 100, 100]);
  expect(seatingBounds([tableFixture()])).toEqual([-14, -4, 148, 108]);
  const rotated = seatingBounds([tableFixture({ rotationDegrees: 90 })]);
  expect(rotated[0]).toBeCloseTo(6);
  expect(rotated[1]).toBeCloseTo(-24);
  expect(rotated[2]).toBeCloseTo(108);
  expect(rotated[3]).toBeCloseTo(148);
});

it('renders group labels and warnings, bounds zoom, and opens the selected booking web editor', async () => {
  api.loadCurrentSeatingPlan!.mockResolvedValue(
    seatingFixture({
      warnings: ['Cần kiểm tra nhóm khách'],
      renderSnapshot: [
        tableFixture(),
        tableFixture({
          layoutTableId: 'round',
          tableLabel: 'Bàn 2',
          shape: 'ROUND',
          x: 150,
          rotationDegrees: 45,
          color: 'invalid',
          guestGroupId: null,
          guestGroupName: null,
        }),
      ],
    }),
  );
  const context = await props();
  await render(<WorkspaceSeating {...context} />);
  await screen.findByText('Bàn 1: Bạn bè');
  expect(screen.getByText('Bàn 2: Chưa gắn nhóm')).toBeOnTheScreen();
  expect(screen.getByText('Cần kiểm tra nhóm khách')).toBeOnTheScreen();
  const smaller = screen.getByRole('button', { name: 'Thu nhỏ sơ đồ' });
  const larger = screen.getByRole('button', { name: 'Phóng to sơ đồ' });
  expect(smaller).toBeDisabled();
  for (let i = 0; i < 6; i++) await fireEvent.press(larger);
  expect(larger).toBeDisabled();
  for (let i = 0; i < 6; i++) await fireEvent.press(smaller);
  expect(smaller).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Phân bàn trên web' }));
  await waitFor(() =>
    expect(openWebPrepare).toHaveBeenCalledWith(
      context.booking.bookingId,
      '/khong-gian/chuan-bi/khach?xem=so-do',
    ),
  );
});

it.each(['DRAFT', 'REQUIRES_REVIEW'] as const)(
  'shows the server %s status and permits read-only web access after closing',
  async (status) => {
    api.loadCurrentSeatingPlan!.mockResolvedValue(
      seatingFixture({ status, renderSnapshot: [], warnings: [] }),
    );
    const context = await props();
    await render(
      <WorkspaceSeating {...context} booking={bookingFixture({ phase: 'COMPLETED' })} />,
    );
    expect(
      await screen.findByText(status === 'DRAFT' ? /Bản nháp/ : /Cần xem lại/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Phân bàn trên web' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Xem sơ đồ trên web' }));
    await waitFor(() => expect(openWebPrepare).toHaveBeenCalledTimes(1));
  },
);

it('distinguishes no plan from a failed read and recovers on retry', async () => {
  api
    .loadCurrentSeatingPlan!.mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(null);
  await render(<WorkspaceSeating {...await props()} />);
  await screen.findByText(/Chưa rõ kết quả/);
  expect(screen.queryByText(/Chưa có sơ đồ bàn/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
  expect(await screen.findByText(/Chưa có sơ đồ bàn/)).toBeOnTheScreen();
});
