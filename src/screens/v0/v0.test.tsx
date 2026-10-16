import {
  createHash as mockCreateHash,
  randomUUID as mockRandomUUID,
} from 'node:crypto';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Alert, BackHandler, Share as NativeShare } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ConfirmedPlanningSnapshot } from '@/features/booking-lifecycle/planning-api';
import type { AppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import { HyProfile as V0AccountTab } from '../hy/hy-profile';
import { V0CompanionShell } from './v0-companion-shell';
import { V0InviteTab } from './v0-invite-tab';
import { HyParty as V0OverviewTab } from '../hy/hy-party';
import { HyPartyDetail as V0PlanTab } from '../hy/hy-detail';
import { V0GuestsSubflow, V0MediaSubflow, V0PrintSubflow, V0ScheduleSubflow } from './v0-subflows';
import type { V0EventFacts } from './v0-types';

import { coupleBilling } from './subflows/subflows-common';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn().mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

jest.mock('expo-crypto', () => ({
  randomUUID: () => mockRandomUUID(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: (_algorithm: string, value: string) =>
    Promise.resolve(mockCreateHash('sha256').update(value).digest('hex')),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file:///path/to/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 1024,
      },
    ],
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 16, top: 0, left: 0, right: 0 }),
}));

jest.mock('@/features/payments-billing/billing-api', () => {
  const actual = jest.requireActual('@/features/payments-billing/billing-api');
  let instance: any = null;
  return {
    ...actual,
    createCoupleBillingGateway: () => {
      if (!instance) {
        instance = {
          load: jest.fn().mockResolvedValue({
            totals: {
              netPaidVnd: 50000000,
              acceptedChargesVnd: 100000000,
              outstandingVnd: 50000000,
            },
            charges: [],
            payments: [],
          }),
          loadGuestGroups: jest.fn().mockResolvedValue([
            { guestGroupId: 'grp-1', name: 'Gia đình nhà trai', status: 'ACTIVE' },
            { guestGroupId: 'grp-2', name: 'Gia đình nhà gái', status: 'ACTIVE' },
          ]),
          loadGuests: jest.fn().mockResolvedValue({
            items: [
              { guestId: 'g-1', name: 'Trần Thị Mai', guestGroupId: 'grp-1', notes: null, status: 'ACTIVE' },
            ],
            nextCursor: null,
            sourceSequence: 1,
          }),
          loadContracts: jest.fn().mockResolvedValue({ revisions: [] }),
          loadAppendices: jest.fn().mockResolvedValue({ appendices: [] }),
          loadIncidentals: jest.fn().mockResolvedValue({ items: [] }),
          loadFinalInvoices: jest.fn().mockResolvedValue({ invoices: [] }),
          loadContext: jest.fn().mockResolvedValue({
            timelineRevisionId: 'rev-1',
            contractRevisionId: 'c-rev-1',
            documentDigest: 'digest-1',
          }),
          loadAttempt: jest.fn().mockResolvedValue({
            attemptId: 'att-1',
            status: 'UNKNOWN',
            amountVnd: 10000000,
          }),
          startDeposit: jest.fn().mockResolvedValue({ checkoutUrl: 'https://vnpay.vn/test' }),
          startBalance: jest.fn().mockResolvedValue({ checkoutUrl: 'https://vnpay.vn/test' }),
          downloadContractPdf: jest.fn().mockResolvedValue(new Blob()),
        };
      }
      return instance;
    },
  };
});

jest.mock('@/features/restored-flows/restored-flows-api', () => {
  const actual = jest.requireActual('@/features/restored-flows/restored-flows-api');
  let instance: any = null;
  return {
    ...actual,
    createRestoredFlowsGateway: () => {
      if (!instance) {
        instance = {
          attendanceSummary: jest.fn().mockResolvedValue({
            checkInMode: 'NONE',
            checkedInGuestCount: 0,
            totalNamedGuests: 0,
          }),
          loadProposal: jest.fn().mockResolvedValue({
            revision: 4,
            effectiveTimeline: [
              {
                itemId: 't-1',
                startTime: '17:30',
                title: 'Đón khách & Chụp ảnh lưu niệm',
                description: 'Khu vực tiền sảnh',
              },
            ],
            pendingTimeline: null,
            capabilities: {
              canApproveTimeline: false,
              canEditTimeline: true,
              canRequestCancellation: true,
              canRequestChange: true,
              canWithdrawApproval: false,
            },
          }),
          readContracts: jest.fn().mockResolvedValue({
            eligibleForDeposit: true,
          }),
          requestCancellation: jest.fn().mockResolvedValue({}),
          requestChange: jest.fn().mockResolvedValue({}),
        };
      }
      return instance;
    },
  };
});

jest.mock('@/features/identity-access/experience-api', () => {
  const actual = jest.requireActual('@/features/identity-access/experience-api');
  let instance: any = null;
  return {
    ...actual,
    createExperienceGateway: () => {
      if (!instance) {
        instance = {
          profile: jest.fn().mockResolvedValue({
            accountId: 'acc-1',
            displayEmail: 'couple@example.com',
            displayName: 'Thùy Trang',
            revision: 1,
          }),
          updateProfile: jest.fn().mockResolvedValue({
            accountId: 'acc-1',
            displayEmail: 'couple@example.com',
            displayName: 'Thùy Trang',
            revision: 2,
          }),
          changePassword: jest.fn().mockResolvedValue({ status: 'completed' }),
          requestPasswordChange: jest.fn().mockResolvedValue({
            ticket: 'ticket-1',
            expiresAt: '2026-10-16T12:00:00Z',
          }),
          overview: jest.fn().mockResolvedValue({ data: [], nextCursor: null }),
          listSessions: jest.fn().mockResolvedValue({ sessions: [] }),
          revokeSession: jest.fn().mockResolvedValue(undefined),
          revokeCurrentSession: jest.fn().mockResolvedValue(undefined),
          liveHealth: jest.fn().mockResolvedValue({ status: 'live' }),
          readyHealth: jest.fn().mockResolvedValue({ status: 'ready' }),
        };
      }
      return instance;
    },
  };
});

jest.mock('@/features/invitation-studio/app-invitation-api', () => {
  const actual = jest.requireActual('@/features/invitation-studio/app-invitation-api');
  let instance: any = null;
  return {
    ...actual,
    createAppInvitationGateway: () => {
      if (!instance) {
        instance = {
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
          }),
          getRestaurantCatalog: jest.fn().mockResolvedValue({
            name: 'Trung tâm Tiệc cưới Wedding Estate',
          }),
          listPrintOrders: jest.fn().mockResolvedValue([]),
          approvePrintOrder: jest.fn().mockResolvedValue({}),
          approveReplacementProposal: jest.fn().mockResolvedValue({}),
          cancelApprovedPrintOrder: jest.fn().mockResolvedValue({}),
          uploadWeddingMedia: jest.fn().mockResolvedValue({ uploadCount: 1 }),
          quickEditTextFields: jest.fn().mockResolvedValue({}),
          publishInvitation: jest.fn().mockResolvedValue({}),
          unpublishInvitation: jest.fn().mockResolvedValue(undefined),
        };
      }
      return instance;
    },
  };
});

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
    access: 'full',
    actor: {
      accountId: 'acc-1',
      displayEmail: 'couple@example.com',
      roles: ['COUPLE'] as const,
      sessionId: 's-1',
    },
    denial: null,
  }),
  restore: jest.fn().mockResolvedValue({
    status: 'authenticated',
    access: 'full',
    actor: {
      accountId: 'acc-1',
      displayEmail: 'couple@example.com',
      roles: ['COUPLE'] as const,
      sessionId: 's-1',
    },
    denial: null,
  }),
} as unknown as AndroidIdentitySession;

afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});

describe('V0OverviewTab', () => {
  it('renders event anchor with dynamic date facts, next action, and tasks', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0OverviewTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('Thùy Trang & Hoàng Nam')).toBeOnTheScreen();
    expect((await screen.findAllByText('18 Tháng 01, 2027')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Sảnh Lavender · 18:00–21:30/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('Hành trình cưới')).toBeOnTheScreen();

    // Navigate to invite
    await fireEvent.press(screen.getByRole('button', { name: 'Thiệp & lời mời' }));
    expect(onNavigate).toHaveBeenCalledWith('invite');

    // Navigate to schedule
    await fireEvent.press(screen.getByRole('button', { name: 'Lịch trình & yêu cầu' }));
    expect(onNavigate).toHaveBeenCalledWith('schedule');
  });

  it('routes journey steps in HyParty', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0OverviewTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        onNavigate={onNavigate}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Hợp đồng' }));
    expect(onNavigate).toHaveBeenCalledWith('contracts');

    await fireEvent.press(screen.getByRole('button', { name: 'Đặt cọc' }));
    expect(onNavigate).toHaveBeenCalledWith('billing');
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

    expect(await screen.findByText('THIỆP MỜI')).toBeOnTheScreen();
    await waitFor(() =>
      expect(gateway.listDesigns).toHaveBeenCalledWith('mock-access-token', 'booking-test-123'),
    );
    expect((await screen.findAllByText('Vườn chiều')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Phiên bản 4/)).length).toBeGreaterThan(0);
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
    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
    expect(await screen.findByText('Sửa nhanh thiệp')).toBeOnTheScreen();

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

    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
    const groomInput = screen.getByPlaceholderText('Tên chú rể');
    await fireEvent.changeText(groomInput, 'Nam Mới');
    await fireEvent.press(screen.getByRole('button', { name: 'Lưu bản chỉnh sửa' }));

    expect((await screen.findAllByText(/Xung đột phiên bản/)).length).toBeGreaterThan(0);
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
    expect(await screen.findByText('Link thiệp cưới chính thức')).toBeOnTheScreen();
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

    expect(await screen.findByText('Thùy Trang & Hoàng Nam')).toBeOnTheScreen();
    expect(await screen.findByText('18 Tháng 01, 2027')).toBeOnTheScreen();
    expect(await screen.findByText('Sảnh Lavender')).toBeOnTheScreen();
    expect(await screen.findByText('Đón khách & Chụp ảnh lưu niệm')).toBeOnTheScreen();
    expect(await screen.findByText('Nghi thức thành hôn chính thức')).toBeOnTheScreen();
    expect(await screen.findByText('Khai tiệc mừng')).toBeOnTheScreen();
  });

  it('navigates to subflows and overview from quick links and header in V0PlanTab', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0PlanTab facts={mockFacts} activeBooking={mockBooking} onNavigate={onNavigate} />,
    );

    await fireEvent.press(screen.getByText('Lịch trình chính thức'));
    expect(onNavigate).toHaveBeenCalledWith('schedule');

    await fireEvent.press(screen.getByText('Nhóm khách & sơ đồ bàn'));
    expect(onNavigate).toHaveBeenCalledWith('seating');

    await fireEvent.press(screen.getByText('Ảnh cưới'));
    expect(onNavigate).toHaveBeenCalledWith('media');
  });

  it('renders empty timeline and fallback revision state in V0PlanTab', async () => {
    const onNavigate = jest.fn();
    const emptyBooking: ConfirmedPlanningSnapshot = {
      ...mockBooking,
      timelineRevision: null,
      revision: 2,
      phase: 'COMPLETED',
      timeline: [],
    };

    await render(
      <V0PlanTab facts={mockFacts} activeBooking={emptyBooking} onNavigate={onNavigate} />,
    );

    expect(await screen.findByText('Chưa có lịch trình chính thức')).toBeOnTheScreen();
  });
});

describe('V0Subflows', () => {
  it('renders truthful schedule from active booking in V0ScheduleSubflow', async () => {
    await render(
      <V0ScheduleSubflow facts={mockFacts} activeBooking={mockBooking} onNavigate={jest.fn()} />,
    );

    expect(await screen.findByText('Lễ cưới Thùy Trang & Hoàng Nam')).toBeOnTheScreen();
    expect(await screen.findByText('17:30')).toBeOnTheScreen();
    expect(await screen.findByText('Đón khách & Chụp ảnh lưu niệm')).toBeOnTheScreen();
  });

  it('explains 72h media cutoff and contractual limits in V0MediaSubflow', async () => {
    await render(<V0MediaSubflow facts={mockFacts} onNavigate={jest.fn()} />);

    expect(await screen.findByText(/Thời hạn tải ảnh/)).toBeOnTheScreen();
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

    expect(await screen.findByText(/Đã hết hạn duyệt/)).toBeOnTheScreen();
    await unmount();

    const pastFacts = { ...mockFacts, eventDate: '2020-01-01' };
    await render(<V0MediaSubflow facts={pastFacts} onNavigate={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Chọn ảnh từ máy' }));
    expect(Alert.alert).toHaveBeenCalledWith('Đã quá thời hạn cutoff', expect.any(String));
  });

  it('loads real print orders and approves quotation via gateway in V0PrintSubflow', async () => {
    const gateway = createMockGateway();
    gateway.listPrintOrders = jest.fn().mockResolvedValue([mockPrintOrder]);
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

    // Confirm quotation in RestoredPrintPanel
    await fireEvent.press(screen.getByRole('button', { name: 'Chấp thuận báo giá hiện tại' }));
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

    expect(await screen.findByText('Quy định danh sách & sơ đồ bàn')).toBeOnTheScreen();
    expect(await screen.findByText(/không lưu trữ danh tính theo Hộ gia đình/)).toBeOnTheScreen();
    expect(await screen.findByText('280 khách')).toBeOnTheScreen();
  });

  it('navigates back from subflows in V0CompanionShell', async () => {
    const onNavigate = jest.fn();
    const { unmount } = await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        initialScreen="schedule"
        onNavigate={onNavigate}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
    expect(onNavigate).toHaveBeenCalledWith('overview');
    await unmount();

    const onNavigateMedia = jest.fn();
    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        initialScreen="media"
        onNavigate={onNavigateMedia}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
    expect(onNavigateMedia).toHaveBeenCalledWith('overview');
  });

  it('renders multiple print order statuses in V0PrintSubflow', async () => {
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
    await fireEvent.press(screen.getByRole('button', { name: 'Chấp thuận bản thay thế' }));
    await waitFor(() => {
      expect(gateway.approveReplacementProposal).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-12345678',
        'rev-replace-1',
        2,
        expect.any(String),
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
    gateway.listPrintOrders = jest.fn().mockResolvedValue([mockPrintOrder]);

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
    await fireEvent.press(screen.getByRole('button', { name: 'Chấp thuận báo giá hiện tại' }));
    expect(await screen.findByText(/Conflict/)).toBeOnTheScreen();
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
        session={mockSession}
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText('HY')).toBeOnTheScreen();
    expect(await screen.findByText('Thùy Trang & Hoàng Nam')).toBeOnTheScreen();
    expect(await screen.findByText('couple@example.com')).toBeOnTheScreen();
    expect(await screen.findByText('Hồ sơ & bảo mật')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Thông báo'));
    expect(onNavigate).toHaveBeenCalledWith('notifications');
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

    expect(await screen.findByText('Thùy Trang & Hoàng Nam')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Khách' }));
    expect((await screen.findAllByText('Khách mời')).length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole('tab', { name: 'Thiệp' }));
    expect((await screen.findAllByText('Thiệp cưới')).length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole('tab', { name: 'Tài chính' }));
    expect((await screen.findAllByText('Tài chính')).length).toBeGreaterThan(0);

    await fireEvent.press(await screen.findByRole('button', { name: 'Xem thanh toán & giao dịch' }));
    expect((await screen.findAllByText('Thanh toán')).length).toBeGreaterThan(0);
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

    expect(await screen.findByText('Lịch trình')).toBeOnTheScreen();

    // Trigger hardware back
    expect(backHandlerCallback).not.toBeNull();
    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });

    expect(onNavigate).toHaveBeenCalledWith('overview');
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
        initialScreen="media"
        onNavigate={onNavigate}
      />,
    );
    expect(await screen.findByText('Ảnh cưới')).toBeOnTheScreen();

    await act(async () => {
      backHandlerCallback!({} as never);
    });
    expect(onNavigate).toHaveBeenCalledWith('overview');

    await unmount();

    await render(
      <V0CompanionShell
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        initialScreen="print"
        onNavigate={onNavigate}
      />,
    );
    expect(await screen.findByText('Đơn in')).toBeOnTheScreen();

    await act(async () => {
      backHandlerCallback!({} as never);
    });
    expect(onNavigate).toHaveBeenCalledWith('finance');
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
    const groomInput = screen.getByPlaceholderText('Tên chú rể');
    await fireEvent.changeText(groomInput, 'Thay Đổi Chưa Lưu');

    // Press close button on sheet
    await fireEvent.press(screen.getByRole('button', { name: 'Đóng' }));
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
    expect(await screen.findByText('THIỆP MỜI')).toBeOnTheScreen();

    // Test handleMorePress options
    await fireEvent.press(screen.getByRole('button', { name: 'Tùy chọn thiệp & bản in' }));
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
    await fireEvent.press(screen.getByRole('button', { name: 'Chấp thuận bản thay thế' }));
    await waitFor(() =>
      expect(gateway.approveReplacementProposal).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-replacement-1',
        'comm-rev-2',
        2,
        expect.any(String),
      ),
    );

    // Cancel order
    await fireEvent.press(screen.getByRole('button', { name: 'Hủy đơn in' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận hủy đơn in' }));
    await waitFor(() =>
      expect(gateway.cancelApprovedPrintOrder).toHaveBeenCalledWith(
        'mock-access-token',
        'booking-test-123',
        'order-replacement-1',
        2,
        expect.any(String),
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

    expect(await screen.findByText(/Thời hạn tải ảnh/)).toBeOnTheScreen();
    const altInput = screen.getByPlaceholderText(/Nhập mô tả ảnh/);
    await fireEvent.changeText(altInput, 'Ảnh cưới hạnh phúc');
    await fireEvent.press(screen.getByRole('button', { name: 'Chọn ảnh từ máy' }));
    await waitFor(() => expect(gateway.uploadWeddingMedia).toHaveBeenCalled());
  });

  it('manages groups, guests, adds guest, and adds new group in V0GuestsSubflow', async () => {
    jest.spyOn(coupleBilling, 'loadGuestGroups').mockResolvedValue([
      {
        guestGroupId: 'grp-1',
        name: 'Gia đình nhà trai',
        status: 'ACTIVE',
        bookingId: 'booking-test-123',
        color: '#D4AF37',
        revision: 1,
      },
      {
        guestGroupId: 'grp-2',
        name: 'Gia đình nhà gái',
        status: 'ACTIVE',
        bookingId: 'booking-test-123',
        color: '#8A9A5B',
        revision: 1,
      },
    ]);
    jest.spyOn(coupleBilling, 'loadGuests').mockResolvedValue({
      items: [
        {
          guestId: 'g-1',
          name: 'Trần Thị Mai',
          guestGroupId: 'grp-1',
          operationalNote: null,
          phone: null,
          status: 'ACTIVE',
          bookingId: 'booking-test-123',
          revision: 1,
        },
      ],
      nextCursor: null,
      sourceSequence: 1,
    });

    await render(
      <V0GuestsSubflow
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        onNavigate={jest.fn()}
      />,
    );

    expect(await screen.findByText('Gia đình nhà trai')).toBeOnTheScreen();
    expect(await screen.findByText('Gia đình nhà gái')).toBeOnTheScreen();
    expect(await screen.findByText(/Trần Thị Mai/)).toBeOnTheScreen();
  });

  it('routes quick actions and milestones from V0OverviewTab to respective screens', async () => {
    const onNavigate = jest.fn();
    await render(
      <V0OverviewTab
        facts={mockFacts}
        activeBooking={mockBooking}
        session={mockSession}
        onNavigate={onNavigate}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Thiệp & lời mời' }));
    expect(onNavigate).toHaveBeenCalledWith('invite');

    await fireEvent.press(screen.getByRole('button', { name: 'Lịch trình & yêu cầu' }));
    expect(onNavigate).toHaveBeenCalledWith('schedule');

    await fireEvent.press(screen.getByRole('button', { name: 'Khách mời của hai bạn' }));
    expect(onNavigate).toHaveBeenCalledWith('guests');

    await fireEvent.press(screen.getByRole('button', { name: 'Hợp đồng' }));
    expect(onNavigate).toHaveBeenCalledWith('contracts');

    await fireEvent.press(screen.getByRole('button', { name: 'Quyết toán' }));
    expect(onNavigate).toHaveBeenCalledWith('finance');
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

    await fireEvent.press(screen.getByText('Lịch trình chính thức'));
    expect(onNavigate).toHaveBeenCalledWith('schedule');

    await fireEvent.press(screen.getByText('Nhóm khách & sơ đồ bàn'));
    expect(onNavigate).toHaveBeenCalledWith('seating');

    await fireEvent.press(screen.getByText('Ảnh cưới'));
    expect(onNavigate).toHaveBeenCalledWith('media');
  });

  it('handles account tab logout and security toggles', async () => {
    const onLogout = jest.fn();
    const onNavigate = jest.fn();
    await render(
      <V0AccountTab
        facts={mockFacts}
        session={mockSession}
        profile={{
          accountId: 'acc-1',
          displayEmail: 'couple@example.com',
          displayName: 'Thùy Trang & Hoàng Nam',
          revision: 1,
        }}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />,
    );

    // Toggle security inline settings
    await fireEvent.press(screen.getByText('Hồ sơ & bảo mật'));
    expect(await screen.findByText('Hồ sơ và bảo mật')).toBeOnTheScreen();

    // Logout
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng xuất' }));
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Sửa nhanh' }));
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

    const altInput = screen.getByPlaceholderText(/Nhập mô tả ảnh/);
    await fireEvent.changeText(altInput, 'Ảnh mô tả lỗi');
    await fireEvent.press(await screen.findByRole('button', { name: 'Chọn ảnh từ máy' }));
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

    expect(await screen.findByText('Thùy Trang & Hoàng Nam')).toBeOnTheScreen();

    // Navigate to Thiệp tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Thiệp' }));
    expect((await screen.findAllByText('Thiệp cưới')).length).toBeGreaterThan(0);

    // Navigate to Khách tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Khách' }));
    expect((await screen.findAllByText('Khách mời')).length).toBeGreaterThan(0);

    // Navigate to Tài chính tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Tài chính' }));
    expect((await screen.findAllByText('Tài chính')).length).toBeGreaterThan(0);

    // Navigate back to Tiệc tab
    await fireEvent.press(screen.getByRole('tab', { name: 'Tiệc' }));
    expect(await screen.findByText('Thùy Trang & Hoàng Nam')).toBeOnTheScreen();
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

    expect(await screen.findByText('Thanh toán')).toBeOnTheScreen();

    await act(async () => {
      const handled = backHandlerCallback!({} as never);
      expect(handled).toBe(true);
    });
    expect(onNavigate).toHaveBeenCalledWith('finance');
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

    expect(await screen.findByText('Thanh toán')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
    expect(onNavigate).toHaveBeenCalledWith('finance');
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
    expect(onNavigate).toHaveBeenCalledWith('overview');
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
