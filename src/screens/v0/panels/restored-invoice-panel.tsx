import React, { useEffect, useRef, useState } from 'react';

import { HyText as Text } from '@/components/hy-ui';
import { api, message, money, Button, ErrorNote, Panel, type ContextProps } from './panels-common';

export function RestoredInvoicePanel(props: ContextProps) {
  const snapshot = props.session?.snapshot();
  const accountId = snapshot?.status === 'authenticated' ? snapshot.actor.accountId : 'anonymous';
  return <InvoiceBrowser key={`${accountId}:${props.activeBooking?.bookingId ?? ''}`} {...props} />;
}

function InvoiceBrowser({ activeBooking, session }: ContextProps) {
  const bookingId = activeBooking?.bookingId;
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.readInvoices>>['revisions']>([]);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getInvoice>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const listFlight = useRef<Promise<void> | null>(null);
  const detailFlights = useRef(
    new Map<string, Promise<Awaited<ReturnType<typeof api.getInvoice>>>>(),
  );
  const generation = useRef(0);
  const detailSelection = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
      detailSelection.current += 1;
      listFlight.current = null;
      detailFlights.current.clear();
    },
    [session, bookingId],
  );
  const load = () => {
    if (!session || !bookingId) return Promise.resolve();
    if (listFlight.current) return listFlight.current;
    const current = generation.current;
    setLoading(true);
    const task = (async () => {
      try {
        let page = await session.authorize((token) => api.readInvoices(token, bookingId));
        const all = [...page.revisions];
        const seen = new Set<string>();
        while (page.nextCursor) {
          if (current !== generation.current) return;
          const cursor = page.nextCursor;
          if (seen.has(cursor)) throw new Error('Phân trang hóa đơn không hợp lệ.');
          seen.add(cursor);
          page = await session.authorize((token) => api.readInvoices(token, bookingId, { cursor }));
          all.push(...page.revisions);
        }
        if (current !== generation.current) return;
        setRows(all);
        setError(null);
      } catch (e) {
        if (current !== generation.current) return;
        setRows([]);
        setDetail(null);
        setError(message(e));
      } finally {
        if (current === generation.current) setLoading(false);
      }
    })();
    listFlight.current = task;
    void task.finally(() => {
      if (listFlight.current === task) listFlight.current = null;
    });
    return task;
  };
  const selectInvoice = async (invoiceRevisionId: string) => {
    if (!session || !bookingId) return;
    const current = generation.current;
    const selected = ++detailSelection.current;
    setLoadingDetail(true);
    setDetail(null);
    setError(null);
    let task = detailFlights.current.get(invoiceRevisionId);
    if (!task) {
      task = session.authorize((token) => api.getInvoice(token, bookingId, invoiceRevisionId));
      detailFlights.current.set(invoiceRevisionId, task);
    }
    try {
      const invoice = await task;
      if (current === generation.current && selected === detailSelection.current)
        setDetail(invoice);
    } catch (e) {
      if (current === generation.current && selected === detailSelection.current) {
        setDetail(null);
        setError(message(e));
      }
    } finally {
      if (detailFlights.current.get(invoiceRevisionId) === task)
        detailFlights.current.delete(invoiceRevisionId);
      if (current === generation.current && selected === detailSelection.current)
        setLoadingDetail(false);
    }
  };
  if (!session || !bookingId) return null;
  return (
    <Panel title="Chi tiết hóa đơn bất biến">
      <ErrorNote error={error} />
      <Button
        label={loading ? 'Đang tải lịch sử…' : 'Tải lịch sử hóa đơn'}
        disabled={loading}
        onPress={() => void load()}
      />
      {rows.map((row) => (
        <Button
          key={row.invoiceRevisionId}
          label={`Xem hóa đơn ${row.invoiceNumber} · bản ${row.revisionNumber}`}
          onPress={() => void selectInvoice(row.invoiceRevisionId)}
        />
      ))}
      {loadingDetail && <Text>Đang tải chi tiết hóa đơn…</Text>}
      {detail && (
        <>
          <Text>
            Hóa đơn {detail.invoiceNumber} · phát hành{' '}
            {new Date(detail.issuedAt).toLocaleString('vi-VN')}
          </Text>
          <Text>Giá trị thương mại: {money(detail.document.commercialTotalVnd)}</Text>
          <Text>Phát sinh: {money(detail.document.incidentalTotalVnd)}</Text>
          <Text>Tổng cộng: {money(detail.document.totalVnd)}</Text>
          <Text selectable>Mã tài liệu: {detail.documentDigest}</Text>
        </>
      )}
    </Panel>
  );
}
