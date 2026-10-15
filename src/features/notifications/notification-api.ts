import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { operations } from '@/lib/api/generated/schema';
import { createDeterministicIdempotencyKey } from '@/lib/idempotency';

export type InboxView =
  operations['listNotificationInbox']['responses'][200]['content']['application/json']['data'];
export type InboxItem = InboxView['items'][number];
export type NotificationPreferencesView =
  operations['getNotificationPreferences']['responses'][200]['content']['application/json']['data'];
export type AndroidInstallationView =
  operations['listAndroidNotificationInstallations']['responses'][200]['content']['application/json']['data'];
export type AndroidInstallationItem = AndroidInstallationView[number];

export interface NotificationGateway {
  listInbox(
    this: void,
    accessToken: string,
    query?: { cursor?: string; limit?: number },
  ): Promise<InboxView>;
  countUnread(this: void, accessToken: string): Promise<number>;
  readNotification(
    this: void,
    accessToken: string,
    id: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<void>;
  readAllNotifications(
    this: void,
    accessToken: string,
    throughCreatedAt: string,
    idempotencyKey?: string,
  ): Promise<void>;
  getPreferences(this: void, accessToken: string): Promise<NotificationPreferencesView>;
  updatePreferences(
    this: void,
    accessToken: string,
    body: { expectedRevision: number; reminderEmail?: boolean; reminderPush?: boolean },
    idempotencyKey?: string,
  ): Promise<NotificationPreferencesView>;
  listInstallations(this: void, accessToken: string): Promise<AndroidInstallationView>;
  registerInstallation(
    this: void,
    accessToken: string,
    body: { expectedRevision: number; installationId: string; pushToken: string },
    idempotencyKey?: string,
  ): Promise<void>;
  revokeInstallation(
    this: void,
    accessToken: string,
    id: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<void>;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Thiếu dữ liệu thông báo.');
  return value;
}

export function createNotificationGateway(client?: ApiClient): NotificationGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  return {
    async listInbox(accessToken, query) {
      const { data, error } = await api().GET('/notifications/inbox', {
        headers: headers(accessToken),
        ...(query ? { params: { query } } : {}),
      });
      if (error !== undefined) throw new Error('Không thể tải hộp thư thông báo.');
      return required(data).data as unknown as InboxView;
    },

    async countUnread(accessToken) {
      const { data, error } = await api().GET('/notifications/unread-count', {
        headers: headers(accessToken),
      });
      if (error !== undefined) throw new Error('Không thể tải số thông báo chưa đọc.');
      return (required(data).data as unknown as { count: number }).count;
    },

    async readNotification(accessToken, id, expectedRevision, idempotencyKey) {
      const { error } = await api().POST('/notifications/inbox/{id}/read', {
        headers: headers(accessToken),
        params: {
          path: { id },
          header: { 'Idempotency-Key': idempotencyKey ?? `read:${id}:${expectedRevision}` },
        },
        body: { expectedRevision },
      });
      if (error !== undefined) throw new Error('Không thể đánh dấu thông báo đã đọc.');
    },

    async readAllNotifications(accessToken, throughCreatedAt, idempotencyKey) {
      const { error } = await api().POST('/notifications/inbox/read-all', {
        headers: headers(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey ?? `read-all:${throughCreatedAt}` },
        },
        body: { throughCreatedAt },
      });
      if (error !== undefined) throw new Error('Không thể đánh dấu tất cả thông báo đã đọc.');
    },

    async getPreferences(accessToken) {
      const { data, error } = await api().GET('/notifications/preferences', {
        headers: headers(accessToken),
      });
      if (error !== undefined) throw new Error('Không thể tải tùy chọn thông báo.');
      return required(data).data as unknown as NotificationPreferencesView;
    },

    async updatePreferences(accessToken, body, idempotencyKey) {
      const { data, error } = await api().PATCH('/notifications/preferences', {
        headers: headers(accessToken),
        params: {
          header: {
            'Idempotency-Key':
              idempotencyKey ??
              createDeterministicIdempotencyKey('notif-pref', 'account', body.expectedRevision, body),
          },
        },
        body,
      });
      if (error !== undefined) throw new Error('Không thể cập nhật tùy chọn thông báo.');
      return required(data).data as unknown as NotificationPreferencesView;
    },

    async listInstallations(accessToken) {
      const { data, error } = await api().GET('/notifications/android-installations', {
        headers: headers(accessToken),
      });
      if (error !== undefined) throw new Error('Không thể tải danh sách thiết bị Android đã đăng ký.');
      return required(data).data as unknown as AndroidInstallationView;
    },

    async registerInstallation(accessToken, body, idempotencyKey) {
      const { error } = await api().POST('/notifications/android-installations', {
        headers: headers(accessToken),
        params: {
          header: {
            'Idempotency-Key':
              idempotencyKey ??
              createDeterministicIdempotencyKey(
                'install',
                body.installationId,
                body.expectedRevision,
                body,
              ),
          },
        },
        body,
      });
      if (error !== undefined) throw new Error('Không thể đăng ký thiết bị Android nhận thông báo.');
    },

    async revokeInstallation(accessToken, id, expectedRevision, idempotencyKey) {
      const { error } = await api().DELETE('/notifications/android-installations/{id}', {
        headers: headers(accessToken),
        params: {
          path: { id },
          header: {
            'Idempotency-Key':
              idempotencyKey ??
              createDeterministicIdempotencyKey('revoke-inst', id, expectedRevision),
          },
        },
        body: { expectedRevision },
      });
      if (error !== undefined) throw new Error('Không thể thu hồi thiết bị Android.');
    },
  };
}
