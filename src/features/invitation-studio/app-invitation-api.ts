import { createApiClient, type ApiClient } from "../../lib/api/client";
import type { operations } from "../../lib/api/generated/schema";

export type AppDesignView =
  operations["getWeddingInvitation"]["responses"][200]["content"]["application/json"]["data"];
export type AppPrintOrderView =
  operations["getPrintOrder"]["responses"][200]["content"]["application/json"]["data"];
export type AppPublicInvitationView =
  operations["getPublicInvitation"]["responses"][200]["content"]["application/json"]["data"];

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
  ): Promise<AppDesignView>;
  listPrintOrders(
    this: void,
    accessToken: string,
    bookingId: string,
  ): Promise<readonly AppPrintOrderView[]>;
  getPublicInvitation(
    this: void,
    slug: string,
  ): Promise<AppPublicInvitationView>;
}

function intent(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Thiếu dữ liệu phản hồi.");
  return value;
}

export function createAppInvitationGateway(client?: ApiClient): AppInvitationGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });

  return {
    async listDesigns(accessToken, bookingId): Promise<readonly AppDesignView[]> {
      const { data, error } = await api().GET("/bookings/{bookingId}/invitations", {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined) throw new Error("Không thể tải danh sách thiệp cưới.");
      return required(data).data.items as unknown as readonly AppDesignView[];
    },

    async getDesign(accessToken, bookingId, designId): Promise<AppDesignView> {
      const { data, error } = await api().GET("/bookings/{bookingId}/invitations/{designId}", {
        headers: headers(accessToken),
        params: { path: { bookingId, designId } },
      });
      if (error !== undefined) throw new Error("Không thể tải chi tiết thiệp cưới.");
      return required(data).data as unknown as AppDesignView;
    },

    async quickEditTextFields(accessToken, bookingId, designId, expectedRevision, textFields): Promise<AppDesignView> {
      const { data, error } = await api().POST(
        "/bookings/{bookingId}/invitations/{designId}/revisions",
        {
          headers: headers(accessToken),
          params: {
            path: { bookingId, designId },
            header: { "Idempotency-Key": intent("app-quick-edit") },
          },
          body: { expectedRevision, textFields },
        },
      );
      if (error !== undefined) throw new Error("Không thể cập nhật nội dung thiệp cưới.");
      return required(data).data as unknown as AppDesignView;
    },

    async listPrintOrders(accessToken, bookingId): Promise<readonly AppPrintOrderView[]> {
      const { data, error } = await api().GET("/bookings/{bookingId}/print-orders", {
        headers: headers(accessToken),
        params: { path: { bookingId } },
      });
      if (error !== undefined) throw new Error("Không thể tải danh sách đơn in.");
      return required(data).data.items as unknown as readonly AppPrintOrderView[];
    },

    async getPublicInvitation(slug): Promise<AppPublicInvitationView> {
      const { data, error } = await api().GET("/public/invitations/{slug}", {
        params: { path: { slug } },
      });
      if (error !== undefined) throw new Error("Thiệp cưới không tồn tại hoặc đã bị gỡ bỏ.");
      return required(data).data as unknown as AppPublicInvitationView;
    },
  };
}
