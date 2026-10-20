import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { HyText as Text, HyInput as TextInput } from '@/components/hy-ui';
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

import { sharedResourceStore, fetchWithDeduplication } from '@/screens/hy/resource-store';

export { styles, money };

const catalogGateway = createCatalogGateway();

const RESTAURANT_TTL = 300_000;
const CATALOG_TTL = 180_000;

export function V0CatalogSubflow({ onNavigate }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [tab, setTab] = useState<'restaurant' | 'halls' | 'menus' | 'dishes'>('restaurant');

  // Initialize from shared cache if available
  const [restaurant, setRestaurant] = useState<PublicRestaurantView | null>(() =>
    sharedResourceStore.get<PublicRestaurantView>('restaurantCatalog'),
  );
  const [halls, setHalls] = useState<PublicHallsView['items']>(() => {
    const cached = sharedResourceStore.get<PublicHallsView>('catalog:halls');
    return cached?.items ?? [];
  });
  const [hallsCursor, setHallsCursor] = useState<string | null>(() => {
    const cached = sharedResourceStore.get<PublicHallsView>('catalog:halls');
    return cached?.nextCursor ?? null;
  });

  const [selectedHall, setSelectedHall] = useState<PublicHallDetailView | null>(null);
  const [menuPackages, setMenuPackages] = useState<PublicMenuPackagesView['items']>(() => {
    const cached = sharedResourceStore.get<PublicMenuPackagesView>(
      'catalog:menu-packages:first-page',
    );
    return cached?.items ?? [];
  });
  const [menusCursor, setMenusCursor] = useState<string | null>(() => {
    const cached = sharedResourceStore.get<PublicMenuPackagesView>(
      'catalog:menu-packages:first-page',
    );
    return cached?.nextCursor ?? null;
  });

  const [dishes, setDishes] = useState<PublicDishesView['items']>(() => {
    const cached = sharedResourceStore.get<PublicDishesView>('catalog:dishes');
    return cached?.items ?? [];
  });
  const [dishesCursor, setDishesCursor] = useState<string | null>(() => {
    const cached = sharedResourceStore.get<PublicDishesView>('catalog:dishes');
    return cached?.nextCursor ?? null;
  });

  const [dishSearch, setDishSearch] = useState('');
  const [loading, setLoading] = useState(() => {
    const hasCached = sharedResourceStore.get('restaurantCatalog') !== null;
    return !hasCached;
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const hallReqIdRef = useRef(0);

  const fetchCatalogData = useCallback(async (force: boolean = false) => {
    setError(null);
    const failures: string[] = [];

    // Load each resource progressively with deduplication & cache
    const restPromise = fetchWithDeduplication(
      'restaurantCatalog',
      () => catalogGateway.getRestaurant(),
      {
        ttlMs: RESTAURANT_TTL,
        force,
      },
    )
      .then((data) => setRestaurant(data))
      .catch(() => failures.push('Nhà hàng'));

    const hallsPromise = fetchWithDeduplication('catalog:halls', () => catalogGateway.listHalls(), {
      ttlMs: CATALOG_TTL,
      force,
    })
      .then((data) => {
        setHalls(data.items);
        setHallsCursor(data.nextCursor ?? null);
      })
      .catch(() => failures.push('Sảnh tiệc'));

    const menusPromise = fetchWithDeduplication(
      'catalog:menu-packages:first-page',
      () => catalogGateway.listMenuPackages(),
      {
        ttlMs: CATALOG_TTL,
        force,
      },
    )
      .then((data) => {
        setMenuPackages(data.items);
        setMenusCursor(data.nextCursor ?? null);
      })
      .catch(() => failures.push('Gói thực đơn'));

    const dishesPromise = fetchWithDeduplication(
      'catalog:dishes',
      () => catalogGateway.listDishes(),
      {
        ttlMs: CATALOG_TTL,
        force,
      },
    )
      .then((data) => {
        setDishes(data.items);
        setDishesCursor(data.nextCursor ?? null);
      })
      .catch(() => failures.push('Món ăn'));

    await Promise.allSettled([restPromise, hallsPromise, menusPromise, dishesPromise]);

    if (failures.length === 4) {
      setError('Không thể kết nối đến máy chủ danh mục công khai. Vui lòng thử lại.');
    } else if (failures.length > 0) {
      setError(`Chưa tải được một số danh mục: ${failures.join(', ')}. Hãy nhấn tải lại.`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const task = setTimeout(() => void fetchCatalogData(false), 0);
    return () => clearTimeout(task);
  }, [fetchCatalogData]);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    await fetchCatalogData(true);
  };

  const handleSelectHall = async (hallId: string) => {
    if (selectedHall?.id === hallId) {
      setSelectedHall(null);
      setDetailError(null);
      return;
    }
    const currentReq = ++hallReqIdRef.current;
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await fetchWithDeduplication(
        `catalog:hall:${hallId}`,
        () => catalogGateway.getHall(hallId),
        { ttlMs: RESTAURANT_TTL },
      );
      if (currentReq === hallReqIdRef.current) {
        setSelectedHall(detail);
      }
    } catch (caught) {
      if (currentReq === hallReqIdRef.current) {
        setDetailError(
          caught instanceof Error ? caught.message : 'Chưa tải được chi tiết sảnh tiệc.',
        );
      }
    } finally {
      if (currentReq === hallReqIdRef.current) {
        setLoadingDetail(false);
      }
    }
  };

  const handleLoadMoreHalls = async () => {
    if (!hallsCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await catalogGateway.listHalls({ cursor: hallsCursor });
      setHalls((prev) => {
        const ids = new Set(prev.map((h) => h.id));
        return [...prev, ...res.items.filter((h) => !ids.has(h.id))];
      });
      setHallsCursor(res.nextCursor ?? null);
    } catch {
      // Non-blocking pagination error
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMoreMenus = async () => {
    if (!menusCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await catalogGateway.listMenuPackages({ cursor: menusCursor });
      setMenuPackages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...res.items.filter((m) => !ids.has(m.id))];
      });
      setMenusCursor(res.nextCursor ?? null);
    } catch {
      // Non-blocking pagination error
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMoreDishes = async () => {
    if (!dishesCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await catalogGateway.listDishes({ cursor: dishesCursor });
      setDishes((prev) => {
        const ids = new Set(prev.map((d) => d.id));
        return [...prev, ...res.items.filter((d) => !ids.has(d.id))];
      });
      setDishesCursor(res.nextCursor ?? null);
    } catch {
      // Non-blocking pagination error
    } finally {
      setLoadingMore(false);
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
          {hallsCursor && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tải thêm sảnh tiệc"
              disabled={loadingMore}
              onPress={handleLoadMoreHalls}
              style={[
                styles.refreshButton,
                { alignSelf: 'center', marginTop: 8, paddingHorizontal: 16 },
              ]}
            >
              <Text style={{ color: tokens.primary, fontWeight: '600', fontSize: 13 }}>
                {loadingMore ? 'Đang tải thêm...' : 'Tải thêm sảnh tiệc'}
              </Text>
            </Pressable>
          )}
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
          {menusCursor && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tải thêm gói thực đơn"
              disabled={loadingMore}
              onPress={handleLoadMoreMenus}
              style={[
                styles.refreshButton,
                { alignSelf: 'center', marginTop: 8, paddingHorizontal: 16 },
              ]}
            >
              <Text style={{ color: tokens.primary, fontWeight: '600', fontSize: 13 }}>
                {loadingMore ? 'Đang tải thêm...' : 'Tải thêm gói thực đơn'}
              </Text>
            </Pressable>
          )}
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
          {dishesCursor && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tải thêm món ăn"
              disabled={loadingMore}
              onPress={handleLoadMoreDishes}
              style={[
                styles.refreshButton,
                { alignSelf: 'center', marginTop: 8, paddingHorizontal: 16 },
              ]}
            >
              <Text style={{ color: tokens.primary, fontWeight: '600', fontSize: 13 }}>
                {loadingMore ? 'Đang tải thêm...' : 'Tải thêm món ăn'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}
