import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import {
  inputLine,
  lineKey,
  selectionValidation,
  type CatalogChoice,
  type LineInput,
  type PricedLine,
} from '@/features/couple-workspace/commercial-policies';
import { money } from '@/features/couple-workspace/policies';
import type { CommercialContractView } from '@/features/payments-billing/billing-api';
import { confirmModal } from '@/lib/confirm';
import {
  Action,
  commandKey,
  Feedback,
  Field,
  Notice,
  ReadState,
  Section,
  s,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createWorkspaceGateway();
const commercial = createRestoredFlowsGateway();
type Selection = NonNullable<CommercialContractView['customerSelection']>;
export function PricedLines({
  lines,
  total,
  label = 'Tổng cộng',
  showTotal = true,
}: {
  lines: readonly PricedLine[];
  total: number;
  label?: string;
  showTotal?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {lines.map((line, index) => (
        <View style={s.item} key={`${lineKey(line)}:${index}`}>
          <Text style={s.heading}>{line.name}</Text>
          {line.description && <Text style={s.muted}>{line.description}</Text>}
          <Text style={s.muted}>
            {line.quantity} {line.category === 'MENU' ? 'bàn' : line.unit} ×{' '}
            {money(line.unitPriceVnd)}
          </Text>
          <Text>{money(line.lineTotalVnd)}</Text>
        </View>
      ))}
      {showTotal && (
        <Text style={s.amount}>
          {label}: {money(total)}
        </Text>
      )}
    </View>
  );
}

export function CommercialEditor({
  session,
  booking,
  proposal,
  refresh,
  bookingRevision,
  baseLines,
  selection,
  predecessorRevisionId,
  onSaved,
  onReload,
  contextReady = true,
}: WorkspaceProps & {
  bookingRevision: number;
  baseLines: readonly PricedLine[];
  selection?: Selection | undefined;
  predecessorRevisionId?: string | undefined;
  onSaved?: (() => void) | undefined;
  onReload?: (() => void) | undefined;
}) {
  const appendix = predecessorRevisionId !== undefined;
  const [baseRevision] = useState(bookingRevision);
  const stale = baseRevision !== bookingRevision;
  const [lines, setLines] = useState<readonly LineInput[]>(() => baseLines.map(inputLine));
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<{ signature: string; selection: Selection } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const load = useCallback(
    () => session.authorize((token) => api.selectionChoices(token)),
    [session],
  );
  const catalog = useRead(load);
  const command = useCommand(refresh);
  const body = useMemo(() => ({ expectedRevision: baseRevision, lines }), [baseRevision, lines]);
  const signature = JSON.stringify(body);
  const validation = stale
    ? 'Thông tin tiệc đã thay đổi. Nội dung đang soạn được giữ nguyên; hãy tải lại trước khi lưu.'
    : !contextReady
      ? 'Hãy cập nhật thông tin tiệc trước khi lưu hoặc gửi duyệt.'
      : catalog.error
        ? 'Chưa tải được danh mục. Hãy tải lại thực đơn và dịch vụ.'
        : !catalog.data
          ? 'Đang tải thực đơn và dịch vụ.'
          : !proposal
            ? 'Chưa tải được giới hạn bàn. Hãy tải lại thông tin tiệc.'
            : selectionValidation(lines, catalog.data, {
                planningHeadcount: proposal.planningHeadcount,
                maximumTables: proposal.capacity?.maximumTables,
                hallMaxGuests: proposal.proposal.hall.maxGuests,
                ...(appendix ? { frozen: baseLines, reason } : {}),
              });
  const dirty =
    lines.length !== baseLines.length ||
    lines.some(
      (line) =>
        !baseLines.some(
          (old) =>
            lineKey(old) === lineKey(line) &&
            old.sourceRevisionId === line.sourceRevisionId &&
            old.quantity === line.quantity,
        ),
    );
  useEffect(() => {
    if (appendix || validation) return;
    let active = true;
    const timer = setTimeout(() => {
      setPreviewError(null);
      void session
        .authorize((token) => api.previewSelection(token, booking.bookingId, body))
        .then(
          (result) => {
            if (active) setPreview({ signature, selection: result.selection as Selection });
          },
          () => {
            if (active) setPreviewError('Chưa xem trước được giá. Hãy thử lại trước khi lưu.');
          },
        );
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session, booking.bookingId, body, signature, validation, appendix, previewNonce]);
  const choices = useMemo(() => {
    const byKey = new Map<string, CatalogChoice>(
      (catalog.data ?? []).map((item) => [lineKey(item), item]),
    );
    for (const line of baseLines)
      if (appendix || !byKey.has(lineKey(line))) byKey.set(lineKey(line), line);
    return Array.from(byKey.values());
  }, [catalog.data, baseLines, appendix]);
  const setQuantity = (choice: CatalogChoice, text: string) => {
    if (!/^\d*$/.test(text)) return;
    const quantity = text === '' ? 0 : Number(text);
    setLines((old) => {
      const previous = old.find((line) => lineKey(line) === lineKey(choice));
      return [
        ...old.filter((line) => lineKey(line) !== lineKey(choice)),
        ...(quantity > 0
          ? [
              {
                category: choice.category,
                sourceId: choice.sourceId,
                sourceRevisionId: previous?.sourceRevisionId ?? choice.sourceRevisionId,
                quantity,
              },
            ]
          : []),
      ];
    });
  };
  const priced =
    preview?.signature === signature
      ? preview.selection
      : !dirty && selection?.status === 'DRAFT'
        ? selection
        : null;
  const save = () => {
    if (validation || command.pending || (!appendix && !priced)) return;
    const payload = appendix
      ? { ...body, predecessorRevisionId: predecessorRevisionId!, reason: reason.trim() }
      : body;
    void command
      .run(
        async () => {
          if (appendix)
            await session.authorize((token) =>
              commercial.createAppendix(
                token,
                booking.bookingId,
                { ...body, predecessorRevisionId: predecessorRevisionId!, reason: reason.trim() },
                commandKey('appendix-draft', booking.bookingId, payload),
              ),
            );
          else
            await session.authorize((token) =>
              api.saveSelection(
                token,
                booking.bookingId,
                body,
                commandKey('selection-draft', booking.bookingId, body),
              ),
            );
        },
        appendix
          ? 'Đã lưu phụ lục nháp. Kiểm tra chênh lệch rồi gửi duyệt.'
          : 'Đã lưu lựa chọn nháp.',
      )
      .then((ok) => {
        if (ok) onSaved?.();
      });
  };
  return (
    <Section title={appendix ? 'Tạo phụ lục thay đổi' : 'Lựa chọn thực đơn & dịch vụ'}>
      <Notice>
        {appendix
          ? 'Hạng mục giữ nguyên giữ giá đã chốt. Đổi số lượng ở phiên bản giá cũ cần chọn rõ giá hiện hành. Nhà hàng tính chênh lệch, không thu thêm cọc.'
          : 'Lựa chọn giúp nhà hàng chuẩn bị hợp đồng. Gửi lựa chọn chưa phải là duyệt hợp đồng hay thanh toán.'}
      </Notice>
      <ReadState state={catalog} />
      <Feedback command={command} />
      {choices.map((choice) => {
        const line = lines.find((item) => lineKey(item) === lineKey(choice));
        const live = catalog.data?.find((item) => lineKey(item) === lineKey(choice));
        const stale = !!line && !!live && line.sourceRevisionId !== live.sourceRevisionId;
        return (
          <View key={lineKey(choice)} style={s.item}>
            <Text style={s.heading}>{choice.name}</Text>
            <Text style={s.muted}>{choice.description}</Text>
            <Text>
              {money(choice.unitPriceVnd)} / {choice.category === 'MENU' ? 'bàn' : choice.unit}
            </Text>
            {appendix && choice.category === 'PRINT' ? (
              <Text>
                {line?.quantity ?? 0} {choice.unit} · Giữ theo hợp đồng
              </Text>
            ) : (
              <Field
                label={`${choice.category === 'MENU' ? 'Số bàn' : 'Số lượng'} · ${choice.name}`}
                disabled={command.pending}
                value={String(line?.quantity ?? 0)}
                numeric
                onChangeText={(text) => {
                  if (!command.pending) setQuantity(choice, text);
                }}
              />
            )}
            {!live && <Notice>Hạng mục không còn trong danh mục đang bán.</Notice>}
            {stale && (
              <>
                <Notice>
                  Giá hiện hành: {money(live.unitPriceVnd)} / {live.unit}. Giá đã chốt giữ nguyên
                  khi không đổi hạng mục.
                </Notice>
                <Action
                  label={`Dùng giá hiện hành · ${choice.name}`}
                  secondary
                  disabled={command.pending}
                  onPress={() =>
                    setLines((old) =>
                      old.map((item) =>
                        lineKey(item) === lineKey(choice)
                          ? { ...item, sourceRevisionId: live.sourceRevisionId }
                          : item,
                      ),
                    )
                  }
                />
              </>
            )}
            {line && !(appendix && choice.category === 'PRINT') && (
              <Action
                label={`Bỏ ${choice.name}`}
                secondary
                disabled={command.pending}
                onPress={() =>
                  setLines((old) => old.filter((item) => lineKey(item) !== lineKey(choice)))
                }
              />
            )}
          </View>
        );
      })}
      {appendix && (
        <Field
          label="Lý do thay đổi"
          disabled={command.pending}
          value={reason}
          onChangeText={setReason}
          multiline
        />
      )}
      {validation && <Notice>{validation}</Notice>}
      {stale && onReload && (
        <Action
          label="Tải lại và bỏ thay đổi chưa lưu"
          secondary
          disabled={command.pending}
          onPress={() =>
            void confirmModal
              .confirm({
                title: 'Tải lại lựa chọn mới nhất?',
                message:
                  'Các thay đổi chưa lưu sẽ bị bỏ. Lựa chọn đã lưu gần nhất sẽ được tải lại.',
                destructive: true,
              })
              .then((agreed) => {
                if (agreed) onReload();
              })
          }
        />
      )}
      {previewError && (
        <>
          <Notice error>{previewError}</Notice>
          <Action
            label="Thử lại xem giá"
            secondary
            onPress={() => setPreviewNonce((value) => value + 1)}
          />
        </>
      )}
      {!appendix && priced && (
        <PricedLines lines={priced.lines} total={priced.totalVnd} label="Tổng theo giá nhà hàng" />
      )}
      <Action
        label={appendix ? 'Lưu phụ lục nháp' : 'Lưu nháp'}
        disabled={!!validation || command.pending || (!appendix && !priced)}
        onPress={save}
        secondary
      />
      {!appendix && selection?.revisionId && selection.status === 'DRAFT' && (
        <Action
          label="Gửi lựa chọn cho nhà hàng"
          disabled={dirty || !!validation || command.pending || !priced}
          onPress={() => {
            void command.run(async () => {
              if (
                !(await confirmModal.confirm({
                  title: 'Gửi lựa chọn cho nhà hàng?',
                  message:
                    'Sau khi gửi, lựa chọn bị khoá chỉnh sửa và nhà hàng dùng để soạn hợp đồng. Gửi lựa chọn chưa phải là duyệt hợp đồng hay thanh toán.',
                  confirmText: 'Gửi lựa chọn',
                }))
              )
                return false;
              const payload = {
                expectedRevision: bookingRevision,
                selectionRevisionId: selection.revisionId!,
              };
              await session.authorize((token) =>
                api.submitSelection(
                  token,
                  booking.bookingId,
                  payload,
                  commandKey('selection-submit', booking.bookingId, payload),
                ),
              );
              return true;
            }, 'Đã gửi lựa chọn cho nhà hàng.');
          }}
        />
      )}
      {dirty && (
        <Action
          label="Huỷ thay đổi chưa lưu"
          onPress={() => {
            setLines(baseLines.map(inputLine));
            setReason('');
          }}
          disabled={command.pending}
          secondary
        />
      )}
    </Section>
  );
}
