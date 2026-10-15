import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { FileTextIcon, StatusTag } from '@/components/v0-primitives';
import { useWeddingTheme } from '@/theme';
import { RestoredInvoicePanel } from '../restored-flow-controls';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';
import { money, coupleBilling, type CommercialInvoiceView } from './subflows-common';

export function V0InvoicesSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [invoicesData, setInvoicesData] = useState<CommercialInvoiceView | null>(null);
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
          coupleBilling.loadFinalInvoices(token, activeBooking.bookingId),
        );
        if (active) setInvoicesData(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Chưa tải được danh sách hóa đơn quyết toán.',
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

  const revisions = invoicesData?.revisions ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredInvoicePanel activeBooking={activeBooking} session={session} />
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
          <Text style={[styles.heading, { color: tokens.text }]}>Hóa đơn quyết toán cuối</Text>
        </View>
      </View>

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.champagne, marginBottom: 16 },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary, marginBottom: 4 }]}>
          Hóa đơn quyết toán tiệc chính thức
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          Đây là danh sách hóa đơn quyết toán cuối cùng được phát hành chính thức sau khi hoàn tất
          tiệc, hoàn toàn phân biệt với sổ cái lịch sử giao dịch tạm thời.
        </Text>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {revisions.length > 0 ? (
        revisions.map((rev) => (
          <View
            key={rev.invoiceRevisionId}
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.rule, marginBottom: 12 },
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
                Bản hóa đơn #{rev.revisionNumber} ({rev.invoiceNumber})
              </Text>
              <StatusTag tone="success">#{rev.invoiceRevisionId.slice(0, 8)}</StatusTag>
            </View>

            <View style={[styles.factRow, { marginTop: 8 }]}>
              <Text style={{ fontSize: 12, color: tokens.muted }}>Tổng tiền quyết toán:</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.primary }}>
                {money(rev.document.totalVnd)}
              </Text>
            </View>

            {rev.issuedAt ? (
              <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                Ngày phát hành: {new Date(rev.issuedAt).toLocaleDateString('vi-VN')}
              </Text>
            ) : null}

            {rev.documentDigest ? (
              <Text style={{ fontSize: 10, color: tokens.earth, marginTop: 2 }}>
                Mã xác thực: {rev.documentDigest.slice(0, 16)}…
              </Text>
            ) : null}
          </View>
        ))
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Chưa có hóa đơn quyết toán
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Hóa đơn quyết toán cuối sẽ được ban quản lý nhà hàng phát hành sau khi tiệc cưới hoàn
            tất nghiệm thu.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
