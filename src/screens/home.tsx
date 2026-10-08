import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  type ConfirmedPlanningSnapshot,
  type PlanningGateway,
} from '@/features/booking-lifecycle/planning-api';
import {
  AndroidIdentitySession,
  createIdentityApi,
  createSecureRefreshStore,
  readResetCredential,
  type AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import { semanticColors, type, useWeddingTheme } from '@/theme';
import { ApiClientError } from '@/lib/api/client';

import { styles } from './home.styles';
import { CoupleOverviewScreen } from './couple-overview';

const VENUE_IMAGE =
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85';
const deviceSession = new AndroidIdentitySession(createIdentityApi(), createSecureRefreshStore());

export function HomeScreen({
  initialResetToken,
  session = deviceSession,
}: Readonly<{
  initialResetToken?: string | null;
  session?: AndroidIdentitySession;
}>) {
  const { brand, colors } = useWeddingTheme();
  const incomingUrl = Linking.useURL();
  const [snapshot, setSnapshot] = useState<AndroidSessionSnapshot>(() => session.snapshot());
  const [loading, setLoading] = useState(true);
  const [resetToken, setResetToken] = useState<string | null>(initialResetToken ?? null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token =
        initialResetToken === undefined
          ? readResetCredential(incomingUrl ?? (await Linking.getInitialURL()))
          : initialResetToken;
      if (!active) return;
      if (token !== null) {
        setResetToken(token);
        setLoading(false);
        return;
      }
      const nextSnapshot = await session.restore();
      if (!active) return;
      setSnapshot(nextSnapshot);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [initialResetToken, incomingUrl, session]);

  if (loading) {
    return (
      <View style={[styles.sessionState, { backgroundColor: colors.background }]}>
        <Text style={[styles.sessionEyebrow, { color: brand.primary }]}>WEDDING ESTATE</Text>
        <Text style={[styles.sessionTitle, { color: brand.display }]}>Đang khôi phục phiên</Text>
        <Text selectable style={[type.body, { color: colors.secondaryLabel }]}>
          Phiên an toàn đang được kiểm tra.
        </Text>
      </View>
    );
  }

  if (resetToken !== null || snapshot.status === 'anonymous' || snapshot.access === 'denied') {
    return (
      <IdentityScreen
        key={resetToken ?? 'identity'}
        session={session}
        resetToken={resetToken}
        onAuthenticated={(nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setResetToken(null);
        }}
      />
    );
  }

  return (
    <CoupleOverviewScreen
      renderPlan={(value) => <PlanningContent snapshot={value} />}
      session={session}
      onLogout={() => {
        void session.logout().finally(() => setSnapshot(session.snapshot()));
      }}
    />
  );
}

type ConfirmedPlanningScreenProps = Readonly<{
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

function PlanningContent({ snapshot }: Readonly<{ snapshot: ConfirmedPlanningSnapshot }>) {
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

function PlanningFact({ label, value }: Readonly<{ label: string; value: string }>) {
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
function TimelineRow({
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
function PlanningNotice({
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
function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

type IdentityScreenProps = Readonly<{
  onAuthenticated: (snapshot: AndroidSessionSnapshot) => void;
  resetToken: string | null;
  session: AndroidIdentitySession;
}>;

function IdentityScreen({ onAuthenticated, resetToken, session }: IdentityScreenProps) {
  const { brand, colors } = useWeddingTheme();
  const [mode, setMode] = useState<'login' | 'reset-complete' | 'reset-request'>(
    resetToken === null ? 'login' : 'reset-complete',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
    } catch {
      setError('Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.');
    } finally {
      setPending(false);
    }
  };

  const submit = () => {
    if (pending) return;
    if (mode === 'login') {
      setPending(true);
      setError(null);
      setMessage(null);
      void session
        .login(email, password)
        .then((nextSnapshot) => {
          setPending(false);
          onAuthenticated(nextSnapshot);
        })
        .catch(() => {
          setError('Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.');
          setPending(false);
        });
      return;
    }
    if (mode === 'reset-request') {
      void run(async () => {
        await session.requestPasswordReset(email);
        setMessage('Nếu tài khoản đủ điều kiện, hướng dẫn đặt lại mật khẩu đã được gửi.');
      });
      return;
    }
    if (resetToken === null || password !== confirmation) {
      setError('Hai mật khẩu chưa trùng khớp.');
      return;
    }
    void run(async () => {
      await session.completePasswordReset(resetToken, password);
      setPassword('');
      setConfirmation('');
      setMode('login');
      setMessage('Mật khẩu đã được cập nhật. Hãy đăng nhập lại.');
    });
  };

  const title =
    mode === 'login'
      ? 'Đăng nhập cho cặp đôi'
      : mode === 'reset-request'
        ? 'Khôi phục mật khẩu'
        : 'Đặt mật khẩu mới';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.authContent, { backgroundColor: colors.background }]}
    >
      <View style={styles.authBrand} accessibilityLabel="The Wedding Estate">
        <Text style={[styles.brandPrelude, { color: brand.gold }]}>THE</Text>
        <Text style={[styles.brandName, { color: brand.display }]}>WEDDING ESTATE</Text>
      </View>
      <Image
        source={{ uri: VENUE_IMAGE }}
        style={styles.authImage}
        contentFit="cover"
        accessibilityLabel="Hoa cưới trong khu vườn ấm áp"
      />
      <View style={[styles.authPanel, { backgroundColor: brand.powder, borderColor: brand.gold }]}>
        <Text style={[styles.scriptTitle, { color: brand.script }]}>Hành trình của hai bạn</Text>
        <Text selectable style={[styles.authTitle, { color: brand.display }]}>
          {title}
        </Text>
        {mode !== 'reset-complete' ? (
          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            keyboardType="email-address"
          />
        ) : null}
        {mode !== 'reset-request' ? (
          <LabeledInput
            label={mode === 'login' ? 'Mật khẩu' : 'Mật khẩu mới'}
            value={password}
            onChangeText={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            secureTextEntry
          />
        ) : null}
        {mode === 'reset-complete' ? (
          <LabeledInput
            label="Xác nhận mật khẩu"
            value={confirmation}
            onChangeText={setConfirmation}
            autoComplete="new-password"
            secureTextEntry
          />
        ) : null}
        {error === null ? null : (
          <Text
            selectable
            accessibilityRole="alert"
            style={[styles.authMessage, { color: brand.script }]}
          >
            {error}
          </Text>
        )}
        {message === null ? null : (
          <Text
            selectable
            accessibilityLiveRegion="polite"
            style={[styles.authMessage, { color: brand.primary }]}
          >
            {message}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            mode === 'login'
              ? 'Đăng nhập'
              : mode === 'reset-request'
                ? 'Gửi hướng dẫn'
                : 'Cập nhật mật khẩu'
          }
          accessibilityState={{ disabled: pending }}
          disabled={pending}
          onPress={submit}
          style={({ pressed }) => [
            styles.authPrimaryAction,
            { backgroundColor: brand.primary },
            (pressed || pending) && styles.pressed,
          ]}
        >
          <Text style={[styles.authPrimaryLabel, { color: brand.primaryText }]}>
            {pending
              ? 'ĐANG XỬ LÝ…'
              : mode === 'login'
                ? 'ĐĂNG NHẬP'
                : mode === 'reset-request'
                  ? 'GỬI HƯỚNG DẪN'
                  : 'CẬP NHẬT MẬT KHẨU'}
          </Text>
        </Pressable>
        {mode === 'login' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('reset-request')}
            style={styles.authTextAction}
          >
            <Text style={[type.subhead, { color: brand.primary }]}>Quên mật khẩu?</Text>
          </Pressable>
        ) : null}
        {mode === 'reset-request' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode('login')}
            style={styles.authTextAction}
          >
            <Text style={[type.subhead, { color: brand.primary }]}>Quay lại đăng nhập</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function LabeledInput({
  label,
  ...input
}: Readonly<React.ComponentProps<typeof TextInput>> & { label: string }) {
  return (
    <View style={styles.authField}>
      <Text style={styles.authFieldLabel}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.authInput}
      />
    </View>
  );
}
