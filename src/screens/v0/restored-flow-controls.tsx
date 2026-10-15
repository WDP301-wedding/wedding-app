import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import {
  createAppInvitationGateway,
  type AppDesignView,
  type AppPrintOrderView,
} from '@/features/invitation-studio/app-invitation-api';
import { createBillingIntents } from '@/features/payments-billing/billing-intents';
import type {
  CommercialContractView,
  CommercialAppendixView,
} from '@/features/payments-billing/billing-api';
import { readPublicEnv } from '@/lib/env';
import { saveOrShareDownloadedFile } from '@/lib/save-downloaded-file';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';

const api = createRestoredFlowsGateway();
const invitations = createAppInvitationGateway();
type ContextProps = Pick<V0CommonProps, 'activeBooking' | 'session'>;
type Proposal = Awaited<ReturnType<typeof api.loadProposal>>;
type Contract = CommercialContractView['revisions'][number];
type Line = Contract['document']['lines'][number];
type DraftLine = Pick<Line, 'category' | 'sourceId' | 'sourceRevisionId' | 'quantity'> & {
  name: string;
};
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
const money = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { tokens } = useWeddingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: tokens.primary, opacity: disabled ? 0.45 : 1 }]}
    >
      <Text style={{ color: tokens.onPrimary }}>{label}</Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const { tokens } = useWeddingTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: tokens.text }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={[styles.input, { color: tokens.text, borderColor: tokens.rule }]}
      />
    </View>
  );
}
function Panel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const { tokens } = useWeddingTheme();
  return (
    <View style={[styles.panel, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: tokens.primary }}>{title}</Text>
      {children}
    </View>
  );
}
function ErrorNote({ error }: { error: string | null }) {
  const { tokens } = useWeddingTheme();
  return error ? (
    <Text accessibilityRole="alert" style={{ color: tokens.tagWarmText }}>
      {error}
    </Text>
  ) : null;
}

// Preserve the exact key and payload fingerprint across unknown outcomes and restarts.
function useMutation(session: V0CommonProps['session']) {
  const snapshot = session?.snapshot();
  const accountId = snapshot?.status === 'authenticated' ? snapshot.actor.accountId : null;
  const intents = useMemo(() => (accountId ? createBillingIntents(accountId) : null), [accountId]);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T,>(
    scope: string,
    body: object,
    operation: (key: string) => Promise<T>,
  ): Promise<boolean> => {
    if (busy.current || !intents) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await intents.run(scope, body, (key) => operation(key));
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return { run, pending, error };
}

export function RestoredHealthPanel() {
  const [value, setValue] = useState<{ live: string; ready: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const load = async () => {
    setPending(true);
    setError(null);
    const results = await Promise.allSettled([api.liveHealth(), api.readyHealth()]);
    setValue({
      live: results[0].status === 'fulfilled' ? results[0].value.status : 'Không xác định',
      ready: results[1].status === 'fulfilled' ? results[1].value.status : 'Không xác định',
    });
    const failure = results.find((r) => r.status === 'rejected');
    if (failure?.status === 'rejected') setError(message(failure.reason));
    setPending(false);
  };
  return (
    <Panel title="Trạng thái hệ thống">
      <Text>Máy chủ: {value?.live ?? 'Chưa kiểm tra'}</Text>
      <Text>Sẵn sàng: {value?.ready ?? 'Chưa kiểm tra'}</Text>
      <ErrorNote error={error} />
      <Button label="Kiểm tra trạng thái" disabled={pending} onPress={() => void load()} />
    </Panel>
  );
}

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

export function RestoredGuestPanel({ activeBooking, session }: ContextProps) {
  const bookingId = activeBooking?.bookingId;
  const [data, setData] = useState<{
    settings: Awaited<ReturnType<typeof api.checkInSettings>>;
    attendance: Awaited<ReturnType<typeof api.attendanceSummary>>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation(session);
  const load = useCallback(async () => {
    if (!session || !bookingId) return;
    try {
      const result = await session.authorize(async (token) => {
        const [settings, attendance] = await Promise.all([
          api.checkInSettings(token, bookingId),
          api.attendanceSummary(token, bookingId),
        ]);
        return { settings, attendance };
      });
      setData(result);
      setError(null);
    } catch (e) {
      setData(null);
      setError(message(e));
    }
  }, [session, bookingId]);
  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);
  if (!session || !bookingId) return null;
  const toggle = async () => {
    if (!data || data.settings.locked) return;
    const body = {
      expectedRevision: data.settings.revision,
      checkInMode:
        data.settings.checkInMode === 'NONE' ? ('BY_GUEST_NAME' as const) : ('NONE' as const),
    };
    if (
      await mutation.run(`${bookingId}:checkin-settings`, body, (key) =>
        session.authorize((token) => api.configureCheckIn(token, bookingId, body, key)),
      )
    )
      await load();
  };
  return (
    <Panel title="Điểm danh theo tên">
      <ErrorNote error={error ?? mutation.error} />
      <Button label="Tải cài đặt và số liệu điểm danh" onPress={() => void load()} />
      {data && (
        <>
          <Text>
            {data.settings.checkInMode === 'NONE'
              ? 'Điểm danh đang tắt — không ghi nhận số khách thực tế.'
              : `Chỉ tính khách có tên: ${data.attendance.checkedInGuestCount ?? 'Chưa ghi nhận'}. Không phải tổng khách dự tiệc.`}
          </Text>
          <Button
            label={
              data.settings.checkInMode === 'NONE'
                ? 'Bật điểm danh theo tên'
                : 'Tắt điểm danh theo tên'
            }
            disabled={mutation.pending || data.settings.locked}
            onPress={() => void toggle()}
          />
        </>
      )}
    </Panel>
  );
}

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

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 12, marginVertical: 8 },
  button: { minHeight: 44, padding: 12, borderRadius: 8, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 44 },
});

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
