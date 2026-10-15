import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import {
  api,
  message,
  useMutation,
  Button,
  Field,
  ErrorNote,
  Panel,
  type ContextProps,
  type Proposal,
} from './panels-common';
import { styles } from './panels.styles';

export function RestoredTimelinePanel({ activeBooking, session }: ContextProps) {
  const bookingId = activeBooking?.bookingId;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<
    { itemId?: string; startTime: string; title: string; description: string }[]
  >([]);
  const [reason, setReason] = useState('');
  const [cancel, setCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation(session);
  const load = useCallback(async () => {
    if (!session || !bookingId) return;
    try {
      const p = await session.authorize((token) => api.loadProposal(token, bookingId));
      setProposal(p);
      setItems(
        Array.from(p.timeline?.items ?? p.effectiveTimeline?.items ?? [], (i) => ({
          ...i,
          description: i.description ?? '',
        })),
      );
      setError(null);
    } catch (e) {
      setProposal(null);
      setError(message(e));
    }
  }, [session, bookingId]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  if (!session || !bookingId) return null;
  const send = async (action: 'create' | 'change' | 'approve' | 'withdraw' | 'cancel') => {
    if (!proposal) return;
    const timeline = proposal.timeline;
    if (['change', 'withdraw', 'cancel'].includes(action) && !reason.trim()) {
      setError('Vui lòng nhập lý do.');
      return;
    }
    if (
      ['create', 'change'].includes(action) &&
      items.some(
        (i) =>
          !i.title.trim() ||
          i.title.trim().length > 120 ||
          !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(i.startTime) ||
          i.description.length > 2000,
      )
    ) {
      setError('Mỗi mục cần tên (tối đa 120 ký tự), giờ HH:mm và mô tả tối đa 2000 ký tự.');
      return;
    }
    const expectedRevision = proposal.revision;
    const edited = items.map((i, order) => ({ ...i, title: i.title.trim(), order }));
    const payload =
      action === 'create'
        ? {
            expectedRevision,
            predecessorRevisionId:
              timeline?.revisionId ?? proposal.effectiveTimeline?.revisionId ?? null,
            items: edited,
          }
        : action === 'change'
          ? { expectedRevision, items: edited, reason: reason.trim() }
          : action === 'cancel' || action === 'withdraw'
            ? { expectedRevision, reason: reason.trim() }
            : { expectedRevision };
    const ok = await mutation.run(`${bookingId}:timeline`, { action, payload }, (key) =>
      session.authorize<unknown>(async (token) => {
        if (action === 'create')
          return api.createTimeline(
            token,
            bookingId,
            {
              expectedRevision,
              predecessorRevisionId:
                timeline?.revisionId ?? proposal.effectiveTimeline?.revisionId ?? null,
              items: edited,
            },
            key,
          );
        if (action === 'change')
          return api.requestChange(
            token,
            bookingId,
            { expectedRevision, items: edited, reason: reason.trim() },
            key,
          );
        if (action === 'cancel')
          return api.requestCancellation(
            token,
            bookingId,
            { expectedRevision, reason: reason.trim() },
            key,
          );
        if (!timeline) throw new Error('Không có bản lịch trình đang chờ để xử lý.');
        return action === 'approve'
          ? api.approveTimeline(token, bookingId, timeline.revisionId, { expectedRevision }, key)
          : api.withdrawTimeline(
              token,
              bookingId,
              timeline.revisionId,
              { expectedRevision, reason: reason.trim() },
              key,
            );
      }),
    );
    if (ok) {
      setCancel(false);
      await load();
    }
  };
  return (
    <Panel title="Chỉnh sửa và phê duyệt lịch trình">
      <ErrorNote error={error ?? mutation.error} />
      <Button label="Tải lại lịch trình" disabled={mutation.pending} onPress={() => void load()} />
      {proposal && (
        <>
          <Text>
            Bản hiệu lực: {proposal.effectiveTimeline?.revisionNumber ?? 'Chưa có'} · Bản đề xuất:{' '}
            {proposal.timeline?.revisionNumber ?? 'Chưa có'}
          </Text>
          <Text>
            Cặp đôi: {proposal.timeline?.coupleApprovedAt ? 'Đã duyệt' : 'Chưa duyệt'} · Nhà hàng:{' '}
            {proposal.timeline?.managerApprovedAt ? 'Đã duyệt' : 'Chưa duyệt'}
          </Text>
          {items.map((item, index) => (
            <View key={index} style={styles.panel}>
              <Field
                label={`Giờ mục ${index + 1}`}
                value={item.startTime}
                onChange={(v) =>
                  setItems((old) => old.map((x, i) => (i === index ? { ...x, startTime: v } : x)))
                }
              />
              <Field
                label={`Tên mục ${index + 1}`}
                value={item.title}
                onChange={(v) =>
                  setItems((old) => old.map((x, i) => (i === index ? { ...x, title: v } : x)))
                }
              />
              <Field
                label={`Mô tả mục ${index + 1}`}
                value={item.description}
                multiline
                onChange={(v) =>
                  setItems((old) => old.map((x, i) => (i === index ? { ...x, description: v } : x)))
                }
              />
              <Button
                label={`Xóa mục ${index + 1}`}
                disabled={mutation.pending}
                onPress={() => setItems((old) => old.filter((_, i) => i !== index))}
              />
            </View>
          ))}
          <Button
            label="Thêm mục lịch trình"
            disabled={mutation.pending || items.length >= 100}
            onPress={() =>
              setItems((old) => [...old, { title: '', startTime: '', description: '' }])
            }
          />
          <Field
            label="Lý do thay đổi / rút duyệt / hủy tiệc"
            value={reason}
            multiline
            onChange={setReason}
          />
          {proposal.capabilities.canEditTimeline && (
            <>
              <Button
                label="Tạo bản lịch trình mới"
                disabled={mutation.pending}
                onPress={() => void send('create')}
              />
              <Button
                label="Gửi yêu cầu thay đổi"
                disabled={mutation.pending}
                onPress={() => void send('change')}
              />
            </>
          )}
          {proposal.capabilities.canApproveTimeline && proposal.timeline && (
            <Button
              label="Phê duyệt lịch trình đề xuất"
              disabled={mutation.pending}
              onPress={() => void send('approve')}
            />
          )}
          {proposal.capabilities.canWithdrawApproval && proposal.timeline && (
            <Button
              label="Rút phê duyệt lịch trình"
              disabled={mutation.pending}
              onPress={() => void send('withdraw')}
            />
          )}
          {proposal.capabilities.canRequestCancellation && (
            <Button
              label={cancel ? 'Xác nhận gửi yêu cầu hủy tiệc' : 'Yêu cầu hủy tiệc'}
              disabled={mutation.pending}
              onPress={() => (cancel ? void send('cancel') : setCancel(true))}
            />
          )}
          {cancel && <Button label="Giữ nguyên tiệc" onPress={() => setCancel(false)} />}
          {proposal.cancellationRequests?.map((r) => (
            <Text key={r.requestId}>
              {r.requestedAt}: {r.reason}
            </Text>
          ))}
        </>
      )}
    </Panel>
  );
}
