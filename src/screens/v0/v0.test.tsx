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
jest.setTimeout(15000);

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

const mockPrintOrder = {
  orderId: 'order-12345678',
  bookingId: 'booking-test-123',
  status: 'QUOTED' as const,
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
  lines: [{ designId: 'design-1', lineId: 'line-1', quantity: 200, printableRevisionId: null }],
  currentCommercialRevisionId: 'comm-rev-1',
  evidenceReference: null,
  handedOverAt: null,
  readyAt: null,
  pendingReplacementProposal: null,
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
    listPrintOrders: jest.fn().mockResolvedValue([mockPrintOrder]),
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

  it('navigates to subflows and overview from quick links and header in V0PlanTab', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0PlanTab facts={mockFacts} activeBooking={mockBooking} onNavigate={onNavigate} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Về tổng quan' }));
    expect(onNavigate).toHaveBeenCalledWith('overview');

    await fireEvent.press(screen.getByRole('button', { name: 'Ảnh riêng tư' }));
    expect(onNavigate).toHaveBeenCalledWith('media');

    await fireEvent.press(screen.getByRole('button', { name: 'Đơn in thiệp' }));
    expect(onNavigate).toHaveBeenCalledWith('print');

    await fireEvent.press(screen.getByRole('button', { name: 'Khách mời & chỗ ngồi' }));
    expect(onNavigate).toHaveBeenCalledWith('guests');
  });

  it('renders empty timeline and fallback revision state in V0PlanTab', async () => {
    const onNavigate = jest.fn();
    const emptyBooking: ConfirmedPlanningSnapshot = {
      ...mockBooking,
      timelineRevision: null,
      revision: 2,
      phase: 'COMPLETED',
      timeline: [
        {
          itemId: 't-none',
          startTime: '18:00',
          title: 'Tiết mục mở màn',
          description: null,
        },
      ],
    };

    await render(
      <V0PlanTab facts={mockFacts} activeBooking={emptyBooking} onNavigate={onNavigate} />,
    );

    expect(await screen.findByText('Phiên bản 2 đang có hiệu lực')).toBeOnTheScreen();
    expect(await screen.findByText('Tiết mục mở màn')).toBeOnTheScreen();

    const noItemsBooking: ConfirmedPlanningSnapshot = {
      ...emptyBooking,
      timeline: [],
    };
    await render(
      <V0PlanTab facts={mockFacts} activeBooking={noItemsBooking} onNavigate={onNavigate} />,
    );
    expect(await screen.findByText('Kịch bản chi tiết đang được chuẩn bị')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết lịch trình mẫu' }));
    expect(onNavigate).toHaveBeenCalledWith('schedule');
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

  it('handles expired quotation and cutoff alert in V0Subflows', async () => {
    const gateway = createMockGateway();
    const expiredOrder = {
      orderId: 'ord-expired',
      bookingId: 'booking-test-123',
      status: 'QUOTED' as const,
      revision: 1,
      createdAt: '2026-01-01T00:00:00Z',
      receivableChargeId: null,
      currentCommercialRevision: {
        commercialRevisionId: 'rev-exp',
        revisionNumber: 1,
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: '2020-01-01T00:00:00Z',
        estimatedHandoverAt: '2020-01-10T00:00:00Z',
        orderTotalVnd: 2500000,
        lines: [],
      },
      lines: [],
      currentCommercialRevisionId: 'rev-exp',
      evidenceReference: null,
      handedOverAt: null,
      readyAt: null,
      pendingReplacementProposal: null,
    };

    gateway.listPrintOrders = jest.fn().mockResolvedValue([expiredOrder]);

    const { unmount } = await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Đã có báo giá (Chờ duyệt)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận duyệt báo giá in' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Hết hạn báo giá',
      'Báo giá in thiệp cưới đã hết hạn. Vui lòng liên hệ nhà hàng để nhận báo giá mới.',
    );
    await unmount();

    const pastFacts = { ...mockFacts, eventDate: '2020-01-01' };
    await render(<V0MediaSubflow facts={pastFacts} onNavigate={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Tải thêm ảnh từ máy' }));
    expect(Alert.alert).toHaveBeenCalledWith('Đã quá thời hạn cutoff', expect.any(String));
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

  it('navigates back to plan from V0ScheduleSubflow and V0MediaSubflow header back buttons', async () => {
    const onNavigate = jest.fn();
    const { unmount } = await render(
      <V0ScheduleSubflow facts={mockFacts} activeBooking={mockBooking} onNavigate={onNavigate} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Về kế hoạch' }));
    expect(onNavigate).toHaveBeenCalledWith('plan');
    await unmount();

    const onNavigateMedia = jest.fn();
    await render(<V0MediaSubflow facts={mockFacts} onNavigate={onNavigateMedia} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Về kế hoạch' }));
    expect(onNavigateMedia).toHaveBeenCalledWith('plan');
  });

  it('navigates back to plan from V0PrintSubflow and renders multiple print order statuses', async () => {
    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    const ordersWithVariousStatuses = [
      {
        orderId: 'ord-req-1',
        bookingId: 'booking-test-123',
        status: 'REQUESTED' as const,
        revision: 1,
        createdAt: '2026-01-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: null,
        lines: [],
        currentCommercialRevisionId: null,
        evidenceReference: null,
        handedOverAt: null,
        readyAt: null,
        pendingReplacementProposal: null,
      },
      {
        orderId: 'ord-prod-2',
        bookingId: 'booking-test-123',
        status: 'IN_PRODUCTION' as const,
        revision: 2,
        createdAt: '2026-01-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: null,
        lines: [],
        currentCommercialRevisionId: null,
        evidenceReference: null,
        handedOverAt: null,
        readyAt: null,
        pendingReplacementProposal: null,
      },
      {
        orderId: 'ord-ready-3',
        bookingId: 'booking-test-123',
        status: 'READY_FOR_HANDOVER' as const,
        revision: 3,
        createdAt: '2026-01-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: null,
        lines: [],
        currentCommercialRevisionId: null,
        evidenceReference: null,
        handedOverAt: null,
        readyAt: null,
        pendingReplacementProposal: null,
      },
      {
        orderId: 'ord-handed-4',
        bookingId: 'booking-test-123',
        status: 'HANDED_OVER' as const,
        revision: 4,
        createdAt: '2026-01-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: null,
        lines: [],
        currentCommercialRevisionId: null,
        evidenceReference: null,
        handedOverAt: null,
        readyAt: null,
        pendingReplacementProposal: null,
      },
      {
        orderId: 'ord-canc-5',
        bookingId: 'booking-test-123',
        status: 'CANCELLED' as const,
        revision: 5,
        createdAt: '2026-01-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: null,
        lines: [],
        currentCommercialRevisionId: null,
        evidenceReference: null,
        handedOverAt: null,
        readyAt: null,
        pendingReplacementProposal: null,
      },
    ];

    gateway.listPrintOrders = jest.fn().mockResolvedValue(ordersWithVariousStatuses);

    await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Chờ báo giá')).toBeOnTheScreen();
    expect(await screen.findByText('Đang sản xuất')).toBeOnTheScreen();
    expect(await screen.findByText('Sẵn sàng bàn giao')).toBeOnTheScreen();
    expect(await screen.findByText('Đã bàn giao')).toBeOnTheScreen();
    expect(await screen.findByText('Đã hủy đơn')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Về kế hoạch' }));
    expect(onNavigate).toHaveBeenCalledWith('plan');
  });

  it('handles replacement proposals in V0PrintSubflow', async () => {
    const gateway = createMockGateway();
    const orderWithReplacement = {
      ...mockPrintOrder,
      pendingReplacementProposal: {
        commercialRevisionId: 'rev-replace-1',
        revisionNumber: 3,
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-12-31T00:00:00Z',
        orderTotalVnd: 3500000,
        estimatedHandoverAt: null,
        lines: [],
      },
    };
    gateway.listPrintOrders = jest.fn().mockResolvedValue([orderWithReplacement]);

    await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText(/Đề xuất báo giá thay thế mới/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Duyệt báo giá thay thế' }));
    await waitFor(() => {
      expect(gateway.approveReplacementProposal).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-12345678',
        'rev-replace-1',
        2,
      );
    });
  });

  it('handles 409 conflict during quotation approval in V0PrintSubflow', async () => {
    const gateway = createMockGateway();
    gateway.approvePrintOrder = jest.fn().mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        status: 409,
        code: 'CONFLICT',
        message: 'Conflict',
        requestId: '00000000-0000-0000-0000-000000000000',
      }),
    );

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
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận duyệt báo giá in' }));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Xung đột phiên bản (409)',
        expect.any(String),
        expect.any(Array),
      );
    });
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

  it('routes to guests, media, and print subflows with functional hardware back handling', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    const { unmount } = await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        initialScreen="guests"
        onNavigate={onNavigate}
      />,
    );
    expect(await screen.findByText('Khách mời & chỗ ngồi')).toBeOnTheScreen();

    await act(async () => {
      backHandlerCallback!({} as never);
    });
    expect(onNavigate).toHaveBeenCalledWith('plan');

    await unmount();

    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        initialScreen="media"
        onNavigate={onNavigate}
      />,
    );
    expect(await screen.findByText('Kho ảnh cưới bảo mật')).toBeOnTheScreen();

    await act(async () => {
      backHandlerCallback!({} as never);
    });
    expect(onNavigate).toHaveBeenCalledWith('plan');
  });
});

describe('V0InviteTab edge cases & dirty edits', () => {
  it('resets inputs to server state when user chooses Xem bản máy chủ after 409 conflict', async () => {
    const gateway = createMockGateway();
    gateway.quickEditTextFields = jest.fn().mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        status: 409,
        code: 'STALE_INVITATION_REVISION',
        message: 'Stale revision',
        requestId: 'req-409',
      }),
    );

    gateway.getDesign = jest.fn().mockResolvedValue({
      designId: 'design-1',
      title: 'Vườn chiều',
      revisionNumber: 7,
      status: 'APPROVED',
      textFields: {
        groomName: 'Hoàng Nam Từ Máy Chủ',
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
    await fireEvent.changeText(groomInput, 'Nam Cục Bộ');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));

    expect(await screen.findByRole('button', { name: 'Xem bản máy chủ' })).toBeOnTheScreen();

    // Click Xem bản máy chủ
    await fireEvent.press(screen.getByRole('button', { name: 'Xem bản máy chủ' }));
    await waitFor(() => expect(gateway.getDesign).toHaveBeenCalled());
    expect(await screen.findByDisplayValue('Hoàng Nam Từ Máy Chủ')).toBeOnTheScreen();
  });

  it('unpublishes invitation and hides public link and QR', async () => {
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
    await fireEvent.press(screen.getByRole('button', { name: 'Xuất bản thiệp cưới' }));
    expect(await screen.findByRole('button', { name: 'Thu hồi xuất bản' })).toBeOnTheScreen();

    // Unpublish
    await fireEvent.press(screen.getByRole('button', { name: 'Thu hồi xuất bản' }));
    await waitFor(() => expect(gateway.unpublishInvitation).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Xuất bản thiệp cưới' })).toBeOnTheScreen();
  });

  it('shows confirmation alert when user presses back with dirty edits', async () => {
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Chỉnh sửa chữ' }));
    const groomInput = screen.getByPlaceholderText('Tên chú rể');
    await fireEvent.changeText(groomInput, 'Thay Đổi Chưa Lưu');

    // Press back button
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại thiệp' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Hủy thay đổi?',
      expect.stringContaining('chưa lưu'),
      expect.any(Array),
    );

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const alertButtons = alertCalls[alertCalls.length - 1][2];
    const discardButton = alertButtons.find((b: { text: string }) => b.text === 'Rời đi');
    await act(async () => {
      discardButton.onPress();
    });
    expect(await screen.findByText('Bản xem trước thiệp cưới (Vườn chiều)')).toBeOnTheScreen();

    // Test handleMorePress options
    await fireEvent.press(screen.getByRole('button', { name: 'Tùy chọn khác' }));
    expect(Alert.alert).toHaveBeenCalledWith('Tùy chọn thiệp cưới', undefined, expect.any(Array));
    const moreCalls = (Alert.alert as jest.Mock).mock.calls;
    const moreButtons = moreCalls[moreCalls.length - 1][2];
    const refreshBtn = moreButtons.find((b: { text: string }) => b.text === 'Làm mới thiết kế');
    await act(async () => {
      refreshBtn.onPress();
    });
    expect(gateway.getDesign).toHaveBeenCalled();
  });
});

describe('V0Subflows edge cases & actions', () => {
  it('approves replacement proposal and supports cancellation in V0PrintSubflow', async () => {
    const gateway = createMockGateway();
    gateway.listPrintOrders = jest.fn().mockResolvedValue([
      {
        orderId: 'order-replacement-1',
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
          orderTotalVnd: 2500000,
          lines: [],
        },
        pendingReplacementProposal: {
          commercialRevisionId: 'comm-rev-2',
          createdAt: '2026-10-01T00:00:00Z',
          estimatedHandoverAt: '2026-11-15T00:00:00Z',
          expiresAt: '2026-11-20T00:00:00Z',
          lines: [],
          orderTotalVnd: 2800000,
          revisionNumber: 2,
        },
      },
    ]);

    await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText(/Đề xuất báo giá thay thế mới/)).toBeOnTheScreen();

    // Approve replacement
    await fireEvent.press(screen.getByRole('button', { name: 'Duyệt báo giá thay thế' }));
    await waitFor(() =>
      expect(gateway.approveReplacementProposal).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-replacement-1',
        'comm-rev-2',
        2,
      ),
    );

    // Cancel order
    await fireEvent.press(screen.getByRole('button', { name: 'Hủy đơn in' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Hủy đơn in thiệp',
      expect.any(String),
      expect.any(Array),
    );
    const cancelAlertButtons = (Alert.alert as unknown as jest.Mock).mock.calls.find(
      (call) => call[0] === 'Hủy đơn in thiệp',
    )?.[2];
    const confirmButton = cancelAlertButtons?.find(
      (b: { text: string }) => b.text === 'Xác nhận hủy',
    );
    await act(async () => {
      await confirmButton?.onPress?.();
    });
    await waitFor(() =>
      expect(gateway.cancelApprovedPrintOrder).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-replacement-1',
        2,
      ),
    );
  });

  it('renders print orders across IN_PRODUCTION, READY_FOR_HANDOVER, HANDED_OVER, and CANCELLED states', async () => {
    const gateway = createMockGateway();
    gateway.listPrintOrders = jest.fn().mockResolvedValue([
      {
        orderId: 'order-prod',
        bookingId: 'booking-test-123',
        status: 'IN_PRODUCTION',
        revision: 2,
        createdAt: '2026-10-01T00:00:00Z',
        receivableChargeId: null,
      },
      {
        orderId: 'order-ready',
        bookingId: 'booking-test-123',
        status: 'READY_FOR_HANDOVER',
        revision: 2,
        createdAt: '2026-10-01T00:00:00Z',
        receivableChargeId: null,
      },
      {
        orderId: 'order-done',
        bookingId: 'booking-test-123',
        status: 'HANDED_OVER',
        revision: 2,
        createdAt: '2026-10-01T00:00:00Z',
        receivableChargeId: null,
      },
      {
        orderId: 'order-cancel',
        bookingId: 'booking-test-123',
        status: 'CANCELLED',
        revision: 2,
        createdAt: '2026-10-01T00:00:00Z',
        receivableChargeId: null,
      },
    ]);

    await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Đang sản xuất')).toBeOnTheScreen();
    expect(await screen.findByText('Sẵn sàng bàn giao')).toBeOnTheScreen();
    expect(await screen.findByText('Đã bàn giao')).toBeOnTheScreen();
    expect(await screen.findByText('Đã hủy đơn')).toBeOnTheScreen();
  });

  it('uploads media via gateway in V0MediaSubflow', async () => {
    const gateway = createMockGateway();
    gateway.uploadWeddingMedia = jest.fn().mockResolvedValue({
      mediaAssetId: 'm-1',
      previewPath: '/media/preview-1.jpg',
    });

    await render(
      <V0MediaSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Kho ảnh cưới bảo mật')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tải thêm ảnh từ máy' }));
    await waitFor(() => expect(gateway.uploadWeddingMedia).toHaveBeenCalled());
  });

  it('manages groups, guests, adds guest, and adds new group in V0GuestsSubflow', async () => {
    await render(<V0GuestsSubflow facts={mockFacts} onNavigate={jest.fn()} />);

    expect(await screen.findByText('Gia đình nhà trai')).toBeOnTheScreen();
    expect(await screen.findByText('Gia đình nhà gái')).toBeOnTheScreen();

    // Add a guest to currently selected group
    const guestInput = screen.getByPlaceholderText('Tên khách mời tùy chọn...');
    await fireEvent.changeText(guestInput, 'Trần Thị Mai');
    await fireEvent.press(screen.getByRole('button', { name: 'Thêm khách' }));
    expect(await screen.findByText(/Trần Thị Mai/)).toBeOnTheScreen();

    // Add a new group
    const groupInput = screen.getByPlaceholderText('Tên nhóm mới (ví dụ: Bạn cấp 3)');
    await fireEvent.changeText(groupInput, 'Bạn cấp 3');
    await fireEvent.press(screen.getByRole('button', { name: 'Thêm nhóm' }));
    expect(await screen.findByText('Bạn cấp 3')).toBeOnTheScreen();
  });

  it('routes quick actions and milestones from V0OverviewTab to respective screens', async () => {
    const onNavigate = jest.fn();
    await render(<V0OverviewTab facts={mockFacts} onNavigate={onNavigate} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Mở bản xem trước' }));
    expect(onNavigate).toHaveBeenCalledWith('invite');

    await fireEvent.press(screen.getByRole('button', { name: 'Xem kế hoạch' }));
    expect(onNavigate).toHaveBeenCalledWith('plan');

    await fireEvent.press(screen.getByText('Lễ cưới chính thức'));
    expect(onNavigate).toHaveBeenCalledWith('schedule');

    await fireEvent.press(screen.getByText('Đơn in thiệp cưới'));
    expect(onNavigate).toHaveBeenCalledWith('print');

    await fireEvent.press(screen.getByRole('button', { name: 'Mở Kế hoạch khách mời' }));
    expect(onNavigate).toHaveBeenCalledWith('guests');
  });

  it('routes to schedule and subflows from V0PlanTab', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0PlanTab
        facts={mockFacts}
        activeBooking={{ ...mockBooking, timeline: [] }}
        onNavigate={onNavigate}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Xem chi tiết lịch trình mẫu' }));
    expect(onNavigate).toHaveBeenCalledWith('schedule');

    await fireEvent.press(screen.getByRole('button', { name: 'Ảnh riêng tư' }));
    expect(onNavigate).toHaveBeenCalledWith('media');

    await fireEvent.press(screen.getByRole('button', { name: 'Đơn in thiệp' }));
    expect(onNavigate).toHaveBeenCalledWith('print');

    await fireEvent.press(screen.getByRole('button', { name: 'Khách mời & chỗ ngồi' }));
    expect(onNavigate).toHaveBeenCalledWith('guests');
  });

  it('handles account tab logout and security toggles', async () => {
    const onLogout = jest.fn();
    const onNavigate = jest.fn();
    await render(
      <V0AccountTab
        facts={mockFacts}
        session={mockSession}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />,
    );

    // Toggle security inline settings
    await fireEvent.press(screen.getByRole('button', { name: 'Bảo mật phiên đăng nhập' }));
    expect(await screen.findByText('Đổi mật khẩu tài khoản')).toBeOnTheScreen();

    // Navigate to billing
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán & Hóa đơn' }));
    expect(onNavigate).toHaveBeenCalledWith('billing');

    // Logout
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất khỏi thiết bị' }));
    expect(Alert.alert).toHaveBeenCalledWith('Đăng xuất', expect.any(String), expect.any(Array));
    const logoutAlertButtons = (Alert.alert as unknown as jest.Mock).mock.calls.find(
      (call) => call[0] === 'Đăng xuất',
    )?.[2];
    const confirmLogout = logoutAlertButtons?.find((b: { text: string }) => b.text === 'Đăng xuất');
    await confirmLogout?.onPress?.();
    expect(onLogout).toHaveBeenCalled();
  });

  it('handles network, timeout, 401, and 403 errors when saving edit in V0InviteTab', async () => {
    const gateway = createMockGateway();
    const currentSession = {
      ...mockSession,
      authorize: jest.fn(async (callback) => callback('mock-access-token')),
    } as unknown as AndroidIdentitySession;

    // Test network error
    gateway.quickEditTextFields = jest.fn().mockRejectedValueOnce(
      new ApiClientError({
        kind: 'network',
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Mạng yếu',
        requestId: '00000000-0000-0000-0000-000000000000',
      }),
    );

    const { unmount } = await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={currentSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Chỉnh sửa chữ' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Tên chú rể'), 'Nam Network');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));
    expect(await screen.findByText(/Lỗi kết nối mạng trước khi nhận kết quả/)).toBeOnTheScreen();
    await unmount();

    // Test timeout error
    gateway.quickEditTextFields = jest.fn().mockRejectedValueOnce(
      new ApiClientError({
        kind: 'timeout',
        status: 0,
        code: 'TIMEOUT',
        message: 'Timeout',
        requestId: '00000000-0000-0000-0000-000000000000',
      }),
    );

    await render(
      <V0InviteTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={currentSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Chỉnh sửa chữ' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Tên chú rể'), 'Nam Timeout');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));
    expect(await screen.findByText(/Quá thời gian kết nối tới máy chủ/)).toBeOnTheScreen();

    // Test 401 error
    gateway.quickEditTextFields = jest.fn().mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId: '00000000-0000-0000-0000-000000000000',
      }),
    );
    await fireEvent.changeText(screen.getByPlaceholderText('Tên chú rể'), 'Nam 401');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));
    expect(
      await screen.findByText('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.'),
    ).toBeOnTheScreen();

    // Test 403 error
    gateway.quickEditTextFields = jest.fn().mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
        requestId: '00000000-0000-0000-0000-000000000000',
      }),
    );
    await fireEvent.changeText(screen.getByPlaceholderText('Tên chú rể'), 'Nam 403');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));
    expect(
      await screen.findByText('Bạn không có quyền chỉnh sửa thiệp cưới này.'),
    ).toBeOnTheScreen();
  });

  it('supports resolving 409 conflict by overwriting server version in V0InviteTab', async () => {
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
        revisionNumber: 8,
        status: 'APPROVED',
        textFields: { groomName: 'Nam Ghi Đè', brideName: 'Trang' },
      });

    gateway.getDesign = jest.fn().mockResolvedValue({
      designId: 'design-1',
      title: 'Vườn chiều',
      revisionNumber: 7,
      status: 'APPROVED',
      textFields: { groomName: 'Server Name', brideName: 'Trang' },
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
    await fireEvent.changeText(screen.getByPlaceholderText('Tên chú rể'), 'Nam Ghi Đè');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));

    expect(await screen.findByRole('button', { name: 'Xác nhận lưu đè' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận lưu đè' }));
    await waitFor(() =>
      expect(gateway.quickEditTextFields).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'design-1',
        7,
        expect.any(Object),
        expect.any(String),
      ),
    );
  });

  it('handles publish and unpublish failures gracefully in V0InviteTab', async () => {
    const gateway = createMockGateway();
    gateway.publishInvitation = jest.fn().mockRejectedValueOnce(new Error('Lỗi xuất bản mạng'));

    const { unmount } = await render(
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
    expect(await screen.findByText('Lỗi xuất bản mạng')).toBeOnTheScreen();
    await unmount();

    // Unpublish failure
    gateway.publishInvitation = jest.fn().mockResolvedValue({
      bookingId: 'booking-test-123',
      designId: 'design-1',
      publicSlug: 'trang-nam-2027',
      genericQrPayload:
        'https://wedding-be-production-e1dc.up.railway.app/api/v1/invitations/public/trang-nam-2027',
      publishedRevisionId: 'rev-4',
      publicationRevision: 1,
      publishedAt: '2026-10-01T00:00:00Z',
    });
    gateway.unpublishInvitation = jest.fn().mockRejectedValueOnce(new Error('Lỗi gỡ thiệp mạng'));
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
    expect(await screen.findByRole('button', { name: 'Thu hồi xuất bản' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Thu hồi xuất bản' }));
    expect(await screen.findByText('Lỗi gỡ thiệp mạng')).toBeOnTheScreen();
  });

  it('handles expired quotations, empty orders, and conflict alerts in V0PrintSubflow', async () => {
    const gateway = createMockGateway();
    // 1. Expired quotation
    gateway.listPrintOrders = jest.fn().mockResolvedValue([
      {
        orderId: 'order-expired',
        bookingId: 'booking-test-123',
        status: 'QUOTED',
        revision: 2,
        createdAt: '2026-10-01T00:00:00Z',
        receivableChargeId: null,
        currentCommercialRevision: {
          commercialRevisionId: 'comm-rev-exp',
          revisionNumber: 1,
          createdAt: '2026-10-01T00:00:00Z',
          expiresAt: '2020-01-01T00:00:00Z', // Expired in past
          orderTotalVnd: 2500000,
          lines: [],
        },
      },
    ]);

    const { unmount } = await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText(/Đã hết hạn duyệt/)).toBeOnTheScreen();
    await unmount();

    // 2. Empty orders
    gateway.listPrintOrders = jest.fn().mockResolvedValue([]);
    await render(
      <V0PrintSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Chưa có đơn in thiệp cưới')).toBeOnTheScreen();
  });

  it('handles upload failures and locked cutoff states in V0MediaSubflow', async () => {
    const gateway = createMockGateway();
    gateway.uploadWeddingMedia = jest.fn().mockRejectedValueOnce(new Error('Tệp quá lớn 25MiB'));

    const { unmount } = await render(
      <V0MediaSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Tải thêm ảnh từ máy' }));
    expect(Alert.alert).toHaveBeenCalledWith('Lỗi tải ảnh', 'Tệp quá lớn 25MiB');
    await unmount();

    // Cutoff passed (eventDate in past)
    const pastFacts = { ...mockFacts, eventDate: '2020-01-01' };
    await render(
      <V0MediaSubflow
        facts={pastFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Đã khóa kho ảnh')).toBeOnTheScreen();
  });

  it('renders empty timeline notice in V0ScheduleSubflow', async () => {
    const emptyBooking = { ...mockBooking, timeline: [] };
    await render(
      <V0ScheduleSubflow facts={mockFacts} activeBooking={emptyBooking} onNavigate={jest.fn()} />,
    );

    expect(await screen.findByText('Kịch bản chi tiết đang được chuẩn bị')).toBeOnTheScreen();
  });

  it('navigates seamlessly across all bottom tabs in V0CompanionShell', async () => {
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="overview"
      />,
    );

    expect(await screen.findByText('Góc nhỏ của hai bạn')).toBeOnTheScreen();

    // Navigate to Thiệp tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Thiệp' }));
    expect(await screen.findByText('Thiệp của hai bạn')).toBeOnTheScreen();

    // Navigate to Kế hoạch tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Kế hoạch' }));
    expect(await screen.findByText('Lịch trình của hai bạn')).toBeOnTheScreen();

    // Navigate to Tài khoản tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Tài khoản' }));
    expect(await screen.findByText('Thông tin của hai bạn')).toBeOnTheScreen();

    // Navigate back to Tổng quan tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Tổng quan' }));
    expect(await screen.findByText('Góc nhỏ của hai bạn')).toBeOnTheScreen();
  });

  it('handles hardware back routing on billing screen in V0CompanionShell', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="billing"
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Thanh toán & Hóa đơn')).toBeOnTheScreen();

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });
    expect(onNavigate).toHaveBeenCalledWith('account');
  });

  it('handles header back button on billing screen in V0CompanionShell', async () => {
    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="billing"
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Thanh toán & Hóa đơn')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại tài khoản' }));
    expect(onNavigate).toHaveBeenCalledWith('account');
  });

  it('handles hardware back routing on edit screen in V0CompanionShell', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="edit"
        onNavigate={onNavigate}
      />,
    );

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });
    expect(onNavigate).toHaveBeenCalledWith('invite');
  });

  it('handles hardware back on schedule in V0CompanionShell', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, cb) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = cb;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="schedule"
        onNavigate={onNavigate}
      />,
    );

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });
    expect(onNavigate).toHaveBeenCalledWith('plan');
  });

  it('returns false on hardware back on overview in V0CompanionShell', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, cb) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = cb;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="overview"
        onNavigate={onNavigate}
      />,
    );

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(false);
    });
  });

  it('handles hardware back on share and account in V0CompanionShell', async () => {
    let backHandlerCallback: Parameters<typeof BackHandler.addEventListener>[1] | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, callback) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const onNavigate = jest.fn();
    const gateway = createMockGateway();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="share"
        onNavigate={onNavigate}
      />,
    );

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });
    expect(onNavigate).toHaveBeenCalledWith('invite');

    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        invitationGateway={gateway}
        initialScreen="account"
        onNavigate={onNavigate}
      />,
    );

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });
    expect(onNavigate).toHaveBeenCalledWith('overview');
  });

  it('renders subflows in V0CompanionShell', async () => {
    const gateway = createMockGateway();
    for (const sub of ['media', 'print', 'guests', 'seating'] as const) {
      const { unmount } = await render(
        <V0CompanionShell
          facts={mockFacts}
          activeBooking={mockBooking}
          session={mockSession}
          invitationGateway={gateway}
          initialScreen={sub}
        />,
      );
      unmount();
    }
  });
});
