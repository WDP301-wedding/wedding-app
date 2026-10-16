import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import {
  HyText as Text,
  HyCard,
  HyButton,
  HyRow,
  HyScreen,
  HyState,
  HyEnter,
  HyBadge,
} from '@/components/hy-ui';
import {
  CalendarIcon,
  UsersIcon,
  FileTextIcon,
  ImageIcon,
  WalletIcon,
  ClockIcon,
} from '@/components/v0-icons';
import { hy } from '@/theme';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { openBrowserAsync } from 'expo-web-browser';
import { readPublicEnv } from '@/lib/env';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from './use-hy-resource';

const api = createRestoredFlowsGateway();
const invitation = createAppInvitationGateway();
const coupleBilling = createCoupleBillingGateway();

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function HyParty({
  activeBooking,
  facts,
  session,
  onNavigate,
  onSwitchBooking,
  allBookings,
}: V0CommonProps) {
  const loader = useCallback(async () => {
    if (!session || !activeBooking) throw new Error('Chưa chọn tiệc cưới.');
    const [proposal, contracts, designs, billingRes, restaurant] = await Promise.allSettled([
      session.authorize((t) => api.loadProposal(t, activeBooking.bookingId)),
      session.authorize((t) => api.readContracts(t, activeBooking.bookingId)),
      session.authorize((t) => invitation.listDesigns(t, activeBooking.bookingId)),
      session.authorize((t) => coupleBilling.load(t, activeBooking.bookingId)),
      invitation.getRestaurantCatalog().catch(() => null),
    ]);

    if (proposal.status === 'rejected') throw proposal.reason;
    return {
      proposal: proposal.value,
      contracts: contracts.status === 'fulfilled' ? contracts.value : null,
      designs: designs.status === 'fulfilled' ? designs.value : null,
      billing: billingRes.status === 'fulfilled' ? billingRes.value : null,
      restaurant: restaurant.status === 'fulfilled' ? restaurant.value : null,
    };
  }, [activeBooking, session]);

  const { data, error, loading, reload } = useHyResource(loader);
  const phase = activeBooking?.phase ?? 'DRAFT';
  const pre = phase === 'DRAFT' || phase === 'AWAITING_DEPOSIT';
  const isCancelled = phase === 'CANCELLED';
  const isCompleted = phase === 'COMPLETED';

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const eventTime = Date.parse(
    `${facts.eventDate}T${activeBooking?.shift.startTime?.slice(0, 5) ?? '00:00'}:00+07:00`,
  );
  const days = Number.isFinite(eventTime)
    ? Math.max(0, Math.ceil((eventTime - now) / 86400000))
    : null;

  // Derive 6 journey stages strictly from API status
  const contractApproved = data?.contracts?.revisions?.some((r) => r.state === 'APPROVED');
  const hasEffectiveTimeline = Boolean(data?.proposal?.effectiveTimeline);
  const remainingVnd = data?.billing?.totals.outstandingVnd ?? 0;

  const steps = [
    {
      num: 1,
      label: 'Tư vấn',
      status: 'done' as const,
      meta: 'Đã hoàn tất tư vấn sảnh & gói dịch vụ',
      go: () => onNavigate('catalog'),
    },
    {
      num: 2,
      label: 'Thoả thuận',
      status: contractApproved || hasEffectiveTimeline ? ('done' as const) : ('waiting' as const),
      meta:
        contractApproved || hasEffectiveTimeline
          ? 'Hợp đồng & kịch bản đã thống nhất'
          : 'Cần xem lại hợp đồng và kịch bản',
      go: () => onNavigate('contracts'),
    },
    {
      num: 3,
      label: 'Đặt cọc',
      status:
        phase === 'CONFIRMED' || isCompleted
          ? ('done' as const)
          : phase === 'AWAITING_DEPOSIT'
            ? ('waiting' as const)
            : ('waiting' as const),
      meta:
        phase === 'CONFIRMED' || isCompleted
          ? 'Đã ghi nhận tiền đặt cọc'
          : 'Cần hoàn tất đặt cọc để mở khóa đầy đủ',
      go: () => onNavigate('payments'),
    },
    {
      num: 4,
      label: 'Chuẩn bị',
      status: pre ? ('locked' as const) : isCompleted ? ('done' as const) : ('waiting' as const),
      meta: pre
        ? 'Mở sau khi đặt cọc'
        : isCompleted
          ? 'Đã hoàn tất khâu chuẩn bị'
          : 'Khách mời, sơ đồ bàn, thiệp cưới & đơn in',
      go: () => onNavigate('prepare'),
    },
    {
      num: 5,
      label: 'Ngày cưới',
      status: pre ? ('locked' as const) : isCompleted ? ('done' as const) : ('waiting' as const),
      meta: pre
        ? 'Mở sau khi đặt cọc'
        : isCompleted
          ? 'Đã hoàn thành ngày chung đôi'
          : facts.formattedDate,
      go: () => onNavigate('plan'),
    },
    {
      num: 6,
      label: 'Quyết toán',
      status: !isCompleted
        ? ('locked' as const)
        : remainingVnd > 0
          ? ('waiting' as const)
          : ('done' as const),
      meta: !isCompleted
        ? 'Mở sau ngày cưới'
        : remainingVnd > 0
          ? 'Cần quyết toán số dư'
          : 'Đã quyết toán hoàn tất',
      go: () => onNavigate('payments'),
    },
  ];

  // Derive up to 3 actionable items
  const portalUrl = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;
  const rawTodos: {
    title: string;
    description: string;
    buttonLabel: string;
    onAction: () => void;
    isWebHandoff?: boolean;
  }[] = [];

  if (pre) {
    rawTodos.push({
      title: 'Đặt cọc tiệc cưới trên Web',
      description: 'Hoàn tất hợp đồng và đặt cọc qua cổng thông tin Web để mở khóa trọn vẹn app.',
      buttonLabel: 'Mở trên Web',
      isWebHandoff: true,
      onAction: () => {
        if (portalUrl) void openBrowserAsync(portalUrl);
        else onNavigate('payments');
      },
    });
  }

  if (data?.contracts?.revisions?.some((r) => r.state === 'AWAITING_APPROVAL')) {
    rawTodos.push({
      title: 'Phê duyệt dự thảo hợp đồng',
      description: 'Nhà hàng đã gửi bản dự thảo hợp đồng mới, vui lòng xem và phê duyệt.',
      buttonLabel: 'Xem hợp đồng',
      onAction: () => onNavigate('contracts'),
    });
  }

  if (!hasEffectiveTimeline && !pre) {
    rawTodos.push({
      title: 'Thống nhất kịch bản tiệc cưới',
      description: 'Xem các mốc thời gian đón khách, làm lễ và tiệc để thống nhất cùng nhà hàng.',
      buttonLabel: 'Xem kịch bản',
      onAction: () => onNavigate('schedule'),
    });
  }

  if (!pre && !isCancelled) {
    rawTodos.push({
      title: 'Sắp xếp sơ đồ bàn tiệc',
      description: 'Bố trí nhóm khách vào các bàn theo đúng vị trí không gian sảnh trên Web.',
      buttonLabel: 'Sắp xếp trên Web',
      isWebHandoff: true,
      onAction: () => {
        if (portalUrl) void openBrowserAsync(portalUrl);
        else onNavigate('prepare');
      },
    });
  }

  if (isCompleted && remainingVnd > 0) {
    rawTodos.push({
      title: 'Thanh toán số dư quyết toán',
      description: `Còn lại ${formatVnd(remainingVnd)} sau khi tính phụ lục và chi phí phát sinh.`,
      buttonLabel: 'Thanh toán ngay',
      onAction: () => onNavigate('payments'),
    });
  }

  const todos = rawTodos.slice(0, 3);

  // Financial summary
  const paidVnd = data?.billing?.totals.netPaidVnd ?? 0;
  const totalVnd = data?.billing?.totals.acceptedChargesVnd ?? 0;
  const progressRatio = totalVnd > 0 ? Math.min(1, Math.max(0, paidVnd / totalVnd)) : 0;

  // Restaurant contact info (only if provided by API, NO fake numbers)
  const phone =
    (
      data?.restaurant as { displayName: string; address?: string; hotline?: string } | null
    )?.hotline?.trim() || null;

  return (
    <HyScreen onRefresh={() => void reload()} refreshing={loading}>
      {/* Hero Countdown Card */}
      <HyEnter>
        <View style={{ backgroundColor: hy.primary, borderRadius: 24, padding: 20, gap: 14 }}>
          {allBookings && allBookings.length >= 2 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đổi tiệc cưới"
              onPress={() => onSwitchBooking?.()}
              style={{
                minHeight: 44,
                borderWidth: 1,
                borderColor: 'rgba(255,248,241,0.4)',
                borderRadius: 22,
                paddingHorizontal: 14,
                justifyContent: 'center',
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: hy.canvas, fontSize: 13, fontWeight: '500' }}>
                {facts.hallName || 'Đổi tiệc cưới'} ⌄
              </Text>
            </Pressable>
          ) : (
            <View
              style={{
                backgroundColor: 'rgba(255,248,241,0.15)',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 4,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ color: hy.canvas, fontSize: 12, fontWeight: '600' }}>
                {facts.hallName || 'Tiệc cưới'}
              </Text>
            </View>
          )}

          <Text
            style={{
              fontFamily: hy.bold,
              fontSize: 26,
              lineHeight: 34,
              fontWeight: '700',
              color: hy.canvas,
            }}
          >
            {facts.coupleDisplay}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,248,241,0.2)',
              paddingTop: 14,
            }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: hy.canvas, fontWeight: '600', fontSize: 15 }}>
                {facts.formattedDate}
              </Text>
              <Text style={{ color: '#F3E9E1', fontSize: 13 }}>
                {facts.hallName} · {facts.shiftTime} · {facts.planningHeadcount} khách dự kiến
              </Text>
            </View>
            {days !== null && !isCancelled && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 40,
                    lineHeight: 44,
                    fontFamily: hy.bold,
                    color: hy.canvas,
                  }}
                >
                  {days}
                </Text>
                <Text style={{ fontSize: 12, color: hy.canvas }}>
                  {isCompleted ? 'đã chung đôi' : 'ngày nữa'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </HyEnter>

      {/* Cancelled Banner */}
      {isCancelled && (
        <HyCard style={{ backgroundColor: hy.errorBg, borderColor: hy.error }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: hy.error }}>
            Tiệc cưới này đã được huỷ
          </Text>
          <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 20 }}>
            Hợp đồng và giao dịch ở trạng thái lưu trữ bất biến. Quý khách vẫn có thể tra cứu lịch
            sử tài liệu và đối soát tài chính.
          </Text>
          <HyButton
            label="Xem lịch sử thanh toán"
            variant="outline"
            onPress={() => onNavigate('payments')}
          />
        </HyCard>
      )}

      {/* Pre-deposit / Restricted guidance */}
      {pre && !isCancelled && (
        <HyCard style={{ backgroundColor: hy.warningBg, borderColor: hy.warning }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ClockIcon size={18} color={hy.warning} />
            <Text style={{ fontWeight: '700', color: hy.warning, fontSize: 15 }}>
              Hoàn tất hợp đồng và đặt cọc trên Web
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 20 }}>
            Tiệc cưới đang ở giai đoạn thỏa thuận. Các tính năng chuẩn bị nâng cao sẽ tự động kích
            hoạt sau khi nhà hàng xác nhận đặt cọc.
          </Text>
          <HyButton
            label="Mở cổng Web để đặt cọc"
            onPress={() => {
              if (portalUrl) void openBrowserAsync(portalUrl);
              else onNavigate('payments');
            }}
          />
        </HyCard>
      )}

      {error && (
        <HyState
          kind="error"
          title="Chưa tải được tổng quan"
          body={error}
          onRetry={() => void reload()}
        />
      )}

      {/* 6-step Journey Timeline */}
      <HyCard>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700' }}>Hành trình cưới</Text>
          <Text style={{ fontSize: 12, color: hy.muted }}>6 giai đoạn</Text>
        </View>

        <View style={{ gap: 0, marginTop: 4 }}>
          {steps.map((st, idx) => (
            <Pressable
              key={st.label}
              accessibilityRole="button"
              accessibilityLabel={`${st.label}: ${st.meta}`}
              onPress={st.go}
              style={{
                flexDirection: 'row',
                gap: 14,
                minHeight: 64,
                alignItems: 'flex-start',
              }}
            >
              <View style={{ alignItems: 'center', width: 28 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor:
                      st.status === 'done'
                        ? hy.primary
                        : st.status === 'waiting'
                          ? hy.warningBg
                          : hy.surfaceMuted,
                    borderWidth: 1,
                    borderColor:
                      st.status === 'done'
                        ? hy.primary
                        : st.status === 'waiting'
                          ? hy.warning
                          : hy.rule,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        st.status === 'done'
                          ? '#FFFFFF'
                          : st.status === 'waiting'
                            ? hy.warning
                            : hy.muted,
                    }}
                  >
                    {st.status === 'done' ? '✓' : st.num}
                  </Text>
                </View>
                {idx < steps.length - 1 && (
                  <View style={{ width: 2, height: 38, backgroundColor: hy.rule }} />
                )}
              </View>

              <View style={{ flex: 1, paddingBottom: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600' }}>{st.label}</Text>
                  <HyBadge status={st.status} />
                </View>
                <Text style={{ fontSize: 12, color: hy.secondary, marginTop: 2 }}>{st.meta}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </HyCard>

      {/* Việc cần làm ngay (Max 3) */}
      {todos.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, paddingHorizontal: 4 }}>
            Việc cần làm ngay
          </Text>
          {todos.map((todo) => (
            <HyCard key={todo.title} style={{ gap: 10 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '700' }}>{todo.title}</Text>
                <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
                  {todo.description}
                </Text>
              </View>
              <HyButton
                label={todo.buttonLabel}
                variant={todo.isWebHandoff ? 'outline' : 'primary'}
                onPress={todo.onAction}
              />
            </HyCard>
          ))}
        </View>
      )}

      {/* Tóm tắt tiền */}
      {data?.billing && (
        <HyCard>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <WalletIcon size={18} color={hy.primary} />
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Tóm tắt tiền</Text>
            </View>
            <HyButton label="Ví tiệc" variant="text" onPress={() => onNavigate('payments')} />
          </View>

          <View style={{ gap: 4, marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: hy.secondary }}>Đã thanh toán</Text>
            <Text
              style={{
                fontSize: 28,
                lineHeight: 34,
                fontWeight: '700',
                color: hy.primary,
                fontFamily: hy.bold,
              }}
            >
              {formatVnd(paidVnd)}
            </Text>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: hy.surfaceMuted,
              overflow: 'hidden',
              marginVertical: 4,
            }}
          >
            <View
              style={{
                height: '100%',
                borderRadius: 4,
                backgroundColor: hy.primary,
                width: `${Math.round(progressRatio * 100)}%`,
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 12, color: hy.muted }}>Còn lại</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: hy.ink }}>
                {formatVnd(remainingVnd)}
              </Text>
            </View>
            <View style={{ gap: 2, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: hy.muted }}>Tổng chi phí</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: hy.ink }}>
                {formatVnd(totalVnd)}
              </Text>
            </View>
          </View>
        </HyCard>
      )}

      {/* Liên hệ quản lý / nhà hàng (only if valid phone/contact exists) */}
      {phone && (
        <HyCard style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: hy.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: hy.primary, fontSize: 20 }}>📞</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: '700' }}>Cần hỗ trợ tiệc cưới?</Text>
            <Text style={{ fontSize: 13, color: hy.secondary }}>{phone} · Nhà hàng</Text>
          </View>
          <HyButton
            label="Gọi ngay"
            variant="outline"
            onPress={() => void Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`)}
          />
        </HyCard>
      )}

      {/* Quick Navigation Rows */}
      <Text style={{ fontWeight: '700', fontSize: 16, paddingHorizontal: 4, marginTop: 4 }}>
        Khu vực chuẩn bị & dịch vụ
      </Text>
      <HyRow
        title="Chuẩn bị tiệc cưới"
        subtitle="Khách mời, sơ đồ bàn, thiệp cưới và đơn in"
        icon={<UsersIcon color={hy.primary} />}
        onPress={() => onNavigate('prepare')}
      />
      <HyRow
        title="Lịch trình tiệc cưới"
        subtitle="Kịch bản, điều chỉnh mốc giờ và phê duyệt"
        icon={<CalendarIcon color={hy.primary} />}
        onPress={() => onNavigate('schedule')}
      />
      <HyRow
        title="Kho ảnh riêng tư"
        subtitle="Ảnh cưới và tư liệu ngày cưới của hai bạn"
        icon={<ImageIcon color={hy.primary} />}
        onPress={() => onNavigate('media')}
      />
      <HyRow
        title="Khám phá nhà hàng"
        subtitle="Sảnh tiệc, gói thực đơn và món ăn"
        icon={<FileTextIcon color={hy.primary} />}
        onPress={() => onNavigate('catalog')}
      />
    </HyScreen>
  );
}
