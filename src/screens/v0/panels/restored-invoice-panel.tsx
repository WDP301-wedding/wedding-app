import React, { useState } from 'react';
import { Text } from 'react-native';
import { api, message, money, Button, ErrorNote, Panel, type ContextProps } from './panels-common';

export function RestoredInvoicePanel({ activeBooking, session }: ContextProps) {
  const bookingId = activeBooking?.bookingId;
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.readInvoices>>['revisions']>([]);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getInvoice>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    if (!session || !bookingId) return;
    try {
      let page = await session.authorize((token) => api.readInvoices(token, bookingId));
      const all = [...page.revisions];
      const seen = new Set<string>();
      while (page.nextCursor) {
        const cursor = page.nextCursor;
        if (seen.has(cursor)) throw new Error('Phân trang hóa đơn không hợp lệ.');
        seen.add(cursor);
        page = await session.authorize((token) => api.readInvoices(token, bookingId, { cursor }));
        all.push(...page.revisions);
      }
      setRows(all);
      setError(null);
    } catch (e) {
      setRows([]);
      setDetail(null);
      setError(message(e));
    }
  };
  if (!session || !bookingId) return null;
  return (
    <Panel title="Chi tiết hóa đơn bất biến">
      <ErrorNote error={error} />
      <Button label="Tải lịch sử hóa đơn" onPress={() => void load()} />
      {rows.map((row) => (
        <Button
          key={row.invoiceRevisionId}
          label={`Xem hóa đơn ${row.invoiceNumber} · bản ${row.revisionNumber}`}
          onPress={() =>
            void session
              .authorize((token) => api.getInvoice(token, bookingId, row.invoiceRevisionId))
              .then(setDetail)
              .catch((e) => {
                setDetail(null);
                setError(message(e));
              })
          }
        />
      ))}
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
