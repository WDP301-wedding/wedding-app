import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { operations } from '@/lib/api/generated/schema';
import type { CatalogChoice } from './commercial-policies';

type Body<K extends keyof operations> = operations[K] extends {
  requestBody: { content: { 'application/json': infer B } };
}
  ? B
  : never;
const dataOf = <T>(response: { readonly data: T } | undefined): T => {
  if (!response)
    throw new Error('Chưa nhận được dữ liệu. Hãy tải lại và giữ nguyên yêu cầu khi thử lại.');
  return response.data;
};

export function createWorkspaceGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const params = (bookingId: string, key: string) => ({
    path: { bookingId },
    header: { 'Idempotency-Key': key },
  });
  return {
    async invitations(token: string, bookingId: string) {
      let page = dataOf(
        (
          await api().GET('/bookings/{bookingId}/invitations', {
            headers: auth(token),
            params: { path: { bookingId }, query: { limit: 100 } },
            cache: 'no-store',
          })
        ).data,
      );
      const items = Array.from(page.items);
      const seen = new Set<string>();
      while (page.nextCursor) {
        if (seen.has(page.nextCursor)) throw new Error('Chưa tải được đầy đủ danh sách thiệp.');
        seen.add(page.nextCursor);
        page = dataOf(
          (
            await api().GET('/bookings/{bookingId}/invitations', {
              headers: auth(token),
              params: { path: { bookingId }, query: { limit: 100, cursor: page.nextCursor } },
              cache: 'no-store',
            })
          ).data,
        );
        items.push(...Array.from(page.items));
      }
      return items;
    },
    async printRequests(token: string, bookingId: string) {
      return Array.from(
        dataOf(
          (
            await api().GET('/bookings/{bookingId}/print-requests', {
              headers: auth(token),
              params: { path: { bookingId } },
              cache: 'no-store',
            })
          ).data,
        ).items,
      );
    },
    async selectionChoices(token: string): Promise<readonly CatalogChoice[]> {
      const menus: CatalogChoice[] = [];
      let cursor: string | undefined;
      const seen = new Set<string>();
      do {
        const page = dataOf(
          (
            await api().GET('/catalog/menu-packages', {
              params: { query: { limit: 100, ...(cursor ? { cursor } : {}) } },
            })
          ).data,
        );
        for (const menu of Array.from(page.items))
          menus.push({
            category: 'MENU',
            sourceId: menu.id,
            sourceRevisionId: menu.versionId,
            name: menu.name,
            description: menu.description,
            unit: 'table',
            unitPriceVnd: menu.priceVndPerTable,
          });
        cursor = page.nextCursor ?? undefined;
        if (cursor && seen.has(cursor)) throw new Error('Chưa tải được đầy đủ danh mục thực đơn.');
        if (cursor) seen.add(cursor);
      } while (cursor);
      const services = dataOf(
        (await api().GET('/catalog/services', { headers: auth(token) })).data,
      );
      return [
        ...menus,
        ...Array.from(services.items)
          .filter((item) => item.active)
          .map((item) => ({
            category: 'SERVICE' as const,
            sourceId: item.serviceId,
            sourceRevisionId: item.sourceRevisionId,
            name: item.name,
            description: item.description,
            unit: item.unit,
            unitPriceVnd: item.unitPriceVnd,
          })),
      ];
    },
    async activeAttempts(token: string, bookingId: string) {
      return dataOf(
        (
          await api().GET('/bookings/{bookingId}/payments/active', {
            headers: auth(token),
            params: { path: { bookingId } },
            cache: 'no-store',
          })
        ).data,
      );
    },
    async attempt(token: string, bookingId: string, attemptId: string, reconcile = false) {
      return dataOf(
        (
          await api().GET('/bookings/{bookingId}/payments/{attemptId}', {
            headers: auth(token),
            params: {
              path: { bookingId, attemptId },
              ...(reconcile ? {} : { query: { reconcile: 'false' as const } }),
            },
            cache: 'no-store',
          })
        ).data,
      );
    },
    async publication(token: string, bookingId: string, designId: string) {
      return dataOf(
        (
          await api().GET('/bookings/{bookingId}/invitations/{designId}/publication', {
            headers: auth(token),
            params: { path: { bookingId, designId } },
            cache: 'no-store',
          })
        ).data,
      );
    },
    async preparationGroups(token: string, bookingId: string) {
      const headers = auth(token);
      const [groups, plan] = await Promise.all([
        api().GET('/bookings/{bookingId}/guest-groups', {
          headers,
          params: { path: { bookingId } },
          cache: 'no-store',
        }),
        api().GET('/bookings/{bookingId}/guest-plan', {
          headers,
          params: { path: { bookingId } },
          cache: 'no-store',
        }),
      ]);
      return { groups: Array.from(dataOf(groups.data)), plan: dataOf(plan.data) };
    },
    async createGroup(
      token: string,
      bookingId: string,
      body: Body<'createGuestGroup'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/guest-groups', {
            headers: auth(token),
            params: params(bookingId, key),
            body,
          })
        ).data,
      );
    },
    async updateGroup(
      token: string,
      bookingId: string,
      groupId: string,
      body: Body<'updateGuestGroup'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().PATCH('/bookings/{bookingId}/guest-groups/{groupId}', {
            headers: auth(token),
            params: { path: { bookingId, groupId }, header: { 'Idempotency-Key': key } },
            body,
          })
        ).data,
      );
    },
    async decideExpenses(
      token: string,
      bookingId: string,
      body: Body<'decideIncidentalExpenses'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/incidental-expenses/decisions', {
            headers: auth(token),
            params: params(bookingId, key),
            body,
          })
        ).data,
      );
    },
    async requestContractChanges(
      token: string,
      bookingId: string,
      revisionId: string,
      body: Body<'requestCommercialContractChanges'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/contracts/{revisionId}/change-requests', {
            headers: auth(token),
            params: { path: { bookingId, revisionId }, header: { 'Idempotency-Key': key } },
            body,
          })
        ).data,
      );
    },
    async cancelAppendix(
      token: string,
      bookingId: string,
      revisionId: string,
      body: Body<'cancelCommercialAppendix'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/contract-appendices/{revisionId}/cancellations', {
            headers: auth(token),
            params: { path: { bookingId, revisionId }, header: { 'Idempotency-Key': key } },
            body,
          })
        ).data,
      );
    },
    async previewSelection(
      token: string,
      bookingId: string,
      body: Body<'previewCustomerCommercialSelections'>,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/contract-selections/preview', {
            headers: auth(token),
            params: { path: { bookingId } },
            body,
          })
        ).data,
      );
    },
    async saveSelection(
      token: string,
      bookingId: string,
      body: Body<'saveCustomerCommercialSelections'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/contract-selections/drafts', {
            headers: auth(token),
            params: params(bookingId, key),
            body,
          })
        ).data,
      );
    },
    async submitSelection(
      token: string,
      bookingId: string,
      body: Body<'submitCustomerCommercialSelections'>,
      key: string,
    ) {
      return dataOf(
        (
          await api().POST('/bookings/{bookingId}/contract-selections/submissions', {
            headers: auth(token),
            params: params(bookingId, key),
            body,
          })
        ).data,
      );
    },
    async updateAlias(token: string, bookingId: string, body: Body<'updateBookingAlias'>) {
      return dataOf(
        (
          await api().PATCH('/couple/bookings/{bookingId}/alias', {
            headers: auth(token),
            params: { path: { bookingId } },
            body,
          })
        ).data,
      );
    },
  };
}
