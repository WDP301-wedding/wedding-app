import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  type ConfirmedPlanningSnapshot,
  type PlanningGateway,
} from '@/features/booking-lifecycle/planning-api';
import { type AndroidIdentitySession } from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import { semanticColors, type, useWeddingTheme } from '@/theme';
import { styles } from './home.styles';

export type ConfirmedPlanningScreenProps = Readonly<{
  gateway: PlanningGateway;
  session: AndroidIdentitySession;
  onLogout: () => void;
}>;

export function ConfirmedPlanningScreen({
  gateway,
  onLogout,
  session,
}: ConfirmedPlanningScreenProps) {
  const { brand, colors } = useWeddingTheme();
  const [bookingId, setBookingId] = useState('');
  const [snapshot, setSnapshot] = useState<ConfirmedPlanningSnapshot | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'not-confirmed' | 'error'>('idle');

  const load = async () => {
    if (state === 'loading' || bookingId.trim() === '') return;
    setState('loading');
    try {
      const result = await session.authorize((token) =>
        gateway.loadConfirmed(token, bookingId.trim()),
      );
      if (result.status === 'confirmed') {
        setSnapshot(result.snapshot);
        setState('idle');
      } else {
        setSnapshot(null);
        setState('not-confirmed');
      }
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0))
        setSnapshot(null);
      setState('error');
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
    >
      <View style={styles.topBar}>
        <View style={styles.brandLockup} accessibilityLabel="The Wedding Estate">
          <Text style={[styles.brandPrelude, { color: brand.gold }]}>THE</Text>
          <Text style={[styles.brandName, { color: brand.display }]}>WEDDING ESTATE</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
          testID="logout-button"
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutAction, pressed && styles.pressed]}
        >
          <Text style={[styles.previewTag, { color: brand.primary }]}>ĐĂNG XUẤT</Text>
        </Pressable>
      </View>

      <View style={[styles.planningHero, { backgroundColor: brand.primary }]}>
        <Text style={[styles.countdownEyebrow, { color: brand.goldSoft }]}>
          KẾ HOẠCH ĐÃ XÁC NHẬN
        </Text>
        <Text selectable style={[styles.planningHeroTitle, { color: brand.primaryText }]}>
          Ngày trọng đại của hai bạn
        </Text>
        <Text style={[type.body, { color: brand.primaryText }]}>
          Nhập mã booking để xem thông tin mới nhất từ nhà hàng.
        </Text>
      </View>

      <View
        style={[styles.planningLookup, { backgroundColor: brand.powder, borderColor: brand.gold }]}
      >
        <Text style={[styles.authFieldLabel, { color: colors.label }]}>Mã booking</Text>
        <TextInput
          accessibilityLabel="Mã booking"
          autoCapitalize="none"
          autoCorrect={false}
          value={bookingId}
          onChangeText={setBookingId}
          placeholder="Mã trong xác nhận đặt tiệc"
          placeholderTextColor={colors.secondaryLabel}
          style={[styles.authInput, { color: colors.label }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: state === 'loading' || bookingId.trim() === '' }}
          disabled={state === 'loading' || bookingId.trim() === ''}
          onPress={() => void load()}
          style={({ pressed }) => [
            styles.authPrimaryAction,
            { backgroundColor: brand.primary },
            (pressed || state === 'loading') && styles.pressed,
          ]}
        >
          {state === 'loading' ? (
            <ActivityIndicator color={brand.primaryText} />
          ) : (
            <Text style={[styles.authPrimaryLabel, { color: brand.primaryText }]}>MỞ KẾ HOẠCH</Text>
          )}
        </Pressable>
      </View>

      {state === 'not-confirmed' ? (
        <PlanningNotice
          title="Kế hoạch chưa sẵn sàng"
          body="Ứng dụng Android chỉ mở sau khi tiền cọc được xác nhận. Hãy tiếp tục cộng tác trên Web."
          tone={brand.script}
        />
      ) : null}
      {state === 'error' ? (
        <PlanningNotice
          title="Không thể tải kế hoạch"
          body={
            snapshot === null
              ? 'Kiểm tra mã booking và quyền truy cập, sau đó thử lại.'
              : 'Kiểm tra kết nối mạng, sau đó thử lại. Nội dung đã tải vẫn được giữ.'
          }
          tone={brand.script}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
      ) : null}
      {snapshot === null && state === 'idle' ? (
        <PlanningNotice
          title="Chưa chọn kế hoạch"
          body="Sau khi đặt cọc thành công, mã booking sẽ mở tóm tắt lịch tiệc và các mốc chương trình."
          tone={brand.primary}
        />
      ) : null}
      {snapshot === null ? null : <PlanningContent snapshot={snapshot} />}
    </ScrollView>
  );
}

export function PlanningContent({ snapshot }: Readonly<{ snapshot: ConfirmedPlanningSnapshot }>) {
  const { brand, colors } = useWeddingTheme();
  return (
    <>
      <View style={styles.planningSummary}>
        <Text style={[styles.scriptTitle, { color: brand.script }]}>Thông tin đã xác nhận</Text>
        <Text selectable style={[styles.displayTitle, { color: brand.display }]}>
          {snapshot.hallName}
        </Text>
        <View style={[styles.goldRule, { backgroundColor: brand.gold }]} />
        <View style={styles.planningFacts}>
          <PlanningFact label="Ngày tổ chức" value={formatDate(snapshot.eventDate)} />
          <PlanningFact
            label="Khung giờ"
            value={`${snapshot.shift.startTime}–${snapshot.shift.endTime}`}
          />
          <PlanningFact label="Khách dự kiến" value={`${snapshot.planningHeadcount} khách`} />
          <PlanningFact
            label="Trạng thái"
            value={snapshot.phase === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã xác nhận'}
          />
        </View>
      </View>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: brand.display }]}>Kịch bản ngày cưới</Text>
          <Text selectable style={[type.caption, { color: colors.secondaryLabel }]}>
            Revision {snapshot.timelineRevision ?? 0} · dữ liệu từ nhà hàng
          </Text>
        </View>
        <Text style={[styles.taskCount, { color: brand.gold }]}>
          {String(snapshot.timeline.length).padStart(2, '0')}
        </Text>
      </View>
      {snapshot.timeline.length === 0 ? (
        <PlanningNotice
          title="Chưa có mốc chương trình"
          body="Kịch bản đã xác nhận chưa có nội dung. Quản lý sẽ cập nhật khi sẵn sàng."
          tone={brand.primary}
        />
      ) : (
        <View style={[styles.taskGroup, { borderColor: brand.gold }]}>
          {snapshot.timeline.map((item, index) => (
            <View key={item.itemId}>
              <TimelineRow
                item={item}
                colors={colors}
                accent={index === 0 ? brand.primary : brand.gold}
              />
              {index < snapshot.timeline.length - 1 ? (
                <View style={[styles.separator, { backgroundColor: colors.separator }]} />
              ) : null}
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function PlanningFact({ label, value }: Readonly<{ label: string; value: string }>) {
  const { brand, colors } = useWeddingTheme();
  return (
    <View style={[styles.planningFact, { borderColor: brand.gold }]}>
      <Text style={[type.caption, { color: colors.secondaryLabel }]}>{label}</Text>
      <Text selectable style={[type.headline, { color: colors.label }]}>
        {value}
      </Text>
    </View>
  );
}

export function TimelineRow({
  accent,
  colors,
  item,
}: Readonly<{
  accent: string;
  colors: typeof semanticColors;
  item: ConfirmedPlanningSnapshot['timeline'][number];
}>) {
  return (
    <View style={styles.taskRow} accessibilityLabel={`${item.startTime}. ${item.title}`}>
      <Text selectable numberOfLines={1} style={[styles.taskIndex, { color: accent }]}>
        {item.startTime}
      </Text>
      <View style={styles.taskCopy}>
        <Text selectable style={[type.headline, { color: colors.label }]}>
          {item.title}
        </Text>
        {item.description ? (
          <Text selectable style={[type.caption, { color: colors.secondaryLabel }]}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function PlanningNotice({
  actionLabel,
  body,
  onAction,
  title,
  tone,
}: Readonly<{
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
  tone: string;
}>) {
  const { brand, colors } = useWeddingTheme();
  return (
    <View
      accessibilityRole="summary"
      style={[styles.planningNotice, { backgroundColor: brand.powder, borderColor: tone }]}
    >
      <Text selectable style={[type.headline, { color: colors.label }]}>
        {title}
      </Text>
      <Text selectable style={[type.body, { color: colors.secondaryLabel }]}>
        {body}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.noticeAction}>
          <Text style={[type.subhead, { color: brand.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}
