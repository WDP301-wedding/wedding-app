import { type NamedGuestView, type GuestGroupView } from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';

type FlowGateway = ReturnType<typeof createRestoredFlowsGateway>;

export type Guest = NamedGuestView['items'][number];
export type Group = GuestGroupView[number];
export type AttendanceSummary = Awaited<ReturnType<FlowGateway['attendanceSummary']>>;

export type GuestPlan = {
  readonly planningHeadcount: number;
  readonly revision: number;
  readonly sourceSequence?: number;
};

export const normalize = (v: string): string =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s.()-]/g, '');
  if (compact === '') return null;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  if (/^0\d{9,10}$/.test(compact)) return '+84' + compact.slice(1);
  if (/^84\d{9,10}$/.test(compact)) return '+' + compact;
  throw new Error('Số điện thoại không hợp lệ (ví dụ: 0901234567 hoặc +84901234567).');
}
