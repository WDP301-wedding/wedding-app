import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { components, operations } from '@/lib/api/generated/schema';
export type Profile = components['schemas']['ProfileResponse']['data'];
export type Overview = components['schemas']['CoupleOverviewResponse'];
export type SessionSummary = components['schemas']['SessionSummary'];
export type SessionInventory = components['schemas']['SessionInventoryResponse']['data'];
export type CoupleProfile =
  operations['readCoupleProfile']['responses'][200]['content']['application/json']['data'];
const required = <T>(value: T | undefined) => {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
};
export function createExperienceGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async profile(token: string) {
      return required((await api().GET('/auth/profile', { headers: headers(token) })).data).data;
    },
    async coupleProfile(token: string, consultationId: string): Promise<CoupleProfile> {
      const response = await api().GET('/consultations/{consultationId}/couple-profile', {
        headers: headers(token),
        params: { path: { consultationId } },
      });
      return required(response.data).data;
    },
    async updateProfile(
      token: string,
      displayName: string,
      expectedRevision: number,
      idempotencyKey?: string,
    ) {
      const key = idempotencyKey ?? `profile:${expectedRevision}:${Date.now()}`;
      return required(
        (
          await api().PATCH('/auth/profile', {
            headers: { ...headers(token), 'Idempotency-Key': key },
            body: { displayName, expectedRevision },
          })
        ).data,
      ).data;
    },
    async requestPasswordChange(token: string, currentPassword: string) {
      const response = await api().POST('/auth/password-change-otp-requests', {
        headers: headers(token),
        body: { currentPassword },
      });
      return required(response.data).data;
    },
    async changePassword(token: string, challengeId: string, code: string, newPassword: string) {
      await api().POST('/auth/password-changes', {
        headers: headers(token),
        body: { challengeId, code, newPassword },
      });
    },
    async listSessions(token: string, cursor?: string, limit?: number) {
      const { data } = await api().GET('/auth/sessions', {
        headers: headers(token),
        params: { query: { ...(cursor ? { cursor } : {}), ...(limit ? { limit } : {}) } },
      });
      return required(data).data;
    },
    async revokeSession(token: string, sessionId: string) {
      await api().DELETE('/auth/sessions/{sessionId}', {
        headers: headers(token),
        params: { path: { sessionId } },
      });
    },
    async overview(token: string, cursor?: string) {
      const page = required(
        (
          await api().GET('/couple/bookings', {
            headers: headers(token),
            params: { query: { client: 'ANDROID', limit: 20, ...(cursor ? { cursor } : {}) } },
          })
        ).data,
      );
      return { ...page, data: Array.from(page.data, (item) => ({ ...item })) };
    },
  };
}
