import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { HyText as Text, HyButton, HyCard, HyBadge } from '@/components/hy-ui';
import {
  createCatalogGateway,
  type PublicHallsView,
  type PublicMenuPackagesView,
} from '@/features/catalog/catalog-api';
import { calculateTableCount, GUESTS_PER_TABLE } from '@/features/catalog/estimate';
import { money } from '@/lib/formatters';
import { useWeddingTheme, hy } from '@/theme';
import type { ConsultationPrefill } from './consultation-screen';

export interface EstimatorScreenProps {
  readonly onProceedToConsultation: (prefill: ConsultationPrefill) => void;
  readonly onBack?: () => void;
}

const catalogGateway = createCatalogGateway();

export function EstimatorScreen({ onProceedToConsultation, onBack }: EstimatorScreenProps) {
  const { brand, colors } = useWeddingTheme();

  const [halls, setHalls] = useState<PublicHallsView['items']>([]);
  const [menus, setMenus] = useState<PublicMenuPackagesView['items']>([]);
  const [loading, setLoading] = useState(true);

  const [selectedHallId, setSelectedHallId] = useState<string>('');
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(200);
  const [shift, setShift] = useState<'LUNCH' | 'DINNER'>('DINNER');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [hallsData, menusData] = await Promise.all([
          catalogGateway.listHalls(),
          catalogGateway.listMenuPackages(),
        ]);
        if (!active) return;
        setHalls(hallsData.items);
        setMenus(menusData.items);
        if (hallsData.items[0]) setSelectedHallId(hallsData.items[0].id);
        if (menusData.items[0]) setSelectedMenuId(menusData.items[0].id);
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const selectedHall = halls.find((h) => h.id === selectedHallId) ?? halls[0];
  const selectedMenu = menus.find((m) => m.id === selectedMenuId) ?? menus[0];

  const tables = calculateTableCount(guestCount);
  const hallRentalFee = selectedHall
    ? shift === 'LUNCH'
      ? ((selectedHall as any).lunchRentalFeeVnd ??
        (selectedHall as any).rentalFeeVnd ??
        15_000_000)
      : ((selectedHall as any).dinnerRentalFeeVnd ??
        (selectedHall as any).rentalFeeVnd ??
        20_000_000)
    : 0;

  const menuPricePerTable = selectedMenu?.priceVndPerTable ?? 4_500_000;
  const menuTotalFee = tables * menuPricePerTable;
  const grandTotal = hallRentalFee + menuTotalFee;

  const handleAdjustGuests = (delta: number) => {
    setGuestCount((prev) => Math.max(50, Math.min(800, prev + delta)));
  };

  const handleApplyToConsultation = () => {
    onProceedToConsultation({
      ...(selectedHall?.name ? { hallName: selectedHall.name } : {}),
      ...(selectedMenu?.name ? { menuName: selectedMenu.name } : {}),
      shift,
      expectedGuests: guestCount,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        paddingTop: 24,
        paddingBottom: 48,
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 13, color: brand.script, fontWeight: '600' }}>
            DỰ TOÁN NGÂN SÁCH
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: brand.display, lineHeight: 32 }}>
            Ước tính chi phí tiệc cưới
          </Text>
        </View>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng"
            onPress={onBack}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 15, color: brand.primary, fontWeight: '600' }}>Đóng</Text>
          </Pressable>
        ) : null}
      </View>

      <Text
        style={{ fontSize: 14, color: colors.secondaryLabel, lineHeight: 20, marginBottom: 20 }}
      >
        Chọn sảnh, thực đơn và số lượng bàn tiệc để tính toán chi phí dự kiến minh bạch và nhanh
        chóng.
      </Text>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={{ marginTop: 12, fontSize: 14, color: hy.muted }}>
            Đang tải biểu giá sảnh và thực đơn...
          </Text>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          {/* SỐ KHÁCH VÀ SỐ BÀN */}
          <HyCard style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: brand.display }}>
              1. Quy mô khách mời
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: 22, fontWeight: '700', color: brand.primary }}>
                  {guestCount} khách
                </Text>
                <Text style={{ fontSize: 13, color: hy.muted }}>
                  Tương đương {tables} bàn ({GUESTS_PER_TABLE} khách/bàn)
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Giảm 20 khách"
                  onPress={() => handleAdjustGuests(-20)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: hy.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: hy.outline,
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700' }}>-</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tăng 20 khách"
                  onPress={() => handleAdjustGuests(20)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: hy.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: hy.outline,
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700' }}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick selector chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {[150, 200, 300, 400].map((num) => (
                <Pressable
                  key={num}
                  accessibilityRole="button"
                  accessibilityLabel={`${num} khách`}
                  onPress={() => setGuestCount(num)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: guestCount === num ? brand.primary : hy.surfaceMuted,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: guestCount === num ? '#FFF' : colors.label,
                    }}
                  >
                    {num} khách
                  </Text>
                </Pressable>
              ))}
            </View>
          </HyCard>

          {/* CHỌN SẢNH CƯỚI */}
          <HyCard style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: brand.display }}>
              2. Chọn Sảnh tiệc cưới
            </Text>
            <View style={{ gap: 8 }}>
              {halls.map((hall) => {
                const isSelected = hall.id === selectedHall?.id;
                const isOverCapacity = hall.maxGuests < guestCount;
                return (
                  <Pressable
                    key={hall.id}
                    accessibilityRole="button"
                    accessibilityLabel={hall.name}
                    onPress={() => setSelectedHallId(hall.id)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? brand.primary : hy.outline,
                      backgroundColor: isSelected ? '#FBF0F4' : hy.surface,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.label }}>
                          {hall.name}
                        </Text>
                        <Text style={{ fontSize: 13, color: hy.muted, marginTop: 2 }}>
                          Sức chứa tối đa: {hall.maxGuests} khách
                        </Text>
                      </View>
                      {isOverCapacity ? (
                        <HyBadge label="Vượt sức chứa" status="waiting" />
                      ) : isSelected ? (
                        <HyBadge label="Đang chọn" status="done" />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </HyCard>

          {/* CHỌN CA TIỆC */}
          <HyCard style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: brand.display }}>
              3. Ca tổ chức tiệc
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ca trưa"
                onPress={() => setShift('LUNCH')}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: shift === 'LUNCH' ? brand.primary : hy.outline,
                  backgroundColor: shift === 'LUNCH' ? '#FBF0F4' : hy.surface,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: shift === 'LUNCH' ? brand.primary : colors.label,
                  }}
                >
                  Ca trưa
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, marginTop: 2 }}>11:00 - 14:00</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ca tối"
                onPress={() => setShift('DINNER')}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: shift === 'DINNER' ? brand.primary : hy.outline,
                  backgroundColor: shift === 'DINNER' ? '#FBF0F4' : hy.surface,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: shift === 'DINNER' ? brand.primary : colors.label,
                  }}
                >
                  Ca tối
                </Text>
                <Text style={{ fontSize: 12, color: hy.muted, marginTop: 2 }}>17:30 - 21:30</Text>
              </Pressable>
            </View>
          </HyCard>

          {/* CHỌN THỰC ĐƠN */}
          <HyCard style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: brand.display }}>
              4. Chọn Gói Thực đơn
            </Text>
            <View style={{ gap: 8 }}>
              {menus.map((menu) => {
                const isSelected = menu.id === selectedMenu?.id;
                return (
                  <Pressable
                    key={menu.id}
                    accessibilityRole="button"
                    accessibilityLabel={menu.name}
                    onPress={() => setSelectedMenuId(menu.id)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isSelected ? brand.primary : hy.outline,
                      backgroundColor: isSelected ? '#FBF0F4' : hy.surface,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.label }}>
                          {menu.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: brand.primary,
                            fontWeight: '600',
                            marginTop: 2,
                          }}
                        >
                          {money(menu.priceVndPerTable)} / bàn
                        </Text>
                      </View>
                      {isSelected ? <HyBadge label="Đang chọn" status="done" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </HyCard>

          {/* TỔNG KẾT NGÂN SÁCH DỰ KIẾN */}
          <HyCard
            style={{
              gap: 12,
              backgroundColor: '#FFF9F4',
              borderColor: brand.gold,
              borderWidth: 1.5,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: brand.display }}>
              Tổng ngân sách dự kiến
            </Text>

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: hy.muted }}>
                  Tiền thuê sảnh ({selectedHall?.name ?? 'Sảnh'} -{' '}
                  {shift === 'LUNCH' ? 'Trưa' : 'Tối'}):
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500' }}>{money(hallRentalFee)}</Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: hy.muted }}>
                  Tiệc cưới ({tables} bàn × {money(menuPricePerTable)}):
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500' }}>{money(menuTotalFee)}</Text>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: hy.outline,
                  marginVertical: 4,
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.label }}>
                  Tổng chi phí ước tính:
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: brand.primary }}>
                  {money(grandTotal)}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, color: hy.muted, lineHeight: 16, marginTop: 4 }}>
              * Dự toán mang tính chất tham khảo. Đơn giá chính thức sẽ được xác nhận khi hai bên
              chốt các dịch vụ chi tiết trong hợp đồng dịch vụ tiệc cưới.
            </Text>

            <View style={{ marginTop: 8 }}>
              <HyButton
                label="Đăng ký tư vấn theo cấu hình này"
                onPress={handleApplyToConsultation}
              />
            </View>
          </HyCard>
        </View>
      )}
    </ScrollView>
  );
}
