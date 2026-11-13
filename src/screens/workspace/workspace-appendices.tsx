import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import {
  createCoupleBillingGateway,
  type CommercialAppendixView,
} from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { effectiveAgreementLines } from '@/features/couple-workspace/commercial-policies';
import { closed, money } from '@/features/couple-workspace/policies';
import { confirmModal } from '@/lib/confirm';
import { CommercialEditor, PricedLines } from './commercial-editor';
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

const billing = createCoupleBillingGateway();
const commercial = createRestoredFlowsGateway();
const api = createWorkspaceGateway();
const labels: Readonly<Record<string, string>> = {
  DRAFT: 'Bản nháp',
  AWAITING_APPROVAL: 'Chờ hai bên duyệt',
  APPROVED: 'Đã duyệt',
  SUPERSEDED: 'Đã thay thế hoặc lưu trữ',
};
export function WorkspaceAppendices(props: WorkspaceProps) {
  const { session, booking, revision } = props;
  const [creating, setCreating] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const load = useCallback(async () => {
    let appendices = await session.authorize((token) =>
      billing.loadAppendices(token, booking.bookingId),
    );
    const revisions = [...appendices.revisions];
    const seen = new Set<string>();
    while (appendices.nextCursor) {
      if (seen.has(appendices.nextCursor)) throw new Error('Chưa tải đầy đủ phụ lục.');
      seen.add(appendices.nextCursor);
      const cursor = appendices.nextCursor;
      appendices = await session.authorize((token) =>
        billing.loadAppendices(token, booking.bookingId, cursor),
      );
      revisions.push(...appendices.revisions);
    }
    let contracts = await session.authorize((token) =>
      billing.loadContracts(token, booking.bookingId),
    );
    const contractRevisions = [...contracts.revisions];
    seen.clear();
    while (contracts.nextCursor) {
      if (seen.has(contracts.nextCursor)) throw new Error('Chưa tải đầy đủ hợp đồng làm nền.');
      seen.add(contracts.nextCursor);
      const cursor = contracts.nextCursor;
      contracts = await session.authorize((token) =>
        billing.loadContracts(token, booking.bookingId, cursor),
      );
      contractRevisions.push(...contracts.revisions);
    }
    return {
      appendices: { ...appendices, revisions },
      contracts: { ...contracts, revisions: contractRevisions },
    };
  }, [session, booking.bookingId]);
  const state = useRead(load, revision);
  const list = state.data?.appendices;
  const current = list?.revisions.find((item) => item.revisionId === list.currentRevisionId);
  const open = current?.state === 'DRAFT' || current?.state === 'AWAITING_APPROVAL';
  const frozen = state.data
    ? effectiveAgreementLines(state.data.appendices, state.data.contracts)
    : null;
  return (
    <View style={{ gap: 16 }}>
      <ReadState state={state} />
      {list && (
        <>
          <Section title="Tổng thoả thuận đang hiệu lực">
            <Text style={s.amount}>{money(list.effectiveTotalVnd)}</Text>
            {frozen && (
              <PricedLines lines={frozen} total={list.effectiveTotalVnd} label="Tổng thoả thuận" />
            )}
            <Notice>
              Phụ lục không thu thêm tiền cọc; chênh lệch được cộng/trừ vào số tiền còn phải thanh
              toán. Hợp đồng và phụ lục đã áp dụng được giữ nguyên.
            </Notice>
            {!closed(booking.phase) &&
              !open &&
              (frozen && list.effectiveRevisionId ? (
                <Action
                  label="Tạo phụ lục thay đổi"
                  disabled={state.loading || !!state.error || props.contextReady === false}
                  onPress={() => setCreating(!creating)}
                  secondary
                />
              ) : (
                <>
                  <Notice>Chưa tải được thoả thuận đang hiệu lực để tạo phụ lục.</Notice>
                  <Action label="Tải lại thoả thuận" onPress={state.reload} secondary />
                </>
              ))}
            {open && <Notice>Hoàn tất hoặc huỷ phụ lục đang chờ trước khi tạo bản mới.</Notice>}
            {closed(booking.phase) && (
              <Notice>Tiệc đã hoàn tất hoặc huỷ, không mở thêm phụ lục mới.</Notice>
            )}
          </Section>
          {creating && !closed(booking.phase) && !open && frozen && list.effectiveRevisionId && (
            <CommercialEditor
              key={`${list.effectiveRevisionId}:${editorVersion}`}
              {...props}
              contextReady={props.contextReady !== false && !state.loading && !state.error}
              bookingRevision={list.bookingRevision}
              predecessorRevisionId={list.effectiveRevisionId}
              baseLines={frozen}
              onReload={() => {
                setEditorVersion((value) => value + 1);
                state.reload();
              }}
              onSaved={() => {
                setCreating(false);
                state.reload();
              }}
            />
          )}
          {current && open ? (
            <AppendixReview
              key={current.revisionId}
              {...props}
              list={list}
              appendix={current}
              disabled={state.loading || !!state.error || props.contextReady === false}
            />
          ) : (
            <Notice>
              Không có phụ lục chờ duyệt. Khi thay đổi số bàn, dịch vụ hoặc đặt in thiệp, phụ lục sẽ
              hiện ở đây để xem xét.
            </Notice>
          )}
          {list.revisions.length > 0 && (
            <Section title="Lịch sử phụ lục">
              {list.revisions.map((item) => (
                <View key={item.revisionId} style={s.item}>
                  <Text style={s.heading}>
                    Phụ lục số {item.revisionNumber} · {labels[item.state]}
                  </Text>
                  <Text>{item.document.reason}</Text>
                  <Text style={s.muted}>
                    Chênh lệch: {money(item.document.deltaVnd)} ·{' '}
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </View>
              ))}
            </Section>
          )}
        </>
      )}
    </View>
  );
}

function AppendixReview({
  session,
  booking,
  refresh,
  list,
  appendix,
  disabled,
}: WorkspaceProps & {
  list: CommercialAppendixView;
  appendix: CommercialAppendixView['revisions'][number];
  disabled: boolean;
}) {
  const [before, setBefore] = useState(false);
  const [reason, setReason] = useState('');
  const command = useCommand(refresh);
  const linkedPrint = !!appendix.printOrderId || !!appendix.printRequests?.length;
  const coupleApproved = appendix.approvals.some((item) => item.party === 'COUPLE');
  const managerApproved = appendix.approvals.some((item) => item.party === 'MANAGER');
  const canCancel = !linkedPrint && (!closed(booking.phase) || booking.phase === 'COMPLETED');
  const decision = (submit: boolean) => {
    const body = { expectedRevision: list.bookingRevision };
    void command.run(
      async () => {
        if (
          !(await confirmModal.confirm({
            title: submit ? 'Gửi phụ lục cho hai bên duyệt?' : 'Duyệt phụ lục này?',
            message:
              'Xác nhận đúng bản đang xem và toàn bộ chênh lệch. Giá đã áp dụng được giữ nguyên.',
            confirmText: submit ? 'Gửi duyệt' : 'Duyệt phụ lục',
          }))
        )
          return false;
        if (submit)
          await session.authorize((token) =>
            commercial.submitAppendix(
              token,
              booking.bookingId,
              appendix.revisionId,
              body,
              commandKey('appendix-submit', appendix.revisionId, body),
            ),
          );
        else
          await session.authorize((token) =>
            commercial.approveAppendix(
              token,
              booking.bookingId,
              appendix.revisionId,
              body,
              commandKey('appendix-approve', appendix.revisionId, body),
            ),
          );
        return true;
      },
      submit ? 'Đã gửi phụ lục chờ hai bên duyệt.' : 'Đã ghi nhận duyệt phụ lục.',
    );
  };
  return (
    <Section title={`Phụ lục số ${appendix.revisionNumber}`}>
      <Text>
        {labels[appendix.state]} · {appendix.document.reason}
      </Text>
      <Text>
        Nhà hàng: {managerApproved ? 'Đã duyệt' : 'Chờ duyệt'} · Hai bạn:{' '}
        {coupleApproved ? 'Đã duyệt' : 'Chờ duyệt'}
      </Text>
      <Text style={s.heading}>Chênh lệch: {money(appendix.document.deltaVnd)}</Text>
      <View style={s.row}>
        <Action label="Trước thay đổi" secondary={!before} onPress={() => setBefore(true)} />
        <Action label="Sau thay đổi" secondary={before} onPress={() => setBefore(false)} />
      </View>
      <PricedLines
        lines={before ? appendix.document.beforeLines : appendix.document.afterLines}
        total={before ? appendix.document.beforeTotalVnd : appendix.document.afterTotalVnd}
      />
      {linkedPrint && (
        <Notice>
          Phụ lục này thuộc yêu cầu in thiệp. Để xem hoặc hủy yêu cầu, hãy vào mục Thiệp cưới.
        </Notice>
      )}
      {!closed(booking.phase) && !linkedPrint && appendix.state === 'DRAFT' && (
        <Action
          label="Gửi phụ lục duyệt"
          disabled={disabled || command.pending}
          onPress={() => decision(true)}
        />
      )}
      {!closed(booking.phase) &&
        !linkedPrint &&
        appendix.state === 'AWAITING_APPROVAL' &&
        !coupleApproved && (
          <Action
            label="Duyệt phụ lục"
            disabled={disabled || command.pending}
            onPress={() => decision(false)}
          />
        )}
      {canCancel && (
        <>
          <Field
            label="Lý do huỷ phụ lục chưa áp dụng"
            disabled={command.pending}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Action
            label="Huỷ phụ lục đang chờ"
            disabled={disabled || command.pending || !reason.trim() || reason.trim().length > 500}
            secondary
            onPress={() =>
              void command.run(async () => {
                if (
                  !(await confirmModal.confirm({
                    title: 'Huỷ phụ lục chưa áp dụng?',
                    message: 'Lịch sử và thoả thuận đang hiệu lực được giữ nguyên.',
                    confirmText: 'Huỷ phụ lục',
                    destructive: true,
                  }))
                )
                  return false;
                const body = { expectedRevision: list.bookingRevision, reason: reason.trim() };
                await session.authorize((token) =>
                  api.cancelAppendix(
                    token,
                    booking.bookingId,
                    appendix.revisionId,
                    body,
                    commandKey('appendix-cancel', appendix.revisionId, body),
                  ),
                );
                return true;
              }, 'Đã huỷ đề xuất phụ lục chưa áp dụng.')
            }
          />
        </>
      )}
      <Feedback command={command} />
    </Section>
  );
}
