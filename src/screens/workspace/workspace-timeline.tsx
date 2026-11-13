import { useState } from 'react';
import { View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { HyText as Text } from '@/components/hy-ui';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { money } from '@/features/couple-workspace/policies';
import { confirmModal } from '@/lib/confirm';
import {
  Action,
  commandKey,
  Feedback,
  Field,
  Notice,
  Section,
  s,
  useCommand,
  type WorkspaceProps,
} from './workspace-common';

const api = createRestoredFlowsGateway();
type TimelineProps = WorkspaceProps & { locked: boolean; onContract: () => void };
export function WorkspaceTimeline(props: TimelineProps) {
  const { session, booking, proposal, refresh, locked, onContract } = props;
  const unavailable = props.contextReady === false;
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const command = useCommand(refresh);
  if (!proposal) return <Notice>Chưa tải được kịch bản. Hãy tải lại mục Thoả thuận.</Notice>;
  const timeline = proposal.timeline;
  const postDeposit = proposal.phase === 'CONFIRMED';
  return (
    <>
      <Section title="Đề xuất tiệc">
        <Text style={s.heading}>{proposal.proposal.hall.name}</Text>
        <Text>
          {proposal.planningHeadcount} khách · {proposal.proposal.tableCount} bàn
        </Text>
        {proposal.proposal.menus.map((menu, index) => (
          <Text key={`${menu.versionId}:${index}`}>
            {menu.name} · {menu.tableCount} bàn
          </Text>
        ))}
        <Text style={s.muted}>Tổng theo đề xuất: {money(proposal.proposal.baseChargeVnd)}</Text>
      </Section>
      <Section title={`Kịch bản hiện tại · Bản ${timeline?.revisionNumber ?? 0}`}>
        <Text style={s.muted}>
          Thời gian tổ chức: {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}
        </Text>
        {timeline?.items.length ? (
          timeline.items.map((item) => (
            <View key={item.itemId} style={s.item}>
              <Text style={s.heading}>
                {item.startTime} · {item.title}
              </Text>
              {item.description && <Text style={s.muted}>{item.description}</Text>}
            </View>
          ))
        ) : (
          <Notice>
            Kịch bản chưa có mốc nào. Hãy thêm mốc đầu tiên để hai bên cùng xem và phê duyệt.
          </Notice>
        )}
        <Text>
          Nhà hàng: {timeline?.managerApprovedAt ? 'Đã duyệt' : 'Chờ duyệt'} · Hai bạn:{' '}
          {timeline?.coupleApprovedAt ? 'Đã duyệt' : 'Chờ duyệt'}
        </Text>
        {locked ? (
          <Notice>
            Hợp đồng chuẩn đã được hai bên duyệt. Kịch bản đính kèm được giữ nguyên để đối chiếu.
          </Notice>
        ) : (
          proposal.capabilities.canEditTimeline && (
            <Action
              label={postDeposit ? 'Đề xuất thay đổi kịch bản' : 'Chỉnh sửa kịch bản'}
              secondary
              disabled={command.pending || unavailable}
              onPress={() => setEditing(!editing)}
            />
          )
        )}
        {editing && !locked && proposal.capabilities.canEditTimeline && (
          <TimelineEditor {...props} onSaved={() => setEditing(false)} />
        )}
        {!locked && timeline && proposal.capabilities.canApproveTimeline && (
          <Action
            label="Phê duyệt kịch bản này"
            disabled={command.pending || unavailable}
            onPress={() =>
              void command.run(async () => {
                if (
                  !(await confirmModal.confirm({
                    title: 'Phê duyệt kịch bản?',
                    message: 'Hai bạn đồng ý với toàn bộ chương trình trong bản kịch bản đang xem?',
                    confirmText: 'Phê duyệt',
                  }))
                )
                  return false;
                const body = { expectedRevision: proposal.revision };
                await session.authorize((token) =>
                  api.approveTimeline(
                    token,
                    booking.bookingId,
                    timeline.revisionId,
                    body,
                    commandKey('timeline-approve', timeline.revisionId, body),
                  ),
                );
                return true;
              }, 'Đã ghi nhận phê duyệt kịch bản.')
            }
          />
        )}
        {!locked && timeline && proposal.capabilities.canWithdrawApproval && (
          <>
            <Field
              label="Lý do rút phê duyệt kịch bản"
              disabled={command.pending}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Action
              label="Rút lại phê duyệt"
              secondary
              disabled={
                unavailable || command.pending || !reason.trim() || reason.trim().length > 500
              }
              onPress={() => {
                const body = { expectedRevision: proposal.revision, reason: reason.trim() };
                void command.run(
                  () =>
                    session.authorize((token) =>
                      api.withdrawTimeline(
                        token,
                        booking.bookingId,
                        timeline.revisionId,
                        body,
                        commandKey('timeline-withdraw', timeline.revisionId, body),
                      ),
                    ),
                  'Đã rút lại phê duyệt kịch bản.',
                );
              }}
            />
          </>
        )}
        <Feedback command={command} />
        <Action label="Xem hợp đồng" onPress={onContract} secondary />
      </Section>
      {(proposal.capabilities.canRequestCancellation ||
        !!proposal.cancellationRequests?.length) && <CancellationRequest {...props} />}
    </>
  );
}

function TimelineEditor({
  session,
  booking,
  proposal,
  refresh,
  onSaved,
  contextReady = true,
}: WorkspaceProps & { onSaved: () => void }) {
  const [baseRevision] = useState(proposal?.revision);
  const [predecessorRevisionId] = useState(proposal?.timeline?.revisionId ?? null);
  const [rows, setRows] = useState(() =>
    (proposal?.timeline?.items ?? []).map((item) => ({
      ...item,
      key: item.itemId,
      description: item.description ?? '',
    })),
  );
  const [reason, setReason] = useState('');
  const command = useCommand(refresh);
  if (!proposal) return null;
  const stale = baseRevision !== proposal.revision;
  const needsReason = proposal.phase === 'CONFIRMED';
  const { startTime, endTime } = proposal.proposal.shift;
  const valid =
    !stale &&
    contextReady &&
    rows.length <= 100 &&
    rows.every(
      (row) =>
        /^([01]\d|2[0-3]):[0-5]\d$/.test(row.startTime) &&
        row.startTime >= startTime &&
        row.startTime < endTime &&
        row.title.trim().length > 0 &&
        row.title.trim().length <= 120 &&
        row.description.length <= 2000,
    ) &&
    (!needsReason || (reason.trim().length > 0 && reason.trim().length <= 500));
  const update = (key: string, patch: Partial<(typeof rows)[number]>) =>
    setRows((old) => old.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (index: number, delta: number) =>
    setRows((old) => {
      const result = [...old];
      const item = result.splice(index, 1)[0]!;
      result.splice(index + delta, 0, item);
      return result;
    });
  return (
    <Section title="Chỉnh sửa các mốc">
      {stale && (
        <Notice>
          Thông tin tiệc đã thay đổi. Các mốc đang soạn được giữ nguyên. Bỏ thay đổi và mở lại để
          lấy bản mới trước khi lưu.
        </Notice>
      )}
      {rows.map((row, index) => (
        <View key={row.key} style={s.item}>
          <Field
            label={`Giờ bắt đầu mốc ${index + 1} (HH:mm)`}
            disabled={command.pending}
            value={row.startTime}
            onChangeText={(value) => update(row.key, { startTime: value })}
          />
          <Field
            label={`Tên mốc ${index + 1}`}
            disabled={command.pending}
            value={row.title}
            onChangeText={(value) => update(row.key, { title: value })}
          />
          <Field
            label={`Mô tả mốc ${index + 1}`}
            disabled={command.pending}
            value={row.description}
            onChangeText={(value) => update(row.key, { description: value })}
            multiline
          />
          <View style={s.row}>
            <Action
              label={`Đưa mốc ${index + 1} lên`}
              disabled={index === 0 || command.pending}
              secondary
              onPress={() => move(index, -1)}
            />
            <Action
              label={`Đưa mốc ${index + 1} xuống`}
              disabled={index === rows.length - 1 || command.pending}
              secondary
              onPress={() => move(index, 1)}
            />
            <Action
              label={`Bỏ mốc ${index + 1}`}
              secondary
              disabled={command.pending}
              onPress={() => {
                void confirmModal
                  .confirm({
                    title: 'Xóa mốc khỏi bản nháp?',
                    message: 'Mốc chỉ được xóa khỏi kịch bản đã lưu khi hai bạn bấm lưu bản mới.',
                    destructive: true,
                  })
                  .then((agreed) => {
                    if (agreed) setRows((old) => old.filter((item) => item.key !== row.key));
                  });
              }}
            />
          </View>
        </View>
      ))}
      <Action
        label="Thêm mốc"
        secondary
        disabled={command.pending || rows.length >= 100}
        onPress={() =>
          setRows((old) => [
            ...old,
            {
              key: randomUUID(),
              itemId: randomUUID(),
              order: old.length,
              startTime,
              title: '',
              description: '',
            },
          ])
        }
      />
      {needsReason && (
        <Field
          label="Lý do đổi kịch bản"
          disabled={command.pending}
          value={reason}
          onChangeText={setReason}
          multiline
        />
      )}
      {!valid && (
        <Notice>
          Nhập tên và giờ bắt đầu cho từng mốc trong khung giờ {startTime}–{endTime}
          {needsReason ? ', kèm lý do thay đổi' : ''}.
        </Notice>
      )}
      <Action
        label={needsReason ? 'Gửi yêu cầu thay đổi kịch bản' : 'Lưu bản kịch bản mới'}
        disabled={!valid || command.pending}
        onPress={() => {
          const items = rows.map((row, order) => ({
            itemId: row.itemId,
            order,
            startTime: row.startTime,
            title: row.title.trim(),
            ...(row.description.trim() ? { description: row.description.trim() } : {}),
          }));
          const body = {
            expectedRevision: baseRevision!,
            items,
            ...(needsReason ? { reason: reason.trim() } : { predecessorRevisionId }),
          };
          void command
            .run(
              async () => {
                if (needsReason)
                  await session.authorize((token) =>
                    api.requestChange(
                      token,
                      booking.bookingId,
                      { expectedRevision: baseRevision!, items, reason: reason.trim() },
                      commandKey('timeline-change', booking.bookingId, body),
                    ),
                  );
                else
                  await session.authorize((token) =>
                    api.createTimeline(
                      token,
                      booking.bookingId,
                      {
                        expectedRevision: baseRevision!,
                        items,
                        predecessorRevisionId,
                      },
                      commandKey('timeline-draft', booking.bookingId, body),
                    ),
                  );
              },
              needsReason ? 'Đã gửi yêu cầu thay đổi kịch bản.' : 'Đã lưu bản kịch bản mới.',
            )
            .then((ok) => {
              if (ok) onSaved();
            });
        }}
      />
      <Action
        label="Bỏ thay đổi kịch bản"
        disabled={command.pending}
        secondary
        onPress={() =>
          void confirmModal
            .confirm({
              title: 'Bỏ các thay đổi?',
              message: 'Các thay đổi trong chương trình chưa được lưu và sẽ bị bỏ.',
              destructive: true,
            })
            .then((agreed) => {
              if (agreed) onSaved();
            })
        }
      />
      <Feedback command={command} />
    </Section>
  );
}

function CancellationRequest({
  session,
  booking,
  proposal,
  refresh,
  contextReady = true,
}: WorkspaceProps) {
  const [reason, setReason] = useState('');
  const command = useCommand(refresh);
  if (!proposal) return null;
  return (
    <Section title="Cần đổi hoặc huỷ tiệc?">
      <Text style={s.muted}>
        Yêu cầu huỷ được nhà hàng xem xét theo chính sách đã ký. Trước cọc không phát sinh hoàn cọc;
        sau cọc áp dụng chính sách và thời điểm nhận yêu cầu. Gửi yêu cầu chưa huỷ tiệc ngay.
      </Text>
      {proposal.cancellationRequests?.map((request) => (
        <Notice key={request.requestId}>
          Đã gửi yêu cầu · {new Date(request.requestedAt).toLocaleString('vi-VN')} ·{' '}
          {request.reason}. Nhà hàng đang xem xét.
        </Notice>
      ))}
      {proposal.capabilities.canRequestCancellation && (
        <>
          <Field
            label="Lý do huỷ tiệc"
            disabled={command.pending}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Action
            label="Gửi yêu cầu huỷ"
            disabled={
              !contextReady || command.pending || !reason.trim() || reason.trim().length > 500
            }
            secondary
            onPress={() =>
              void command.run(async () => {
                if (
                  !(await confirmModal.confirm({
                    title: 'Gửi yêu cầu huỷ tiệc?',
                    message:
                      'Quản lý nhà hàng sẽ xem xét theo chính sách huỷ trong hợp đồng đã ký; có thể phát sinh phí.',
                    confirmText: 'Gửi yêu cầu huỷ',
                    destructive: true,
                  }))
                )
                  return false;
                const body = { expectedRevision: proposal.revision, reason: reason.trim() };
                await session.authorize((token) =>
                  api.requestCancellation(
                    token,
                    booking.bookingId,
                    body,
                    commandKey('cancellation-request', booking.bookingId, body),
                  ),
                );
                return true;
              }, 'Đã gửi yêu cầu huỷ để nhà hàng xem xét.')
            }
          />
        </>
      )}
      <Feedback command={command} />
    </Section>
  );
}
