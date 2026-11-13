import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import { FileTextIcon } from '@/components/icons';
import { createWorkspaceGateway } from '@/features/couple-workspace/workspace-api';
import { balanceGate, checkedCheckoutUrl, money } from '@/features/couple-workspace/policies';
import {
  createCoupleBillingGateway,
  type AttemptView,
  type BillingView,
  type DepositBody,
} from '@/features/payments-billing/billing-api';
import { createBillingIntents } from '@/features/payments-billing/billing-intents';
import { confirmModal } from '@/lib/confirm';
import { CompletionNotice } from './workspace-overview';
import { PaymentQr } from './payment-qr';
import {
  Action,
  Feedback,
  Disclosure,
  Notice,
  Page,
  ReadState,
  Section,
  s,
  useClock,
  useCommand,
  useRead,
  type WorkspaceProps,
} from './workspace-common';

const api = createWorkspaceGateway();
const billing = createCoupleBillingGateway();
const statusLabels: Readonly<Record<string, string>> = {
  CREATED: 'Đã tạo · chờ thanh toán',
  PENDING: 'Đang chờ xác minh',
  UNKNOWN: 'Chưa rõ kết quả · đang kiểm tra',
  SUCCEEDED: 'Đã xác nhận thanh toán',
  FAILED: 'Thanh toán không thành công',
};
const unresolved = (attempt: AttemptView) =>
  attempt.status !== 'FAILED' &&
  !(attempt.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED');

export function WorkspacePayment({
  session,
  booking,
  proposal,
  refresh,
  revision,
  navigate,
  initialAttemptId,
  contextReady = true,
}: WorkspaceProps & { initialAttemptId?: string | undefined }) {
  const snapshot = session.snapshot();
  const accountId = snapshot.status === 'authenticated' ? snapshot.actor.accountId : '';
  const [intents] = useState(() => createBillingIntents(accountId));
  const [lastAttempt, setLastAttempt] = useState<AttemptView | null>(null);
  const now = useClock(1000);
  const starting = useRef(false);
  const checking = useRef(false);
  const load = useCallback(async () => {
    const [contracts, active, view, linkedAttempt] = await Promise.all([
      session.authorize((token) => billing.loadContracts(token, booking.bookingId)),
      session.authorize((token) => api.activeAttempts(token, booking.bookingId)),
      booking.accessLevel === 'FULL'
        ? session.authorize((token) => billing.load(token, booking.bookingId))
        : Promise.resolve(null),
      initialAttemptId
        ? session.authorize((token) =>
            api.attempt(token, booking.bookingId, initialAttemptId, false),
          )
        : Promise.resolve(null),
    ]);
    return { contracts, active: Array.from(active.attempts), view, linkedAttempt };
  }, [session, booking.bookingId, booking.accessLevel, initialAttemptId]);
  const state = useRead(load, revision);
  const reloadPayment = state.reload;
  const command = useCommand(() => {
    state.reload();
    refresh();
  });
  const eligibleAttempts =
    state.data?.active.filter(
      (item) => item.purpose === 'DEPOSIT' || booking.accessLevel === 'FULL',
    ) ?? [];
  const linkedAttempt = state.data?.linkedAttempt;
  const attempt =
    lastAttempt && (lastAttempt.purpose === 'DEPOSIT' || booking.accessLevel === 'FULL')
      ? lastAttempt
      : linkedAttempt && (linkedAttempt.purpose === 'DEPOSIT' || booking.accessLevel === 'FULL')
        ? linkedAttempt
        : (eligibleAttempts[0] ?? null);
  const needsPolling = attempt ? unresolved(attempt) : false;
  const attemptId = attempt?.paymentAttemptId;
  const hasUnresolved =
    eligibleAttempts.some(unresolved) ||
    (lastAttempt ? unresolved(lastAttempt) : false) ||
    (linkedAttempt ? unresolved(linkedAttempt) : false);

  const acceptStatus = useCallback(
    async (next: AttemptView) => {
      setLastAttempt(next);
      if (!unresolved(next)) {
        await intents.finishCheckout(booking.bookingId, next);
        refresh();
        reloadPayment();
      }
    },
    [booking.bookingId, intents, refresh, reloadPayment],
  );
  useEffect(() => {
    if (!attemptId || !needsPolling) return;
    let active = true;
    let left = 20;
    let pending = false;
    const poll = async () => {
      if (!active || pending || left <= 0 || AppState.currentState === 'background') return;
      left--;
      pending = true;
      try {
        const next = await session.authorize((token) =>
          api.attempt(token, booking.bookingId, attemptId, false),
        );
        if (active) await acceptStatus(next);
      } catch {
        /* Temporary read failure leaves the manual recovery action available. */
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(() => void poll(), 3000);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        left = 20;
        void poll();
      }
    });
    void poll();
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [attemptId, needsPolling, session, booking.bookingId, acceptStatus]);

  const current = state.data?.contracts.revisions.find(
    (item) => item.revisionId === state.data?.contracts.currentRevisionId,
  );
  const approved = current?.state === 'APPROVED' ? current : null;
  const legacy = state.data?.contracts.modelVersion === 'LEGACY_PROPOSAL_V1';
  const timelineId = approved?.document.timelineRevisionId ?? proposal?.timeline?.revisionId;
  const depositAmount = approved?.document.depositAmountVnd ?? proposal?.proposal.depositAmountVnd;
  const canDeposit =
    contextReady &&
    !state.error &&
    !!state.data &&
    !!proposal &&
    (proposal.phase === 'DRAFT' || proposal.phase === 'AWAITING_DEPOSIT') &&
    !!timelineId &&
    (legacy || !!approved) &&
    !hasUnresolved;
  const view = state.data?.view;
  const gate = view
    ? balanceGate(booking.phase, view.billingRevision, view.balancePaymentEligibility)
    : null;
  const start = async (purpose: 'DEPOSIT' | 'BALANCE') => {
    if (
      !contextReady ||
      state.error ||
      starting.current ||
      command.pending ||
      state.loading ||
      !state.data ||
      hasUnresolved ||
      (purpose === 'DEPOSIT' ? !canDeposit : !gate?.allowed || !view)
    )
      return;
    starting.current = true;
    try {
      const amount = purpose === 'DEPOSIT' ? depositAmount! : view!.totals.outstandingVnd;
      const agreed = await confirmModal.confirm({
        title: purpose === 'DEPOSIT' ? 'Tạo mã QR đặt cọc' : 'Tạo mã QR thanh toán',
        message: `${purpose === 'DEPOSIT' ? 'Khoản đặt cọc' : 'Số tiền còn lại'} là ${money(amount)}. Bạn muốn tạo mã QR để thanh toán khoản này?`,
        confirmText: 'Tạo mã QR',
        cancelText: 'Để sau',
      });
      if (!agreed) return;
      await command.run(async () => {
        const depositBody: DepositBody = {
          timelineRevisionId: timelineId!,
          ...(approved
            ? { contractRevisionId: approved.revisionId, documentDigest: approved.documentDigest }
            : {}),
        };
        const checkout =
          purpose === 'DEPOSIT'
            ? await intents.run(`deposit:${booking.bookingId}`, depositBody, (key) =>
                session.authorize((token) =>
                  billing.startDeposit(token, booking.bookingId, depositBody, key),
                ),
              )
            : await intents.runCheckout(
                booking.bookingId,
                { expectedBillingRevision: view!.billingRevision },
                (key, stableBody) =>
                  session.authorize((token) =>
                    billing.startBalance(
                      token,
                      booking.bookingId,
                      stableBody as { expectedBillingRevision: number },
                      key,
                    ),
                  ),
              );
        checkedCheckoutUrl(checkout.checkoutUrl);
        setLastAttempt({ ...checkout, amountVnd: amount, purpose, applicationStatus: null });
      }, 'Quét mã QR bên dưới để thanh toán. Khi thanh toán xong, chọn “Kiểm tra trạng thái” để xem kết quả.');
    } finally {
      starting.current = false;
    }
  };

  const check = async () => {
    if (!attempt || checking.current) return;
    checking.current = true;
    try {
      await command.run(
        async () =>
          acceptStatus(
            await session.authorize((token) =>
              api.attempt(token, booking.bookingId, attempt.paymentAttemptId, true),
            ),
          ),
        'Đã cập nhật trạng thái giao dịch.',
      );
    } finally {
      checking.current = false;
    }
  };
  const reopenable =
    !!attempt &&
    ['CREATED', 'PENDING', 'UNKNOWN'].includes(attempt.status) &&
    now < Date.parse(attempt.expiresAt) &&
    (attempt.purpose === 'DEPOSIT' || booking.phase === 'COMPLETED');
  let safeUrl: string | null = null;
  if (reopenable && attempt?.checkoutUrl) {
    try {
      safeUrl = checkedCheckoutUrl(attempt.checkoutUrl);
    } catch {
      /* Never open an untrusted checkout URL. */
    }
  }

  return (
    <Page title="Thanh toán">
      <ReadState state={state} />
      <Feedback command={command} />
      {attempt && (
        <Section title="Giao dịch đang xem">
          <Text style={s.heading}>
            {attempt.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán phần còn lại'} ·{' '}
            {money(attempt.amountVnd)}
          </Text>
          <Text>{statusLabels[attempt.status] ?? 'Chưa rõ kết quả'}</Text>
          {attempt.status === 'SUCCEEDED' && attempt.applicationStatus !== 'SUCCEEDED' && (
            <Notice>
              Khoản thanh toán đã được xác nhận. Thông tin tiệc đang cập nhật, hãy chờ trước khi tạo
              giao dịch mới.
            </Notice>
          )}
          <Text style={s.muted}>
            Hết hạn: {new Date(attempt.expiresAt).toLocaleString('vi-VN')}
          </Text>
          {safeUrl && <PaymentQr checkoutUrl={safeUrl} expiresAt={attempt.expiresAt} now={now} />}
          {!safeUrl && needsPolling && (
            <Notice>
              {now < Date.parse(attempt.expiresAt)
                ? 'Chưa thể hiển thị mã QR. Hãy kiểm tra trạng thái giao dịch.'
                : 'Mã QR đã hết hạn. Nếu đã trả tiền, hãy kiểm tra trạng thái giao dịch.'}
            </Notice>
          )}
          <Action
            label="Kiểm tra trạng thái"
            onPress={() => void check()}
            disabled={command.pending}
            secondary
          />
        </Section>
      )}
      {proposal && (proposal.phase === 'DRAFT' || proposal.phase === 'AWAITING_DEPOSIT') && (
        <Section title="Khoản đặt cọc">
          {depositAmount !== undefined && <Text style={s.amount}>{money(depositAmount)}</Text>}
          {!legacy && !approved && (
            <Notice>Hợp đồng hiện tại cần được hai bên duyệt trước khi đặt cọc.</Notice>
          )}
          {hasUnresolved && (
            <Notice>Giao dịch trước chưa hoàn tất. Hãy kiểm tra giao dịch đó trước.</Notice>
          )}
          <Action
            label="Đặt cọc qua VNPay"
            disabled={!canDeposit || command.pending || state.loading}
            onPress={() => void start('DEPOSIT')}
          />
          <Action
            label="Xem hợp đồng"
            variant="text"
            onPress={() => navigate('agreement', { agreementStep: 'contract' })}
          />
        </Section>
      )}
      {view && (
        <>
          <Section title="Công nợ">
            <View style={s.summaryPanel}>
              <Text style={s.muted}>Còn phải thanh toán</Text>
              <Text selectable style={s.amount}>
                {money(view.totals.outstandingVnd)}
              </Text>
              {view.totals.creditVnd > 0 && (
                <Text>Thanh toán thừa: {money(view.totals.creditVnd)}</Text>
              )}
              {gate && !gate.allowed && <Notice>{gate.message}</Notice>}
              <Action
                label="Thanh toán phần còn lại"
                disabled={
                  !contextReady ||
                  !!state.error ||
                  !gate?.allowed ||
                  hasUnresolved ||
                  command.pending ||
                  state.loading
                }
                onPress={() => void start('BALANCE')}
              />
            </View>
            <Disclosure title="Chi tiết công nợ" variant="panel">
              <LedgerRow label="Tổng nghĩa vụ" amount={view.totals.acceptedChargesVnd} />
              <LedgerRow label="Đã thanh toán" amount={view.totals.paidVnd} />
              <LedgerRow label="Đã hoàn tiền" amount={view.totals.refundedVnd} />
              <LedgerRow label="Thanh toán thừa" amount={view.totals.creditVnd} />
            </Disclosure>
          </Section>
          <PaymentHistory
            key={`${view.billingRevision}:${view.nextCursor ?? ''}`}
            session={session}
            bookingId={booking.bookingId}
            view={view}
          />
        </>
      )}
      {booking.accessLevel === 'FULL' &&
        booking.phase !== 'COMPLETED' &&
        (!view || proposal?.completion?.pending || booking.phase === 'CANCELLED') && (
          <CompletionNotice booking={booking} proposal={proposal} navigate={navigate} />
        )}
      <Action
        label="Cập nhật thanh toán"
        onPress={state.reload}
        disabled={command.pending}
        variant="text"
      />
    </Page>
  );
}

function LedgerRow({ label, amount }: { label: string; amount: number }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${money(amount)}`} style={p.ledgerRow}>
      <Text style={p.ledgerLabel}>{label}</Text>
      <Text selectable style={p.ledgerAmount}>
        {money(amount)}
      </Text>
    </View>
  );
}

function PaymentHistory({
  session,
  bookingId,
  view,
}: {
  session: WorkspaceProps['session'];
  bookingId: string;
  view: BillingView;
}) {
  const [extra, setExtra] = useState<BillingView['history']>([]);
  const [cursor, setCursor] = useState(view.nextCursor);
  const command = useCommand(() => {});
  return (
    <Disclosure title="Lịch sử giao dịch" variant="panel">
      {[...view.history, ...extra].map((entry) => (
        <View key={entry.ledgerEntryId} style={p.transaction}>
          <View style={p.transactionHeading}>
            <Text style={p.transactionTitle}>
              {entry.kind === 'PAYMENT'
                ? 'Thanh toán'
                : entry.kind === 'REFUND'
                  ? 'Hoàn tiền'
                  : entry.kind === 'CHARGE'
                    ? 'Nghĩa vụ thanh toán'
                    : 'Điều chỉnh'}
            </Text>
            <Text selectable style={p.transactionAmount}>
              {money(entry.amountVnd)}
            </Text>
          </View>
          <Text style={p.transactionDate}>
            {new Date(entry.occurredAt).toLocaleString('vi-VN')}
          </Text>
        </View>
      ))}
      {view.history.length === 0 && extra.length === 0 && (
        <View style={p.emptyHistory}>
          <View accessible={false} style={p.emptyIcon}>
            <FileTextIcon size={22} color={hy.primary} />
          </View>
          <Text style={p.emptyTitle}>Chưa có giao dịch</Text>
          <Text style={p.emptyDescription}>
            Các khoản phải trả, thanh toán, hoàn tiền và điều chỉnh sẽ xuất hiện tại đây khi được
            ghi nhận.
          </Text>
        </View>
      )}
      {cursor && (
        <Action
          label="Xem thêm giao dịch"
          disabled={command.pending}
          variant="text"
          onPress={() =>
            void command.run(async () => {
              const next = await session.authorize((token) =>
                billing.load(token, bookingId, {
                  cursor,
                  throughBillingRevision: view.billingRevision,
                }),
              );
              setExtra((old) => [...old, ...next.history]);
              setCursor(next.nextCursor);
            }, 'Đã tải thêm giao dịch.')
          }
        />
      )}
      <Feedback command={command} />
    </Disclosure>
  );
}

const p = StyleSheet.create({
  ledgerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: hy.rule,
  },
  ledgerLabel: { fontSize: 13, lineHeight: 21, color: hy.muted, flexGrow: 1, maxWidth: '100%' },
  ledgerAmount: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: hy.semibold,
    color: hy.ink,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 'auto',
    maxWidth: '100%',
    fontVariant: ['tabular-nums'],
  },
  transaction: { paddingVertical: 16, gap: 6, borderTopWidth: 1, borderTopColor: hy.rule },
  transactionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 4,
  },
  transactionTitle: {
    fontFamily: hy.medium,
    fontSize: 14,
    lineHeight: 22,
    color: hy.ink,
    flexGrow: 1,
    maxWidth: '100%',
  },
  transactionAmount: {
    fontFamily: hy.semibold,
    fontSize: 15,
    lineHeight: 23,
    color: hy.primary,
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 'auto',
    maxWidth: '100%',
    fontVariant: ['tabular-nums'],
  },
  transactionDate: { fontSize: 12, lineHeight: 19, color: hy.muted },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: hy.rule,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    backgroundColor: hy.primarySoft,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: hy.semibold,
    fontSize: 14,
    lineHeight: 22,
    color: hy.ink,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 21,
    color: hy.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
