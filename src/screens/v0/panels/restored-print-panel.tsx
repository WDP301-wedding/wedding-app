import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type {
  AppDesignView,
  AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import { readPublicEnv } from '@/lib/env';
import { saveOrShareDownloadedFile } from '@/lib/save-downloaded-file';
import {
  api,
  invitations,
  message,
  money,
  useMutation,
  Button,
  Field,
  ErrorNote,
  Panel,
  type ContextProps,
} from './panels-common';
import { styles } from './panels.styles';

export function RestoredPrintPanel({ activeBooking, session }: ContextProps) {
  const bookingId = activeBooking?.bookingId;
  const [orders, setOrders] = useState<readonly AppPrintOrderView[]>([]);
  const [designs, setDesigns] = useState<readonly AppDesignView[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation(session);
  const load = useCallback(async () => {
    if (!session || !bookingId) return;
    try {
      const [o, d] = await session.authorize((token) =>
        Promise.all([
          invitations.listPrintOrders(token, bookingId),
          invitations.listDesigns(token, bookingId),
        ]),
      );
      setOrders(o);
      setDesigns(d);
      setError(null);
    } catch (e) {
      setOrders([]);
      setDesigns([]);
      setError(message(e));
    }
  }, [session, bookingId]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  if (!session || !bookingId) return null;
  const create = async () => {
    if (!selected || !/^\d+$/.test(quantity) || Number(quantity) < 1 || Number(quantity) > 10000) {
      setError('Chọn mẫu thiệp thật và số lượng từ 1 đến 10000.');
      return;
    }
    const body = { lines: [{ designId: selected, quantity: Number(quantity) }] };
    if (
      await mutation.run(`${bookingId}:print-create`, body, (key) =>
        session.authorize((token) => api.createPrintOrder(token, bookingId, body, key)),
      )
    )
      await load();
  };
  const action = async (
    order: AppPrintOrderView,
    kind: 'approve' | 'replace' | 'cancel' | 'intent',
  ) => {
    const revision =
      kind === 'replace' ? order.pendingReplacementProposal : order.currentCommercialRevision;
    if (
      (kind === 'approve' || kind === 'replace') &&
      (!revision || Date.parse(revision.expiresAt) <= Date.now())
    ) {
      setError('Báo giá đã hết hạn hoặc không có. Vui lòng tải lại.');
      return;
    }
    if (kind === 'intent' && !reason.trim()) {
      setError('Vui lòng nhập lý do hủy.');
      return;
    }
    const body = {
      kind,
      expectedRevision: order.revision,
      commercialRevisionId: revision?.commercialRevisionId,
      reason: reason.trim(),
    };
    const ok = await mutation.run(`${bookingId}:print:${order.orderId}`, body, (key) =>
      session.authorize<unknown>(async (token) => {
        if (kind === 'approve' && revision)
          return invitations.approvePrintOrder(
            token,
            bookingId,
            order.orderId,
            revision.commercialRevisionId,
            order.revision,
            key,
          );
        if (kind === 'replace' && revision)
          return invitations.approveReplacementProposal(
            token,
            bookingId,
            order.orderId,
            revision.commercialRevisionId,
            order.revision,
            key,
          );
        if (kind === 'intent')
          return api.createCancellationIntent(
            token,
            bookingId,
            order.orderId,
            { expectedRevision: order.revision, reason: reason.trim() },
            key,
          );
        return invitations.cancelApprovedPrintOrder(
          token,
          bookingId,
          order.orderId,
          order.revision,
          key,
        );
      }),
    );
    if (ok) {
      setCancelId(null);
      await load();
    }
  };
  return (
    <Panel title="Tạo và xử lý đơn in">
      <ErrorNote error={error ?? mutation.error} />
      <Button
        label="Tải lại mẫu và đơn in"
        disabled={mutation.pending}
        onPress={() => void load()}
      />
      {designs.map((d) => (
        <Button
          key={d.designId}
          label={`${selected === d.designId ? '✓ ' : ''}Mẫu ${d.designId.slice(0, 8)}`}
          onPress={() => setSelected(d.designId)}
        />
      ))}
      <Field label="Số lượng thiệp in" value={quantity} onChange={setQuantity} />
      <Button
        label="Gửi yêu cầu in thiệp"
        disabled={mutation.pending || !selected}
        onPress={() => void create()}
      />
      <Field label="Lý do hủy đơn in" value={reason} multiline onChange={setReason} />
      {orders.map((order) => (
        <View key={order.orderId} style={styles.panel}>
          <Text>
            Đơn {order.orderId.slice(0, 8)} · {order.status} · Phiên bản {order.revision}
          </Text>
          {order.lines
            .filter((line) => line.printableRevisionId !== null)
            .map((line) => (
              <Button
                key={line.lineId}
                label={`Tải bản in ${line.lineId.slice(0, 8)}`}
                disabled={mutation.pending}
                onPress={() =>
                  void session
                    .authorize(async (token) => {
                      const base = readPublicEnv().EXPO_PUBLIC_API_BASE_URL;
                      const response = await fetch(
                        `${base}/bookings/${bookingId}/printable-revisions/${line.printableRevisionId}/file`,
                        { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
                      );
                      if (!response.ok)
                        throw new Error(`Không thể tải bản in (${response.status}).`);
                      await saveOrShareDownloadedFile(
                        await response.blob(),
                        `thiep-${line.printableRevisionId}.pdf`,
                        'application/pdf',
                      );
                    })
                    .catch((e) => setError(message(e)))
                }
              />
            ))}
          <Button
            label="Xem chi tiết mới nhất"
            onPress={() =>
              void session
                .authorize((token) => api.getPrintOrder(token, bookingId, order.orderId))
                .then((fresh) =>
                  setOrders((old) => old.map((o) => (o.orderId === fresh.orderId ? fresh : o))),
                )
                .catch((e) => setError(message(e)))
            }
          />
          {order.status === 'QUOTED' && (
            <Button
              label="Chấp thuận báo giá hiện tại"
              disabled={mutation.pending}
              onPress={() => void action(order, 'approve')}
            />
          )}
          {order.pendingReplacementProposal !== null && (
            <Button
              label="Chấp thuận bản thay thế"
              disabled={mutation.pending}
              onPress={() => void action(order, 'replace')}
            />
          )}
          {!['CANCELLED', 'DELIVERED', 'HANDED_OVER'].includes(order.status) && (
            <>
              <Button
                label="Ghi nhận ý định hủy"
                disabled={mutation.pending}
                onPress={() => void action(order, 'intent')}
              />
              <Button
                label={cancelId === order.orderId ? 'Xác nhận hủy đơn in' : 'Hủy đơn in'}
                disabled={mutation.pending}
                onPress={() =>
                  cancelId === order.orderId
                    ? void action(order, 'cancel')
                    : setCancelId(order.orderId)
                }
              />
              {cancelId === order.orderId && (
                <Button label="Giữ đơn in" onPress={() => setCancelId(null)} />
              )}
            </>
          )}
        </View>
      ))}
    </Panel>
  );
}
