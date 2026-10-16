import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from '@/components/hy-ui';
import { hy } from '@/theme';
import {
  createCoupleBillingGateway,
  type AttemptView,
} from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { FileTextIcon, WalletIcon } from '@/components/v0-icons';
import { openBrowserAsync } from 'expo-web-browser';
import { readPublicEnv } from '@/lib/env';
import { createDeterministicIdempotencyKey } from '@/lib/idempotency';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from '../hy/use-hy-resource';

const billing = createCoupleBillingGateway();
const api = createRestoredFlowsGateway();

function money(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
}

export function V2PaymentsTab({ activeBooking, session, onNavigate }: V0CommonProps) {
  const portalUrl = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<AttemptView | null>(null);

  const loader = useCallback(async () => {
    if (!session || !activeBooking) throw new Error('Chưa chọn tiệc cưới.');
    const bookingId = activeBooking.bookingId;
    const [viewRes, contractsRes] = await Promise.allSettled([
      session.authorize((t) => billing.load(t, bookingId)),
      session.authorize((t) => api.readContracts(t, bookingId)),
    ]);
    return {
      view: viewRes.status === 'fulfilled' ? viewRes.value : null,
      contracts: contractsRes.status === 'fulfilled' ? contractsRes.value : null,
      billingError:
        viewRes.status === 'rejected'
          ? viewRes.reason instanceof Error
            ? viewRes.reason.message
            : 'Chưa tải được số dư'
          : null,
    };
  }, [session, activeBooking]);

  const { data, loading, reload } = useHyResource(loader);

  const totals = data?.view?.totals;
  const netPaid = totals?.netPaidVnd ?? 0;
  const acceptedCharges = totals?.acceptedChargesVnd ?? 0;
  const outstanding = totals?.outstandingVnd ?? 0;
  const pct =
    acceptedCharges > 0
      ? Math.max(0, Math.min(100, Math.round((netPaid / acceptedCharges) * 100)))
      : null;

  const phase = activeBooking?.phase ?? 'DRAFT';
  const pre = phase === 'DRAFT' || phase === 'AWAITING_DEPOSIT';

  // Listen for AppState changes to re-query payment status on returning to foreground
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has returned to the foreground!
        void reload();
        if (activeAttemptId && session && activeBooking) {
          void session
            .authorize((t) => billing.loadAttempt(t, activeBooking.bookingId, activeAttemptId))
            .then((res) => {
              setAttemptResult(res);
            })
            .catch(() => {});
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [activeAttemptId, session, activeBooking, reload]);

  // Handle Balance Payment checkout
  const handleProceedToVNPay = async () => {
    if (!session || !activeBooking || outstanding <= 0) return;
    setPaying(true);
    setPayError(null);
    try {
      const key = createDeterministicIdempotencyKey(
        'payment-balance',
        activeBooking.bookingId,
        data?.view?.billingRevision ?? activeBooking.revision,
        { amountVnd: outstanding },
      );
      const checkout = await session.authorize((t) =>
        billing.startBalance(
          t,
          activeBooking.bookingId,
          {
            expectedBillingRevision: data?.view?.billingRevision ?? activeBooking.revision,
          },
          key,
        ),
      );
      setConfirmOpen(false);
      setActiveAttemptId(checkout.paymentAttemptId);
      // Open VNPay securely
      await openBrowserAsync(checkout.checkoutUrl);
      // Immediately refresh billing state
      await reload();
    } catch (caught: any) {
      setPayError(
        caught instanceof Error
          ? caught.message
          : 'Chưa thể khởi tạo giao dịch thanh toán. Vui lòng thử lại.',
      );
    } finally {
      setPaying(false);
    }
  };

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

        {/* Payment Attempt Result Banner (4 states) */}
        {attemptResult && (
          <HyCard
            style={{
              backgroundColor:
                attemptResult.status === 'SUCCEEDED'
                  ? hy.successBg
                  : attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED'
                    ? hy.warningBg
                    : attemptResult.status === 'UNKNOWN'
                      ? hy.surfaceMuted
                      : hy.errorBg,
              borderColor:
                attemptResult.status === 'SUCCEEDED'
                  ? hy.success
                  : attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED'
                    ? hy.warning
                    : attemptResult.status === 'UNKNOWN'
                      ? hy.outline
                      : hy.error,
              gap: 8,
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
                {attemptResult.status === 'SUCCEEDED'
                  ? 'Thanh toán thành công'
                  : attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED'
                    ? 'Đang xác nhận kết quả thanh toán'
                    : attemptResult.status === 'UNKNOWN'
                      ? 'Chưa rõ trạng thái giao dịch'
                      : 'Thanh toán không thành công'}
              </Text>
              <HyBadge
                status={
                  attemptResult.status === 'SUCCEEDED'
                    ? 'done'
                    : attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED'
                      ? 'waiting'
                      : attemptResult.status === 'UNKNOWN'
                        ? 'neutral'
                        : 'locked'
                }
                label={
                  attemptResult.status === 'SUCCEEDED'
                    ? 'Thành công'
                    : attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED'
                      ? 'Đang xác nhận'
                      : attemptResult.status === 'UNKNOWN'
                        ? 'Chưa rõ'
                        : 'Thất bại'
                }
              />
            </View>
            <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
              {attemptResult.status === 'SUCCEEDED'
                ? `Số tiền ${money(attemptResult.amountVnd)} đã được ghi nhận vào tài khoản tiệc cưới.`
                : attemptResult.status === 'PENDING' || attemptResult.status === 'CREATED'
                  ? 'Máy chủ đang đối soát với cổng VNPay. Vui lòng không tạo giao dịch trùng lặp.'
                  : attemptResult.status === 'UNKNOWN'
                    ? 'Giao dịch chưa có kết quả cuối cùng từ VNPay. Nhà hàng sẽ đối soát trước khi ghi nhận.'
                    : 'Giao dịch bị huỷ hoặc chưa hoàn tất thanh toán.'}
            </Text>
            {attemptResult.paymentAttemptId ? (
              <Text style={{ fontSize: 11, color: hy.muted }}>
                Mã giao dịch: {attemptResult.paymentAttemptId}
              </Text>
            ) : null}
          </HyCard>
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
              <View
                accessibilityLabel={
                  pct === null ? 'Chưa có số liệu thanh toán' : `Đã thanh toán ${pct}%`
                }
                style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}
              >
                {Array.from({ length: 72 }, (_, i) => {
                  const angle = i * 5;
                  return (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: 53 + 46 * Math.sin((angle * Math.PI) / 180),
                        top: 53 - 46 * Math.cos((angle * Math.PI) / 180),
                        width: 3.5,
                        height: 8,
                        borderRadius: 2,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor:
                          pct !== null && i < (72 * pct) / 100 ? hy.primary : hy.rule,
                      }}
                    />
                  );
                })}
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
                  {totals ? money(netPaid) : '—'}
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, marginTop: 2 }}>
                  Tổng chi phí: {totals ? money(acceptedCharges) : '—'}
                </Text>
                <Text style={{ fontSize: 12, color: hy.primary, fontWeight: '600' }}>
                  Còn lại: {totals ? money(outstanding) : '—'}
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
              {totals ? money(outstanding) : 'Chưa xác định'}
            </Text>
          </View>

          {pre ? (
            <HyButton
              label="Hoàn tất đặt cọc trên Web"
              onPress={() => {
                if (portalUrl) void openBrowserAsync(portalUrl);
              }}
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
        {data?.view?.history && data.view.history.length > 0 && (
          <HyCard style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Lịch sử giao dịch</Text>
            {data.view.history.map((tx: any, idx: number) => (
              <View
                key={tx.attemptId || idx}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: idx < data.view!.history.length - 1 ? 1 : 0,
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
                  <Text style={{ fontSize: 15, fontWeight: '600' }}>{money(tx.amountVnd)}</Text>
                  <HyBadge
                    status={
                      tx.state === 'SETTLED' || tx.state === 'SUCCESS'
                        ? 'done'
                        : tx.state === 'PENDING'
                          ? 'waiting'
                          : 'locked'
                    }
                    label={
                      tx.state === 'SETTLED' || tx.state === 'SUCCESS'
                        ? 'Đã ghi nhận'
                        : tx.state === 'PENDING'
                          ? 'Đang xử lý'
                          : 'Không thành công'
                    }
                  />
                </View>
                <Text style={{ fontSize: 12, color: hy.muted }}>
                  {tx.createdAt
                    ? new Date(tx.createdAt).toLocaleString('vi-VN')
                    : 'Giao dịch hệ thống'}
                  {tx.method ? ` · ${tx.method}` : ''}
                </Text>
              </View>
            ))}
          </HyCard>
        )}
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
            <Text accessibilityRole="alert" style={{ fontSize: 13, color: hy.error }}>
              {payError}
            </Text>
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
