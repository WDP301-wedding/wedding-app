import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRightIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  ImageIcon,
  StatusTag,
  UsersIcon,
} from '@/components/v0-primitives';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';

export function V0PlanTab({ activeBooking, facts, onNavigate }: V0CommonProps) {
  const { tokens } = useWeddingTheme();

  const timelineRevision = activeBooking?.timelineRevision ?? null;
  const hasEffectiveTimeline = timelineRevision !== null;
  const timelineItems = activeBooking?.timeline ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về tổng quan"
          onPress={() => onNavigate('overview')}
          style={styles.backButton}
        >
          <Text style={[styles.backGlyph, { color: tokens.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Kế hoạch</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>Lịch trình của hai bạn</Text>
        </View>
      </View>

      {/* Revision Banner */}
      <View
        style={[
          styles.revisionBanner,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.premium,
          },
        ]}
      >
        <View
          style={[
            styles.revisionDot,
            { backgroundColor: hasEffectiveTimeline ? tokens.champagne : tokens.muted },
          ]}
        />
        <View style={styles.revisionCopy}>
          <Text style={[styles.revisionTitle, { color: tokens.text }]}>
            {hasEffectiveTimeline
              ? `Phiên bản #${timelineRevision} đang có hiệu lực`
              : 'Chưa có lịch trình có hiệu lực'}
          </Text>
          <Text style={[styles.revisionSub, { color: tokens.muted }]}>
            {hasEffectiveTimeline
              ? 'Lịch trình chính thức đã được hai bên thống nhất.'
              : 'Đang trong giai đoạn đề xuất hoặc chờ hai bên phê duyệt.'}
          </Text>
        </View>
        <StatusTag tone={hasEffectiveTimeline ? 'success' : 'neutral'}>
          {hasEffectiveTimeline ? 'Đã có hiệu lực' : 'Chưa có hiệu lực'}
        </StatusTag>
      </View>

      {/* Timeline Section */}
      <View style={styles.timeline}>
        {timelineItems.length > 0 ? (
          timelineItems.map((item, index) => {
            const isLast = index === timelineItems.length - 1;
            return (
              <View key={item.itemId || index} style={styles.timelineItem}>
                <View style={styles.timelineTrack}>
                  <View
                    style={[
                      styles.timelineMarker,
                      {
                        backgroundColor: tokens.surfaceMuted,
                        borderColor: tokens.champagne,
                      },
                    ]}
                  >
                    <ClockIcon size={12} color={tokens.sage} />
                  </View>
                  {!isLast && (
                    <View style={[styles.timelineLine, { borderColor: tokens.premium }]} />
                  )}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={[styles.timelineEyebrow, { color: tokens.sage }]}>
                    {item.startTime} · {facts.formattedDate}
                  </Text>
                  <Text style={[styles.timelineHeading, { color: tokens.text }]}>{item.title}</Text>
                  {item.description ? (
                    <Text style={[styles.timelineDesc, { color: tokens.muted }]}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyTimelineCard}>
            <ClockIcon size={24} color={tokens.sage} />
            <Text style={[styles.emptyTimelineTitle, { color: tokens.text }]}>
              Kịch bản chi tiết đang được chuẩn bị
            </Text>
            <Text style={[styles.emptyTimelineDesc, { color: tokens.muted }]}>
              Nhà hàng sẽ gửi kịch bản điều phối chi tiết dựa trên sảnh {facts.hallName} và khung
              giờ {facts.shiftTime}.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem chi tiết lịch trình mẫu"
              onPress={() => onNavigate('schedule')}
              style={styles.textButton}
            >
              <Text style={[styles.textButtonLabel, { color: tokens.primary }]}>Xem chi tiết</Text>
              <ArrowRightIcon size={15} color={tokens.primary} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Quick Links Section */}
      <View style={[styles.quickLinks, { borderTopColor: tokens.rule }]}>
        {/* Row 1: Media */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ảnh riêng tư"
          onPress={() => onNavigate('media')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <ImageIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>Ảnh riêng tư</Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Kho ảnh cưới bảo mật · cutoff 72 giờ trước tiệc
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 2: Print */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đơn in thiệp"
          onPress={() => onNavigate('print')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>Đơn in thiệp</Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Xem trạng thái & báo giá xưởng in (Chỉ đọc)
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 3: Contracts & Appendices */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hợp đồng & Phụ lục"
          onPress={() => onNavigate('contracts')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Hợp đồng & Phụ lục
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Xem chi tiết hợp đồng thương mại, PDF & phụ lục
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 4: Incidental Expenses */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chi phí phát sinh"
          onPress={() => onNavigate('incidentals')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Chi phí phát sinh
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Theo dõi các khoản phát sinh trong tiệc (Chỉ đọc)
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 5: Final Invoices */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hóa đơn cuối"
          onPress={() => onNavigate('invoices')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule }]}
        >
          <FileTextIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Hóa đơn cuối & Quyết toán
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              Hóa đơn chính thức xuất sau tiệc cưới (Chỉ đọc)
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>

        {/* Row 6: Guests & Seating */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khách mời & chỗ ngồi"
          onPress={() => onNavigate('guests')}
          style={[styles.secondaryRow, { borderBottomColor: tokens.rule, borderBottomWidth: 0 }]}
        >
          <UsersIcon size={18} color={tokens.sage} />
          <View style={styles.secondaryRowCopy}>
            <Text style={[styles.secondaryRowTitle, { color: tokens.text }]}>
              Khách mời & chỗ ngồi
            </Text>
            <Text style={[styles.secondaryRowSub, { color: tokens.muted }]}>
              {facts.planningHeadcount} khách kế hoạch · {facts.hallName}
            </Text>
          </View>
          <ChevronRightIcon size={17} color={tokens.muted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 96,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backGlyph: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
  headerTitleWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  heading: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '600',
  },
  revisionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  revisionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  revisionCopy: {
    flex: 1,
  },
  revisionTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  revisionSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  timeline: {
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineTrack: {
    alignItems: 'center',
    width: 28,
  },
  timelineMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    borderLeftWidth: 1,
    marginVertical: 4,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 22,
  },
  timelineEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineHeading: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 3,
  },
  timelineDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  emptyTimelineCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 93, 78, 0.14)',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTimelineTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyTimelineDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickLinks: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  secondaryRowCopy: {
    flex: 1,
  },
  secondaryRowTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  secondaryRowSub: {
    fontSize: 11,
    lineHeight: 15,
  },
});
