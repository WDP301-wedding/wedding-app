import type {
  BillingView,
  CommercialInvoiceView,
  IncidentalExpensesView,
  SeatingPlanData,
} from '@/features/payments-billing/billing-api';
import { bookingFixture, contractFixture } from '@/screens/workspace/workspace-test-support';

export const menuLine = {
  category: 'MENU' as const,
  sourceId: 'menu',
  sourceRevisionId: 'menu-version',
  name: 'Thực đơn đã chốt',
  description: 'Thực đơn thử nghiệm',
  unit: 'table',
  quantity: 10,
  unitPriceVnd: 1000000,
  lineTotalVnd: 10000000,
};
export function billingFixture(overrides: Partial<BillingView> = {}): BillingView {
  return {
    bookingId: bookingFixture().bookingId,
    billingRevision: 4,
    nextCursor: null,
    history: [],
    balancePaymentEligibility: {
      billingRevision: 4,
      canPay: true,
      nextAction: 'PAY_BALANCE',
      reasonCode: null,
    },
    totals: {
      acceptedChargesVnd: 10200000,
      paidVnd: 3000000,
      refundedVnd: 0,
      netPaidVnd: 3000000,
      outstandingVnd: 7200000,
      creditVnd: 0,
    },
    ...overrides,
  };
}
export function expenseFixture(
  overrides: Partial<IncidentalExpensesView> = {},
): IncidentalExpensesView {
  const line = {
    id: 'expense-line',
    name: 'Nước dùng thêm',
    quantity: 2,
    unit: 'thùng',
    unitPriceVnd: 100000,
    totalVnd: 200000,
    note: 'Đã đối chiếu',
  };
  return {
    bookingId: bookingFixture().bookingId,
    revision: 7,
    approvalRequired: true,
    canFinalize: false,
    finalized: true,
    pricing: [],
    lines: [line],
    totalVnd: 200000,
    reviewHistory: [],
    currentReview: {
      id: 'review',
      revisionNumber: 3,
      draftRevision: 6,
      documentDigest: 'review-digest',
      type: 'EXPENSES',
      state: 'APPROVED',
      createdAt: '2026-11-18T00:00:00Z',
      decisionReason: null,
      managerAccountId: 'manager',
      managerApprovedAt: '2026-11-18T00:00:00Z',
      coupleAccountId: 'couple',
      coupleApprovedAt: '2026-11-18T00:01:00Z',
      document: { lines: [line], totalVnd: 200000 },
    },
    ...overrides,
  };
}
export function invoiceFixture(
  overrides: Partial<CommercialInvoiceView['revisions'][number]> = {},
): CommercialInvoiceView['revisions'][number] {
  const contract = contractFixture();
  return {
    bookingId: bookingFixture().bookingId,
    invoiceRevisionId: 'invoice-current',
    invoiceNumber: 'INV-TEST-02',
    revisionNumber: 2,
    predecessorRevisionId: 'invoice-old',
    documentDigest: 'invoice-digest',
    issuedAt: '2026-11-18T00:00:00Z',
    issuedByAccountId: 'manager',
    sourceBillingRevision: 4,
    document: {
      modelVersion: 'FINAL_INVOICE_V1',
      bookingId: bookingFixture().bookingId,
      contract: {
        revisionId: contract.revisionId,
        documentDigest: contract.documentDigest,
        document: { ...contract.document, eventDate: '2026-11-17', lines: [menuLine] },
      },
      appendices: [],
      adjustments: [],
      effectiveCommercialRevisionId: contract.revisionId,
      commercialTotalVnd: 10000000,
      expenseDraftRevision: 6,
      incidentalLines: expenseFixture().lines,
      incidentalTotalVnd: 200000,
      totalVnd: 10200000,
    },
    ...overrides,
  };
}
export function invoiceListFixture(revisions = [invoiceFixture()]): CommercialInvoiceView {
  return {
    bookingId: bookingFixture().bookingId,
    currentRevisionId: revisions[0]?.invoiceRevisionId ?? null,
    nextCursor: null,
    revisions,
  };
}
export function tableFixture(
  overrides: Partial<SeatingPlanData['renderSnapshot'][number]> = {},
): SeatingPlanData['renderSnapshot'][number] {
  return {
    layoutTableId: 'table-1',
    tableLabel: 'Bàn 1',
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    rotationDegrees: 0,
    shape: 'RECTANGLE',
    color: '#123456',
    guestGroupId: 'group-1',
    guestGroupName: 'Friends',
    ...overrides,
  };
}
export function seatingFixture(overrides: Partial<SeatingPlanData> = {}): SeatingPlanData {
  return {
    bookingId: bookingFixture().bookingId,
    bookingRevision: 4,
    currentBookingRevision: 4,
    currentPlanningHeadcount: 95,
    expectedAttendees: 95,
    droppedTableIds: [],
    labels: [],
    layoutName: 'Sơ đồ thử nghiệm',
    layoutTemplateVersionId: 'layout-version',
    managerException: null,
    minGuests: 10,
    maxGuests: 120,
    renderSnapshot: [tableFixture()],
    revisionId: 'seating-revision',
    revisionNumber: 2,
    seatingPlanId: 'seating-plan',
    snapshotDigest: 'seating-digest',
    status: 'CONFIRMED',
    totalSeatCapacity: 100,
    warnings: [],
    ...overrides,
  };
}
