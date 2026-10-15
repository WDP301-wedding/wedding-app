import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import {
  HyText as Text,
  HyInput,
  HyCard,
  HyScreen,
  HyState,
  HySheet,
  HyButton,
} from '@/components/hy-ui';
import { hy } from '@/theme';
import {
  createCoupleBillingGateway,
  type NamedGuestView,
} from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createApiClient } from '@/lib/api/client';
import { RestoredGuestPanel } from '../v0/restored-flow-controls';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from './use-hy-resource';
const billing = createCoupleBillingGateway();
const api = createRestoredFlowsGateway();
const client = createApiClient();
const normalize = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
type Guest = NamedGuestView['items'][number];
export function HyGuests({ activeBooking, facts, session, onNavigate }: V0CommonProps) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<Guest | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loader = useCallback(async () => {
    if (!session || !activeBooking) throw new Error('Chưa chọn tiệc cưới.');
    const bookingId = activeBooking.bookingId;
    const [groups, first, attendance] = await Promise.all([
      session.authorize((t) => billing.loadGuestGroups(t, bookingId)),
      session.authorize((t) => billing.loadGuests(t, bookingId)),
      session.authorize((t) => api.attendanceSummary(t, bookingId)),
    ]);
    let page = first;
    const guests = [...first.items];
    const seen = new Set<string>();
    while (page.nextCursor) {
      const cursor = page.nextCursor;
      if (seen.has(cursor))
        throw new Error('Danh sách khách chưa được tải đầy đủ. Vui lòng tải lại.');
      seen.add(cursor);
      page = await session.authorize(async (t) => {
        const response = await client.GET('/bookings/{bookingId}/guests', {
          headers: { Authorization: `Bearer ${t}` },
          params: { path: { bookingId }, query: { cursor } },
        });
        if (!response.data) throw new Error('Chưa tải được danh sách khách.');
        return response.data.data as NamedGuestView;
      });
      if (page.sourceSequence !== first.sourceSequence)
        throw new Error('Danh sách khách vừa thay đổi. Vui lòng tải lại.');
      guests.push(...page.items);
    }
    return { groups, guests, attendance };
  }, [session, activeBooking]);
  const { data, error, loading, reload } = useHyResource(loader);
  const guests = data?.guests.filter((g) => g.status === 'ACTIVE') ?? [];
  const groups = data?.groups.filter((g) => g.status === 'ACTIVE') ?? [];
  const filtered = guests.filter(
    (g) =>
      (!group || g.guestGroupId === group) && normalize(g.name).includes(normalize(search.trim())),
  );
  const selectedGroup = groups.find((g) => g.guestGroupId === selected?.guestGroupId);
  return (
    <>
      <HyScreen onRefresh={() => void reload()} refreshing={loading}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <HyCard style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: hy.secondary }}>Khách dự kiến</Text>
            <Text style={{ fontSize: 28, fontWeight: '600', color: hy.primary }}>
              {facts.planningHeadcount}
            </Text>
            <Text style={{ fontSize: 11, color: hy.muted }}>Độc lập với danh sách tên</Text>
          </HyCard>
          <HyCard style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: hy.secondary }}>Tên đã nhập</Text>
            <Text style={{ fontSize: 28, fontWeight: '600' }}>{data ? guests.length : '—'}</Text>
            <Text style={{ fontSize: 11, color: hy.muted }}>Tùy chọn · không bắt buộc</Text>
          </HyCard>
        </View>
        {data && (
          <HyCard style={{ backgroundColor: hy.surfaceMuted }}>
            <Text style={{ fontSize: 13 }}>
              {data.attendance.checkInMode === 'NONE'
                ? 'Điểm danh đang tắt · không ghi nhận'
                : `Điểm danh theo tên · ${data.attendance.checkedInGuestCount ?? 'Chưa ghi nhận'}`}
            </Text>
            <HyButton
              label="Cài đặt điểm danh"
              variant="text"
              onPress={() => setSettingsOpen(true)}
            />
          </HyCard>
        )}
        <HyInput
          accessibilityLabel="Tìm tên khách"
          placeholder="Tìm tên khách…"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[{ guestGroupId: '', name: 'Tất cả', color: hy.primary }, ...groups].map((g) => (
            <Pressable
              key={g.guestGroupId}
              accessibilityRole="button"
              accessibilityState={{ selected: group === (g.guestGroupId || null) }}
              onPress={() => setGroup(g.guestGroupId || null)}
              style={{
                borderWidth: 1,
                borderColor: hy.rule,
                borderRadius: 20,
                paddingVertical: 9,
                paddingHorizontal: 14,
                backgroundColor: group === (g.guestGroupId || null) ? hy.primarySoft : hy.surface,
              }}
            >
              <Text style={{ fontSize: 13, color: hy.primary }}>{g.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {loading && !data ? (
          <HyState kind="loading" />
        ) : error ? (
          <HyState kind="error" body={error} onRetry={() => void reload()} />
        ) : filtered.length === 0 ? (
          <HyState
            kind="empty"
            title={search ? 'Không có khách khớp tìm kiếm' : 'Chưa có tên khách'}
            body="Danh sách tên là tùy chọn. Số khách dự kiến vẫn được giữ nguyên."
          />
        ) : (
          <HyCard style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            {filtered.map((guest) => {
              const g = groups.find((x) => x.guestGroupId === guest.guestGroupId);
              return (
                <Pressable
                  key={guest.guestId}
                  accessibilityRole="button"
                  onPress={() => setSelected(guest)}
                  style={{
                    minHeight: 76,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: hy.rule,
                  }}
                >
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: hy.primarySoft,
                    }}
                  >
                    <Text style={{ color: hy.primary, fontWeight: '600' }}>
                      {guest.name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(-2)
                        .map((n) => n[0])
                        .join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '500' }}>{guest.name}</Text>
                    <Text style={{ fontSize: 12, color: hy.muted }}>
                      {g?.name ?? 'Nhóm chưa xác định'}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: g?.color ?? hy.outline,
                    }}
                  />
                  <Text style={{ color: hy.muted, fontSize: 22 }}>›</Text>
                </Pressable>
              );
            })}
          </HyCard>
        )}
      </HyScreen>
      <HySheet
        visible={selected !== null}
        title={selected?.name ?? 'Chi tiết khách'}
        onClose={() => setSelected(null)}
      >
        <Text style={{ color: hy.primary, fontWeight: '600' }}>
          {selectedGroup?.name ?? 'Chưa có thông tin nhóm'}
        </Text>
        <HyCard>
          <Text>Điện thoại: {selected?.phone || 'Chưa cung cấp'}</Text>
          <Text>Ghi chú: {selected?.operationalNote || 'Chưa có'}</Text>
          <Text>
            Điểm danh:{' '}
            {data?.attendance.checkInMode === 'NONE'
              ? 'Không ghi nhận'
              : 'Xem tổng kết điểm danh theo nhóm'}
          </Text>
        </HyCard>
        <HyButton
          label="Mở chia sẻ thiệp"
          onPress={() => {
            setSelected(null);
            onNavigate('share');
          }}
        />
        <Text style={{ fontSize: 13, color: hy.muted }}>
          Thông tin tên, nhóm và chỗ ngồi được quản lý theo dữ liệu nhà hàng.
        </Text>
      </HySheet>
      <HySheet
        visible={settingsOpen}
        title="Điểm danh theo tên"
        onClose={() => {
          setSettingsOpen(false);
          void reload();
        }}
      >
        <RestoredGuestPanel activeBooking={activeBooking} session={session} />
      </HySheet>
    </>
  );
}
