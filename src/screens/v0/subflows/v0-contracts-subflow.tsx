import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { FileTextIcon, StatusTag } from '@/components/v0-primitives';
import { useWeddingTheme } from '@/theme';
import { RestoredCommercialPanel } from '../restored-flow-controls';
import { saveOrShareDownloadedFile } from '@/lib/save-downloaded-file';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';
import { money, coupleBilling, type CommercialContractView } from './subflows-common';

export function V0ContractsSubflow({ activeBooking, onNavigate, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const [contract, setContract] = useState<CommercialContractView | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!session || !activeBooking?.bookingId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await session.authorize((token) =>
          coupleBilling.loadContracts(token, activeBooking.bookingId),
        );
        if (active) setContract(loaded);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Chưa tải được thông tin hợp đồng thương mại.',
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

  const handleDownloadPdf = async (revisionId: string) => {
    if (!session || !activeBooking?.bookingId) return;
    setDownloading(revisionId);
    try {
      const blob = await session.authorize((token) =>
        coupleBilling.downloadContractPdf(token, activeBooking.bookingId, revisionId),
      );
      await saveOrShareDownloadedFile(blob, `hop-dong-${revisionId}.pdf`, 'application/pdf');
    } catch (caught) {
      Alert.alert(
        'Lỗi tải tệp PDF',
        caught instanceof Error ? caught.message : 'Không thể tải tệp PDF hợp đồng.',
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredCommercialPanel mode="contract" activeBooking={activeBooking} session={session} />
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
          <Text style={[styles.heading, { color: tokens.text }]}>Hợp đồng tiệc cưới</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={tokens.primary} style={{ marginVertical: 16 }} />}

      {error ? (
        <View style={[styles.emptyCard, { borderColor: tokens.champagne, marginBottom: 16 }]}>
          <Text style={{ color: tokens.tagWarmText, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {contract ? (
        <View style={{ gap: 14 }}>
          <View
            style={[
              styles.calloutCard,
              { backgroundColor: tokens.surface, borderColor: tokens.premium },
            ]}
          >
            <Text style={[styles.calloutTitle, { color: tokens.primary }]}>Hợp đồng tiệc cưới</Text>
            <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
              Phiên bản đang hiệu lực:{' '}
              {contract.currentRevisionId
                ? `#${contract.currentRevisionId.slice(0, 8)}`
                : 'Chưa có'}
            </Text>
            <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 4 }}>
              Mô hình: {contract.modelVersion} •{' '}
              {contract.eligibleForDeposit ? 'Đủ điều kiện đặt cọc' : 'Chưa đủ điều kiện đặt cọc'}
            </Text>
          </View>

          <Text style={[styles.policyTitle, { color: tokens.text, marginTop: 8 }]}>
            Lịch sử các phiên bản hợp đồng ({contract.revisions?.length ?? 0} bản)
          </Text>

          {contract.revisions && contract.revisions.length > 0 ? (
            contract.revisions.map((rev) => (
              <View
                key={rev.revisionId}
                style={[
                  styles.calloutCard,
                  { backgroundColor: tokens.surface, borderColor: tokens.rule },
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
                    Phiên bản #{rev.revisionNumber}
                  </Text>
                  <StatusTag tone={rev.state === 'APPROVED' ? 'success' : 'neutral'}>
                    {rev.state}
                  </StatusTag>
                </View>

                <View style={[styles.factRow, { marginTop: 8 }]}>
                  <Text style={{ fontSize: 12, color: tokens.muted }}>Giá trị hợp đồng:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.primary }}>
                    {money(rev.document.contractTotalVnd)}
                  </Text>
                </View>

                <View style={[styles.factRow, { marginTop: 4 }]}>
                  <Text style={{ fontSize: 12, color: tokens.muted }}>Tiền cọc yêu cầu:</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: tokens.text }}>
                    {money(rev.document.depositAmountVnd)}
                  </Text>
                </View>

                {rev.createdAt ? (
                  <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 4 }}>
                    Ngày tạo: {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                ) : null}

                {rev.documentDigest ? (
                  <Text style={{ fontSize: 10, color: tokens.earth, marginTop: 2 }}>
                    Mã xác thực: {rev.documentDigest.slice(0, 16)}…
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tải PDF bản ${rev.revisionNumber}`}
                  disabled={downloading === rev.revisionId}
                  onPress={() => void handleDownloadPdf(rev.revisionId)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: tokens.primary,
                      borderColor: tokens.primary,
                      marginTop: 12,
                      opacity: pressed || downloading === rev.revisionId ? 0.8 : 1,
                    },
                  ]}
                >
                  {downloading === rev.revisionId ? (
                    <ActivityIndicator color={tokens.onPrimary} size="small" />
                  ) : (
                    <>
                      <FileTextIcon size={16} color={tokens.onPrimary} />
                      <Text style={[styles.primaryButtonText, { color: tokens.onPrimary }]}>
                        Tải tệp PDF hợp đồng (Bảo mật)
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 12, color: tokens.muted }}>
              Chưa có phiên bản hợp đồng nào.
            </Text>
          )}
        </View>
      ) : !loading ? (
        <View style={styles.emptyCard}>
          <FileTextIcon size={24} color={tokens.sage} />
          <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
            Chưa có hợp đồng thương mại
          </Text>
          <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
            Hợp đồng đặt tiệc chính thức sẽ xuất hiện tại đây khi hai bạn chốt đề xuất với nhà hàng.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ====================================================
// 6. APPENDICES SUBFLOW
// ====================================================
