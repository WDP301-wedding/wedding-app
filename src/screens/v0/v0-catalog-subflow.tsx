import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { RotateCcwIcon } from '@/components/v0-primitives';
import {
  createCatalogGateway,
  type PublicDishesView,
  type PublicHallDetailView,
  type PublicHallsView,
  type PublicMenuPackagesView,
  type PublicRestaurantView,
} from '@/features/catalog/catalog-api';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';
import { styles } from './v0-catalog-subflow.styles';
import { DishCard, HallItemCard, MenuPackageCard, money } from './catalog/v0-catalog-cards';

export { styles, money };

const catalogGateway = createCatalogGateway();

export function V0CatalogSubflow({ onNavigate }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [tab, setTab] = useState<'restaurant' | 'halls' | 'menus' | 'dishes'>('restaurant');
  const [restaurant, setRestaurant] = useState<PublicRestaurantView | null>(null);
  const [halls, setHalls] = useState<PublicHallsView['items']>([]);
  const [selectedHall, setSelectedHall] = useState<PublicHallDetailView | null>(null);
  const [menuPackages, setMenuPackages] = useState<PublicMenuPackagesView['items']>([]);
  const [dishes, setDishes] = useState<PublicDishesView['items']>([]);
  const [dishSearch, setDishSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchCatalogData = useCallback(async () => {
    try {
      const [restRes, hallsRes, menusRes, dishesRes] = await Promise.allSettled([
        catalogGateway.getRestaurant(),
        catalogGateway.listHalls(),
        catalogGateway.listMenuPackages(),
        catalogGateway.listDishes(),
      ]);

      const failures: string[] = [];
      if (restRes.status === 'fulfilled') {
        setRestaurant(restRes.value);
      } else {
        failures.push('Nhà hàng');
      }

      if (hallsRes.status === 'fulfilled') {
        setHalls(hallsRes.value.items);
      } else {
        failures.push('Sảnh tiệc');
      }

      if (menusRes.status === 'fulfilled') {
        setMenuPackages(menusRes.value.items);
      } else {
        failures.push('Gói thực đơn');
      }

      if (dishesRes.status === 'fulfilled') {
        setDishes(dishesRes.value.items);
      } else {
        failures.push('Món ăn');
      }

      if (failures.length === 4) {
        setError('Không thể kết nối đến máy chủ danh mục công khai. Vui lòng thử lại.');
      } else if (failures.length > 0) {
        setError(`Chưa tải được một số danh mục: ${failures.join(', ')}. Hãy nhấn tải lại.`);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Chưa tải được danh mục dịch vụ từ máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCatalogData();
  }, [fetchCatalogData]);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    await fetchCatalogData();
  };

  const handleSelectHall = async (hallId: string) => {
    if (selectedHall?.id === hallId) {
      setSelectedHall(null);
      setDetailError(null);
      return;
    }
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await catalogGateway.getHall(hallId);
      setSelectedHall(detail);
    } catch (caught) {
      setDetailError(
        caught instanceof Error ? caught.message : 'Chưa tải được chi tiết sảnh tiệc.',
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredDishes = dishes.filter(
    (d) =>
      d.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
      d.categoryLabel.toLowerCase().includes(dishSearch.toLowerCase()),
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
    >
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => onNavigate('overview')}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: pressed ? tokens.surfaceMuted : 'transparent' },
          ]}
        >
          <Text style={[styles.backGlyph, { color: tokens.text }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Danh mục dịch vụ</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Khám phá & Bảng giá</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tải lại"
          onPress={loadCatalog}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: pressed ? tokens.surfaceMuted : 'transparent' },
          ]}
        >
          <RotateCcwIcon size={18} color={tokens.text} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: tokens.rule }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nhà hàng"
          onPress={() => setTab('restaurant')}
          style={[
            styles.tabButton,
            tab === 'restaurant' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: tab === 'restaurant' ? tokens.primary : tokens.muted,
                fontWeight: tab === 'restaurant' ? '700' : '500',
              },
            ]}
          >
            Nhà hàng
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sảnh tiệc"
          onPress={() => setTab('halls')}
          style={[
            styles.tabButton,
            tab === 'halls' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: tab === 'halls' ? tokens.primary : tokens.muted,
                fontWeight: tab === 'halls' ? '700' : '500',
              },
            ]}
          >
            Sảnh tiệc ({halls.length})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gói thực đơn"
          onPress={() => setTab('menus')}
          style={[
            styles.tabButton,
            tab === 'menus' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: tab === 'menus' ? tokens.primary : tokens.muted,
                fontWeight: tab === 'menus' ? '700' : '500',
              },
            ]}
          >
            Gói menu ({menuPackages.length})
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Món ăn"
          onPress={() => setTab('dishes')}
          style={[
            styles.tabButton,
            tab === 'dishes' && { borderBottomColor: tokens.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: tab === 'dishes' ? tokens.primary : tokens.muted,
                fontWeight: tab === 'dishes' ? '700' : '500',
              },
            ]}
          >
            Món ăn ({dishes.length})
          </Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {/* Tab 1: RESTAURANT */}
      {tab === 'restaurant' && (
        <View style={{ gap: 14 }}>
          {restaurant ? (
            <View
              style={[
                styles.calloutCard,
                { backgroundColor: tokens.surface, borderColor: tokens.champagne },
              ]}
            >
              <Text style={[styles.calloutTitle, { color: tokens.primary, fontSize: 18 }]}>
                {restaurant.displayName}
              </Text>
              {restaurant.address ? (
                <Text style={{ fontSize: 13, color: tokens.text, marginTop: 8, lineHeight: 18 }}>
                  Địa chỉ: {restaurant.address}
                </Text>
              ) : null}
              {restaurant.publicPhone ? (
                <Text style={{ fontSize: 13, color: tokens.text, marginTop: 4 }}>
                  Điện thoại: {restaurant.publicPhone}
                </Text>
              ) : null}
              {restaurant.publicEmail ? (
                <Text style={{ fontSize: 13, color: tokens.text, marginTop: 4 }}>
                  Email: {restaurant.publicEmail}
                </Text>
              ) : null}

              {restaurant.shifts && restaurant.shifts.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.text }}>
                    Ca phục vụ:
                  </Text>
                  {restaurant.shifts.map((sh, idx) => (
                    <Text key={idx} style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
                      • Ca {sh.code === 'LUNCH' ? 'Trưa' : 'Tối'}: {sh.startTime} – {sh.endTime}
                    </Text>
                  ))}
                </View>
              ) : null}

              {restaurant.description ? (
                <View
                  style={{
                    marginTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: tokens.rule,
                    paddingTop: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, color: tokens.muted, lineHeight: 18 }}>
                    {restaurant.description}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                Chưa có thông tin hồ sơ nhà hàng
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Tab 2: HALLS */}
      {tab === 'halls' && (
        <View style={{ gap: 12 }}>
          {halls.length > 0 ? (
            halls.map((hall) => (
              <HallItemCard
                key={hall.id}
                hall={hall}
                isSelected={selectedHall?.id === hall.id}
                loadingDetail={loadingDetail}
                detailError={detailError}
                selectedHall={selectedHall}
                onToggle={() => handleSelectHall(hall.id)}
              />
            ))
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                Không có sảnh tiệc nào
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Tab 3: MENU PACKAGES */}
      {tab === 'menus' && (
        <View style={{ gap: 12 }}>
          {menuPackages.length > 0 ? (
            menuPackages.map((pkg) => <MenuPackageCard key={pkg.id} pkg={pkg} />)
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                Chưa có gói menu nào
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Tab 4: DISHES */}
      {tab === 'dishes' && (
        <View style={{ gap: 12 }}>
          <TextInput
            style={[
              styles.input,
              { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas },
            ]}
            placeholder="Tìm kiếm món ăn, danh mục..."
            placeholderTextColor={tokens.muted}
            value={dishSearch}
            onChangeText={setDishSearch}
          />

          {filteredDishes.length > 0 ? (
            filteredDishes.map((dish) => <DishCard key={dish.id} dish={dish} />)
          ) : !loading ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
                {dishSearch ? 'Không tìm thấy món phù hợp' : 'Chưa có danh sách món ăn'}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
