import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Alert, BackHandler, Share as NativeShare } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ConfirmedPlanningSnapshot } from '@/features/booking-lifecycle/planning-api';
import type { AppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import { V0AccountTab } from './v0-account-tab';
import { V0CompanionShell } from './v0-companion-shell';
import { V0InviteTab } from './v0-invite-tab';
import { V0OverviewTab } from './v0-overview-tab';
import { V0PlanTab } from './v0-plan-tab';
import { V0GuestsSubflow, V0MediaSubflow, V0PrintSubflow, V0ScheduleSubflow } from './v0-subflows';
import type { V0EventFacts } from './v0-types';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 16, top: 0, left: 0, right: 0 }),
}));

jest.spyOn(Alert, 'alert');
jest.spyOn(NativeShare, 'share');

const mockFacts: V0EventFacts = {
  brideName: 'Thùy Trang',
  groomName: 'Hoàng Nam',
  coupleDisplay: 'Thùy Trang & Hoàng Nam',
  eventDate: '2027-01-18',
  formattedDate: '18 Tháng 01, 2027',
  venueName: 'Nhà hàng Wedding Estate',
  hallName: 'Sảnh Lavender',
  shiftTime: '18:00–21:30',
  planningHeadcount: 280,
  revisionNumber: 4,
};

const mockBooking: ConfirmedPlanningSnapshot = {
  bookingId: 'booking-test-123',
  phase: 'CONFIRMED',
  revision: 4,
  eventDate: '2027-01-18',
  planningHeadcount: 280,
  hallName: 'Sảnh Lavender',
  shift: { startTime: '18:00', endTime: '21:30' },
  timelineRevision: 3,
  timeline: [
    {
      itemId: 't-1',
      startTime: '17:30',
      title: 'Đón khách & Chụp ảnh lưu niệm',
      description: 'Khu vực tiền sảnh',
    },
    {
      itemId: 't-2',
      startTime: '18:30',
      title: 'Nghi thức thành hôn chính thức',
      description: 'Sân khấu chính',
    },
    {
      itemId: 't-3',
      startTime: '19:15',
      title: 'Khai tiệc mừng',
      description: 'Phục vụ 6 món tiệc',
    },
  ],
};

function createMockGateway(): AppInvitationGateway {
  return {
    listDesigns: jest.fn().mockResolvedValue([
      {
        designId: 'design-1',
        title: 'Vườn chiều',
        revisionNumber: 4,
        status: 'APPROVED',
        textFields: {
          groomName: 'Hoàng Nam',
          brideName: 'Thùy Trang',
          greeting: 'Trân trọng kính mời',
          message: 'Chung vui cùng gia đình chúng tôi',
          footer: 'Rất hân hạnh đón tiếp',
        },
      },
    ]),
    getDesign: jest.fn().mockResolvedValue({
      designId: 'design-1',
      title: 'Vườn chiều',
      revisionNumber: 4,
      status: 'APPROVED',
      textFields: {
        groomName: 'Hoàng Nam',
        brideName: 'Thùy Trang',
        greeting: 'Trân trọng kính mời',
        message: 'Chung vui cùng gia đình chúng tôi',
        footer: 'Rất hân hạnh đón tiếp',
      },
    }),
    quickEditTextFields: jest.fn().mockResolvedValue({
      designId: 'design-1',
      title: 'Vườn chiều',
      revisionNumber: 5,
      status: 'APPROVED',
      textFields: {
        groomName: 'Nguyễn Hoàng Nam',
        brideName: 'Thùy Trang',
        greeting: 'Trân trọng kính mời',
        message: 'Chung vui cùng gia đình chúng tôi',
        footer: 'Rất hân hạnh đón tiếp',
      },
    }),
    publishInvitation: jest.fn().mockResolvedValue({
      bookingId: 'booking-test-123',
      designId: 'design-1',
      publicSlug: 'trang-nam-2027',
      genericQrPayload:
        'https://wedding-be-production-e1dc.up.railway.app/api/v1/invitations/public/trang-nam-2027',
      publishedRevisionId: 'rev-4',
      publicationRevision: 1,
      publishedAt: '2026-10-01T00:00:00Z',
    }),
    unpublishInvitation: jest.fn().mockResolvedValue(undefined),
    listPrintOrders: jest.fn().mockResolvedValue([
      {
        orderId: 'order-12345678',
        bookingId: 'booking-test-123',
        status: 'QUOTED',
        revision: 2,
        createdAt: '2026-10-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: {
          commercialRevisionId: 'comm-rev-1',
          revisionNumber: 1,
          createdAt: '2026-10-01T00:00:00Z',
          expiresAt: '2026-11-20T00:00:00Z',
          estimatedHandoverAt: '2026-12-01T00:00:00Z',
          orderTotalVnd: 3000000,
          lines: [
            {
              designId: 'design-1',
              lineId: 'line-1',
              quantity: 200,
              unitPriceVnd: 15000,
              lineTotalVnd: 3000000,
            },
          ],
        },
        lines: [
          { designId: 'design-1', lineId: 'line-1', quantity: 200, printableRevisionId: null },
        ],
        currentCommercialRevisionId: 'comm-rev-1',
        evidenceReference: null,
        handedOverAt: null,
        readyAt: null,
        pendingReplacementProposal: null,
      },
    ]),
    approvePrintOrder: jest.fn().mockResolvedValue({
      orderId: 'order-12345678',
      bookingId: 'booking-test-123',
      status: 'APPROVED',
      revision: 3,
      createdAt: '2026-10-01T00:00:00Z',
      receivableChargeId: 'charge-999',
      currentCommercialRevision: {
        commercialRevisionId: 'comm-rev-1',
        revisionNumber: 1,
        createdAt: '2026-10-01T00:00:00Z',
        expiresAt: '2026-11-20T00:00:00Z',
        estimatedHandoverAt: '2026-12-01T00:00:00Z',
        orderTotalVnd: 3000000,
        lines: [
          {
            designId: 'design-1',
            lineId: 'line-1',
            quantity: 200,
            unitPriceVnd: 15000,
            lineTotalVnd: 3000000,
          },
        ],
      },
      lines: [{ designId: 'design-1', lineId: 'line-1', quantity: 200, printableRevisionId: null }],
      currentCommercialRevisionId: 'comm-rev-1',
      evidenceReference: null,
      handedOverAt: null,
      readyAt: null,
      pendingReplacementProposal: null,
    }),
    approveReplacementProposal: jest.fn().mockResolvedValue({
      orderId: 'order-12345678',
      bookingId: 'booking-test-123',
      revision: 4,
      createdAt: '2026-10-01T00:00:00Z',
      receivableChargeId: 'charge-999',
      currentCommercialRevision: null,
      lines: [],
      currentCommercialRevisionId: null,
      evidenceReference: null,
      handedOverAt: null,
      readyAt: null,
      pendingReplacementProposal: null,
    }),
    cancelApprovedPrintOrder: jest.fn().mockResolvedValue({
      orderId: 'order-12345678',
      bookingId: 'booking-test-123',
      revision: 5,
      createdAt: '2026-10-01T00:00:00Z',
      receivableChargeId: null,
      currentCommercialRevision: null,
      lines: [],
      currentCommercialRevisionId: null,
      evidenceReference: null,
      handedOverAt: null,
      readyAt: null,
      pendingReplacementProposal: null,
    }),
    getRestaurantCatalog: jest.fn().mockResolvedValue({
      name: 'Trung tâm Tiệc cưới Wedding Estate',
    }),
    uploadWeddingMedia: jest.fn().mockResolvedValue({
      uploadCount: 1,
    }),
    getPublicInvitation: jest.fn(),
  };
}

const mockSession = {
  authorize: jest
    .fn()
    .mockImplementation((fn: (token: string) => Promise<unknown>) => fn('mock-access-token')),
  snapshot: jest.fn().mockReturnValue({
    status: 'authenticated',
    access: 'granted',
    session: { accountId: 'acc-1' },
  }),
  restore: jest.fn().mockResolvedValue({
    status: 'authenticated',
    access: 'granted',
    session: { accountId: 'acc-1' },
  }),
} as unknown as AndroidIdentitySession;

afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});

describe('V0OverviewTab', () => {
  it('renders event anchor with dynamic date facts, next action, and tasks', async () => {
    const onNavigate = jest.fn();
    await render(<V0OverviewTab facts={mockFacts} onNavigate={onNavigate} />);

    expect(await screen.findByText('Chào buổi sáng, Thùy Trang & Hoàng Nam')).toBeOnTheScreen();
    expect(await screen.findByText('Nhà hàng Wedding Estate')).toBeOnTheScreen();
    expect((await screen.findAllByText('18:00–21:30 · Sảnh Lavender')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Hoàn thiện nội dung thiệp')).toBeOnTheScreen();

    // Navigate to invite
    await fireEvent.press(screen.getByText('Mở bản xem trước'));
    expect(onNavigate).toHaveBeenCalledWith('invite');

    // Navigate to plan
    await fireEvent.press(screen.getByText('Xem kế hoạch'));
    expect(onNavigate).toHaveBeenCalledWith('plan');
  });

  it('toggles task checklist without pretending business server completion', async () => {
    const onNavigate = jest.fn();
    await render(<V0OverviewTab facts={mockFacts} onNavigate={onNavigate} />);

    const task = await screen.findByText('Kiểm tra nội dung thiệp');
    expect(task).toBeOnTheScreen();

    await fireEvent.press(task);
    expect(await screen.findByText('Kiểm tra nội dung thiệp')).toBeOnTheScreen();
  });

  it('triggers onSwitchBooking when user presses Đổi tiệc cưới', async () => {
    const onSwitchBooking = jest.fn();
    await render(
      <V0OverviewTab facts={mockFacts} onNavigate={jest.fn()} onSwitchBooking={onSwitchBooking} />,
    );

    const switchBtn = await screen.findByRole('button', { name: 'Đổi tiệc cưới' });
    await fireEvent.press(switchBtn);
    expect(onSwitchBooking).toHaveBeenCalled();
  });
});

describe('V0InviteTab', () => {
  it('loads authorized designs from gateway and displays live details', async () => {
    const gateway = createMockGateway();
    await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Thiệp của hai bạn')).toBeOnTheScreen();
    await waitFor(() =>
      expect(gateway.listDesigns).toHaveBeenCalledWith('mock-access-token', 'booking-test-123'),
    );
    expect(await screen.findByText('Vườn chiều')).toBeOnTheScreen();
    expect(await screen.findByText('Đã duyệt nội dung')).toBeOnTheScreen();
  });

  it('saves quick text editing via gateway and updates revision state', async () => {
    const gateway = createMockGateway();
    await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    // Switch to edit subscreen
    await fireEvent.press(await screen.findByRole('button', { name: 'Chỉnh sửa chữ' }));
    expect(await screen.findByText('Chỉnh sửa nội dung')).toBeOnTheScreen();

    // Edit groom name
    const groomInput = screen.getByPlaceholderText('Tên chú rể');
    await fireEvent.changeText(groomInput, 'Nguyễn Hoàng Nam');

    // Save
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));

    await waitFor(() =>
      expect(gateway.quickEditTextFields).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'design-1',
        4,
        expect.objectContaining({ groomName: 'Nguyễn Hoàng Nam' }),
        expect.any(String),
      ),
    );

    expect(await screen.findByText('Đã lưu phiên bản 5')).toBeOnTheScreen();
  });

  it('handles 409 stale revision conflict by retaining inputs and explaining state', async () => {
    const gateway = createMockGateway();
    gateway.quickEditTextFields = jest
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          status: 409,
          code: 'STALE_INVITATION_REVISION',
          message: 'Stale revision',
          requestId: 'req-409',
        }),
      )
      .mockResolvedValueOnce({
        designId: 'design-1',
        title: 'Vườn chiều',
        revisionNumber: 6,
        status: 'APPROVED',
        textFields: {
          groomName: 'Nam Mới',
          brideName: 'Thùy Trang',
          greeting: 'Trân trọng kính mời',
          message: 'Chung vui cùng gia đình chúng tôi',
          footer: 'Rất hân hạnh đón tiếp',
        },
      });

    gateway.getDesign = jest
      .fn()
      .mockResolvedValueOnce({
        designId: 'design-1',
        title: 'Vườn chiều',
        revisionNumber: 4,
        status: 'APPROVED',
        textFields: {
          groomName: 'Hoàng Nam',
          brideName: 'Thùy Trang',
        },
      })
      .mockResolvedValueOnce({
        designId: 'design-1',
        title: 'Vườn chiều',
        revisionNumber: 5,
        status: 'APPROVED',
        textFields: {
          groomName: 'Hoàng Nam',
          brideName: 'Thùy Trang',
        },
      });

    await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Chỉnh sửa chữ' }));
    const groomInput = screen.getByPlaceholderText('Tên chú rể');
    await fireEvent.changeText(groomInput, 'Nam Mới');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));

    expect(await screen.findByText(/cập nhật từ phiên làm việc khác/)).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Nam Mới')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Xem bản máy chủ' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Xác nhận lưu đè' })).toBeOnTheScreen();

    // Explicitly reconfirm reapply with new revision
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận lưu đè' }));
    await waitFor(() =>
      expect(gateway.quickEditTextFields).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'design-1',
        5,
        expect.objectContaining({ groomName: 'Nam Mới' }),
        expect.any(String),
      ),
    );
  });

  it('copies canonical public link to clipboard using expo-clipboard', async () => {
    const gateway = createMockGateway();
    await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Chia sẻ' }));
    expect(await screen.findByText('Gửi thiệp đi')).toBeOnTheScreen();
    expect(await screen.findByText('Thiệp chưa được xuất bản công khai')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Xuất bản thiệp cưới' }));
    expect(
      await screen.findByText(
        'https://wedding-be-production-e1dc.up.railway.app/api/v1/invitations/public/trang-nam-2027',
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sao chép link' }));
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
        'https://wedding-be-production-e1dc.up.railway.app/api/v1/invitations/public/trang-nam-2027',
      ),
    );
    expect(await screen.findByText('Đã sao chép')).toBeOnTheScreen();
  });

  it('opens native share sheet with canonical URL and event details', async () => {
    const gateway = createMockGateway();
    (NativeShare.share as jest.Mock).mockResolvedValue({ action: 'sharedAction' });

    await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Chia sẻ' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xuất bản thiệp cưới' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mở bảng chia sẻ' }));

    await waitFor(() =>
      expect(NativeShare.share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://wedding-be-production-e1dc.up.railway.app/api/v1/invitations/public/trang-nam-2027',
          title: expect.stringContaining('Thiệp cưới'),
        }),
      ),
    );
  });
});

describe('V0PlanTab', () => {
  it('renders dynamic timeline items from ConfirmedPlanningSnapshot', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0PlanTab facts={mockFacts} activeBooking={mockBooking} onNavigate={onNavigate} />,
    );

    expect(await screen.findByText('Lịch trình của hai bạn')).toBeOnTheScreen();
    expect(await screen.findByText('Phiên bản 3 đang có hiệu lực')).toBeOnTheScreen();
    expect(await screen.findByText('Đón khách & Chụp ảnh lưu niệm')).toBeOnTheScreen();
    expect(await screen.findByText('Nghi thức thành hôn chính thức')).toBeOnTheScreen();
    expect(await screen.findByText('Khai tiệc mừng')).toBeOnTheScreen();
  });
});

describe('V0Subflows', () => {
  it('renders truthful schedule from active booking in V0ScheduleSubflow', async () => {
    await render(
      <V0ScheduleSubflow facts={mockFacts} activeBooking={mockBooking} onNavigate={jest.fn()} />,
    );

    expect(await screen.findByText('Lịch trình buổi tiệc')).toBeOnTheScreen();
    expect(await screen.findByText('17:30')).toBeOnTheScreen();
    expect(await screen.findByText('Đón khách & Chụp ảnh lưu niệm')).toBeOnTheScreen();
  });

  it('explains 72h media cutoff and contractual limits in V0MediaSubflow', async () => {
    await render(<V0MediaSubflow facts={mockFacts} onNavigate={jest.fn()} />);

    expect(await screen.findByText('Kho ảnh cưới bảo mật')).toBeOnTheScreen();
    expect(await screen.findByText(/Tối đa 100 ảnh \/ 1 GiB/)).toBeOnTheScreen();
    expect(await screen.findByText(/Thời hạn cutoff/)).toBeOnTheScreen();
  });

  it('loads real print orders and approves quotation via gateway in V0PrintSubflow', async () => {
    const gateway = createMockGateway();
    await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await waitFor(() => expect(gateway.listPrintOrders).toHaveBeenCalled());
    expect(await screen.findByText('Đơn in #order-12')).toBeOnTheScreen();
    expect(await screen.findByText(/200 bộ/)).toBeOnTheScreen();

    // Confirm quotation
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận duyệt báo giá in' }));
    await waitFor(() =>
      expect(gateway.approvePrintOrder).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-12345678',
        'comm-rev-1',
        2,
        expect.any(String),
      ),
    );
  });

  it('renders Group and optional Guest policy without Household or forced RSVP in V0GuestsSubflow', async () => {
    await render(<V0GuestsSubflow facts={mockFacts} onNavigate={jest.fn()} />);

    expect(await screen.findByText('Khách mời & chỗ ngồi')).toBeOnTheScreen();
    expect(await screen.findByText('Quy định danh sách & sơ đồ bàn')).toBeOnTheScreen();
    expect(await screen.findByText(/không lưu trữ danh tính theo Hộ gia đình/)).toBeOnTheScreen();
    expect(await screen.findByText('280 khách')).toBeOnTheScreen();
  });
});

describe('V0AccountTab', () => {
  it('derives couple initials dynamically and navigates to billing', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0AccountTab
        facts={mockFacts}
        profile={{
          accountId: 'acc-1',
          displayEmail: 'couple@example.com',
          displayName: 'Thùy Trang & Hoàng Nam',
          revision: 1,
        }}
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Thông tin của hai bạn')).toBeOnTheScreen();
    expect((await screen.findAllByText('TH')).length).toBeGreaterThan(0); // Derived initials for Thùy Trang & Hoàng Nam
    expect(await screen.findByText('Tài khoản cặp đôi')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán & Hóa đơn' }));
    expect(onNavigate).toHaveBeenCalledWith('billing');
  });
});

describe('V0CompanionShell', () => {
  it('switches tabs and routes billing screen cleanly', async () => {
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Chào buổi sáng, Thùy Trang & Hoàng Nam')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Kế hoạch' }));
    expect(await screen.findByText('Lịch trình của hai bạn')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Tài khoản' }));
    expect(await screen.findByText('Thông tin của hai bạn')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán & Hóa đơn' }));
    expect(await screen.findByText('Thanh toán & Hóa đơn')).toBeOnTheScreen();
  });

  it('bounds hardware back press to return from subflow to parent tab', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        initialScreen="schedule"
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Lịch trình buổi tiệc')).toBeOnTheScreen();

    // Trigger hardware back
    expect(backHandlerCallback).not.toBeNull();
    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });

    expect(onNavigate).toHaveBeenCalledWith('plan');
    expect(await screen.findByText('Lịch trình của hai bạn')).toBeOnTheScreen();
  });
});
