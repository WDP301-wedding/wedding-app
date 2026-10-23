import type { PublicHallDetailView, PublicHallsView, PublicMenuPackagesView } from './catalog-api';

export type HallItem = PublicHallsView['items'][number] | PublicHallDetailView;
export type MenuItem = PublicMenuPackagesView['items'][number];

/** Mỗi bàn 10 khách (quy ước của nhà hàng Hỷ Yến). */
export const GUESTS_PER_TABLE = 10;

/** Số bàn = làm tròn LÊN (281 khách → 29 bàn). */
export function calculateTableCount(guests: number): number {
  if (!Number.isFinite(guests) || guests <= 0) return 0;
  return Math.ceil(guests / GUESTS_PER_TABLE);
}

/** Lọc sảnh phù hợp với số lượng khách, ưu tiên sảnh vừa vặn nhất. */
export function filterSuitableHalls<T extends { maxGuests: number }>(
  halls: readonly T[],
  guests: number,
): T[] {
  return halls
    .filter((hall) => hall.maxGuests >= guests)
    .sort((left, right) => left.maxGuests - right.maxGuests);
}

export type MenuEstimate = Readonly<{
  menu: MenuItem;
  tables: number;
  totalVnd: number;
}>;

/** Chi phí ước tính theo từng gói thực đơn = số bàn × đơn giá/bàn. */
export function calculateMenuEstimates(menus: readonly MenuItem[], guests: number): MenuEstimate[] {
  const tables = calculateTableCount(guests);
  return menus.map((menu) => ({
    menu,
    tables,
    totalVnd: tables * (menu.priceVndPerTable ?? 0),
  }));
}
