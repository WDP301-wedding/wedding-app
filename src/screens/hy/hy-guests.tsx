import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import {
  HyText as Text,
  HyInput,
  HyCard,
  HyScreen,
  HyState,
  HySheet,
  HyButton,
  HyBadge,
} from '@/components/hy-ui';
import { hy } from '@/theme';
import {
  createCoupleBillingGateway,
  type NamedGuestView,
} from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { RestoredGuestPanel } from '../v0/restored-flow-controls';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from './use-hy-resource';

const billing = createCoupleBillingGateway();
const api = createRestoredFlowsGateway();

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

  // Planned headcount quick edit state - 0 is a valid explicit value, no arbitrary 250 fallback
  const [editHeadcountOpen, setEditHeadcountOpen] = useState(false);
  const [headcountValue, setHeadcountValue] = useState(
    typeof facts.planningHeadcount === 'number' ? String(facts.planningHeadcount) : '0',
  );
  const [headcountSaving, setHeadcountSaving] = useState(false);
  const [headcountError, setHeadcountError] = useState<string | null>(null);

  const loader = useCallback(async () => {
    if (!session || !activeBooking) throw new Error('Chưa chọn tiệc cưới.');
    const bookingId = activeBooking.bookingId;
    const [groupsRes, firstRes, attendanceRes, guestPlanRes] = await Promise.allSettled([
      session.authorize((t) => billing.loadGuestGroups(t, bookingId)),
      session.authorize((t) => billing.loadGuests(t, bookingId)),
      session.authorize((t) => api.attendanceSummary(t, bookingId)),
      billing.loadGuestPlan
        ? session.authorize((t) => billing.loadGuestPlan!(t, bookingId)).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (groupsRes.status === 'rejected') throw groupsRes.reason;
    if (firstRes.status === 'rejected') throw firstRes.reason;

    const groups = groupsRes.value;
    const first = firstRes.value;
    const attendance = attendanceRes.status === 'fulfilled' ? attendanceRes.value : null;
    const guestPlan = guestPlanRes.status === 'fulfilled' ? guestPlanRes.value : null;

    let page = first;
    const guests = [...first.items];
    const seen = new Set<string>();
    while (page.nextCursor) {
      const cursor = page.nextCursor;
      if (seen.has(cursor))
        throw new Error('Danh sách khách chưa được tải đầy đủ. Vui lòng tải lại.');
      seen.add(cursor);
      page = await session.authorize((t) => billing.loadGuests(t, bookingId, cursor));
      if (page.sourceSequence !== first.sourceSequence)
        throw new Error('Danh sách khách vừa thay đổi. Vui lòng tải lại.');
      guests.push(...page.items);
    }

    return { groups, guests, attendance, guestPlan };
  }, [session, activeBooking]);

  const { data, error, loading, reload } = useHyResource(loader);
  const guests = useMemo(
    () => data?.guests.filter((g) => g.status === 'ACTIVE') ?? [],
    [data?.guests],
  );
  const groups = useMemo(
    () => data?.groups.filter((g) => g.status === 'ACTIVE') ?? [],
    [data?.groups],
  );
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.guestGroupId, g])), [groups]);

  const currentHeadcount = data?.guestPlan?.planningHeadcount ?? facts.planningHeadcount ?? 0;

  const normalizedSearch = useMemo(() => normalize(search.trim()), [search]);
  const filtered = useMemo(() => {
    if (!normalizedSearch && !group) return guests;
    return guests.filter((g) => {
      if (group && g.guestGroupId !== group) return false;
      if (!normalizedSearch) return true;
      return normalize(g.name).includes(normalizedSearch);
    });
  }, [guests, group, normalizedSearch]);

  const selectedGroup = selected ? groupMap.get(selected.guestGroupId) : undefined;

  const handleSaveHeadcount = async () => {
    const trimmed = headcountValue.trim();
    if (!/^\d+$/.test(trimmed)) {
      setHeadcountError(
        'Vui lòng nhập số nguyên hợp lệ (ví dụ: 150). Không chấp nhận số thập phân hoặc chữ.',
      );
      return;
    }
    const num = Number(trimmed);
    if (!Number.isSafeInteger(num) || num < 0) {
      setHeadcountError('Vui lòng nhập số khách nguyên không âm.');
      return;
    }
    const freshPlan = data?.guestPlan;
    if (!freshPlan) {
      setHeadcountError(
        'Chưa tải được kế hoạch khách từ máy chủ. Vui lòng làm mới trang trước khi cập nhật.',
      );
      return;
    }
    if (!session || !activeBooking || !billing.updateGuestPlan) {
      setHeadcountError('Tính năng cập nhật số khách chưa sẵn sàng.');
      return;
    }
    setHeadcountSaving(true);
    setHeadcountError(null);
    try {
      await session.authorize((t) =>
        billing.updateGuestPlan!(t, activeBooking.bookingId, freshPlan.revision, num),
      );
      setEditHeadcountOpen(false);
      await reload();
    } catch (caught: any) {
      const msg = caught?.message || 'Chưa thể lưu số lượng khách. Vui lòng thử lại.';
      const code = caught?.code ? ` [${caught.code}]` : '';
      setHeadcountError(`${msg}${code}`);
    } finally {
      setHeadcountSaving(false);
    }
  };

  return (
    <>
      <HyScreen onRefresh={() => void reload()} refreshing={loading}>
        {/* Planned count vs Listed guests */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <HyCard style={{ flex: 1, gap: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, color: hy.secondary }}>Khách dự kiến</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sửa nhanh số khách dự kiến"
                onPress={() => {
                  setHeadcountValue(String(currentHeadcount));
                  setHeadcountError(null);
                  setEditHeadcountOpen(true);
                }}
                style={{ paddingHorizontal: 6, paddingVertical: 2 }}
              >
                <Text style={{ fontSize: 12, color: hy.primary, fontWeight: '600' }}>Sửa</Text>
              </Pressable>
            </View>
            <Text
              style={{
                fontSize: 28,
                lineHeight: 34,
                fontWeight: '700',
                color: hy.primary,
                fontFamily: hy.bold,
              }}
            >
              {currentHeadcount}
            </Text>
            <Text style={{ fontSize: 11, color: hy.muted }}>Độc lập với danh sách tên</Text>
          </HyCard>

          <HyCard style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 13, color: hy.secondary }}>Tên đã nhập</Text>
            <Text
              style={{
                fontSize: 28,
                lineHeight: 34,
                fontWeight: '700',
                color: hy.ink,
                fontFamily: hy.bold,
              }}
            >
              {data ? guests.length : '—'}
            </Text>
            <Text style={{ fontSize: 11, color: hy.muted }}>Tùy chọn · không bắt buộc</Text>
          </HyCard>
        </View>

        {/* Check-in Status Card */}
        {data && (
          <HyCard style={{ backgroundColor: hy.surfaceMuted, gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: hy.ink }}>
                Điểm danh (Check-in)
              </Text>
              <HyBadge
                status={
                  !data.attendance || data.attendance.checkInMode === 'NONE' ? 'neutral' : 'info'
                }
                label={
                  !data.attendance || data.attendance.checkInMode === 'NONE'
                    ? 'Chưa ghi nhận'
                    : 'Đang bật'
                }
              />
            </View>
            <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
              {!data.attendance || data.attendance.checkInMode === 'NONE'
                ? 'Điểm danh đang tắt. Hệ thống không ghi nhận (không phải 0 khách).'
                : `Điểm danh theo tên: ${data.attendance.checkedInGuestCount ?? 'Chưa ghi nhận'} khách đã check-in.`}
            </Text>
            <HyButton
              label="Cài đặt chế độ điểm danh"
              variant="text"
              onPress={() => setSettingsOpen(true)}
            />
          </HyCard>
        )}

        {/* Search */}
        <HyInput
          accessibilityLabel="Tìm tên khách"
          placeholder="Tìm kiếm theo tên khách mời…"
          value={search}
          onChangeText={setSearch}
        />

        {/* Group Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {[{ guestGroupId: '', name: 'Tất cả', color: hy.primary }, ...groups].map((g) => {
            const isSelected = group === (g.guestGroupId || null);
            return (
              <Pressable
                key={g.guestGroupId}
                accessibilityRole="button"
                accessibilityLabel={`Lọc nhóm ${g.name}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setGroup(g.guestGroupId || null)}
                style={{
                  minHeight: 40,
                  borderWidth: 1,
                  borderColor: isSelected ? hy.primary : hy.rule,
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: isSelected ? hy.primarySoft : hy.surface,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {g.guestGroupId !== '' && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: g.color || hy.outline,
                    }}
                  />
                )}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? hy.primary : hy.ink,
                  }}
                >
                  {g.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading && !data ? (
          <HyState kind="loading" />
        ) : error ? (
          <HyState kind="error" body={error} onRetry={() => void reload()} />
        ) : filtered.length === 0 ? (
          <HyState
            kind="empty"
            title={search ? 'Không tìm thấy khách phù hợp' : 'Chưa có tên khách'}
            body="Danh sách tên là tùy chọn. Sơ đồ bàn tiệc vẫn hoạt động theo nhóm mà không cần nhập tên."
          />
        ) : (
          <HyCard style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            {filtered.map((guest) => {
              const g = groupMap.get(guest.guestGroupId);
              const initials = guest.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(-2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <Pressable
                  key={guest.guestId}
                  accessibilityRole="button"
                  accessibilityLabel={`Khách ${guest.name}, nhóm ${g?.name ?? 'Chưa xác định'}`}
                  onPress={() => setSelected(guest)}
                  style={{
                    minHeight: 72,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
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
                    <Text style={{ color: hy.primary, fontWeight: '700', fontSize: 14 }}>
                      {initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '600', fontSize: 15 }}>{guest.name}</Text>
                    <Text style={{ fontSize: 12, color: hy.muted }}>
                      {g?.name ?? 'Nhóm chưa xác định'}
                      {guest.phone ? ` · ${guest.phone}` : ''}
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
                  <Text style={{ color: hy.muted, fontSize: 20 }}>›</Text>
                </Pressable>
              );
            })}
          </HyCard>
        )}
      </HyScreen>

      {/* Guest Detail Bottom Sheet */}
      <HySheet
        visible={selected !== null}
        title={selected?.name ?? 'Chi tiết khách'}
        onClose={() => setSelected(null)}
      >
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: selectedGroup?.color || hy.outline,
              }}
            />
            <Text style={{ color: hy.primary, fontWeight: '700', fontSize: 16 }}>
              {selectedGroup?.name ?? 'Chưa gán nhóm'}
            </Text>
          </View>

          <HyCard style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: hy.ink }}>
              Điện thoại:{' '}
              <Text style={{ fontWeight: '600' }}>{selected?.phone || 'Chưa cung cấp'}</Text>
            </Text>
            <Text style={{ fontSize: 14, color: hy.ink }}>
              Ghi chú phục vụ:{' '}
              <Text style={{ color: hy.secondary }}>{selected?.operationalNote || 'Không có'}</Text>
            </Text>
            <Text style={{ fontSize: 14, color: hy.ink }}>
              Tình trạng điểm danh:{' '}
              <Text style={{ fontWeight: '600', color: hy.secondary }}>
                {!data?.attendance || data.attendance.checkInMode === 'NONE'
                  ? 'Chưa ghi nhận'
                  : 'Theo cài đặt điểm danh'}
              </Text>
            </Text>
          </HyCard>

          {selected?.phone ? (
            <HyButton
              label={`Gọi cho ${selected.name}`}
              variant="outline"
              onPress={() => void Linking.openURL(`tel:${selected.phone!.replace(/\s+/g, '')}`)}
            />
          ) : null}

          <HyButton
            label="Mở chia sẻ thiệp cưới"
            onPress={() => {
              setSelected(null);
              onNavigate('share');
            }}
          />

          <Text style={{ fontSize: 12, color: hy.muted, textAlign: 'center' }}>
            Hệ thống không quản lý danh tính theo Hộ gia đình và không có tính năng phản hồi RSVP.
          </Text>
        </View>
      </HySheet>

      {/* Quick Edit Headcount Bottom Sheet */}
      <HySheet
        visible={editHeadcountOpen}
        title="Sửa số khách dự kiến"
        onClose={() => setEditHeadcountOpen(false)}
      >
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
            Số lượng khách dự kiến do Cặp đôi hoặc Quản lý nhập độc lập, không phụ thuộc vào số
            lượng tên trong danh sách khách.
          </Text>

          <HyInput
            accessibilityLabel="Nhập số khách dự kiến"
            keyboardType="number-pad"
            value={headcountValue}
            onChangeText={(txt) => {
              setHeadcountValue(txt);
              setHeadcountError(null);
            }}
            placeholder="Ví dụ: 280"
          />

          {headcountError ? (
            <Text accessibilityRole="alert" style={{ fontSize: 13, color: hy.error }}>
              {headcountError}
            </Text>
          ) : null}

          <HyButton
            label={headcountSaving ? 'Đang lưu...' : 'Lưu số lượng khách'}
            disabled={headcountSaving}
            busy={headcountSaving}
            onPress={() => void handleSaveHeadcount()}
          />
        </View>
      </HySheet>

      {/* Check-in Settings Sheet */}
      <HySheet
        visible={settingsOpen}
        title="Cài đặt điểm danh sự kiện"
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
