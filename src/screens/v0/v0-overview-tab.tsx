import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
import { styles } from './v0-overview-tab.styles';

export { styles };

interface TaskItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  target: 'invite' | 'plan' | 'guests';
}

export function V0OverviewTab({
  activeBooking,
  facts,
  onNavigate,
  onSwitchBooking,
}: V0CommonProps) {
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

      {/* Event Anchor Card or Unconfirmed Notice */}
      {!facts.eventDate ? (
        <View
          style={{
            backgroundColor: tokens.surface,
            borderColor: tokens.rule,
            borderWidth: 1,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.text, marginBottom: 6 }}>
            Chưa có kế hoạch đã xác nhận
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.muted }}>
            Sau khi tiền cọc được xác nhận, kế hoạch sẽ xuất hiện tại đây. Bạn có thể tiếp tục trao
            đổi với nhà hàng trên Web.
          </Text>
        </View>
      ) : (
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
      )}

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

