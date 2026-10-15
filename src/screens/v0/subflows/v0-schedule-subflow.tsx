import React from 'react';
import { ScrollView, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { ClockIcon } from '@/components/v0-primitives';
import { useWeddingTheme } from '@/theme';
import { RestoredTimelinePanel } from '../restored-flow-controls';
import type { V0CommonProps } from '../v0-types';
import { styles } from './subflows.styles';

export function V0ScheduleSubflow({ activeBooking, facts, session }: V0CommonProps) {
  const { tokens } = useWeddingTheme();
  const timelineItems = activeBooking?.timeline ?? [];
  const timelineRevision = activeBooking?.timelineRevision;
  const hasEffectiveTimeline = timelineRevision !== null && timelineRevision !== undefined;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <RestoredTimelinePanel activeBooking={activeBooking} session={session} />

      <View
        style={[
          styles.calloutCard,
          { backgroundColor: tokens.surface, borderColor: tokens.premium },
        ]}
      >
        <Text style={[styles.calloutTitle, { color: tokens.primary }]}>
          Lễ cưới {facts.coupleDisplay}
        </Text>
        <Text style={[styles.calloutSubtitle, { color: tokens.muted }]}>
          {facts.formattedDate} · {facts.shiftTime} · {facts.hallName}
        </Text>
        <Text style={{ fontSize: 11, color: tokens.sage, marginTop: 6, fontWeight: '600' }}>
          {hasEffectiveTimeline
            ? `Phiên bản lịch trình #${timelineRevision} đang có hiệu lực`
            : 'Chưa có lịch trình có hiệu lực (đang hoàn thiện kịch bản)'}
        </Text>
      </View>

      <View style={styles.scheduleList}>
        {timelineItems.length > 0 ? (
          timelineItems.map((item, idx) => (
            <View
              key={item.itemId || idx}
              style={[
                styles.scheduleRow,
                {
                  borderBottomColor: tokens.rule,
                  borderBottomWidth: idx === timelineItems.length - 1 ? 0 : 1,
                },
              ]}
            >
              <View style={styles.scheduleTimeWrap}>
                <ClockIcon size={14} color={tokens.sage} />
                <Text style={[styles.scheduleTime, { color: tokens.primary }]}>
                  {item.startTime}
                </Text>
              </View>
              <View style={styles.scheduleBody}>
                <View style={styles.scheduleHeaderRow}>
                  <Text style={[styles.scheduleItemTitle, { color: tokens.text }]}>
                    {item.title}
                  </Text>
                </View>
                {item.description ? (
                  <Text style={[styles.scheduleItemDesc, { color: tokens.muted }]}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <ClockIcon size={24} color={tokens.sage} />
            <Text style={[styles.emptyCardTitle, { color: tokens.text }]}>
              Kịch bản chi tiết đang được chuẩn bị
            </Text>
            <Text style={[styles.emptyCardDesc, { color: tokens.muted }]}>
              Lịch trình điều phối các phần nghi thức và tiệc sẽ được cập nhật trực tiếp tại đây sau
              khi được quản lý tiệc cưới hoàn thiện và phê duyệt.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ====================================================
// 2. MEDIA SUBFLOW
// ====================================================
