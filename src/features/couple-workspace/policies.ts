/** Display/admission policies translated from PRM-app; server facts remain authoritative. */
import type { BillingView } from '@/features/payments-billing/billing-api';
export const phaseLabels: Readonly<Record<string, string>> = {
  DRAFT: 'Đang dự thảo',
  AWAITING_DEPOSIT: 'Chờ đặt cọc',
  CONFIRMED: 'Đã đặt cọc',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã huỷ',
};
export const phaseLabel = (phase: string) => phaseLabels[phase] ?? 'Đang cập nhật';
export const eventTypeLabel = (eventType: string) =>
  (
    ({
      ENGAGEMENT: 'Lễ ăn hỏi',
      RECEPTION: 'Tiệc báo hỷ',
      ANNIVERSARY: 'Kỷ niệm',
      OTHER: 'Sự kiện khác',
    }) as Readonly<Record<string, string>>
  )[eventType] ?? 'Tiệc cưới';
export const shiftLabel = (code: string) =>
  (({ LUNCH: 'Ca trưa', DINNER: 'Ca tối' }) as Readonly<Record<string, string>>)[code] ?? code;
export function bookingDisplayName(booking: {
  alias?: string | null;
  brideName?: string | null;
  groomName?: string | null;
  eventType: string;
  hallName: string;
}): string {
  if (booking.alias?.trim()) return booking.alias.trim();
  if (booking.brideName != null && booking.groomName != null)
    return `${eventTypeLabel(booking.eventType)} · ${booking.brideName} & ${booking.groomName}`;
  return booking.eventType !== 'WEDDING'
    ? `${eventTypeLabel(booking.eventType)} · ${booking.hallName}`
    : booking.hallName;
}
export const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
export const closed = (phase: string) => phase === 'COMPLETED' || phase === 'CANCELLED';
export function checkedCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'sandbox.vnpayment.vn' ||
    (url.port !== '' && url.port !== '443') ||
    url.pathname !== '/paymentv2/vpcpay.html' ||
    url.username ||
    url.password
  )
    throw new Error('Đường dẫn VNPay không hợp lệ. Giữ nguyên yêu cầu và liên hệ nhà hàng.');
  return url.href;
}
export function vietnamToday(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function journeyIndex(phase: string, eventDate: string, now = new Date()): number {
  switch (phase) {
    case 'CANCELLED':
      return -1;
    case 'AWAITING_DEPOSIT':
      return 2;
    case 'COMPLETED':
      return 5;
    case 'CONFIRMED':
      return vietnamToday(now) >= eventDate ? 4 : 3;
    default:
      return 1;
  }
}
export function defaultBooking<T extends { phase: string; eventDate: string }>(
  bookings: readonly T[],
): T | null {
  return (
    bookings
      .filter((b) => !closed(b.phase))
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0] ??
    bookings[0] ??
    null
  );
}
export function tableCapacityMessage(
  headcount: number,
  tables: number,
  maximumTables?: number | null,
  hallMaxGuests = 10000,
): string | null {
  if (headcount > hallMaxGuests) return `Số khách vượt sức chứa ${hallMaxGuests} khách của sảnh.`;
  if (headcount > tables * 10)
    return `${headcount} khách cần tối thiểu ${Math.ceil(headcount / 10)} bàn (tối đa 10 người/bàn). Đang chọn ${tables} bàn.`;
  if (maximumTables === 0) return 'Sảnh chưa có sơ đồ đã xuất bản để bố trí bàn.';
  if (maximumTables != null && tables > maximumTables)
    return `Đang chọn ${tables} bàn, vượt giới hạn ${maximumTables} bàn của sơ đồ sảnh.`;
  return null;
}
export function depositPercentage(
  snapshot: Readonly<Record<string, unknown>>,
  key = 'depositPercentage',
): number {
  if (!Object.hasOwn(snapshot, key)) return 30;
  const value = snapshot[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 10 || value > 100)
    throw new Error('Tỷ lệ đặt cọc không hợp lệ.');
  return value;
}
const balanceReasons: Readonly<Record<string, string>> = {
  EXPENSE_APPROVAL_REQUIRED:
    'Chi phí phát sinh hoặc điều chỉnh đang chờ hai bên duyệt và nhà hàng chốt hóa đơn.',
  INVOICE_FINALIZATION_REQUIRED:
    'Nhà hàng chưa chốt hoá đơn cuối. Bạn có thể thanh toán sau khi nhà hàng hoàn tất quyết toán.',
  PAYMENT_ATTEMPT_ACTIVE:
    'Đang có một giao dịch thanh toán chưa hoàn tất. Hãy kiểm tra giao dịch đó trước, không tạo giao dịch mới.',
  STALE_BILLING_REVISION:
    'Công nợ vừa thay đổi. Hãy tải lại để xem số liệu mới nhất trước khi thanh toán.',
  BILLING_BALANCE_LIMIT_EXCEEDED:
    'Không còn khoản nào phải thanh toán (bao gồm trường hợp hai bạn đã trả thừa).',
  BALANCE_NOT_ELIGIBLE:
    'Tiệc chưa ở trạng thái cho phép thanh toán phần còn lại. Hãy liên hệ nhà hàng nếu cần hỗ trợ.',
  FINANCIAL_SOURCE_CONFLICT:
    'Thông tin thanh toán cần nhà hàng kiểm tra lại. Hãy liên hệ nhà hàng.',
  PAYMENT_PROVIDER_AMOUNT_UNSUPPORTED:
    'Số tiền vượt giới hạn thanh toán trực tuyến hiện có. Hãy liên hệ nhà hàng để thanh toán.',
  PAYMENT_PROVIDER_UNAVAILABLE:
    'Thanh toán trực tuyến tạm thời chưa khả dụng. Hãy liên hệ nhà hàng.',
};
const blockedBalanceActions = new Set([
  'CONTACT_RESTAURANT',
  'NONE',
  'WAIT_FOR_FINAL_INVOICE',
  'CHECK_EXISTING_PAYMENT',
  'REFRESH_BILLING',
]);
export function balanceGate(
  phase: string | undefined,
  billingRevision: number,
  raw: unknown,
): Readonly<{ allowed: boolean; message: string }> {
  if (phase !== 'COMPLETED')
    return { allowed: false, message: 'Mở sau khi nhà hàng xác nhận tiệc đã tổ chức xong.' };
  if (
    raw &&
    typeof raw === 'object' &&
    'billingRevision' in raw &&
    Number.isSafeInteger(raw.billingRevision) &&
    Number(raw.billingRevision) >= 0 &&
    'canPay' in raw &&
    'nextAction' in raw &&
    'reasonCode' in raw
  ) {
    if (raw.canPay === true && raw.nextAction === 'PAY_BALANCE' && raw.reasonCode === null) {
      return raw.billingRevision === billingRevision
        ? { allowed: true, message: '' }
        : { allowed: false, message: balanceReasons.STALE_BILLING_REVISION! };
    }
    if (
      raw.canPay === false &&
      typeof raw.nextAction === 'string' &&
      blockedBalanceActions.has(raw.nextAction) &&
      typeof raw.reasonCode === 'string' &&
      balanceReasons[raw.reasonCode]
    )
      return { allowed: false, message: balanceReasons[raw.reasonCode]! };
  }
  return {
    allowed: false,
    message: 'Chưa kiểm tra được điều kiện thanh toán. Hãy tải lại công nợ.',
  };
}

export type SettlementStatus = 'unknown' | 'awaitingInvoice' | 'outstanding' | 'credit' | 'settled';
export const settlementLabels: Readonly<Record<SettlementStatus, string>> = {
  unknown: 'Kiểm tra quyết toán',
  awaitingInvoice: 'Chờ nhà hàng chốt hoá đơn',
  outstanding: 'Còn công nợ',
  credit: 'Còn tiền thanh toán thừa',
  settled: 'Đã tất toán',
};
export function settlementStatus(
  view: BillingView | null,
  invoiceTotal: number | null,
): SettlementStatus {
  const eligibility = view?.balancePaymentEligibility;
  if (!view || !eligibility || eligibility.billingRevision !== view.billingRevision)
    return 'unknown';
  if (
    eligibility.canPay
      ? eligibility.nextAction !== 'PAY_BALANCE' || eligibility.reasonCode !== null
      : !balanceReasons[eligibility.reasonCode] ||
        !blockedBalanceActions.has(eligibility.nextAction)
  )
    return 'unknown';
  if (
    eligibility.reasonCode === 'PAYMENT_ATTEMPT_ACTIVE' ||
    eligibility.reasonCode === 'FINANCIAL_SOURCE_CONFLICT'
  )
    return 'unknown';
  if (invoiceTotal === null) return 'awaitingInvoice';
  if (invoiceTotal !== view.totals.acceptedChargesVnd) return 'unknown';
  if (view.totals.outstandingVnd > 0) return 'outstanding';
  if (view.totals.creditVnd > 0) return 'credit';
  return view.totals.netPaidVnd === view.totals.acceptedChargesVnd ? 'settled' : 'unknown';
}
