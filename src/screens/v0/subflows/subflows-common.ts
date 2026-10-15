import {
  createCoupleBillingGateway,
  type CommercialContractView,
  type CommercialAppendixView,
  type IncidentalExpensesView,
  type CommercialInvoiceView,
  type GuestGroupView,
  type NamedGuestView,
} from '@/features/payments-billing/billing-api';
import type { AppPrintOrderView } from '@/features/invitation-studio/app-invitation-api';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const coupleBilling = createCoupleBillingGateway();

export function printStatusMeta(status: AppPrintOrderView['status']) {
  switch (status) {
    case 'REQUESTED':
      return { label: 'Chờ báo giá', tone: 'neutral' as const };
    case 'QUOTED':
      return { label: 'Đã có báo giá', tone: 'warm' as const };
    case 'APPROVED':
      return { label: 'Đã duyệt báo giá', tone: 'success' as const };
    case 'IN_PRODUCTION':
      return { label: 'Đang sản xuất', tone: 'warm' as const };
    case 'READY_FOR_HANDOVER':
      return { label: 'Sẵn sàng bàn giao', tone: 'success' as const };
    case 'HANDED_OVER':
      return { label: 'Đã bàn giao', tone: 'success' as const };
    case 'CANCELLED':
      return { label: 'Đã hủy đơn', tone: 'neutral' as const };
    default:
      return { label: status, tone: 'neutral' as const };
  }
}

export type {
  CommercialContractView,
  CommercialAppendixView,
  IncidentalExpensesView,
  CommercialInvoiceView,
  GuestGroupView,
  NamedGuestView,
};
