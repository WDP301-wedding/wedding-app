import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { FileTextIcon, StatusTag } from '@/components/v0-primitives';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';
import { money, coupleBilling, type IncidentalExpensesView } from './subflows-common';

export function V0IncidentalsSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [sheet, setSheet] = useState<IncidentalExpensesView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadIncidentals(token, activeBooking.bookingId),
        );
        if (active) setSheet(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : 'Chưa tải được danh sách chi phí phát sinh.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, activeBooking?.bookingId]);

  const lines = sheet?.lines ?? [];
  const totalVnd = sheet?.totalVnd ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tài khoản"
          onPress={() => onNavigate('account')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Thương mại & Pháp lý</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Chi phí phát sinh</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 16 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
          Tổng chi phí phát sinh: {money(totalVnd)}
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Gồm các khoản dịch vụ thêm, đồ uống phát sinh thực tế trong tiệc được nhà hàng ghi nhận
          (Bản #{sheet?.revision ?? 1} · {sheet?.finalized ? 'Đã chốt phát sinh' : 'Chưa chốt'}).
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {lines.length > 0 ? (
        lines.map((item) => (
          <View
            key={item.id}
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 10 },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                {item.name}
              </Text>
              <StatusTag tone="neutral">
                {item.quantity} {item.unit}
              </StatusTag>
            </View>
            <View style={[styles.factRow, { marginTop: 6 }]}>
              <Text style={{ fontSize: 12, color: tokens.muted }}>
                Đơn giá: {money(item.unitPriceVnd)}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                Thành tiền: {money(item.totalVnd)}
              </Text>
            </View>
            {item.note ? (
              <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                Ghi chú: {item.note}
              </Text>
            ) : null}
          </View>
        ))
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Không có chi phí phát sinh
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Tiệc cưới của hai bạn hiện không có khoản chi phí phát sinh nào ngoài hợp đồng ban đầu.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 8. FINAL INVOICES SUBFLOW
// ====================================================
