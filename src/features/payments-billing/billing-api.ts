import { ApiClientError, createApiClient, type ApiClient } from '../../lib/api/client';
import type { components, operations } from '../../lib/api/generated/schema';
import { createDeterministicIdempotencyKey } from '../../lib/idempotency';

import { readPublicEnv } from '../../lib/env';
import {
  retiredGuestOperation,
  type GuestItem,
  type NamedGuestView,
  type PersonalInvitationLinkView,
} from './retired-guest-types';
export type { GuestItem, NamedGuestView, PersonalInvitationLinkView } from './retired-guest-types';

type CurrentBillingView = components['schemas']['BookingBillingResponse']['data'];
export type BillingView = Omit<CurrentBillingView, 'balancePaymentEligibility'> &
  Readonly<{
    /** Older deployed responses may omit this advisory field; admission must fail closed. */
    balancePaymentEligibility?: CurrentBillingView['balancePaymentEligibility'] | undefined;
  }>;
export type AttemptView = components['schemas']['BillingAttemptResponse']['data'];
export type CheckoutView = components['schemas']['BillingCheckoutResponse']['data'];
export type DepositBody = components['schemas']['BillingDepositBody'];
export type BalanceBody = components['schemas']['BillingBalanceBody'];
export type BillingPageQuery = operations['getBookingBilling']['parameters']['query'];
export type CommercialContractView =
  operations['listCommercialContracts']['responses'][200]['content']['application/json']['data'];
export type CommercialAppendixView =
  operations['listCommercialAppendices']['responses'][200]['content']['application/json']['data'];
export type IncidentalExpensesView =
  operations['getIncidentalExpenses']['responses'][200]['content']['application/json']['data'];
export type CommercialInvoiceView =
  operations['listCommercialInvoices']['responses'][200]['content']['application/json']['data'];
export type GuestGroupView =
  operations['listGuestGroups']['responses'][200]['content']['application/json']['data'];

export type BillingContext = Readonly<{
  bookingId: string;
  accessLevel: 'RESTRICTED' | 'FULL';
  phase: components['schemas']['BookingProposalResponse']['data']['phase'];
  depositAmountVnd: number;
  timelineRevisionId: string | null;
  contractRevisionId?: string | null;
  documentDigest?: string | null;
}>;
export interface CoupleBillingGateway {
  loadContext(this: void, token: string, bookingId: string): Promise<BillingContext>;
  load(
    this: void,
    token: string,
    bookingId: string,
    query?: BillingPageQuery,
  ): Promise<BillingView>;
  loadAttempt(
    this: void,
    token: string,
    bookingId: string,
    attemptId: string,
  ): Promise<AttemptView>;
  startDeposit(
    this: void,
    token: string,
    bookingId: string,
    body: DepositBody,
    key: string,
  ): Promise<CheckoutView>;
  startBalance(
    this: void,
    token: string,
    bookingId: string,
    body: BalanceBody,
    key: string,
  ): Promise<CheckoutView>;
  loadContracts?(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
  ): Promise<CommercialContractView>;
  loadAppendices?(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
  ): Promise<CommercialAppendixView>;
  loadIncidentals?(this: void, token: string, bookingId: string): Promise<IncidentalExpensesView>;
  loadFinalInvoices?(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
  ): Promise<CommercialInvoiceView>;
  loadGuestGroups?(this: void, token: string, bookingId: string): Promise<GuestGroupView>;
  loadGuests?(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
    status?: 'ACTIVE' | 'ARCHIVED',
  ): Promise<NamedGuestView>;
  downloadContractPdf?(
    this: void,
    token: string,
    bookingId: string,
    revisionId: string,
  ): Promise<Blob>;
  createGuest?(
    this: void,
    token: string,
    bookingId: string,
    body: {
      readonly name: string;
      readonly guestGroupId: string;
      readonly phone?: string | null;
      readonly operationalNote?: string | null;
    },
    key?: string,
  ): Promise<GuestItem>;
  updateGuest?(
    this: void,
    token: string,
    bookingId: string,
    guestId: string,
    body: {
      readonly expectedRevision: number;
      readonly name?: string;
      readonly guestGroupId?: string;
      readonly phone?: string | null;
      readonly operationalNote?: string | null;
      readonly status?: 'ACTIVE' | 'ARCHIVED';
    },
    key?: string,
  ): Promise<GuestItem>;
  issueGuestInvitationLink?(
    this: void,
    token: string,
    bookingId: string,
    guestId: string,
    expectedRevision: number,
    key?: string,
  ): Promise<PersonalInvitationLinkView>;
}

export interface CoupleCommercialBillingGateway extends CoupleBillingGateway {
  loadContracts(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
  ): Promise<CommercialContractView>;
  loadAppendices(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
  ): Promise<CommercialAppendixView>;
  loadIncidentals(this: void, token: string, bookingId: string): Promise<IncidentalExpensesView>;
  loadFinalInvoices(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
  ): Promise<CommercialInvoiceView>;
  loadGuestGroups(this: void, token: string, bookingId: string): Promise<GuestGroupView>;
  loadGuests(
    this: void,
    token: string,
    bookingId: string,
    cursor?: string,
    status?: 'ACTIVE' | 'ARCHIVED',
  ): Promise<NamedGuestView>;
  downloadContractPdf(
    this: void,
    token: string,
    bookingId: string,
    revisionId: string,
  ): Promise<Blob>;
  createGuest?(
    this: void,
    token: string,
    bookingId: string,
    body: {
      readonly name: string;
      readonly guestGroupId: string;
      readonly phone?: string | null;
      readonly operationalNote?: string | null;
    },
    key?: string,
  ): Promise<GuestItem>;
  updateGuest?(
    this: void,
    token: string,
    bookingId: string,
    guestId: string,
    body: {
      readonly expectedRevision: number;
      readonly name?: string;
      readonly guestGroupId?: string;
      readonly phone?: string | null;
      readonly operationalNote?: string | null;
      readonly status?: 'ACTIVE' | 'ARCHIVED';
    },
    key?: string,
  ): Promise<GuestItem>;
  issueGuestInvitationLink?(
    this: void,
    token: string,
    bookingId: string,
    guestId: string,
    expectedRevision: number,
    key?: string,
  ): Promise<PersonalInvitationLinkView>;
  loadGuestPlan?(
    this: void,
    token: string,
    bookingId: string,
  ): Promise<{
    readonly planningHeadcount: number;
    readonly revision: number;
    readonly sourceSequence?: number;
  }>;
  updateGuestPlan?(
    this: void,
    token: string,
    bookingId: string,
    expectedRevision: number,
    planningHeadcount: number,
    key?: string,
  ): Promise<{
    readonly planningHeadcount: number;
    readonly revision: number;
  }>;
  loadSeatingLayoutOptions?(
    this: void,
    token: string,
    bookingId: string,
  ): Promise<
    operations['listSeatingLayoutOptions']['responses'][200]['content']['application/json']['data']
  >;
  loadSeatingPlan?(
    this: void,
    token: string,
    bookingId: string,
    planId: string,
  ): Promise<
    operations['readSeatingPlan']['responses'][200]['content']['application/json']['data']
  >;
  loadCurrentSeatingPlan?(
    this: void,
    token: string,
    bookingId: string,
  ): Promise<
    operations['readSeatingPlan']['responses'][200]['content']['application/json']['data'] | null
  >;
}
export type SeatingPlanData =
  operations['readSeatingPlan']['responses'][200]['content']['application/json']['data'];
function required<T>(data: { readonly data: T } | undefined): T {
  if (data?.data === undefined || data.data === null)
    throw new Error('Không nhận được dữ liệu thanh toán. Giữ nguyên yêu cầu để thử lại.');
  return data.data;
}
function checkout(data: { readonly data: CheckoutView } | undefined): CheckoutView {
  const value = required(data);
  const url = new URL(value.checkoutUrl);
  if (
    url.origin !== 'https://sandbox.vnpayment.vn' ||
    url.pathname !== '/paymentv2/vpcpay.html' ||
    url.username ||
    url.password
  )
    throw new Error('Đường dẫn VNPay không hợp lệ. Giữ nguyên yêu cầu và liên hệ nhà hàng.');
  return value;
}
export function createCoupleBillingGateway(client?: ApiClient): CoupleCommercialBillingGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async loadContext(token, bookingId) {
      const [value, contractsRes] = await Promise.all([
        api()
          .GET('/bookings/{bookingId}/proposal', {
            params: { path: { bookingId } },
            headers: headers(token),
            cache: 'no-store',
          })
          .then(({ data }) => required(data)),
        api()
          .GET('/bookings/{bookingId}/contracts', {
            params: { path: { bookingId } },
            headers: headers(token),
            cache: 'no-store',
          })
          .catch(() => null),
      ]);

      let contractRevisionId: string | null = null;
      let documentDigest: string | null = null;
      const contractData = contractsRes?.data?.data as CommercialContractView | undefined;
      const approvedContract = contractData?.revisions?.find(
        (revision) => revision.state === 'APPROVED',
      );
      if (approvedContract) {
        contractRevisionId = approvedContract.revisionId;
        documentDigest = approvedContract.documentDigest;
      }

      return {
        bookingId: value.bookingId,
        accessLevel: value.capabilities.accessLevel,
        phase: value.phase,
        depositAmountVnd: value.proposal.depositAmountVnd,
        timelineRevisionId:
          value.effectiveTimeline?.revisionId ?? value.timeline?.revisionId ?? null,
        ...(contractRevisionId !== null ? { contractRevisionId, documentDigest } : {}),
      };
    },
    async load(token, bookingId, query = {}) {
      const { data } = await api().GET('/bookings/{bookingId}/billing', {
        params: { path: { bookingId }, query: { limit: 25, ...query } },
        headers: headers(token),
        cache: 'no-store',
      });
      const value = required(data);
      return {
        ...value,
        history: Array.from(value.history),
        balancePaymentEligibility: value.balancePaymentEligibility?.canPay
          ? { ...value.balancePaymentEligibility, reasonCode: null }
          : value.balancePaymentEligibility,
      };
    },
    async loadAttempt(token, bookingId, attemptId) {
      const { data } = await api().GET('/bookings/{bookingId}/payments/{attemptId}', {
        params: { path: { bookingId, attemptId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },
    async startDeposit(token, bookingId, body, key) {
      const { data } = await api().POST('/bookings/{bookingId}/payments/deposit', {
        params: { path: { bookingId }, header: { 'Idempotency-Key': key } },
        headers: headers(token),
        body,
        cache: 'no-store',
      });
      return checkout(data);
    },
    async startBalance(token, bookingId, body, key) {
      const { data } = await api().POST('/bookings/{bookingId}/payments/balance', {
        params: { path: { bookingId }, header: { 'Idempotency-Key': key } },
        headers: headers(token),
        body,
        cache: 'no-store',
      });
      return checkout(data);
    },
    async loadContracts(token, bookingId, cursor) {
      const { data } = await api().GET('/bookings/{bookingId}/contracts', {
        params: { path: { bookingId }, ...(cursor ? { query: { cursor } } : {}) },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as CommercialContractView;
    },
    async loadAppendices(token, bookingId, cursor) {
      const { data } = await api().GET('/bookings/{bookingId}/contract-appendices', {
        params: { path: { bookingId }, ...(cursor ? { query: { cursor } } : {}) },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as CommercialAppendixView;
    },
    async loadIncidentals(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/incidental-expenses', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as IncidentalExpensesView;
    },
    async loadFinalInvoices(token, bookingId, cursor) {
      const { data } = await api().GET('/bookings/{bookingId}/final-invoices', {
        params: { path: { bookingId }, ...(cursor ? { query: { cursor } } : {}) },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as CommercialInvoiceView;
    },
    async loadGuestGroups(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/guest-groups', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as GuestGroupView;
    },
    async loadGuests() {
      return retiredGuestOperation();
    },
    async downloadContractPdf(token, bookingId, revisionId) {
      const baseUrl = readPublicEnv().EXPO_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/contracts/${revisionId}/pdf`, {
        headers: headers(token),
      });
      if (!res.ok) {
        throw new Error('Không thể tải tệp PDF hợp đồng từ máy chủ.');
      }
      return await res.blob();
    },
    async loadGuestPlan(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/guest-plan', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as {
        readonly planningHeadcount: number;
        readonly revision: number;
        readonly sourceSequence?: number;
      };
    },
    async updateGuestPlan(token, bookingId, expectedRevision, planningHeadcount, key) {
      const idempKey =
        key ??
        createDeterministicIdempotencyKey('guest-plan', bookingId, expectedRevision, {
          planningHeadcount,
        });
      const { data } = await api().PATCH('/bookings/{bookingId}/guest-plan', {
        params: {
          path: { bookingId },
          header: { 'Idempotency-Key': idempKey },
        },
        headers: headers(token),
        body: { expectedRevision, planningHeadcount },
        cache: 'no-store',
      });
      return required(data) as {
        readonly planningHeadcount: number;
        readonly revision: number;
      };
    },
    async loadSeatingLayoutOptions(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/seating-layout-options', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(
        data,
      ) as operations['listSeatingLayoutOptions']['responses'][200]['content']['application/json']['data'];
    },
    async loadSeatingPlan(token, bookingId, planId) {
      const { data } = await api().GET('/bookings/{bookingId}/seating-plans/{planId}', {
        params: { path: { bookingId, planId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(
        data,
      ) as operations['readSeatingPlan']['responses'][200]['content']['application/json']['data'];
    },
    async loadCurrentSeatingPlan(token, bookingId) {
      try {
        const { data } = await api().GET('/bookings/{bookingId}/seating-plans/current', {
          headers: headers(token),
          params: { path: { bookingId } },
          cache: 'no-store',
        });
        if (data === undefined) throw new Error('Chưa thể tải sơ đồ bàn hiện tại.');
        const plan = data.data;
        return plan === null
          ? null
          : {
              ...plan,
              droppedTableIds: Array.from(plan.droppedTableIds),
              labels: Array.from(plan.labels),
              renderSnapshot: Array.from(plan.renderSnapshot),
              warnings: Array.from(plan.warnings),
            };
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 404) return null;
        throw error;
      }
    },
    async createGuest() {
      return retiredGuestOperation();
    },
    async updateGuest() {
      return retiredGuestOperation();
    },
    async issueGuestInvitationLink() {
      return retiredGuestOperation();
    },
  };
}
