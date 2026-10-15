import type { ApiClient } from '@/lib/api/client';
import type { operations } from '@/lib/api/generated/schema';
import { createDeterministicIdempotencyKey } from '@/lib/idempotency';

export function createCommercialFlowsMethods(
  api: () => ApiClient,
  required: <T>(value: T | undefined) => T,
) {
  return {
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
  };
}
