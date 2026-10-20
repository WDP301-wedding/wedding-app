import { money } from '@/lib/formatters';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import {
  HyText as Text,
  HyCard,
  HyRow,
  HyButton,
  HyScreen,
  HyState,
  HyEnter,
} from '@/components/hy-ui';
import { hy } from '@/theme';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { FileTextIcon } from '@/components/v0-icons';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from './use-hy-resource';
const billing = createCoupleBillingGateway();
const api = createRestoredFlowsGateway();

const FINANCE_RING_DOTS = Array.from({ length: 72 }, (_, i) => {
  const angle = i * 5;
  const rad = (angle * Math.PI) / 180;
  return {
    index: i,
    angle,
    left: 58 + 52 * Math.sin(rad),
    top: 58 - 52 * Math.cos(rad),
    rotate: `${angle}deg`,
  };
});

const FinanceProgressRing = React.memo(function FinanceProgressRing({
  pct,
}: {
  pct: number | null;
}) {
  const filledCount = pct !== null ? Math.round((72 * pct) / 100) : 0;
  return (
    <View
      accessibilityLabel={pct === null ? 'Chưa có số liệu thanh toán' : `Đã thanh toán ${pct}%`}
      style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}
    >
      {FINANCE_RING_DOTS.map((dot) => (
        <View
          key={dot.index}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: 4,
            height: 9,
            borderRadius: 2,
            transform: [{ rotate: dot.rotate }],
            backgroundColor: pct !== null && dot.index < filledCount ? hy.primary : hy.rule,
          }}
        />
      ))}
      <Text
        style={{
          fontFamily: hy.display,
          fontSize: 30,
          fontWeight: '600',
          color: hy.primary,
        }}
      >
        {pct === null ? '—' : `${pct}%`}
      </Text>
      <Text style={{ fontSize: 11, color: hy.muted }}>đã thanh toán</Text>
    </View>
  );
});

export function HyFinance({ activeBooking, session, onNavigate }: V0CommonProps) {
  const bookingId = activeBooking?.bookingId;
  const loader = useCallback(async () => {
    if (!session || !bookingId) throw new Error('Chưa chọn tiệc cưới.');
    const [view, contracts] = await Promise.allSettled([
      session.authorize((t) => billing.load(t, bookingId)),
      session.authorize((t) => api.readContracts(t, bookingId)),
    ]);
    return {
      view: view.status === 'fulfilled' ? view.value : null,
      contracts: contracts.status === 'fulfilled' ? contracts.value : null,
      billingError:
        view.status === 'rejected'
          ? view.reason instanceof Error
            ? view.reason.message
            : 'Chưa tải được số dư'
          : null,
    };
  }, [session, bookingId]);
  const { data, loading, error, reload } = useHyResource(loader, {
    key: bookingId ? `booking:${bookingId}:finance` : undefined,
    ttlMs: 30_000,
  });
  const totals = data?.view?.totals;
  const pct =
    totals && totals.acceptedChargesVnd > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((totals.netPaidVnd / totals.acceptedChargesVnd) * 100)),
        )
      : null;
  const documents = [
    ['contracts', 'Hợp đồng', 'Phiên bản, chữ ký hai bên & PDF'],
    ['appendices', 'Phụ lục', 'Nội dung điều chỉnh & giá trị chênh lệch'],
    ['print', 'Đơn in thiệp', 'Báo giá và tiến độ bàn giao'],
    ['incidentals', 'Chi phí phát sinh', 'Các khoản ghi nhận trong ngày cưới'],
    ['invoices', 'Hóa đơn cuối', 'Lịch sử hóa đơn đã phát hành'],
  ] as const;
  return (
    <HyScreen onRefresh={() => void reload()} refreshing={loading}>
      {loading && !data ? (
        <HyState kind="loading" />
      ) : error ? (
        <HyState kind="error" body={error} onRetry={() => void reload()} />
      ) : (
        <>
          <HyEnter>
            <HyCard
              style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 24 }}
            >
              <FinanceProgressRing pct={pct} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 14, color: hy.secondary }}>Đã thanh toán</Text>
                <Text style={{ fontSize: 22, fontWeight: '600' }}>
                  {totals ? money(totals.netPaidVnd) : 'Chưa có dữ liệu'}
                </Text>
                <Text style={{ fontSize: 13, color: hy.muted }}>
                  {totals
                    ? `trên tổng ${money(totals.acceptedChargesVnd)}`
                    : 'Tải lại khi nhà hàng gửi thông tin.'}
                </Text>
              </View>
            </HyCard>
          </HyEnter>
          {data?.billingError && (
            <HyState
              kind="error"
              title="Chưa tải được công nợ"
              body={data.billingError}
              onRetry={() => void reload()}
            />
          )}
          <HyCard style={{ backgroundColor: hy.primarySoft, borderColor: hy.primarySoft }}>
            <Text style={{ fontSize: 14, color: hy.secondary }}>Số dư cần trả</Text>
            <Text style={{ fontSize: 32, lineHeight: 40, fontWeight: '600', color: hy.primary }}>
              {totals ? money(totals.outstandingVnd) : 'Chưa xác định'}
            </Text>
            <HyButton label="Xem thanh toán & giao dịch" onPress={() => onNavigate('billing')} />
            <Text style={{ fontSize: 12, color: hy.secondary }}>
              Kết quả được xác nhận từ máy chủ. Nếu giao dịch chưa rõ kết quả, hãy kiểm tra trước
              khi thanh toán lại.
            </Text>
          </HyCard>
        </>
      )}
      <Text style={{ fontSize: 16, fontWeight: '600' }}>Tài liệu của hai bạn</Text>
      {documents.map(([screen, title, subtitle]) => (
        <HyRow
          key={screen}
          title={title}
          subtitle={subtitle}
          icon={<FileTextIcon color={hy.primary} />}
          onPress={() => onNavigate(screen)}
        />
      ))}
    </HyScreen>
  );
}
