import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import type {
  CommercialAppendixView,
  CommercialContractView,
} from '@/features/payments-billing/billing-api';
import {
  api,
  message,
  money,
  useMutation,
  Button,
  Field,
  ErrorNote,
  Panel,
  type ContextProps,
  type Line,
  type DraftLine,
  type Proposal,
} from './panels-common';
import { styles } from './panels.styles';

async function allContracts(token: string, bookingId: string) {
  let page = await api.readContracts(token, bookingId);
  const revisions = [...page.revisions];
  const seen = new Set<string>();
  while (page.nextCursor) {
    if (seen.has(page.nextCursor)) throw new Error('Phân trang hợp đồng không hợp lệ.');
    seen.add(page.nextCursor);
    page = await api.readContracts(token, bookingId, { cursor: page.nextCursor });
    revisions.push(...page.revisions);
  }
  return { ...page, revisions };
}
async function allAppendices(token: string, bookingId: string) {
  let page = await api.readAppendices(token, bookingId);
  const revisions = [...page.revisions];
  const seen = new Set<string>();
  while (page.nextCursor) {
    if (seen.has(page.nextCursor)) throw new Error('Phân trang phụ lục không hợp lệ.');
    seen.add(page.nextCursor);
    page = await api.readAppendices(token, bookingId, { cursor: page.nextCursor });
    revisions.push(...page.revisions);
  }
  return { ...page, revisions };
}

export function RestoredCommercialPanel({
  activeBooking,
  session,
  mode,
}: ContextProps & { mode: 'contract' | 'appendix' }) {
  const bookingId = activeBooking?.bookingId;
  const [data, setData] = useState<{
    proposal: Proposal;
    contracts: CommercialContractView;
    appendices: CommercialAppendixView | null;
    finalized: boolean;
    menus: Awaited<ReturnType<typeof api.readMenus>>['items'];
    legal: Awaited<ReturnType<typeof api.coupleProfile>>;
  } | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mutation = useMutation(session);
  const load = useCallback(async () => {
    if (!session || !bookingId) return;
    setLoading(true);
    try {
      const result = await session.authorize(async (token) => {
        const [proposal, contracts, appendices, invoices] = await Promise.all([
          api.loadProposal(token, bookingId),
          allContracts(token, bookingId),
          mode === 'appendix' ? allAppendices(token, bookingId) : Promise.resolve(null),
          api.readInvoices(token, bookingId),
        ]);
        const legal = await api.coupleProfile(token, proposal.consultationId);
        let menuPage = await api.readMenus();
        const menus = [...menuPage.items];
        const seen = new Set<string>();
        while (menuPage.nextCursor) {
          if (seen.has(menuPage.nextCursor)) throw new Error('Phân trang thực đơn không hợp lệ.');
          seen.add(menuPage.nextCursor);
          menuPage = await api.readMenus({ cursor: menuPage.nextCursor });
          menus.push(...menuPage.items);
        }
        return {
          proposal,
          contracts,
          appendices,
          finalized: invoices.currentRevisionId !== null || invoices.revisions.length > 0,
          menus,
          legal,
        };
      });
      let existing: readonly Line[] = [];
      if (mode === 'appendix' && result.appendices) {
        const effective = result.appendices.effectiveRevisionId;
        const appendix = result.appendices.revisions.find((r) => r.revisionId === effective);
        const contract = result.contracts.revisions.find((r) => r.revisionId === effective);
        if (appendix) existing = appendix.document.afterLines;
        else if (contract) existing = contract.document.lines;
        else throw new Error('Chưa tải được đúng bản thương mại hiệu lực; không thể tạo phụ lục.');
      } else {
        const current = result.contracts.revisions.find(
          (r) => r.revisionId === result.contracts.currentRevisionId,
        );
        existing = current?.document.lines ?? [];
      }
      setData(result);
      setBride(result.legal.brideName ?? '');
      setGroom(result.legal.groomName ?? '');
      setLines(
        existing.length
          ? existing.map((l) => ({
              category: l.category,
              sourceId: l.sourceId,
              sourceRevisionId: l.sourceRevisionId,
              quantity: l.quantity,
              name: l.name,
            }))
          : result.proposal.proposal.tableCount > 0
            ? [
                {
                  category: 'MENU',
                  sourceId: result.proposal.proposal.menu.packageId,
                  sourceRevisionId: result.proposal.proposal.menu.versionId,
                  quantity: result.proposal.proposal.tableCount,
                  name: result.proposal.proposal.menu.name,
                },
              ]
            : [],
      );
      setError(null);
    } catch (e) {
      setData(null);
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [session, bookingId, mode]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  if (!session || !bookingId) return null;
  const revisions = mode === 'contract' ? data?.contracts.revisions : data?.appendices?.revisions;
  const send = async (
    action: 'create' | 'submit' | 'approve' | 'withdraw',
    revisionId?: string,
  ) => {
    if (!data) return;
    const expectedRevision =
      mode === 'contract' ? data.contracts.bookingRevision : data.appendices?.bookingRevision;
    if (!expectedRevision) {
      setError('Thiếu phiên bản hồ sơ từ máy chủ. Hãy tải lại.');
      return;
    }
    if (
      action === 'create' &&
      (lines.length < 1 ||
        lines.length > 50 ||
        !lines.some((l) => l.category === 'MENU') ||
        lines.some(
          (l) => !Number.isSafeInteger(l.quantity) || l.quantity < 1 || l.quantity > 10000,
        ))
    ) {
      setError(
        'Cần 1–50 dòng hợp lệ, có ít nhất một dòng thực đơn; số lượng nguyên từ 1 đến 10000.',
      );
      return;
    }
    if (((mode === 'appendix' && action === 'create') || action === 'withdraw') && !reason.trim()) {
      setError('Vui lòng nhập lý do.');
      return;
    }
    if (mode === 'appendix' && data.finalized) {
      setError('Đã phát hành hóa đơn quyết toán. Vui lòng liên hệ quản lý để điều chỉnh.');
      return;
    }
    const payloadLines = lines.map(({ category, sourceId, sourceRevisionId, quantity }) => ({
      category,
      sourceId,
      sourceRevisionId,
      quantity,
    }));
    const timelineRevisionId =
      data.proposal.effectiveTimeline?.revisionId ?? data.proposal.timeline?.revisionId;
    const predecessorRevisionId =
      mode === 'contract' ? data.contracts.currentRevisionId : data.appendices?.effectiveRevisionId;
    if (action === 'create' && mode === 'contract' && !timelineRevisionId) {
      setError('Chưa có lịch trình hợp lệ để lập hợp đồng.');
      return;
    }
    const payload = {
      expectedRevision,
      lines: payloadLines,
      reason: reason.trim(),
      revisionId,
      predecessorRevisionId,
      timelineRevisionId,
    };
    const ok = await mutation.run(`${bookingId}:commercial`, { mode, action, payload }, (key) =>
      session.authorize<unknown>(async (token) => {
        if (mode === 'contract') {
          if (action === 'create') {
            if (!timelineRevisionId) throw new Error('Thiếu lịch trình.');
            return api.createContract(
              token,
              bookingId,
              {
                expectedRevision,
                predecessorRevisionId: data.contracts.currentRevisionId,
                timelineRevisionId,
                lines: payloadLines,
              },
              key,
            );
          }
          if (!revisionId) throw new Error('Chưa chọn bản hợp đồng.');
          if (action === 'submit')
            return api.submitContract(token, bookingId, revisionId, { expectedRevision }, key);
          if (action === 'approve')
            return api.approveContract(token, bookingId, revisionId, { expectedRevision }, key);
          return api.withdrawContract(
            token,
            bookingId,
            revisionId,
            { expectedRevision, reason: reason.trim() },
            key,
          );
        }
        if (action === 'create') {
          if (!predecessorRevisionId) throw new Error('Chưa có bản thương mại hiệu lực.');
          return api.createAppendix(
            token,
            bookingId,
            { expectedRevision, predecessorRevisionId, reason: reason.trim(), lines: payloadLines },
            key,
          );
        }
        if (!revisionId) throw new Error('Chưa chọn phụ lục.');
        return action === 'submit'
          ? api.submitAppendix(token, bookingId, revisionId, { expectedRevision }, key)
          : api.approveAppendix(token, bookingId, revisionId, { expectedRevision }, key);
      }),
    );
    if (ok) await load();
  };
  const saveNames = async () => {
    if (!data || !bride.trim() || !groom.trim()) {
      setError('Vui lòng nhập đầy đủ họ tên cô dâu và chú rể.');
      return;
    }
    const body = {
      expectedRevision: data.legal.revision,
      brideName: bride.trim().normalize('NFC'),
      groomName: groom.trim().normalize('NFC'),
    };
    if (
      await mutation.run(`${bookingId}:legal-profile`, body, (key) =>
        session.authorize((token) =>
          api.updateCoupleProfile(token, data.proposal.consultationId, body, key),
        ),
      )
    )
      await load();
  };
  return (
    <Panel title={mode === 'contract' ? 'Soạn và phê duyệt hợp đồng' : 'Soạn và phê duyệt phụ lục'}>
      <ErrorNote error={error ?? mutation.error} />
      {loading && <ActivityIndicator />}
      <Button
        label="Tải lại dữ liệu thương mại"
        disabled={loading || mutation.pending}
        onPress={() => void load()}
      />
      {data && (
        <>
          <Field label="Họ tên cô dâu" value={bride} onChange={setBride} />
          <Field label="Họ tên chú rể" value={groom} onChange={setGroom} />
          <Button
            label="Lưu tên pháp lý"
            disabled={mutation.pending}
            onPress={() => void saveNames()}
          />
          {data.finalized && mode === 'appendix' ? (
            <Text>Đã phát hành hóa đơn quyết toán; không tạo phụ lục mới.</Text>
          ) : (
            <>
              <Text>Dòng dịch vụ lấy từ máy chủ. Đơn giá và tổng tiền do máy chủ tính.</Text>
              {lines.map((line, index) => (
                <View style={styles.panel} key={`${index}:${line.sourceId}`}>
                  <Text>
                    {line.category} · {line.name}
                  </Text>
                  <Field
                    label={`Số lượng ${line.name}`}
                    value={String(line.quantity)}
                    onChange={(v) =>
                      setLines((old) =>
                        old.map((l, i) =>
                          i === index ? { ...l, quantity: /^\d+$/.test(v) ? Number(v) : 0 } : l,
                        ),
                      )
                    }
                  />
                  <Button
                    label={`Bỏ dòng ${index + 1}`}
                    disabled={mutation.pending}
                    onPress={() => setLines((old) => old.filter((_, i) => i !== index))}
                  />
                </View>
              ))}
              <Text>Thêm gói thực đơn từ danh mục:</Text>
              {data.menus.map((menu) => (
                <Button
                  key={menu.id}
                  label={`${menu.name} · ${money(menu.priceVndPerTable)}/bàn`}
                  disabled={mutation.pending || lines.length >= 50}
                  onPress={() =>
                    setLines((old) => [
                      ...old,
                      {
                        category: 'MENU',
                        sourceId: menu.id,
                        sourceRevisionId: menu.versionId,
                        quantity: 1,
                        name: menu.name,
                      },
                    ])
                  }
                />
              ))}
              <Text>
                Các dòng in ấn/dịch vụ đã có được giữ đúng nguồn. Dịch vụ mới cần nguồn thương mại
                thật từ nhà hàng.
              </Text>
              <Field
                label="Lý do điều chỉnh / rút duyệt"
                value={reason}
                multiline
                onChange={setReason}
              />
              <Button
                label={mode === 'contract' ? 'Tạo bản nháp hợp đồng' : 'Tạo bản nháp phụ lục'}
                disabled={mutation.pending}
                onPress={() => void send('create')}
              />
            </>
          )}
          {revisions?.map((rev) => (
            <View key={rev.revisionId} style={styles.panel}>
              <Text>
                Phiên bản #{rev.revisionNumber} · {rev.state}
              </Text>
              <Text>
                Cặp đôi:{' '}
                {rev.approvals.some((a) => a.party === 'COUPLE') ? 'Đã duyệt' : 'Chưa duyệt'} · Nhà
                hàng: {rev.approvals.some((a) => a.party === 'MANAGER') ? 'Đã duyệt' : 'Chưa duyệt'}
              </Text>
              {rev.state === 'DRAFT' && (
                <Button
                  label={`Gửi duyệt bản ${rev.revisionNumber}`}
                  disabled={mutation.pending}
                  onPress={() => void send('submit', rev.revisionId)}
                />
              )}
              {rev.state === 'AWAITING_APPROVAL' &&
                !rev.approvals.some((a) => a.party === 'COUPLE') && (
                  <Button
                    label={`Phê duyệt bản ${rev.revisionNumber}`}
                    disabled={mutation.pending}
                    onPress={() => void send('approve', rev.revisionId)}
                  />
                )}
              {mode === 'contract' &&
                rev.state === 'AWAITING_APPROVAL' &&
                rev.approvals.some((a) => a.party === 'COUPLE') && (
                  <Button
                    label={`Rút duyệt bản ${rev.revisionNumber}`}
                    disabled={mutation.pending}
                    onPress={() => void send('withdraw', rev.revisionId)}
                  />
                )}
            </View>
          ))}
        </>
      )}
    </Panel>
  );
}
