import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components, operations } from '../../lib/api/generated/schema';

export type BillingView = components['schemas']['BookingBillingResponse']['data'];
export type AttemptView = components['schemas']['BillingAttemptResponse']['data'];
export type CheckoutView = components['schemas']['BillingCheckoutResponse']['data'];
export type DepositBody = components['schemas']['BillingDepositBody'];
export type BalanceBody = components['schemas']['BillingBalanceBody'];
export type BillingPageQuery = operations['getBookingBilling']['parameters']['query'];
export type BillingContext = Readonly<{
  bookingId: string;
  accessLevel: 'RESTRICTED' | 'FULL';
  phase: components['schemas']['BookingProposalResponse']['data']['phase'];
  depositAmountVnd: number;
  timelineRevisionId: string | null;
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
export function createCoupleBillingGateway(client?: ApiClient): CoupleBillingGateway {
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
      return {
        bookingId: value.bookingId,
        accessLevel: value.capabilities.accessLevel,
        phase: value.phase,
        depositAmountVnd: value.proposal.depositAmountVnd,
        timelineRevisionId: value.timeline?.revisionId ?? null,
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
  };
}
