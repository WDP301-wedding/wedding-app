import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import {
  HyText as Text,
  HyCard,
  HyButton,
  HyScreen,
  HySegmentedControl,
  HyBadge,
  HyState,
} from '@/components/hy-ui';
import { hy } from '@/theme';
import { openBrowserAsync } from 'expo-web-browser';
import { readPublicEnv } from '@/lib/env';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { HyGuests } from '../hy/hy-guests';
import { V0InviteTab } from '../v0/v0-invite-tab';
import { V0PrintSubflow } from '../v0/v0-subflows';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from '../hy/use-hy-resource';

const billing = createCoupleBillingGateway();

export type PrepareSegment = 'guests' | 'seating' | 'card' | 'print';

export function V2PrepareTab(props: V0CommonProps) {
  const [segment, setSegment] = useState<PrepareSegment>('guests');
  const portalUrl = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;

  // Seating layout loader
  const seatingLoader = useCallback(async () => {
    if (!props.session || !props.activeBooking || !billing.loadSeatingLayoutOptions) {
      return { options: null, groups: [] };
    }
    const bookingId = props.activeBooking.bookingId;
    const [optionsRes, groupsRes] = await Promise.allSettled([
      props.session.authorize((t) => billing.loadSeatingLayoutOptions!(t, bookingId)),
      props.session.authorize((t) => billing.loadGuestGroups(t, bookingId)),
    ]);
    return {
      options: optionsRes.status === 'fulfilled' ? optionsRes.value : null,
      groups: groupsRes.status === 'fulfilled' ? groupsRes.value : [],
    };
  }, [props.session, props.activeBooking]);

  const {
    data: seatingData,
    loading: seatingLoading,
    reload: reloadSeating,
  } = useHyResource(seatingLoader, { enabled: segment === 'seating' });

  const bookingPortalUrl =
    portalUrl && props.activeBooking?.bookingId
      ? `${portalUrl.replace(/\/+$/, '')}/bookings/${props.activeBooking.bookingId}/seating`
      : portalUrl;

  return (
    <View style={{ flex: 1, backgroundColor: hy.canvas }}>
      {/* Top Segmented Control */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <HySegmentedControl<PrepareSegment>
          items={[
            { key: 'guests', label: 'Khách' },
            { key: 'seating', label: 'Sơ đồ' },
            { key: 'card', label: 'Thiệp' },
            { key: 'print', label: 'Đơn in' },
          ]}
          selected={segment}
          onSelect={setSegment}
        />
      </View>

      {/* Segment Content */}
      <View style={{ flex: 1 }}>
        {segment === 'guests' && <HyGuests {...props} />}

        {segment === 'seating' && (
          <HyScreen onRefresh={() => void reloadSeating()} refreshing={seatingLoading}>
            {/* Web Handoff Card for Seating */}
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
              <HyButton
                label="Mở trình duyệt để xếp bàn"
                onPress={() => {
                  if (bookingPortalUrl) void openBrowserAsync(bookingPortalUrl);
                }}
              />
            </HyCard>

            {/* Confirmed Hall & Planning Headcount Info */}
            <HyCard>
              <Text style={{ fontSize: 15, fontWeight: '700' }}>
                Thông tin sảnh & khách kế hoạch
              </Text>
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
                Số khách kế hoạch do Cặp đôi hoặc Quản lý nhập độc lập, không suy ra từ số ghế của
                sơ đồ.
              </Text>
            </HyCard>

            {/* Seating Layout Options (Reference Templates) */}
            {seatingLoading && !seatingData ? (
              <HyState kind="loading" />
            ) : seatingData?.options?.items && seatingData.options.items.length > 0 ? (
              <HyCard>
                <Text style={{ fontSize: 15, fontWeight: '700' }}>
                  Tùy chọn bố cục mẫu tham khảo
                </Text>
                <Text style={{ fontSize: 12, color: hy.secondary, marginBottom: 4 }}>
                  Các mẫu bố cục không gian tương thích với sảnh tiệc. Sơ đồ chính thức cần được xác
                  nhận trên Web.
                </Text>
                {seatingData.options.items.map((opt) => (
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
                      Sức chứa mẫu: {opt.totalSeatCapacity} chỗ ({opt.minGuests} – {opt.maxGuests}{' '}
                      khách)
                    </Text>
                    {opt.warning ? (
                      <Text style={{ fontSize: 11, color: hy.warning }}>
                        Cảnh báo: {opt.warning}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </HyCard>
            ) : (
              <HyCard style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: hy.secondary }}>
                  Sơ đồ bàn hoạt động theo nhóm khách
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, textAlign: 'center' }}>
                  Chưa có sơ đồ bàn chính thức. Sơ đồ hoạt động theo nhóm khách mà không bắt buộc
                  phải có danh sách tên từng khách mời.
                </Text>
              </HyCard>
            )}

            {/* Assigned Groups in Seating */}
            {seatingData?.groups && seatingData.groups.length > 0 && (
              <HyCard>
                <Text style={{ fontSize: 15, fontWeight: '700' }}>
                  Các nhóm khách tham gia sơ đồ
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {seatingData.groups.map((grp) => (
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
        )}

        {segment === 'card' && <V0InviteTab {...props} initialSubscreen="preview" />}

        {segment === 'print' && <V0PrintSubflow {...props} />}
      </View>
    </View>
  );
}
