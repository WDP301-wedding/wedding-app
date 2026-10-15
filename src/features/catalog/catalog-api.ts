import { createApiClient, type ApiClient } from '@/lib/api/client';
import type { operations } from '@/lib/api/generated/schema';

export type PublicDishesView =
  operations['listPublicDishes']['responses'][200]['content']['application/json']['data'];
export type PublicHallsView =
  operations['listPublicHalls']['responses'][200]['content']['application/json']['data'];
export type PublicHallDetailView =
  operations['getPublicHall']['responses'][200]['content']['application/json']['data'];
export type PublicMenuPackagesView =
  operations['listPublicMenuPackages']['responses'][200]['content']['application/json']['data'];
export type PublicRestaurantView =
  operations['getPublicRestaurant']['responses'][200]['content']['application/json']['data'];

export interface CatalogGateway {
  listDishes(
    this: void,
    query?: {
      categoryLabel?: string;
      cursor?: string;
      limit?: number;
      search?: string;
    },
  ): Promise<PublicDishesView>;
  listHalls(this: void, query?: { cursor?: string; limit?: number }): Promise<PublicHallsView>;
  getHall(this: void, hallId: string): Promise<PublicHallDetailView>;
  listMenuPackages(
    this: void,
    query?: { cursor?: string; limit?: number },
  ): Promise<PublicMenuPackagesView>;
  getRestaurant(this: void): Promise<PublicRestaurantView>;
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Thiếu dữ liệu danh mục.');
  return value;
}

export function createCatalogGateway(client?: ApiClient): CatalogGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());

  return {
    async listDishes(query) {
      const { data, error } = await api().GET('/catalog/dishes', {
        params: query ? { query } : {},
      });
      if (error !== undefined) throw new Error('Không thể tải danh mục món ăn.');
      return required(data).data as unknown as PublicDishesView;
    },

    async listHalls(query) {
      const { data, error } = await api().GET('/catalog/halls', {
        params: query ? { query } : {},
      });
      if (error !== undefined) throw new Error('Không thể tải danh mục sảnh cưới.');
      return required(data).data as unknown as PublicHallsView;
    },

    async getHall(hallId) {
      const { data, error } = await api().GET('/catalog/halls/{hallId}', {
        params: { path: { hallId } },
      });
      if (error !== undefined) throw new Error('Không thể tải thông tin chi tiết sảnh cưới.');
      return required(data).data as unknown as PublicHallDetailView;
    },

    async listMenuPackages(query) {
      const { data, error } = await api().GET('/catalog/menu-packages', {
        params: query ? { query } : {},
      });
      if (error !== undefined) throw new Error('Không thể tải danh mục gói thực đơn.');
      return required(data).data as unknown as PublicMenuPackagesView;
    },

    async getRestaurant() {
      const { data, error } = await api().GET('/catalog/restaurant');
      if (error !== undefined) throw new Error('Không thể tải thông tin nhà hàng.');
      return required(data).data as unknown as PublicRestaurantView;
    },
  };
}
