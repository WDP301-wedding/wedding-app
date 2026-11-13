import { AndroidIdentitySession, type IdentityApi } from '@/features/identity-access/session';
import type { ProposalView } from '@/features/booking-lifecycle/proposal-api';
import type { Booking } from './workspace-common';
import type { CommercialContractView } from '@/features/payments-billing/billing-api';

export function contractFixture(
  overrides: Partial<CommercialContractView['revisions'][number]> = {},
): CommercialContractView['revisions'][number] {
  const proposal = proposalFixture();
  return {
    revisionId: 'contract',
    revisionNumber: 3,
    predecessorRevisionId: null,
    state: 'APPROVED',
    documentDigest: 'digest',
    createdAt: '2026-11-12T00:00:00Z',
    submittedAt: '2026-11-12T00:00:00Z',
    approvedAt: '2026-11-12T00:00:00Z',
    pdfSha256: null,
    approvals: [
      {
        actorAccountId: 'manager',
        documentDigest: 'digest',
        occurredAt: '2026-11-12T00:00:00Z',
        party: 'MANAGER',
      },
      {
        actorAccountId: 'couple',
        documentDigest: 'digest',
        occurredAt: '2026-11-12T00:00:00Z',
        party: 'COUPLE',
      },
    ],
    document: {
      modelVersion: 'FULL_CONTRACT_V1',
      bookingId: proposal.bookingId,
      timelineRevisionId: proposal.timeline!.revisionId,
      timelineDigest: 'timeline-digest',
      timeline: [],
      brideName: 'Minh Anh',
      groomName: 'Trọng Nghĩa',
      restaurantId: 'restaurant',
      restaurantName: 'Hỷ Yến',
      restaurantAddress: 'Địa chỉ thử nghiệm',
      hallId: 'hall',
      hallName: 'Sảnh Hoa',
      maxGuests: 120,
      eventDate: '2027-01-18',
      shiftCode: 'DINNER',
      shiftStartTime: '18:00',
      shiftEndTime: '22:00',
      planningHeadcount: 95,
      tableCount: 10,
      lines: [],
      contractTotalVnd: 10000000,
      depositAmountVnd: 3000000,
      incidentalClause: 'Các chi phí phát sinh sẽ được tính sau',
      standardTerms: {
        version: 'WEDDING_STANDARD_V1',
        reserveMenu: { versionId: 'reserve', name: 'Thực đơn dự phòng', dishes: ['Gỏi sen'] },
        orderedMenus: [],
      },
    },
    ...overrides,
  };
}
export function contractListFixture(contract = contractFixture()): CommercialContractView {
  return {
    bookingId: bookingFixture().bookingId,
    bookingRevision: 4,
    modelVersion: 'FULL_CONTRACT_V1',
    currentRevisionId: contract.revisionId,
    eligibleForDeposit: contract.state === 'APPROVED',
    customerSelection: {
      revisionId: 'selection',
      revisionNumber: 1,
      status: 'SUBMITTED',
      lines: [],
      totalVnd: 10000000,
      submittedAt: '2026-11-12T00:00:00Z',
    },
    draftSeed: [],
    capabilities: {
      canApprove: true,
      canEditSelections: false,
      canManageDraft: false,
      canWithdrawApproval: true,
      canRequestChanges: true,
    },
    revisions: [contract],
    nextCursor: null,
  };
}

export function bookingFixture(overrides: Partial<Booking> = {}): Booking {
  return {
    bookingId: '00000000-0000-4000-8000-000000000101',
    consultationId: '00000000-0000-4000-8000-000000000102',
    phase: 'CONFIRMED',
    accessLevel: 'FULL',
    eventDate: '2027-01-18',
    eventType: 'WEDDING',
    hallName: 'Sảnh Hoa',
    shiftCode: 'DINNER',
    planningHeadcount: 95,
    hasTimeline: true,
    managerApproved: true,
    coupleApproved: true,
    ...overrides,
  };
}
export function proposalFixture(overrides: Partial<ProposalView> = {}): ProposalView {
  const booking = bookingFixture();
  const menu = {
    packageId: '00000000-0000-4000-8000-000000000301',
    versionId: '00000000-0000-4000-8000-000000000302',
    versionNumber: 1,
    name: 'Thực đơn tiệc',
    description: 'Thực đơn đã chọn',
    priceVndPerTable: 1000000,
  };
  const timeline = {
    revisionId: '00000000-0000-4000-8000-000000000201',
    revisionNumber: 1,
    predecessorRevisionId: null,
    managerApprovedAt: '2026-11-12T00:00:00Z',
    coupleApprovedAt: '2026-11-12T00:00:00Z',
    items: [
      {
        itemId: '00000000-0000-4000-8000-000000000401',
        order: 0,
        startTime: '18:00',
        title: 'Đón khách',
        description: null,
      },
    ],
  };
  return {
    bookingId: booking.bookingId,
    consultationId: booking.consultationId,
    phase: booking.phase,
    eventDate: booking.eventDate,
    revision: 4,
    planningHeadcount: 95,
    capabilities: {
      accessLevel: 'FULL',
      canEditTimeline: false,
      canApproveTimeline: false,
      canWithdrawApproval: false,
      canRequestCancellation: true,
    },
    proposal: {
      hall: { id: 'hall', name: 'Sảnh Hoa', description: 'Sảnh tiệc', maxGuests: 120 },
      shift: { code: 'DINNER', startTime: '18:00', endTime: '22:00' },
      menu,
      menus: [{ ...menu, tableCount: 10, lineTotalVnd: 10000000 }],
      tableCount: 10,
      baseChargeVnd: 10000000,
      depositAmountVnd: 3000000,
      depositPercentage: 30,
    },
    timeline,
    effectiveTimeline: timeline,
    capacity: { guestsPerTable: 10, minimumTables: 10, maximumTables: 12, issue: null },
    ...overrides,
  };
}
export async function sessionFixture(): Promise<AndroidIdentitySession> {
  const api: IdentityApi = {
    createSession: async () => ({
      accessToken: 'fixture-access',
      refreshToken: 'fixture-refresh',
      sessionId: 'fixture-session',
    }),
    refreshSession: async () => ({
      accessToken: 'fixture-access',
      refreshToken: 'fixture-refresh',
      sessionId: 'fixture-session',
    }),
    getCurrentUser: async () => ({
      accountId: 'fixture-account',
      sessionId: 'fixture-session',
      displayEmail: 'couple@example.invalid',
      roles: ['COUPLE'],
    }),
    logout: async () => {},
    requestPasswordReset: async () => {},
    completePasswordReset: async () => {},
  };
  const session = new AndroidIdentitySession(api, {
    read: async () => null,
    replace: async () => {},
    clear: async () => {},
  });
  await session.login('couple@example.invalid', 'fixture-password');
  return session;
}
