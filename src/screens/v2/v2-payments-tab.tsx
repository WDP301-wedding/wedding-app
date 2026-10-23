import { toast } from '@/lib/toast/store';
import { reportError } from '@/lib/toast/feedback';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, View } from 'react-native';
import {
  HyText as Text,
  HyCard,
  HyButton,
  HyRow,
  HyScreen,
  HyEnter,
  HySheet,
  HyBadge,
  OfflineBanner,
  HyAlert,
} from '@/components/hy-ui';
import { hy } from '@/theme';
import {
  createCoupleBillingGateway,
  type AttemptView,
  type BillingView,
  type BalanceBody,
} from '@/features/payments-billing/billing-api';
import { createBillingIntents } from '@/features/payments-billing/billing-intents';
import { FileTextIcon, WalletIcon } from '@/components/v0-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { readPublicEnv } from '@/lib/env';
import { ApiClientError } from '@/lib/api/client';
import { money } from '@/lib/formatters';
import { completed, kinds } from '../billing-sections';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from '../hy/use-hy-resource';
import { sharedResourceStore } from '../hy/resource-store';

const billing = createCoupleBillingGateway();

const sourceLabels: Record<string, string> = {
  BASE_BOOKING: 'Tiệc cơ sở',
  CONTRACT: 'Hợp đồng',
  CONTRACT_APPENDIX: 'Phụ lục hợp đồng',
  INCIDENTAL_FINALIZATION: 'Quyết toán phát sinh',
  INVOICE_ADJUSTMENT: 'Điều chỉnh hóa đơn',
  PRINT_ORDER: 'Đơn đặt in',
  PAYMENT_ATTEMPT: 'Giao dịch thanh toán',
  PRINT_CREDIT: 'Tín dụng in ấn',
  MANUAL_REFUND: 'Hoàn tiền thủ công',
};

const PAYMENT_RING_DOTS = Array.from({ length: 72 }, (_, i) => {
  const angle = i * 5;
  const rad = (angle * Math.PI) / 180;
  return {
    index: i,
    angle,
    left: 53 + 46 * Math.sin(rad),
    top: 53 - 46 * Math.cos(rad),
    rotate: `${angle}deg`,
  };
});

const PaymentProgressRing = React.memo(function PaymentProgressRing({
  pct,
}: {
  pct: number | null;
}) {
  const filledCount = pct !== null ? Math.round((72 * pct) / 100) : 0;
  return (
    <View
      accessibilityLabel={pct === null ? 'Chưa có số liệu thanh toán' : `Đã thanh toán ${pct}%`}
      style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}
    >
      {PAYMENT_RING_DOTS.map((dot) => (
        <View
          key={dot.index}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: 3.5,
            height: 8,
            borderRadius: 2,
            transform: [{ rotate: dot.rotate }],
            backgroundColor: pct !== null && dot.index < filledCount ? hy.primary : hy.rule,
          }}
        />
      ))}
      <Text
        style={{
          fontFamily: hy.bold,
          fontSize: 26,
          fontWeight: '700',
          color: hy.primary,
        }}
      >
        {pct === null ? '—' : `${pct}%`}
      </Text>
      <Text style={{ fontSize: 11, color: hy.muted }}>tiến độ</Text>
    </View>
  );
});

const ActiveAttemptCard = React.memo(function ActiveAttemptCard({
  attemptResult,
  checkingStatus,
  onCheckStatus,
}: {
  attemptResult: AttemptView;
  checkingStatus: boolean;
  onCheckStatus: () => void;
}) {
  const isSucceeded = attemptResult.status === 'SUCCEEDED';
  const isPending = attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED';
  const isUnknown = attemptResult.status === 'UNKNOWN';

  return (
    <HyCard
      style={{
        backgroundColor: isSucceeded ? hy.surface : hy.surfaceMuted,
        gap: 8,
        borderWidth: 1,
        borderColor: isSucceeded ? hy.primary : hy.rule,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700' }}>
          {isSucceeded
            ? 'Thanh toán thành công'
            : isPending
              ? 'Đang xác nhận kết quả thanh toán'
              : isUnknown
                ? 'Chưa rõ trạng thái giao dịch'
                : 'Thanh toán không thành công'}
        </Text>
        <HyBadge
          status={isSucceeded ? 'done' : isPending ? 'waiting' : isUnknown ? 'neutral' : 'locked'}
          label={
            isSucceeded
              ? 'Thành công'
              : isPending
                ? 'Đang xác nhận'
                : isUnknown
                  ? 'Chưa rõ'
                  : 'Thất bại'
          }
        />
      </View>
      <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
        {isSucceeded
          ? `Số tiền ${money(attemptResult.amountVnd)} đã được ghi nhận vào tài khoản tiệc cưới.`
          : isPending
            ? 'Máy chủ đang đối soát với cổng VNPay. Vui lòng không tạo giao dịch trùng lặp.'
            : isUnknown
              ? 'Giao dịch chưa có kết quả cuối cùng từ VNPay. Nhà hàng sẽ đối soát trước khi ghi nhận.'
              : 'Giao dịch bị huỷ hoặc chưa hoàn tất thanh toán.'}
      </Text>
      {attemptResult.paymentAttemptId ? (
        <Text style={{ fontSize: 11, color: hy.muted }}>
          Mã giao dịch: {attemptResult.paymentAttemptId}
        </Text>
      ) : null}
      {!completed(attemptResult) && (
        <HyButton
          label={checkingStatus ? 'Đang kiểm tra kết quả…' : 'Kiểm tra lại trạng thái'}
          variant="outline"
          disabled={checkingStatus}
          busy={checkingStatus}
          onPress={onCheckStatus}
        />
      )}
    </HyCard>
  );
});

const TransactionHistoryCard = React.memo(function TransactionHistoryCard({
  historyList,
  nextCursor,
  loadingMore,
  onLoadMore,
}: {
  historyList: readonly BillingView['history'][number][];
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  if (historyList.length === 0) return null;
  return (
    <HyCard style={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>Lịch sử giao dịch sổ cái</Text>
      {historyList.map((entry, idx) => {
        const isPayment = entry.kind === 'PAYMENT';
        const isRefund = entry.kind === 'REFUND';
        const isAdjustment = entry.kind === 'CREDIT_ADJUSTMENT';
        const badgeStatus = isPayment ? 'done' : isRefund ? 'waiting' : 'neutral';
        const badgeLabel = kinds[entry.kind] ?? entry.kind;
        const sourceName = sourceLabels[entry.sourceType] ?? entry.sourceType;
        return (
          <View
            key={entry.ledgerEntryId}
            style={{
              paddingVertical: 10,
              borderBottomWidth: idx < historyList.length - 1 ? 1 : 0,
              borderBottomColor: hy.rule,
              gap: 4,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: isRefund || isAdjustment ? hy.secondary : hy.ink,
                }}
              >
                {isRefund ? `-${money(entry.amountVnd)}` : money(entry.amountVnd)}
              </Text>
              <HyBadge status={badgeStatus} label={badgeLabel} />
            </View>
            <Text style={{ fontSize: 12, color: hy.muted }}>
              {entry.occurredAt
                ? new Date(entry.occurredAt).toLocaleString('vi-VN')
                : 'Giao dịch hệ thống'}
              {sourceName ? ` · ${sourceName}` : ''}
              {entry.paymentAttemptId ? ` · Mã: ${entry.paymentAttemptId.slice(0, 8)}…` : ''}
            </Text>
          </View>
        );
      })}
      {nextCursor && (
        <HyButton
          label={loadingMore ? 'Đang tải thêm…' : 'Tải thêm lịch sử'}
          variant="outline"
          disabled={loadingMore}
          busy={loadingMore}
          onPress={onLoadMore}
        />
      )}
    </HyCard>
  );
});

export function V2PaymentsTab({ activeBooking, session, onNavigate }: V0CommonProps) {
  const portalUrl = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<AttemptView | null>(null);
  const busyRef = useRef(false);
  const announcedResults = useRef(new Set<string>());

  // Pagination for history
  const [extraHistory, setExtraHistory] = useState<readonly BillingView['history'][number][]>([]);
  const [pagedNextCursor, setPagedNextCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const prevBookingIdRef = useRef<string | null>(null);
  if (prevBookingIdRef.current !== (activeBooking?.bookingId ?? null)) {
    prevBookingIdRef.current = activeBooking?.bookingId ?? null;
    if (extraHistory.length > 0) setExtraHistory([]);
    if (pagedNextCursor !== undefined) setPagedNextCursor(undefined);
  }

  const sessionSnapshot = session?.snapshot();
  const accountId =
    sessionSnapshot?.status === 'authenticated' ? sessionSnapshot.actor.accountId : 'device';
  const intents = useMemo(() => createBillingIntents(accountId), [accountId]);

  const bookingId = activeBooking?.bookingId;

  const loader = useCallback(async () => {
    if (!session || !bookingId) throw new Error('Chưa chọn tiệc cưới.');
    try {
      const view = await session.authorize((t) => billing.load(t, bookingId));
      return {
        view,
        billingError: null,
      };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof ApiClientError && (err.code || err.requestId)
          ? `${err.message} (${[err.code ? `Mã: ${err.code}` : null, err.requestId ? `ID: ${err.requestId}` : null].filter(Boolean).join(', ')})`
          : err instanceof Error
            ? err.message
            : 'Chưa tải được số dư';
      return {
        view: null,
        billingError: errorMsg,
      };
    }
  }, [session, bookingId]);

  const { data, loading, reload } = useHyResource(loader, {
    key: bookingId ? `booking:${bookingId}:billing` : undefined,
    ttlMs: 30_000,
  });

  const historyList = useMemo(() => {
    const base = data?.view?.history ?? [];
    if (extraHistory.length === 0) return base;
    const existingIds = new Set(base.map((e) => e.ledgerEntryId));
    const newItems = extraHistory.filter((e) => !existingIds.has(e.ledgerEntryId));
    return [...base, ...newItems];
  }, [data?.view?.history, extraHistory]);

  const nextCursor =
    pagedNextCursor !== undefined ? pagedNextCursor : (data?.view?.nextCursor ?? null);

  const reconcileAttempt = useCallback(
    async (attemptId: string) => {
      if (!session || !bookingId) return;
      try {
        const res = await session.authorize((t) => billing.loadAttempt(t, bookingId, attemptId));
        setAttemptResult(res);
        if (completed(res)) {
          await intents.finishCheckout(bookingId, res);
          const resultKey = `${accountId}:${bookingId}:${attemptId}:${res.status}:${res.applicationStatus}`;
          if (!announcedResults.current.has(resultKey)) {
            announcedResults.current.add(resultKey);
            if (announcedResults.current.size > 20) {
              const oldest = announcedResults.current.values().next().value;
              if (oldest) announcedResults.current.delete(oldest);
            }
            if (res.status === 'SUCCEEDED' && res.applicationStatus === 'SUCCEEDED')
              toast.success('Máy chủ đã ghi nhận thanh toán.');
            else if (res.status === 'FAILED')
              toast.info('Giao dịch chưa hoàn tất. Xem chi tiết trạng thái trước khi thử lại.');
          }
          sharedResourceStore.invalidate(`booking:${bookingId}:billing`);
        }
      } catch {
        setPayError(
          'Chưa đối soát được giao dịch. Kiểm tra lại trạng thái trước khi thanh toán tiếp.',
        );
      }
    },
    [session, bookingId, intents, accountId],
  );

  // Recover in-flight checkout attempt when booking mounts
  useEffect(() => {
    if (!activeBooking || !session) return;
    const bookingId = activeBooking.bookingId;
    let active = true;
    void (async () => {
      try {
        const recovered = await intents.recoverCheckout(bookingId);
        if (recovered?.checkout?.paymentAttemptId && active) {
          const attemptId = recovered.checkout.paymentAttemptId;
          setActiveAttemptId(attemptId);
          await reconcileAttempt(attemptId);
        }
      } catch {
        // Recovery read error handled gracefully
      }
    })();
    return () => {
      active = false;
    };
  }, [activeBooking, intents, session, reconcileAttempt]);

  // Listen for AppState changes to re-query payment status on returning to foreground
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        void reload();
        if (activeBooking && session) {
          void (async () => {
            const bookingId = activeBooking.bookingId;
            const targetAttemptId =
              activeAttemptId ??
              (await intents.recoverCheckout(bookingId))?.checkout?.paymentAttemptId ??
              null;
            if (targetAttemptId) {
              await reconcileAttempt(targetAttemptId);
            }
          })();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [activeAttemptId, session, activeBooking, reload, intents, reconcileAttempt]);

  // Manual status check for pending or unknown attempt
  const handleCheckAttemptStatus = async () => {
    if (!session || !activeBooking || !activeAttemptId || checkingStatus) return;
    setCheckingStatus(true);
    try {
      await reconcileAttempt(activeAttemptId);
      await reload();
    } finally {
      setCheckingStatus(false);
    }
  };

  // Handle Balance Payment checkout
  const handleProceedToVNPay = async () => {
    if (busyRef.current) return;
    if (!session || !activeBooking || outstanding <= 0) return;
    if (data?.view?.billingRevision === undefined) {
      setPayError(
        'Chưa tải được phiên bản số dư máy chủ. Vui lòng tải lại trang trước khi thanh toán.',
      );
      return;
    }
    if (attemptResult && !completed(attemptResult)) {
      setPayError(
        'Giao dịch trước đó đang được xử lý. Vui lòng kiểm tra trạng thái trước khi tạo giao dịch mới.',
      );
      return;
    }
    busyRef.current = true;
    setPaying(true);
    setPayError(null);
    try {
      const expectedBillingRevision = data.view.billingRevision;
      const checkout = await intents.runCheckout(
        activeBooking.bookingId,
        { expectedBillingRevision },
        (idempotencyKey, stableBody) =>
          session.authorize((t) =>
            billing.startBalance(
              t,
              activeBooking.bookingId,
              stableBody as BalanceBody,
              idempotencyKey,
            ),
          ),
      );
      setConfirmOpen(false);
      setActiveAttemptId(checkout.paymentAttemptId);
      // Open VNPay securely
      await openBrowserAsync(checkout.checkoutUrl);
      // Immediately reconcile after returning from browser
      await reconcileAttempt(checkout.paymentAttemptId);
      await reload();
    } catch (caught: unknown) {
      setPayError(
        caught instanceof Error
          ? caught.message
          : 'Chưa thể khởi tạo giao dịch thanh toán. Vui lòng thử lại.',
      );
    } finally {
      busyRef.current = false;
      setPaying(false);
    }
  };

  const handleLoadMoreHistory = async () => {
    if (!session || !activeBooking || !nextCursor || loadingMore || !data?.view) return;
    setLoadingMore(true);
    try {
      const res = await session.authorize((t) =>
        billing.load(t, activeBooking.bookingId, {
          cursor: nextCursor,
          throughBillingRevision: data.view!.billingRevision,
        }),
      );
      setExtraHistory((prev) => [...prev, ...res.history]);
      setPagedNextCursor(res.nextCursor);
    } catch (error) {
      reportError(error);
      // Preserve existing ledger entries.
    } finally {
      setLoadingMore(false);
    }
  };

  const totals = data?.view?.totals;
  const hasTotals = Boolean(totals);
  const netPaid = totals?.netPaidVnd ?? 0;
  const acceptedCharges = totals?.acceptedChargesVnd ?? 0;
  const outstanding = totals?.outstandingVnd ?? 0;
  const pct =
    acceptedCharges > 0
      ? Math.max(0, Math.min(100, Math.round((netPaid / acceptedCharges) * 100)))
      : null;

  const phase = activeBooking?.phase ?? 'DRAFT';
  const pre = phase === 'DRAFT' || phase === 'AWAITING_DEPOSIT';
  const isTerminalPhase = phase === 'CANCELLED' || phase === 'COMPLETED';

  const documents = [
    ['contracts', 'Hợp đồng thương mại', 'Phiên bản hợp đồng, điều khoản & tệp PDF'],
    ['appendices', 'Phụ lục hợp đồng', 'Nội dung điều chỉnh và giá trị chênh lệch'],
    ['invoices', 'Hóa đơn quyết toán', 'Bảng kê chi tiết từng dòng dịch vụ đã chốt'],
    ['incidentals', 'Chi phí phát sinh', 'Các khoản dịch vụ phát sinh ngoài giờ / phục vụ'],
    ['print', 'Đơn đặt in thiệp', 'Tiến độ sản xuất in ấn và ngày bàn giao'],
  ] as const;

  return (
    <>
      <HyScreen onRefresh={() => void reload()} refreshing={loading}>
        {/* Offline notice if any */}
        <OfflineBanner visible={false} />

        {/* Billing Error Notice if loading failed */}
        {data?.billingError && data.view === null && (
          <HyCard style={{ backgroundColor: hy.errorBg, borderColor: hy.error, gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: hy.error }}>
              Lỗi tải số dư thanh toán
            </Text>
            <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
              {data.billingError}
            </Text>
            <HyButton label="Thử lại" onPress={() => void reload()} />
          </HyCard>
        )}

        {/* Payment Attempt Result Banner (4 states) */}
        {attemptResult && (
          <ActiveAttemptCard
            attemptResult={attemptResult}
            checkingStatus={checkingStatus}
            onCheckStatus={() => void handleCheckAttemptStatus()}
          />
        )}

        {/* Ví tiệc: Progress Ring & Summary */}
        <HyEnter>
          <HyCard style={{ gap: 16, paddingVertical: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <WalletIcon size={20} color={hy.primary} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: hy.ink }}>Ví tiệc cưới</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              {/* Progress Ring Indicator */}
              <PaymentProgressRing pct={pct} />

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 13, color: hy.secondary }}>Đã thanh toán</Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: hy.ink,
                    fontFamily: hy.bold,
                  }}
                >
                  {hasTotals ? money(netPaid) : '—'}
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, marginTop: 2 }}>
                  Tổng chi phí: {hasTotals ? money(acceptedCharges) : '—'}
                </Text>
                <Text style={{ fontSize: 12, color: hy.primary, fontWeight: '600' }}>
                  Còn lại: {hasTotals ? money(outstanding) : '—'}
                </Text>
              </View>
            </View>
          </HyCard>
        </HyEnter>

        {/* Primary CTA Card */}
        <HyCard style={{ backgroundColor: hy.primarySoft, borderColor: hy.primarySoft, gap: 10 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 13, color: hy.secondary }}>Số dư cần thanh toán</Text>
            <Text
              style={{
                fontSize: 30,
                lineHeight: 36,
                fontWeight: '700',
                color: hy.primary,
                fontFamily: hy.bold,
              }}
            >
              {hasTotals ? money(outstanding) : 'Chưa xác định'}
            </Text>
          </View>

          {!hasTotals ? (
            <HyButton
              label={data?.billingError ? 'Thử lại tải số dư' : 'Đang tải thông tin số dư…'}
              disabled={loading || !data?.billingError}
              onPress={() => void reload()}
            />
          ) : pre ? (
            <HyButton
              label="Hoàn tất đặt cọc trên Web"
              onPress={() => {
                if (portalUrl) void openBrowserAsync(portalUrl);
              }}
            />
          ) : isTerminalPhase ? (
            <HyButton label="Tiệc cưới đã kết thúc vòng đời" disabled onPress={() => {}} />
          ) : attemptResult && !completed(attemptResult) ? (
            <HyButton
              label="Giao dịch đang xử lý (Kiểm tra lại)"
              variant="outline"
              disabled={checkingStatus}
              busy={checkingStatus}
              onPress={() => void handleCheckAttemptStatus()}
            />
          ) : outstanding > 0 ? (
            <HyButton
              label={`Thanh toán số dư (${money(outstanding)})`}
              onPress={() => {
                setPayError(null);
                setConfirmOpen(true);
              }}
            />
          ) : (
            <HyButton label="Đã thanh toán đủ toàn bộ" disabled onPress={() => {}} />
          )}

          <Text style={{ fontSize: 12, color: hy.muted, lineHeight: 16 }}>
            Kết quả thanh toán luôn được xác thực lại từ máy chủ Hỷ Yến và cổng VNPay.
          </Text>
        </HyCard>

        {/* Documents Section */}
        <Text style={{ fontSize: 16, fontWeight: '700', paddingHorizontal: 4, marginTop: 4 }}>
          Tài liệu & hồ sơ tài chính
        </Text>
        {documents.map(([screen, title, subtitle]) => (
          <HyRow
            key={screen}
            title={title}
            subtitle={subtitle}
            icon={<FileTextIcon color={hy.primary} />}
            onPress={() => onNavigate(screen as any)}
          />
        ))}

        {/* Transaction History Section */}
        <TransactionHistoryCard
          historyList={historyList}
          nextCursor={nextCursor}
          loadingMore={loadingMore}
          onLoadMore={() => void handleLoadMoreHistory()}
        />
      </HyScreen>

      {/* Pre-VNPay Confirmation Sheet */}
      <HySheet
        visible={confirmOpen}
        title="Xác nhận thanh toán"
        onClose={() => setConfirmOpen(false)}
      >
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
            Bạn đang chuẩn bị thực hiện thanh toán trực tuyến qua cổng thanh toán bảo mật VNPay.
          </Text>

          <HyCard style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: hy.muted }}>Số tiền thanh toán:</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: hy.primary }}>
                {money(outstanding)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: hy.muted }}>Cổng thanh toán:</Text>
              <Text style={{ fontSize: 13, fontWeight: '600' }}>VNPay</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: hy.muted }}>Tiệc cưới:</Text>
              <Text style={{ fontSize: 13, fontWeight: '500' }}>{activeBooking?.hallName}</Text>
            </View>
          </HyCard>

          {payError ? (
            <HyAlert
              variant="error"
              message={payError}
              onDismiss={() => setPayError(null)}
              style={{ marginVertical: 4 }}
            />
          ) : null}

          <HyButton
            label={paying ? 'Đang chuyển sang VNPay...' : 'Xác nhận & Mở VNPay'}
            disabled={paying}
            busy={paying}
            onPress={() => void handleProceedToVNPay()}
          />
          <HyButton label="Hủy" variant="outline" onPress={() => setConfirmOpen(false)} />
        </View>
      </HySheet>
    </>
  );
}
