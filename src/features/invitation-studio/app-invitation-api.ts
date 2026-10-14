import { createApiClient, ApiClientError, type ApiClient } from '../../lib/api/client';
import type { operations } from '../../lib/api/generated/schema';
import { readPublicEnv } from '../../lib/env';

export type AppDesignView =
  operations['getWeddingInvitation']['responses'][200]['content']['application/json']['data'];
export type AppPrintOrderView =
  operations['getPrintOrder']['responses'][200]['content']['application/json']['data'];
export type AppPublicInvitationView =
  operations['getPublicInvitation']['responses'][200]['content']['application/json']['data'];
export type AppPublicationView =
  operations['publishWeddingInvitation']['responses'][200]['content']['application/json']['data'];

export type AppTextFields = {
  brideName?: string;
  groomName?: string;
  greeting?: string;
  message?: string;
  footer?: string;
};

export interface AppInvitationGateway {
  listDesigns(
    this: void,
    accessToken: string,
    bookingId: string,
  ): Promise<readonly AppDesignView[]>;
  getDesign(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
  ): Promise<AppDesignView>;
  quickEditTextFields(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
    expectedRevision: number,
    textFields: AppTextFields,
    idempotencyKey?: string,
  ): Promise<AppDesignView>;
  publishInvitation(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
    expectedRevision: number,
    designRevisionId: string,
    expectedPublicationRevision?: number,
    idempotencyKey?: string,
  ): Promise<AppPublicationView>;
  unpublishInvitation(
    this: void,
    accessToken: string,
    bookingId: string,
    designId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<void>;
  listPrintOrders(
    this: void,
    accessToken: string,
    bookingId: string,
  ): Promise<readonly AppPrintOrderView[]>;
  approvePrintOrder(
    this: void,
    accessToken: string,
    bookingId: string,
    orderId: string,
    commercialRevisionId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<AppPrintOrderView>;
  approveReplacementProposal(
    this: void,
    accessToken: string,
    bookingId: string,
    orderId: string,
    commercialRevisionId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<AppPrintOrderView>;
  cancelApprovedPrintOrder(
    this: void,
    accessToken: string,
    bookingId: string,
    orderId: string,
    expectedRevision: number,
    idempotencyKey?: string,
  ): Promise<AppPrintOrderView>;
  getPublicInvitation(this: void, slug: string): Promise<AppPublicInvitationView>;
  getRestaurantCatalog(this: void): Promise<{ displayName: string; address?: string }>;
  uploadWeddingMedia(
    this: void,
    accessToken: string,
    bookingId: string,
    expectedRevision: number,
    file: { uri: string; name: string; type: string } | Blob,
    altText?: string,
    idempotencyKey?: string,
  ): Promise<{ mediaAssetId: string; previewPath: string }>;
}

function intent(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
}

export function createAppInvitationGateway(client?: ApiClient): AppInvitationGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  return {
    async listDesigns(accessToken, bookingId): Promise<readonly AppDesignView[]> {
      const { data, error } = await api().GET('/bookings/{bookingId}/invitations', {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined) throw new Error('Không thể tải danh sách thiệp cưới.');
      return required(data).data.items as unknown as readonly AppDesignView[];
    },

    async getDesign(accessToken, bookingId, designId): Promise<AppDesignView> {
      const { data, error } = await api().GET('/bookings/{bookingId}/invitations/{designId}', {
        headers: headers(accessToken),
        params: { path: { bookingId, designId } },
      });
      if (error !== undefined) throw new Error('Không thể tải chi tiết thiệp cưới.');
      return required(data).data as unknown as AppDesignView;
    },

    async quickEditTextFields(
      accessToken,
      bookingId,
      designId,
      expectedRevision,
      textFields,
      idempotencyKey,
    ): Promise<AppDesignView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/invitations/{designId}/revisions',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { 'Idempotency-Key': idempotencyKey ?? intent('app-quick-edit') },
          },
          body: { expectedRevision, textFields },
        },
      );
      if (error !== undefined) throw new Error('Không thể cập nhật nội dung thiệp cưới.');
      return required(data).data as unknown as AppDesignView;
    },

    async publishInvitation(
      accessToken,
      bookingId,
      designId,
      expectedRevision,
      designRevisionId,
      expectedPublicationRevision,
      idempotencyKey,
    ): Promise<AppPublicationView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/invitations/{designId}/publication',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { 'Idempotency-Key': idempotencyKey ?? intent('app-publish') },
          },
          body: {
            expectedRevision,
            designRevisionId,
            expectedPublicationRevision: expectedPublicationRevision ?? 0,
          },
        },
      );
      if (error !== undefined) throw new Error('Không thể xuất bản thiệp cưới.');
      return required(data).data as unknown as AppPublicationView;
    },

    async unpublishInvitation(
      accessToken,
      bookingId,
      designId,
      expectedRevision,
      idempotencyKey,
    ): Promise<void> {
      const { error } = await api().DELETE(
        '/bookings/{bookingId}/invitations/{designId}/publication',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { 'Idempotency-Key': idempotencyKey ?? intent('app-unpublish') },
          },
          body: { expectedRevision },
        },
      );
      if (error !== undefined) throw new Error('Không thể thu hồi xuất bản thiệp cưới.');
    },

    async listPrintOrders(accessToken, bookingId): Promise<readonly AppPrintOrderView[]> {
      const { data, error } = await api().GET('/bookings/{bookingId}/print-orders', {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined) throw new Error('Không thể tải danh sách đơn in.');
      return required(data).data.items as unknown as readonly AppPrintOrderView[];
    },

    async approvePrintOrder(
      accessToken,
      bookingId,
      orderId,
      commercialRevisionId,
      expectedRevision,
      idempotencyKey,
    ): Promise<AppPrintOrderView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/approval',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': idempotencyKey ?? intent('app-print-approval') },
          },
          body: { commercialRevisionId, expectedRevision },
        },
      );
      if (error !== undefined) throw new Error('Không thể phê duyệt đơn in.');
      return required(data).data as unknown as AppPrintOrderView;
    },

    async approveReplacementProposal(
      accessToken,
      bookingId,
      orderId,
      commercialRevisionId,
      expectedRevision,
      idempotencyKey,
    ): Promise<AppPrintOrderView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/replacement-approvals',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': idempotencyKey ?? intent('app-print-replacement') },
          },
          body: { commercialRevisionId, expectedRevision },
        },
      );
      if (error !== undefined) throw new Error('Không thể xác nhận báo giá thay thế.');
      return required(data).data as unknown as AppPrintOrderView;
    },

    async cancelApprovedPrintOrder(
      accessToken,
      bookingId,
      orderId,
      expectedRevision,
      idempotencyKey,
    ): Promise<AppPrintOrderView> {
      const { data, error } = await api().POST(
        '/bookings/{bookingId}/print-orders/{orderId}/cancellation',
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, orderId },
            header: { 'Idempotency-Key': idempotencyKey ?? intent('app-print-cancel') },
          },
          body: { expectedRevision },
        },
      );
      if (error !== undefined) throw new Error('Không thể hủy đơn in thiệp.');
      return required(data).data as unknown as AppPrintOrderView;
    },

    async getPublicInvitation(slug): Promise<AppPublicInvitationView> {
      const { data, error } = await api().GET('/public/invitations/{slug}', {
        params: { path: { slug } },
      });
      if (error !== undefined) throw new Error('Thiệp cưới không tồn tại hoặc đã bị gỡ bỏ.');
      return required(data).data as unknown as AppPublicInvitationView;
    },

    async getRestaurantCatalog(): Promise<{ displayName: string; address?: string }> {
      try {
        const { data, error } = await api().GET('/catalog/restaurant');
        if (error !== undefined || !data?.data) {
          return { displayName: 'Chưa cung cấp' };
        }
        return {
          displayName: data.data.displayName || 'Chưa cung cấp',
          address: data.data.address,
        };
      } catch {
        return { displayName: 'Chưa cung cấp' };
      }
    },

    async uploadWeddingMedia(
      accessToken,
      bookingId,
      expectedRevision,
      file,
      altText,
      idempotencyKey,
    ): Promise<{ mediaAssetId: string; previewPath: string }> {
      const formData = new FormData();
      formData.append('expectedRevision', String(expectedRevision));
      if (altText) formData.append('altText', altText);
      // @ts-expect-error React Native / Web FormData file append
      formData.append('file', file);

      const baseUrl = readPublicEnv().EXPO_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/bookings/${bookingId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Idempotency-Key': idempotencyKey ?? intent('app-media-upload'),
        },
        body: formData,
      });

      if (!res.ok) {
        let errMessage = 'Không thể tải ảnh lên kho ảnh tiệc.';
        let code = '';
        try {
          const errorJson = (await res.json()) as { error?: { message?: string; code?: string } };
          if (errorJson.error?.message) errMessage = errorJson.error.message;
          if (errorJson.error?.code) code = errorJson.error.code;
        } catch {
          // Response body might not be JSON
        }
        throw new ApiClientError({
          kind: 'api',
          code: code || 'HTTP_ERROR',
          message: errMessage,
          requestId: res.headers.get('x-request-id') || 'media-upload',
          status: res.status,
        });
      }
      const json = (await res.json()) as { data: { mediaAssetId: string; previewPath: string } };
      return json.data;
    },
  };
}
