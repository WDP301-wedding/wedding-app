import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  StatusTag,
} from '@/components/v0-primitives';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from './v0-types';

interface TaskItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  target: 'invite' | 'plan' | 'guests';
}

export function V0OverviewTab({ facts, onNavigate, onSwitchBooking }: V0CommonProps) {
  const { tokens } = useWeddingTheme();

  const [tasks, setTasks] = useState<readonly TaskItem[]>([
    {
      id: 'invite',
      label: 'Kiểm tra nội dung thiệp',
      detail: 'Chỉnh sửa tên cặp đôi & lời mời',
      done: false,
      target: 'invite',
    },
    {
      id: 'schedule',
      label: 'Duyệt lịch trình buổi tiệc',
      detail: `Phiên bản ${facts.revisionNumber} · theo dõi kịch bản`,
      done: false,
      target: 'plan',
    },
    {
      id: 'guests',
      label: 'Kế hoạch khách mời',
      detail: `${facts.planningHeadcount} khách kế hoạch · ${facts.hallName}`,
      done: false,
      target: 'guests',
    },
  ]);

  const toggleTask = (taskId: string) => {
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
  };

  const pendingCount = tasks.filter((t) => !t.done).length;

  // Parse eventDate dynamically
  const eventDateObj = facts.eventDate ? new Date(`${facts.eventDate}T00:00:00+07:00`) : new Date();
  const dayStr = String(eventDateObj.getDate()).padStart(2, '0');
  const monthStr = `Tháng ${String(eventDateObj.getMonth() + 1).padStart(2, '0')}`;
  const yearStr = String(eventDateObj.getFullYear());

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Topbar */}
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <Text style={[styles.eyebrow, { color: tokens.sage }]}>Góc nhỏ của hai bạn</Text>
          <Text style={[styles.heading, { color: tokens.text }]}>
            {`Chào buổi sáng, ${facts.coupleDisplay}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          onPress={() => onNavigate('account')}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: pressed ? tokens.surfaceMuted : 'transparent' },
          ]}
        >
          <BellIcon size={20} color={tokens.primary} />
        </Pressable>
      </View>

      {onSwitchBooking ? (
        <View style={{ marginBottom: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi tiệc cưới"
            onPress={onSwitchBooking}
            style={({ pressed }) => [
              {
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: tokens.rule,
                alignSelf: 'flex-start',
                backgroundColor: pressed ? tokens.surfaceMuted : tokens.surface,
              },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.sage }}>
              ‹ Đổi tiệc cưới khác
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Event Anchor Card */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chi tiết ngày tiệc"
        onPress={() => onNavigate('plan')}
        style={({ pressed }) => [
          styles.eventAnchor,
          {
            backgroundColor: tokens.primary,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.dateBlock}>
          <Text style={[styles.dateDay, { color: tokens.onPrimary }]}>{dayStr}</Text>
          <Text style={[styles.dateMonthYear, { color: tokens.onPrimary }]}>
            {monthStr}
            {'\n'}
            {yearStr}
          </Text>
        </View>
        <View style={styles.eventDetail}>
          <Text style={[styles.eventSub, { color: tokens.onPrimary }]}>
            {`Lễ cưới của ${facts.coupleDisplay}`}
          </Text>
          <Text style={[styles.eventVenue, { color: tokens.onPrimary }]}>{facts.venueName}</Text>
          <Text style={[styles.eventHall, { color: tokens.onPrimary, opacity: 0.9 }]}>
            {`${facts.shiftTime} · ${facts.hallName}`}
          </Text>
        </View>
        <ChevronRightIcon size={20} color={tokens.onPrimary} />
      </Pressable>

      {/* Next Action Card */}
      <View
        style={[
          styles.nextAction,
          {
            backgroundColor: tokens.surface,
            borderColor: tokens.rule,
          },
        ]}
      >
        <View style={styles.sectionLabelRow}>
          <View style={[styles.labelLine, { backgroundColor: tokens.champagne }]} />
          <Text style={[styles.sectionLabel, { color: tokens.sage }]}>Việc tiếp theo</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hoàn thiện nội dung thiệp"
          onPress={() => onNavigate('invite')}
          style={styles.actionMain}
        >
          <View style={[styles.actionIcon, { backgroundColor: tokens.surfaceMuted }]}>
            <FileTextIcon size={19} color={tokens.sage} />
          </View>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionTitle, { color: tokens.text }]}>
              Hoàn thiện nội dung thiệp
            </Text>
            <Text style={[styles.actionDesc, { color: tokens.muted }]}>
              Phiên bản {facts.revisionNumber} · xem trước và chia sẻ thiệp cưới
            </Text>
          </View>
          <ArrowRightIcon size={19} color={tokens.sage} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở bản xem trước"
          onPress={() => onNavigate('invite')}
          style={styles.textButton}
        >
          <Text style={[styles.textButtonLabel, { color: tokens.primary }]}>Mở bản xem trước</Text>
          <ArrowRightIcon size={15} color={tokens.primary} />
        </Pressable>
      </View>

      {/* Milestones Block */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: tokens.text }]}>Cột mốc sắp tới</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem kế hoạch"
            onPress={() => onNavigate('plan')}
          >
            <Text style={[styles.subtleButton, { color: tokens.sage }]}>Xem kế hoạch</Text>
          </Pressable>
        </View>

        {/* Milestone 1 */}
        <Pressable
          onPress={() => onNavigate('schedule')}
          style={[styles.milestoneRow, { borderBottomColor: tokens.rule }]}
        >
          <View style={[styles.milestoneDate, { borderRightColor: tokens.premium }]}>
            <Text style={[styles.milestoneDay, { color: tokens.text }]}>{dayStr}</Text>
            <Text style={[styles.milestoneMonth, { color: tokens.earth }]}>{monthStr}</Text>
          </View>
          <View style={styles.milestoneInfo}>
            <Text style={[styles.milestoneTitle, { color: tokens.text }]}>Lễ cưới chính thức</Text>
            <Text style={[styles.milestoneSub, { color: tokens.muted }]}>
              {facts.shiftTime} · {facts.hallName}
            </Text>
          </View>
          <StatusTag tone="warm">Đã xác nhận</StatusTag>
        </Pressable>

        {/* Milestone 2 */}
        <Pressable
          onPress={() => onNavigate('print')}
          style={[styles.milestoneRow, { borderBottomColor: tokens.rule, borderBottomWidth: 0 }]}
        >
          <View style={[styles.milestoneDate, { borderRightColor: tokens.premium }]}>
            <Text style={[styles.milestoneDay, { color: tokens.text }]}>Thiệp</Text>
            <Text style={[styles.milestoneMonth, { color: tokens.earth }]}>In ấn</Text>
          </View>
          <View style={styles.milestoneInfo}>
            <Text style={[styles.milestoneTitle, { color: tokens.text }]}>Đơn in thiệp cưới</Text>
            <Text style={[styles.milestoneSub, { color: tokens.muted }]}>
              Duyệt báo giá & số lượng bộ thiệp
            </Text>
          </View>
          <StatusTag tone="neutral">Xem đơn</StatusTag>
        </Pressable>
      </View>

      {/* Task List Block */}
      <View
        style={[
          styles.sectionBlock,
          { borderTopColor: tokens.rule, borderTopWidth: 1, paddingTop: 18 },
        ]}
      >
        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>Checklist cá nhân</Text>
            <Text style={{ fontSize: 11, color: tokens.muted, marginTop: 2 }}>
              Lưu cục bộ trên thiết bị · Không đồng bộ trạng thái lên máy chủ
            </Text>
          </View>
          <Text style={[styles.countBadge, { color: tokens.muted }]}>
            {pendingCount} việc cần làm
          </Text>
        </View>

        {tasks.map((task) => (
          <Pressable
            key={task.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            accessibilityLabel={`${task.label}, ${task.done ? 'đã xong' : 'chưa xong'}`}
            onPress={() => toggleTask(task.id)}
            style={({ pressed }) => [
              styles.taskRow,
              {
                backgroundColor: pressed ? tokens.surfaceMuted : 'transparent',
                borderBottomColor: tokens.rule,
              },
            ]}
          >
            <View
              style={[
                styles.checkbox,
                task.done
                  ? { backgroundColor: tokens.sage, borderColor: tokens.sage }
                  : { borderColor: tokens.sage, backgroundColor: 'transparent' },
              ]}
            >
              {task.done ? <CheckIcon size={12} color={tokens.onPrimary} /> : null}
            </View>
            <View style={styles.taskCopy}>
              <Text
                style={[
                  styles.taskLabel,
                  { color: task.done ? tokens.muted : tokens.text },
                  task.done && styles.taskDoneText,
                ]}
              >
                {task.label}
              </Text>
              <Text style={[styles.taskDetail, { color: tokens.muted }]}>{task.detail}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mở ${task.label}`}
              onPress={() => onNavigate(task.target)}
              style={styles.chevronTarget}
            >
              <ChevronRightIcon size={18} color={tokens.muted} />
            </Pressable>
          </Pressable>
        ))}
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
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  topbarLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventAnchor: {
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  dateBlock: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.25)',
  },
  dateDay: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  dateMonthYear: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  eventDetail: {
    flex: 1,
  },
  eventSub: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    opacity: 0.85,
    marginBottom: 2,
  },
  eventVenue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventHall: {
    fontSize: 12,
    lineHeight: 16,
  },
  nextAction: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labelLine: {
    width: 3,
    height: 12,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  actionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 93, 78, 0.08)',
    minHeight: 44,
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  subtleButton: {
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    fontSize: 12,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  milestoneDate: {
    alignItems: 'center',
    paddingRight: 14,
    borderRightWidth: 1,
    width: 68,
  },
  milestoneDay: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },
  milestoneMonth: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  milestoneSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCopy: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskDoneText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDetail: {
    fontSize: 11,
    lineHeight: 15,
  },
  chevronTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
