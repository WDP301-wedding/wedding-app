import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components, operations } from '../../lib/api/generated/schema';

import { readPublicEnv } from '../../lib/env';

export type BillingView = components['schemas']['BookingBillingResponse']['data'];
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
export type NamedGuestView =
  operations['listNamedGuests']['responses'][200]['content']['application/json']['data'];

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
  loadContracts?(this: void, token: string, bookingId: string): Promise<CommercialContractView>;
  loadAppendices?(this: void, token: string, bookingId: string): Promise<CommercialAppendixView>;
  loadIncidentals?(this: void, token: string, bookingId: string): Promise<IncidentalExpensesView>;
  loadFinalInvoices?(this: void, token: string, bookingId: string): Promise<CommercialInvoiceView>;
  loadGuestGroups?(this: void, token: string, bookingId: string): Promise<GuestGroupView>;
  loadGuests?(this: void, token: string, bookingId: string): Promise<NamedGuestView>;
  downloadContractPdf?(
    this: void,
    token: string,
    bookingId: string,
    revisionId: string,
  ): Promise<Blob>;
}

export interface CoupleCommercialBillingGateway extends CoupleBillingGateway {
  loadContracts(this: void, token: string, bookingId: string): Promise<CommercialContractView>;
  loadAppendices(this: void, token: string, bookingId: string): Promise<CommercialAppendixView>;
  loadIncidentals(this: void, token: string, bookingId: string): Promise<IncidentalExpensesView>;
  loadFinalInvoices(this: void, token: string, bookingId: string): Promise<CommercialInvoiceView>;
  loadGuestGroups(this: void, token: string, bookingId: string): Promise<GuestGroupView>;
  loadGuests(this: void, token: string, bookingId: string): Promise<NamedGuestView>;
  downloadContractPdf(
    this: void,
    token: string,
    bookingId: string,
    revisionId: string,
  ): Promise<Blob>;
}
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
      const { data } = await api().GET('/bookings/{bookingId}/proposal', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      const value = required(data);

      let contractRevisionId: string | null = null;
      let documentDigest: string | null = null;
      try {
        const contractsRes = await api().GET('/bookings/{bookingId}/contracts', {
          params: { path: { bookingId } },
          headers: headers(token),
          cache: 'no-store',
        });
        const contractData = contractsRes.data?.data as CommercialContractView | undefined;
        const approvedContract = contractData?.revisions?.find(
          (r: { readonly state: string }) => r.state === 'APPROVED',
        );
        if (approvedContract) {
          contractRevisionId = approvedContract.revisionId;
          documentDigest = approvedContract.documentDigest;
        }
      } catch {
        // Non-blocking
      }

      return {
        bookingId: value.bookingId,
        accessLevel: value.capabilities.accessLevel,
        phase: value.phase,
        depositAmountVnd: value.proposal.depositAmountVnd,
        timelineRevisionId:
          value.effectiveTimeline?.revisionId ?? value.timeline?.revisionId ?? null,
        contractRevisionId,
        documentDigest,
      };
    },
    async load(token, bookingId, query = {}) {
      const { data } = await api().GET('/bookings/{bookingId}/billing', {
        params: { path: { bookingId }, query: { limit: 25, ...query } },
        headers: headers(token),
        cache: 'no-store',
      });
      const value = required(data);
      return { ...value, history: Array.from(value.history) };
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
    async loadContracts(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/contracts', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as CommercialContractView;
    },
    async loadAppendices(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/contract-appendices', {
        params: { path: { bookingId } },
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
    async loadFinalInvoices(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/final-invoices', {
        params: { path: { bookingId } },
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
    async loadGuests(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/guests', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as NamedGuestView;
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
  };
}
