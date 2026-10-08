import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { components } from '@/lib/api/generated/schema';
export type Profile = components['schemas']['ProfileResponse']['data'];
export type Overview = components['schemas']['CoupleOverviewResponse'];
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
    async updateProfile(token: string, displayName: string, expectedRevision: number) {
      return required(
        (
          await api().PATCH('/auth/profile', {
            headers: headers(token),
            body: { displayName, expectedRevision },
          })
        ).data,
      ).data;
    },
    async changePassword(token: string, currentPassword: string, newPassword: string) {
      await api().POST('/auth/password-changes', {
        headers: headers(token),
        body: { currentPassword, newPassword },
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
