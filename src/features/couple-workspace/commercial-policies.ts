import type {
  CommercialAppendixView,
  CommercialContractView,
} from '@/features/payments-billing/billing-api';
import { tableCapacityMessage } from './policies';

export type PricedLine = CommercialContractView['revisions'][number]['document']['lines'][number];
export type LineInput = Pick<PricedLine, 'category' | 'sourceId' | 'sourceRevisionId' | 'quantity'>;
export type CatalogChoice = Omit<PricedLine, 'quantity' | 'lineTotalVnd'>;
export const lineKey = (line: Pick<LineInput, 'category' | 'sourceId'>) =>
  `${line.category}:${line.sourceId.toLowerCase()}`;

export type SelectionDifference = Readonly<{
  name: string;
  kind: 'added' | 'removed' | 'changed';
  fields: readonly string[];
}>;
export function selectionDifferences(
  submitted: readonly PricedLine[],
  contracted: readonly PricedLine[],
): readonly SelectionDifference[] {
  const changes: SelectionDifference[] = [];
  for (const before of submitted) {
    const after = contracted.find((line) => lineKey(line) === lineKey(before));
    if (!after) {
      changes.push({ name: before.name, kind: 'removed', fields: [] });
      continue;
    }
    const fields = [
      before.quantity !== after.quantity && 'số lượng',
      before.unitPriceVnd !== after.unitPriceVnd && 'đơn giá',
      before.name !== after.name && 'tên',
      before.description !== after.description && 'mô tả',
      before.unit !== after.unit && 'đơn vị',
      before.sourceRevisionId !== after.sourceRevisionId && 'phiên bản hạng mục',
    ].filter((field): field is string => typeof field === 'string');
    if (fields.length) changes.push({ name: after.name, kind: 'changed', fields });
  }
  for (const line of contracted)
    if (!submitted.some((before) => lineKey(before) === lineKey(line)))
      changes.push({ name: line.name, kind: 'added', fields: [] });
  return changes;
}
export const inputLine = ({
  category,
  sourceId,
  sourceRevisionId,
  quantity,
}: PricedLine): LineInput => ({ category, sourceId, sourceRevisionId, quantity });
export function effectiveAgreementLines(
  appendices: CommercialAppendixView,
  contracts: CommercialContractView,
): readonly PricedLine[] | null {
  const id = appendices.effectiveRevisionId;
  if (!id) return null;
  return (
    appendices.revisions.find((item) => item.revisionId === id)?.document.afterLines ??
    contracts.revisions.find((item) => item.revisionId === id)?.document.lines ??
    null
  );
}
export function selectionValidation(
  lines: readonly LineInput[],
  catalog: readonly CatalogChoice[],
  options: {
    planningHeadcount: number;
    maximumTables?: number | undefined;
    hallMaxGuests: number;
    frozen?: readonly PricedLine[] | undefined;
    reason?: string | undefined;
  },
): string | null {
  const appendix = options.frozen !== undefined;
  if (!lines.some((line) => line.category === 'MENU'))
    return 'Cần chọn ít nhất một thực đơn và nhập số bàn lớn hơn 0.';
  if (lines.length > 50) return 'Mỗi lựa chọn tối đa 50 hạng mục.';
  if (
    lines.some(
      (line) =>
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > (!appendix && line.category === 'MENU' ? 500 : 10000),
    )
  )
    return 'Số lượng phải là số nguyên dương, tối đa 500 bàn cho mỗi thực đơn hoặc 10.000 đơn vị dịch vụ.';
  const tables = lines
    .filter((line) => line.category === 'MENU')
    .reduce((sum, line) => sum + line.quantity, 0);
  if (appendix && tables > 500) return 'Tổng số bàn tối đa là 500.';
  const capacity = tableCapacityMessage(
    options.planningHeadcount,
    tables,
    options.maximumTables,
    options.hallMaxGuests,
  );
  if (capacity) return capacity;
  if (appendix && !options.reason?.trim()) return 'Hãy nhập lý do thay đổi.';
  if (appendix && options.reason!.trim().length > 500) return 'Lý do thay đổi tối đa 500 ký tự.';
  for (const line of lines) {
    const before = options.frozen?.find((item) => lineKey(item) === lineKey(line));
    if (before?.sourceRevisionId === line.sourceRevisionId && before.quantity === line.quantity)
      continue;
    const choice = catalog.find((item) => lineKey(item) === lineKey(line));
    if (!choice)
      return line.category === 'PRINT' && !appendix
        ? 'Thiệp in đã chuyển sang đặt sau cọc. Hãy bỏ mục thiệp in cũ trước khi lưu.'
        : 'Hạng mục đã ngừng bán chỉ có thể giữ nguyên hoặc bỏ. Hãy chọn hạng mục thay thế.';
    if (choice.sourceRevisionId !== line.sourceRevisionId)
      return 'Hạng mục đã đổi phiên bản giá. Chọn “Dùng giá hiện hành” để thay đổi số lượng.';
  }
  return null;
}
