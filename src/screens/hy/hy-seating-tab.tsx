import { openBrowserAsync } from 'expo-web-browser';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { HyBadge, HyButton, HyCard, HyScreen, HyState, HyText as Text } from '@/components/hy-ui';
import {
  createCoupleBillingGateway,
  type SeatingPlanData,
} from '@/features/payments-billing/billing-api';
import { readPublicEnv } from '@/lib/env';
import { hy } from '@/theme';
import type { V0CommonProps } from '../v0/v0-types';
import { resourcePolicy } from './resource-store';
import { useHyResource } from './use-hy-resource';

const billing = createCoupleBillingGateway();

export function HySeatingTab(props: V0CommonProps) {
  const session = props.session;
  const bookingId = props.activeBooking?.bookingId;
  const portalUrl = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;

  const currentPlanLoader = useCallback(async () => {
    if (!session || !bookingId || !billing.loadCurrentSeatingPlan) return null;
    return session.authorize((token) => billing.loadCurrentSeatingPlan!(token, bookingId));
  }, [session, bookingId]);

  const optionsLoader = useCallback(async () => {
    if (!session || !bookingId || !billing.loadSeatingLayoutOptions) return null;
    return session.authorize((token) => billing.loadSeatingLayoutOptions!(token, bookingId));
  }, [session, bookingId]);

  const groupsLoader = useCallback(async () => {
    if (!session || !bookingId) return [];
    return session.authorize((token) => billing.loadGuestGroups(token, bookingId));
  }, [session, bookingId]);

  const {
    data: currentPlan,
    loading: planLoading,
    error: planError,
    reload: reloadPlan,
  } = useHyResource<SeatingPlanData | null>(currentPlanLoader, {
    key: bookingId ? `booking:${bookingId}:seating-current` : undefined,
    ttlMs: resourcePolicy.defaultTtlMs,
  });

  const {
    data: options,
    loading: optionsLoading,
    error: optionsError,
    reload: reloadOptions,
  } = useHyResource(optionsLoader, {
    key: bookingId ? `booking:${bookingId}:seating-options` : undefined,
    ttlMs: resourcePolicy.defaultTtlMs,
  });

  const {
    data: groups,
    error: groupsError,
    reload: reloadGroups,
  } = useHyResource(groupsLoader, {
    key: bookingId ? `booking:${bookingId}:seating-groups` : undefined,
    ttlMs: resourcePolicy.defaultTtlMs,
  });

  const refreshing = planLoading || optionsLoading;
  const handleRefresh = useCallback(
    () => Promise.all([reloadPlan(), reloadOptions(), reloadGroups()]),
    [reloadPlan, reloadOptions, reloadGroups],
  );

  const bookingPortalUrl = useMemo(() => {
    if (!portalUrl || !bookingId) return portalUrl;
    return `${portalUrl.replace(/\/+$/, '')}/khong-gian/chuan-bi/khach?xem=so-do&bookingId=${encodeURIComponent(bookingId)}`;
  }, [portalUrl, bookingId]);

  const handleOpenBrowser = useCallback(() => {
    if (bookingPortalUrl) {
      void openBrowserAsync(bookingPortalUrl);
    }
  }, [bookingPortalUrl]);

  return (
    <HyScreen onRefresh={() => void handleRefresh()} refreshing={refreshing}>
      {/* 1. Confirmed or Draft Seating Plan Card */}
      {currentPlan ? (
        <HyCard style={{ borderColor: hy.primary, backgroundColor: hy.surface, gap: 12 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 11, color: hy.secondary, fontWeight: '600' }}>
                SƠ ĐỒ BÀN TIỆC ĐANG ÁP DỤNG
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: hy.primary }}>
                {currentPlan.layoutName}
              </Text>
            </View>
            <HyBadge
              status={
                currentPlan.status === 'CONFIRMED'
                  ? 'done'
                  : currentPlan.status === 'DRAFT'
                    ? 'waiting'
                    : 'neutral'
              }
              label={
                currentPlan.status === 'CONFIRMED'
                  ? 'Đã xác nhận'
                  : currentPlan.status === 'DRAFT'
                    ? 'Bản nháp'
                    : 'Cần xem lại'
              }
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              backgroundColor: hy.surfaceMuted,
              padding: 12,
              borderRadius: 12,
            }}
          >
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 12, color: hy.muted }}>Số lượng bàn</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: hy.ink, marginTop: 2 }}>
                {currentPlan.renderSnapshot.length} bàn
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: hy.rule }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 12, color: hy.muted }}>Tổng sức chứa</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: hy.primary, marginTop: 2 }}>
                {currentPlan.totalSeatCapacity} chỗ
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: hy.rule }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 12, color: hy.muted }}>Phạm vi khách</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: hy.secondary, marginTop: 4 }}>
                {currentPlan.minGuests} – {currentPlan.maxGuests}
              </Text>
            </View>
          </View>

          {/* Warnings if any */}
          {currentPlan.warnings && currentPlan.warnings.length > 0 && (
            <View
              style={{
                backgroundColor: hy.surfaceMuted,
                borderLeftWidth: 3,
                borderColor: hy.warning,
                padding: 10,
                borderRadius: 8,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: hy.warning }}>Lưu ý:</Text>
              {currentPlan.warnings.map((w, idx) => (
                <Text key={idx} style={{ fontSize: 12, color: hy.secondary }}>
                  • {w}
                </Text>
              ))}
            </View>
          )}

          {/* Table List with Group Assignments */}
          <View style={{ gap: 8, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: hy.ink }}>
              Phân bổ nhóm vào bàn tiệc ({currentPlan.renderSnapshot.length} bàn):
            </Text>
            <View style={{ gap: 6 }}>
              {currentPlan.renderSnapshot.map((table) => (
                <View
                  key={table.layoutTableId}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: hy.surfaceMuted,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{table.shape === 'ROUND' ? '⚪' : '▭'}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: hy.ink }}>
                      {table.tableLabel}
                    </Text>
                  </View>

                  {table.guestGroupName ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: table.color || hy.outline,
                        }}
                      />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: hy.primary }}>
                        {table.guestGroupName}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: hy.muted }}>Chưa gán nhóm</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          <HyButton
            label="Mở trình duyệt để chỉnh sửa sơ đồ"
            variant="outline"
            onPress={handleOpenBrowser}
          />
        </HyCard>
      ) : (
        /* Web Handoff Card when no current plan is selected */
        <HyCard style={{ backgroundColor: hy.surfaceMuted, borderColor: hy.rule }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: hy.primary }}>
              Sắp xếp sơ đồ bàn tiệc trên Web
            </Text>
            <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
              Giao diện kéo thả nhóm khách vào bàn tiệc và chỉnh sửa vị trí không gian sảnh được
              thực hiện trên phiên bản Web của Hỷ Yến theo đúng tiệc cưới của bạn.
            </Text>
          </View>
          <HyButton label="Mở trình duyệt để xếp bàn" onPress={handleOpenBrowser} />
        </HyCard>
      )}

      {/* 2. Confirmed Hall & Planning Headcount Info */}
      <HyCard>
        <Text style={{ fontSize: 15, fontWeight: '700' }}>Thông tin sảnh & khách kế hoạch</Text>
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: hy.muted }}>Sảnh tiệc</Text>
            <Text style={{ fontSize: 13, fontWeight: '600' }}>{props.facts.hallName}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: hy.muted }}>Khung giờ</Text>
            <Text style={{ fontSize: 13, fontWeight: '600' }}>{props.facts.shiftTime}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: hy.muted }}>Khách kế hoạch (hợp đồng)</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: hy.primary }}>
              {props.facts.planningHeadcount} khách
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: hy.muted, marginTop: 4 }}>
          Số khách kế hoạch do Cặp đôi hoặc Quản lý nhập độc lập, không suy ra từ số ghế của sơ đồ.
        </Text>
      </HyCard>

      {/* Errors if any */}
      {planError || optionsError || groupsError ? (
        <HyState
          kind="error"
          title="Chưa tải đủ thông tin sơ đồ"
          body={planError ?? optionsError ?? groupsError ?? ''}
          onRetry={() => void handleRefresh()}
        />
      ) : null}

      {/* 3. Seating Layout Options (Reference Templates when not selected or for reference) */}
      {!currentPlan && options?.items && options.items.length > 0 && (
        <HyCard>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>Tùy chọn bố cục mẫu tham khảo</Text>
          <Text style={{ fontSize: 12, color: hy.secondary, marginBottom: 4 }}>
            Các mẫu bố cục không gian tương thích với sảnh tiệc. Sơ đồ chính thức cần được xác nhận
            trên Web.
          </Text>
          {options.items.map((opt) => (
            <View
              key={opt.layoutTemplateVersionId}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 1,
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
                <Text style={{ fontSize: 14, fontWeight: '600' }}>{opt.name}</Text>
                <HyBadge
                  status={opt.compatible ? 'done' : 'waiting'}
                  label={opt.compatible ? 'Tương thích' : 'Cần lưu ý'}
                />
              </View>
              <Text style={{ fontSize: 12, color: hy.secondary }}>
                Sức chứa mẫu: {opt.totalSeatCapacity} chỗ ({opt.minGuests} – {opt.maxGuests} khách)
              </Text>
              {opt.warning ? (
                <Text style={{ fontSize: 11, color: hy.warning }}>Cảnh báo: {opt.warning}</Text>
              ) : null}
            </View>
          ))}
        </HyCard>
      )}

      {/* 4. Assigned Groups in Seating */}
      {groups && groups.length > 0 && (
        <HyCard>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>Các nhóm khách tham gia sơ đồ</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {groups.map((grp) => (
              <View
                key={grp.guestGroupId}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: hy.surfaceMuted,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: grp.color || hy.outline,
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: '500' }}>{grp.name}</Text>
              </View>
            ))}
          </View>
        </HyCard>
      )}
    </HyScreen>
  );
}
