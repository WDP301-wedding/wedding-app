import { randomUUID } from 'expo-crypto';
import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { components, operations } from '@/lib/api/generated/schema';

export type ProposalView = components['schemas']['BookingProposalResponse']['data'];
export type CoupleProfileView =
  operations['readCoupleProfile']['responses'][200]['content']['application/json']['data'];
export type CommercialContractView =
  operations['listCommercialContracts']['responses'][200]['content']['application/json']['data'];
export type ContractRevision = CommercialContractView['revisions'][number];

function required<T>(data: { readonly data: T } | undefined): T {
  if (data?.data === undefined || data.data === null) {
    throw new Error('Máy chủ không trả dữ liệu phản hồi.');
  }
  return data.data;
}

export interface ProposalGateway {
  loadProposal(this: void, token: string, bookingId: string): Promise<ProposalView>;
  approveTimeline(
    this: void,
    token: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    key?: string,
  ): Promise<void>;
  loadCoupleProfile(this: void, token: string, consultationId: string): Promise<CoupleProfileView>;
  updateCoupleProfile(
    this: void,
    token: string,
    consultationId: string,
    body: {
      readonly brideName: string;
      readonly groomName: string;
      readonly expectedRevision: number;
    },
    key?: string,
  ): Promise<CoupleProfileView>;
  loadContracts(this: void, token: string, bookingId: string): Promise<CommercialContractView>;
  approveContract(
    this: void,
    token: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    key?: string,
  ): Promise<void>;
}

export function createProposalGateway(client?: ApiClient): ProposalGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  return {
    async loadProposal(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/proposal', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as unknown as ProposalView;
    },

    async approveTimeline(token, bookingId, revisionId, expectedRevision, key) {
      const idemKey = key ?? `approve-timeline:${bookingId}:${revisionId}:${randomUUID()}`;
      await api().POST('/bookings/{bookingId}/timeline-revisions/{revisionId}/approvals', {
        params: {
          path: { bookingId, revisionId },
          header: { 'Idempotency-Key': idemKey },
        },
        headers: headers(token),
        body: { expectedRevision },
      });
    },

    async loadCoupleProfile(token, consultationId) {
      const { data } = await api().GET('/consultations/{consultationId}/couple-profile', {
        params: { path: { consultationId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },

    async updateCoupleProfile(token, consultationId, body, key) {
      const idemKey =
        key ?? `update-names:${consultationId}:${body.expectedRevision}:${randomUUID()}`;
      const { data } = await api().PATCH('/consultations/{consultationId}/couple-profile', {
        params: {
          path: { consultationId },
          header: { 'Idempotency-Key': idemKey },
        },
        headers: headers(token),
        body,
      });
      return required(data);
    },

    async loadContracts(token, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/contracts', {
        params: { path: { bookingId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data) as unknown as CommercialContractView;
    },

    async approveContract(token, bookingId, revisionId, expectedRevision, key) {
      const idemKey = key ?? `approve-contract:${bookingId}:${revisionId}:${randomUUID()}`;
      await api().POST('/bookings/{bookingId}/contracts/{revisionId}/approvals', {
        params: {
          path: { bookingId, revisionId },
          header: { 'Idempotency-Key': idemKey },
        },
        headers: headers(token),
        body: { expectedRevision },
      });
    },
  };
}
