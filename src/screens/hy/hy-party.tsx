import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  HyText as Text,
  HyCard,
  HyButton,
  HyRow,
  HyScreen,
  HyState,
  HyEnter,
} from '@/components/hy-ui';
import { CalendarIcon, UsersIcon, FileTextIcon, ImageIcon } from '@/components/v0-icons';
import { hy } from '@/theme';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import { openBrowserAsync } from 'expo-web-browser';
import { readPublicEnv } from '@/lib/env';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from './use-hy-resource';
const api = createRestoredFlowsGateway();
const invitation = createAppInvitationGateway();
export function HyParty({
  activeBooking,
  facts,
  session,
  onNavigate,
  onSwitchBooking,
}: V0CommonProps) {
  const loader = useCallback(async () => {
    if (!session || !activeBooking) throw new Error('Chưa chọn tiệc cưới.');
    const [proposal, contracts, designs] = await Promise.allSettled([
      session.authorize((t) => api.loadProposal(t, activeBooking.bookingId)),
      session.authorize((t) => api.readContracts(t, activeBooking.bookingId)),
      session.authorize((t) => invitation.listDesigns(t, activeBooking.bookingId)),
    ]);
    if (proposal.status === 'rejected') throw proposal.reason;
    return {
      proposal: proposal.value,
      contracts: contracts.status === 'fulfilled' ? contracts.value : null,
      designs: designs.status === 'fulfilled' ? designs.value : null,
    };
  }, [activeBooking, session]);
  const { data, error, loading, reload } = useHyResource(loader);
  const pre = activeBooking?.phase === 'DRAFT' || activeBooking?.phase === 'AWAITING_DEPOSIT';
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
  const steps = [
    {
      label: 'Lịch trình tiệc cưới',
      done: Boolean(data?.proposal.effectiveTimeline),
      meta: data?.proposal.effectiveTimeline
        ? 'Hai bên đã thống nhất'
        : 'Xem và thống nhất cùng nhà hàng',
      go: 'schedule' as const,
    },
    {
      label: 'Hợp đồng',
      done: data?.contracts?.eligibleForDeposit === true,
      meta: data?.contracts
        ? data.contracts.eligibleForDeposit
          ? 'Đã đủ điều kiện đặt cọc'
          : 'Đang hoàn thiện hồ sơ'
        : 'Chưa xác định trạng thái',
      go: 'contracts' as const,
    },
    {
      label: 'Đặt cọc',
      done: activeBooking?.phase === 'CONFIRMED' || activeBooking?.phase === 'COMPLETED',
      meta: pre ? 'Hoàn tất trên cổng thông tin Web' : 'Theo dõi chi tiết giao dịch',
      go: 'billing' as const,
    },
    {
      label: 'Khách mời & thiệp cưới',
      done: undefined,
      meta: !data?.designs
        ? 'Chưa tải được thiết kế'
        : `${data?.designs?.length ?? 0} thiết kế thiệp`,
      go: 'invite' as const,
    },
    {
      label: 'Ngày chung đôi',
      done: activeBooking?.phase === 'COMPLETED',
      meta: facts.formattedDate,
      go: 'plan' as const,
    },
    {
      label: 'Quyết toán',
      done: undefined,
      meta: 'Hợp đồng, phát sinh và hóa đơn cuối',
      go: 'finance' as const,
    },
  ];
  return (
    <HyScreen onRefresh={() => void reload()} refreshing={loading}>
      <HyEnter>
        <View style={{ backgroundColor: hy.primary, borderRadius: 28, padding: 20, gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi tiệc cưới"
            onPress={() => onSwitchBooking?.()}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: 'rgba(255,248,241,0.4)',
              borderRadius: 24,
              paddingHorizontal: 16,
              justifyContent: 'center',
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: hy.canvas, fontSize: 13 }}>
              {facts.hallName || 'Chọn tiệc'} ⌄
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: hy.display,
              fontSize: 30,
              lineHeight: 38,
              fontWeight: '600',
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
              borderTopColor: 'rgba(255,248,241,0.25)',
              paddingTop: 14,
            }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: hy.canvas, fontWeight: '600' }}>{facts.formattedDate}</Text>
              <Text style={{ color: '#F3E9E1', fontSize: 13 }}>
                {facts.hallName} · {facts.shiftTime}
              </Text>
            </View>
            {days !== null && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{ fontSize: 44, lineHeight: 50, fontFamily: hy.display, color: hy.canvas }}
                >
                  {days}
                </Text>
                <Text style={{ fontSize: 13, color: hy.canvas }}>
                  {activeBooking?.phase === 'COMPLETED' ? 'đã chung đôi' : 'ngày nữa'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </HyEnter>
      {pre && (
        <HyCard style={{ backgroundColor: hy.warningBg, borderColor: hy.warningBg }}>
          <Text style={{ fontWeight: '600' }}>Hoàn tất hợp đồng và đặt cọc trên Web</Text>
          <Text style={{ fontSize: 14, color: hy.secondary }}>
            Các quyền sử dụng được cập nhật khi nhà hàng ghi nhận tiền cọc.
          </Text>
          <HyButton
            label="Mở trình duyệt"
            onPress={() => {
              const url = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;
              if (url) void openBrowserAsync(url);
              else onNavigate('billing');
            }}
          />
        </HyCard>
      )}
      {error && (
        <HyState
          kind="error"
          title="Chưa tải được hành trình"
          body={error}
          onRetry={() => void reload()}
        />
      )}
      {loading && !data ? (
        <HyState kind="loading" />
      ) : (
        <HyCard>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Hành trình cưới</Text>
          {steps.map((step, i) => (
            <View key={step.label} style={{ flexDirection: 'row', gap: 14, minHeight: 58 }}>
              <View style={{ alignItems: 'center', width: 32 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: step.done ? hy.primary : hy.primarySoft,
                    borderWidth: 1,
                    borderColor: step.done ? hy.primary : hy.rule,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: step.done ? '#FFFFFF' : hy.primary,
                    }}
                  >
                    {step.done ? '✓' : i + 1}
                  </Text>
                </View>
                {i < steps.length - 1 && (
                  <View style={{ width: 2, flex: 1, backgroundColor: hy.rule }} />
                )}
              </View>
              <View style={{ flex: 1, paddingBottom: 12 }}>
                <HyButton label={step.label} variant="text" onPress={() => onNavigate(step.go)} />
                <Text style={{ fontSize: 13, color: hy.secondary }}>{step.meta}</Text>
              </View>
            </View>
          ))}
        </HyCard>
      )}
      <Text style={{ fontWeight: '600', fontSize: 16, paddingHorizontal: 4 }}>Việc cần làm</Text>
      <HyRow
        title="Lịch trình & yêu cầu"
        subtitle="Xem phiên bản, điều chỉnh và phê duyệt"
        icon={<CalendarIcon color={hy.primary} />}
        onPress={() => onNavigate('schedule')}
      />
      <HyRow
        title="Khách mời của hai bạn"
        subtitle="Nhóm khách, danh sách tên và điểm danh"
        icon={<UsersIcon color={hy.primary} />}
        onPress={() => onNavigate('guests')}
      />
      <HyRow
        title="Thiệp & lời mời"
        subtitle="Xem thiết kế, sửa chữ và chia sẻ"
        icon={<FileTextIcon color={hy.primary} />}
        onPress={() => onNavigate('invite')}
      />
      <HyRow
        title="Ảnh riêng tư"
        subtitle="Ảnh cưới và nội dung chuẩn bị cho ngày tiệc"
        icon={<ImageIcon color={hy.primary} />}
        onPress={() => onNavigate('media')}
      />
      <HyRow
        title="Khám phá nhà hàng"
        subtitle="Sảnh tiệc, món ăn và gói thực đơn"
        onPress={() => onNavigate('catalog')}
      />
    </HyScreen>
  );
}
