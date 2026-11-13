import { settlementStatus } from './policies';
import type { BillingView } from '@/features/payments-billing/billing-api';

const view: BillingView = {
  bookingId: 'booking',
  billingRevision: 4,
  history: [],
  nextCursor: null,
  balancePaymentEligibility: {
    canPay: false,
    reasonCode: 'BILLING_BALANCE_LIMIT_EXCEEDED',
    nextAction: 'NONE',
    billingRevision: 4,
  },
  totals: {
    acceptedChargesVnd: 100,
    paidVnd: 100,
    refundedVnd: 0,
    netPaidVnd: 100,
    outstandingVnd: 0,
    creditVnd: 0,
  },
};
it('requires a current invoice and matching billing fence before saying settled', () => {
  expect(settlementStatus(view, null)).toBe('awaitingInvoice');
  expect(settlementStatus(view, 101)).toBe('unknown');
  expect(settlementStatus({ ...view, billingRevision: 5 }, 100)).toBe('unknown');
  expect(settlementStatus(view, 100)).toBe('settled');
});
it('keeps refund, overpayment and unresolved-attempt states distinct', () => {
  expect(
    settlementStatus(
      { ...view, totals: { ...view.totals, refundedVnd: 50, netPaidVnd: 50, outstandingVnd: 50 } },
      100,
    ),
  ).toBe('outstanding');
  expect(
    settlementStatus(
      { ...view, totals: { ...view.totals, paidVnd: 110, netPaidVnd: 110, creditVnd: 10 } },
      100,
    ),
  ).toBe('credit');
  expect(
    settlementStatus(
      {
        ...view,
        balancePaymentEligibility: {
          canPay: false,
          reasonCode: 'PAYMENT_ATTEMPT_ACTIVE',
          nextAction: 'CHECK_EXISTING_PAYMENT',
          billingRevision: 4,
        },
      },
      100,
    ),
  ).toBe('unknown');
});
