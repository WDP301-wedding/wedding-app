import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { HyButton, HyCard, HyInput, HySheet, HyState, HyText as Text } from '@/components/hy-ui';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { toast } from '@/lib/toast/store';
import { hy } from '@/theme';
import type { V0CommonProps } from '../v0/v0-types';
import { normalize, type Group, type Guest } from './hy-guest-types';
import { sharedResourceStore } from './resource-store';
import { useHyResource } from './use-hy-resource';

const billing = createCoupleBillingGateway();

export function HyArchivedGuestsSheet({
  visible,
  bookingId,
  session,
  groups,
  onClose,
  onGuestRestored,
}: {
  visible: boolean;
  bookingId: string | undefined;
  session: V0CommonProps['session'];
  groups: readonly Group[];
  onClose: () => void;
  onGuestRestored: () => void;
}) {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const groupMap = useMemo(() => new Map(groups.map((g) => [g.guestGroupId, g])), [groups]);

  const loader = useCallback(async () => {
    if (!session || !bookingId || !billing.loadGuests) return [] as Guest[];
    const res = await session.authorize((t) =>
      billing.loadGuests!(t, bookingId, undefined, 'ARCHIVED'),
    );
    return res.items.filter((g) => g.status === 'ARCHIVED');
  }, [session, bookingId]);

  const {
    data: archivedGuestsData,
    loading,
    error,
    reload,
  } = useHyResource(loader, {
    enabled: visible,
    key: bookingId && visible ? `booking:${bookingId}:archived-guests` : undefined,
    ttlMs: 30_000,
  });

  const archivedGuests = useMemo(() => archivedGuestsData ?? [], [archivedGuestsData]);

  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  const handleRestore = async (guest: Guest) => {
    if (!session || !bookingId || !billing.updateGuest) return;
    setRestoringId(guest.guestId);
    try {
      await session.authorize((t) =>
        billing.updateGuest!(t, bookingId, guest.guestId, {
          expectedRevision: guest.revision,
          status: 'ACTIVE',
        }),
      );
      if (bookingId) {
        sharedResourceStore.invalidate(`booking:${bookingId}:guests-data`);
        sharedResourceStore.invalidate(`booking:${bookingId}:archived-guests`);
      }
      toast.success(`Đã khôi phục "${guest.name}" vào danh sách tiệc.`);
      await reload(true);
      onGuestRestored();
    } catch (caught: any) {
      toast.error(caught?.message || 'Chưa thể khôi phục khách mời. Vui lòng thử lại.');
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return archivedGuests;
    return archivedGuests.filter((g) => normalize(g.name).includes(q));
  }, [archivedGuests, search]);

  return (
    <HySheet visible={visible} title="Khách mời đã lưu trữ" onClose={handleClose}>
      <View style={{ gap: 12, maxHeight: 520 }}>
        <Text style={{ fontSize: 13, color: hy.secondary, lineHeight: 18 }}>
          Khách lưu trữ không hiển thị trong danh sách tiệc chính và không tính vào số khách đã
          nhập. Bạn có thể khôi phục lại bất cứ lúc nào.
        </Text>

        {archivedGuests.length > 0 && (
          <HyInput
            accessibilityLabel="Tìm khách lưu trữ"
            placeholder="Tìm theo tên khách lưu trữ..."
            value={search}
            onChangeText={setSearch}
          />
        )}

        {loading ? (
          <HyState kind="loading" title="Đang tải danh sách lưu trữ…" />
        ) : error ? (
          <HyState kind="error" body={error} onRetry={() => void reload(true)} />
        ) : filtered.length === 0 ? (
          <HyState
            kind="empty"
            title={search ? 'Không tìm thấy kết quả' : 'Chưa có khách nào trong lưu trữ'}
            body={
              search
                ? 'Không có khách lưu trữ nào khớp với từ khóa tìm kiếm.'
                : 'Những khách bạn bấm "Lưu trữ" sẽ xuất hiện tại đây và có thể khôi phục lại.'
            }
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.guestId}
            style={{ maxHeight: 380 }}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const group = groupMap.get(item.guestGroupId);
              const isRestoring = restoringId === item.guestId;
              const initials = item.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(-2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <HyCard
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    backgroundColor: hy.surface,
                  }}
                >
                  <View
                    style={{
                      height: 38,
                      width: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: hy.surfaceMuted,
                    }}
                  >
                    <Text style={{ color: hy.secondary, fontWeight: '700', fontSize: 13 }}>
                      {initials}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '600', fontSize: 14 }}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {group && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: group.color || hy.outline,
                          }}
                        />
                      )}
                      <Text style={{ fontSize: 12, color: hy.muted }}>
                        {group?.name ?? 'Chưa gán nhóm'}
                        {item.phone ? ` · ${item.phone}` : ''}
                      </Text>
                    </View>
                  </View>

                  <HyButton
                    label={isRestoring ? 'Đang phục hồi...' : 'Khôi phục'}
                    variant="outline"
                    disabled={isRestoring}
                    busy={isRestoring}
                    onPress={() => void handleRestore(item)}
                  />
                </HyCard>
              );
            }}
          />
        )}
      </View>
    </HySheet>
  );
}
