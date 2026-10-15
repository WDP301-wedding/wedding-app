import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { operations } from '@/lib/api/generated/schema';
import { createDeterministicIdempotencyKey } from '@/lib/idempotency';
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi từ máy chủ.');
  return value;
}
export function createRestoredFlowsGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  return {
    async attendanceSummary(token: string, bookingId: string) {
      const { data } = await api().GET('/bookings/{bookingId}/attendance-summary', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId } },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['readAttendanceSummary']['responses'][200]['content']['application/json']['data'];
    },
    async requestCancellation(
      token: string,
      bookingId: string,
      body: operations['requestBookingCancellation']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/cancellation-requests', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ??
              createDeterministicIdempotencyKey('requestCancellation', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['requestBookingCancellation']['responses'][202]['content']['application/json']['data'];
    },
    async requestChange(
      token: string,
      bookingId: string,
      body: operations['requestBookingTimelineChange']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/change-requests', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('requestChange', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['requestBookingTimelineChange']['responses'][201]['content']['application/json']['data'];
    },
    async checkInSettings(token: string, bookingId: string) {
      const { data } = await api().GET('/bookings/{bookingId}/check-in-settings', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId } },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['readCheckInSettings']['responses'][200]['content']['application/json']['data'];
    },
    async configureCheckIn(
      token: string,
      bookingId: string,
      body: operations['configureCheckIn']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().PATCH('/bookings/{bookingId}/check-in-settings', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('configureCheckIn', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['configureCheckIn']['responses'][200]['content']['application/json']['data'];
    },
    async readAppendices(
      token: string,
      bookingId: string,
      query?: operations['listCommercialAppendices']['parameters']['query'],
    ) {
      const { data } = await api().GET('/bookings/{bookingId}/contract-appendices', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId }, ...(query ? { query } : {}) },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['listCommercialAppendices']['responses'][200]['content']['application/json']['data'];
    },
    async createAppendix(
      token: string,
      bookingId: string,
      body: operations['createCommercialAppendix']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/contract-appendices', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('createAppendix', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['createCommercialAppendix']['responses'][201]['content']['application/json']['data'];
    },
    async approveAppendix(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['approveCommercialAppendix']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/contract-appendices/{revisionId}/approvals',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, revisionId },
            header: {
              'Idempotency-Key':
                key ??
                createDeterministicIdempotencyKey('approveAppendix', bookingId, 'body', body),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['approveCommercialAppendix']['responses'][200]['content']['application/json']['data'];
    },
    async submitAppendix(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['submitCommercialAppendix']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/contract-appendices/{revisionId}/submissions',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, revisionId },
            header: {
              'Idempotency-Key':
                key ?? createDeterministicIdempotencyKey('submitAppendix', bookingId, 'body', body),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['submitCommercialAppendix']['responses'][200]['content']['application/json']['data'];
    },
    async readContracts(
      token: string,
      bookingId: string,
      query?: operations['listCommercialContracts']['parameters']['query'],
    ) {
      const { data } = await api().GET('/bookings/{bookingId}/contracts', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId }, ...(query ? { query } : {}) },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['listCommercialContracts']['responses'][200]['content']['application/json']['data'];
    },
    async createContract(
      token: string,
      bookingId: string,
      body: operations['createCommercialContractRevision']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/contracts', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('createContract', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['createCommercialContractRevision']['responses'][201]['content']['application/json']['data'];
    },
    async approveContract(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['approveCommercialContract']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/contracts/{revisionId}/approvals', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId, revisionId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('approveContract', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['approveCommercialContract']['responses'][200]['content']['application/json']['data'];
    },
    async submitContract(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['submitCommercialContract']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/contracts/{revisionId}/submissions',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, revisionId },
            header: {
              'Idempotency-Key':
                key ?? createDeterministicIdempotencyKey('submitContract', bookingId, 'body', body),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['submitCommercialContract']['responses'][200]['content']['application/json']['data'];
    },
    async withdrawContract(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['withdrawCommercialContractApproval']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/contracts/{revisionId}/withdrawals',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, revisionId },
            header: {
              'Idempotency-Key':
                key ??
                createDeterministicIdempotencyKey('withdrawContract', bookingId, 'body', body),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['withdrawCommercialContractApproval']['responses'][200]['content']['application/json']['data'];
    },
    async readInvoices(
      token: string,
      bookingId: string,
      query?: operations['listCommercialInvoices']['parameters']['query'],
    ) {
      const { data } = await api().GET('/bookings/{bookingId}/final-invoices', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId }, ...(query ? { query } : {}) },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['listCommercialInvoices']['responses'][200]['content']['application/json']['data'];
    },
    async getInvoice(token: string, bookingId: string, invoiceRevisionId: string) {
      const { data } = await api().GET('/bookings/{bookingId}/final-invoices/{invoiceRevisionId}', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId, invoiceRevisionId } },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['getCommercialInvoice']['responses'][200]['content']['application/json']['data'];
    },
    async createPrintOrder(
      token: string,
      bookingId: string,
      body: operations['requestPrintOrder']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/print-orders', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('createPrintOrder', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['requestPrintOrder']['responses'][201]['content']['application/json']['data'];
    },
    async getPrintOrder(token: string, bookingId: string, orderId: string) {
      const { data } = await api().GET('/bookings/{bookingId}/print-orders/{orderId}', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId, orderId } },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['getPrintOrder']['responses'][200]['content']['application/json']['data'];
    },
    async createCancellationIntent(
      token: string,
      bookingId: string,
      orderId: string,
      body: operations['recordPrintOrderCancellationIntent']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/cancellation-intents',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, orderId },
            header: {
              'Idempotency-Key':
                key ??
                createDeterministicIdempotencyKey(
                  'createCancellationIntent',
                  bookingId,
                  'body',
                  body,
                ),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['recordPrintOrderCancellationIntent']['responses'][200]['content']['application/json']['data'];
    },
    async loadProposal(token: string, bookingId: string) {
      const { data } = await api().GET('/bookings/{bookingId}/proposal', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { bookingId } },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['getBookingProposal']['responses'][200]['content']['application/json']['data'];
    },
    async createTimeline(
      token: string,
      bookingId: string,
      body: operations['createBookingTimelineRevision']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST('/bookings/{bookingId}/timeline-revisions', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { bookingId },
          header: {
            'Idempotency-Key':
              key ?? createDeterministicIdempotencyKey('createTimeline', bookingId, 'body', body),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['createBookingTimelineRevision']['responses'][201]['content']['application/json']['data'];
    },
    async approveTimeline(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['approveBookingTimelineRevision']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/timeline-revisions/{revisionId}/approvals',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, revisionId },
            header: {
              'Idempotency-Key':
                key ??
                createDeterministicIdempotencyKey('approveTimeline', bookingId, 'body', body),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['approveBookingTimelineRevision']['responses'][200]['content']['application/json']['data'];
    },
    async withdrawTimeline(
      token: string,
      bookingId: string,
      revisionId: string,
      body: operations['withdrawBookingTimelineApproval']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().POST(
        '/bookings/{bookingId}/timeline-revisions/{revisionId}/withdrawals',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            path: { bookingId, revisionId },
            header: {
              'Idempotency-Key':
                key ??
                createDeterministicIdempotencyKey('withdrawTimeline', bookingId, 'body', body),
            },
          },
          body,
          cache: 'no-store',
        },
      );
      return required(data)
        .data as operations['withdrawBookingTimelineApproval']['responses'][200]['content']['application/json']['data'];
    },
    async readMenus(query?: operations['listPublicMenuPackages']['parameters']['query']) {
      const { data } = await api().GET('/catalog/menu-packages', {
        params: { ...(query ? { query } : {}) },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['listPublicMenuPackages']['responses'][200]['content']['application/json']['data'];
    },
    async coupleProfile(token: string, consultationId: string) {
      const { data } = await api().GET('/consultations/{consultationId}/couple-profile', {
        headers: { Authorization: `Bearer ${token}` },
        params: { path: { consultationId } },
        cache: 'no-store',
      });
      return required(data)
        .data as operations['readCoupleProfile']['responses'][200]['content']['application/json']['data'];
    },
    async updateCoupleProfile(
      token: string,
      consultationId: string,
      body: operations['updateCoupleProfile']['requestBody']['content']['application/json'],
      key?: string,
    ) {
      const { data } = await api().PATCH('/consultations/{consultationId}/couple-profile', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          path: { consultationId },
          header: {
            'Idempotency-Key':
              key ??
              createDeterministicIdempotencyKey(
                'updateCoupleProfile',
                consultationId,
                'body',
                body,
              ),
          },
        },
        body,
        cache: 'no-store',
      });
      return required(data)
        .data as operations['updateCoupleProfile']['responses'][200]['content']['application/json']['data'];
    },
    async liveHealth() {
      const { data } = await api().GET('/health/live', { cache: 'no-store' });
      return required(data)
        .data as operations['getHealthLive']['responses'][200]['content']['application/json']['data'];
    },
    async readyHealth() {
      const { data } = await api().GET('/health/ready', { cache: 'no-store' });
      return required(data)
        .data as operations['getHealthReady']['responses'][200]['content']['application/json']['data'];
    },
  };
}
