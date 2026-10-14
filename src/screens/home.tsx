import {
  createPasswordOtpGateway,
  type OtpChallenge,
} from '@/features/identity-access/password-otp-api';
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
  const [mode, setMode] = useState<'login' | 'reset-request'>('login');

  useEffect(() => {
    let active = true;
    void (async () => {
      const url = incomingUrl ?? (await Linking.getInitialURL());
      if (url && (url.includes('/reset') || url.includes('#reset'))) {
        setMode('reset-request');
      }
      if (initialResetToken !== undefined && initialResetToken !== null) {
        setMode('reset-request');
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
          Phiên an toàn đang được kiểm tra từ máy chủ.
        </Text>
      </View>
    );
  }

  const isReset =
    mode === 'reset-request' ||
    Boolean(incomingUrl && (incomingUrl.includes('/reset') || incomingUrl.includes('#reset'))) ||
    (initialResetToken !== undefined && initialResetToken !== null);

  if (isReset || snapshot.status === 'anonymous') {
    return (
      <IdentityScreen
        key={isReset ? 'identity-reset' : 'identity-anon'}
        session={session}
        initialMode={isReset ? 'reset-request' : mode}
        onAuthenticated={(nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setMode('login');
        }}
      />
    );
  }

  if (snapshot.access === 'denied') {
    return (
      <View
        style={[
          styles.sessionState,
          { backgroundColor: colors.background, paddingHorizontal: 24, justifyContent: 'center' },
        ]}
      >
        <Text style={[styles.sessionEyebrow, { color: brand.script }]}>TRUY CẬP BỊ TỪ CHỐI</Text>
        <Text style={[styles.sessionTitle, { color: brand.display, marginTop: 8 }]}>
          Tài khoản chưa có quyền truy cập
        </Text>
        <Text
          selectable
          style={[
            type.body,
            { color: colors.secondaryLabel, textAlign: 'center', marginVertical: 16 },
          ]}
        >
          Ứng dụng di động chỉ dành cho Cặp đôi có quyền FULL sau khi hoàn tất đặt cọc. Tài khoản
          của bạn ({snapshot.actor.displayEmail}) hiện ở trạng thái RESTRICTED hoặc chưa đủ quyền.
          Vui lòng thao tác trên phiên bản Web.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất"
          onPress={() => {
            void session.logout().finally(() => setSnapshot(session.snapshot()));
          }}
          style={({ pressed }) => [
            styles.authPrimaryAction,
            { backgroundColor: brand.primary, paddingHorizontal: 24 },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.authPrimaryLabel, { color: brand.primaryText }]}>ĐĂNG XUẤT</Text>
        </Pressable>
      </View>
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
  initialMode?: 'login' | 'reset-request';
  onAuthenticated: (snapshot: AndroidSessionSnapshot) => void;
  session: AndroidIdentitySession;
}>;

function mapAuthError(caught: unknown): string {
  if (caught instanceof ApiClientError) {
    if (caught.status === 401) return 'Email hoặc mật khẩu chưa chính xác. Vui lòng thử lại.';
    if (caught.status === 422)
      return 'Dữ liệu không hợp lệ. Mật khẩu phải có độ dài từ 12 đến 128 ký tự.';
    if (caught.status === 429)
      return 'Đã vượt quá số lần thử cho phép. Vui lòng đợi trong giây lát trước khi thử lại.';
    if (caught.status === 503 || caught.code === 'EMAIL_WORKER_DISABLED')
      return 'Dịch vụ gửi email OTP tạm thời chưa sẵn sàng (worker đang tắt). Vui lòng liên hệ quản trị viên.';
    if (caught.code === 'OTP_INVALID')
      return 'Mã OTP 6 chữ số chưa chính xác. Vui lòng kiểm tra lại.';
    if (caught.code === 'CHALLENGE_EXPIRED')
      return 'Mã OTP đã hết hiệu lực (10 phút). Vui lòng yêu cầu mã mới.';
    if (caught.kind === 'network') return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.';
    if (caught.kind === 'timeout') return 'Yêu cầu quá thời gian chờ (Timeout). Vui lòng thử lại.';
    if (caught.message) return caught.message;
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.';
}

function IdentityScreen({ initialMode = 'login', onAuthenticated, session }: IdentityScreenProps) {
  const { brand, colors } = useWeddingTheme();
  const [mode, setMode] = useState<'login' | 'reset-complete' | 'reset-request'>(initialMode);
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (pending) return;

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setError('Vui lòng nhập đầy đủ email và mật khẩu.');
        return;
      }
      setPending(true);
      setError(null);
      setMessage(null);
      void session
        .login(email.trim(), password)
        .then((nextSnapshot) => {
          setPending(false);
          onAuthenticated(nextSnapshot);
        })
        .catch((caught: unknown) => {
          setError(mapAuthError(caught));
          setPending(false);
        });
      return;
    }

    if (mode === 'reset-request') {
      if (!email.trim() || !email.includes('@')) {
        setError('Vui lòng nhập địa chỉ email hợp lệ.');
        return;
      }
      setPending(true);
      setError(null);
      setMessage(null);
      void (async () => {
        try {
          const value = await createPasswordOtpGateway().request(email.trim());
          setChallenge(value);
          setRemaining(value.resendAfterSeconds);
          setMode('reset-complete');
          setCode('');
          setMessage(
            'Nếu tài khoản đủ điều kiện, mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.',
          );
        } catch (caught) {
          setError(mapAuthError(caught));
        } finally {
          setPending(false);
        }
      })();
      return;
    }

    // mode === 'reset-complete'
    if (!challenge) {
      setMode('reset-request');
      setError('Phiên yêu cầu mã OTP không tồn tại. Vui lòng yêu cầu mã mới.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Mã OTP phải gồm chính xác 6 chữ số.');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('Mật khẩu mới phải có độ dài từ 12 đến 128 ký tự.');
      return;
    }
    if (password !== confirmation) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    void (async () => {
      try {
        await createPasswordOtpGateway().complete(challenge.challengeId, code.trim(), password);
        setPassword('');
        setConfirmation('');
        setCode('');
        setChallenge(null);
        await session.discardRevokedSession();
        setMode('login');
        setMessage('Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập với mật khẩu mới.');
      } catch (caught) {
        setError(mapAuthError(caught));
      } finally {
        setPending(false);
      }
    })();
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
            editable={!pending}
          />
        ) : null}

        {mode !== 'reset-request' ? (
          <LabeledInput
            label={mode === 'login' ? 'Mật khẩu' : 'Mật khẩu mới'}
            value={password}
            onChangeText={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            secureTextEntry
            editable={!pending}
          />
        ) : null}

        {mode === 'reset-complete' && challenge ? (
          <LabeledInput
            label="Mã OTP"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!pending}
          />
        ) : null}

        {mode === 'reset-complete' ? (
          <LabeledInput
            label="Xác nhận mật khẩu"
            value={confirmation}
            onChangeText={setConfirmation}
            autoComplete="new-password"
            secureTextEntry
            editable={!pending}
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
                ? 'Gửi mã OTP'
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
          {pending ? (
            <ActivityIndicator color={brand.primaryText} />
          ) : (
            <Text style={[styles.authPrimaryLabel, { color: brand.primaryText }]}>
              {mode === 'login'
                ? 'ĐĂNG NHẬP'
                : mode === 'reset-request'
                  ? 'GỬI MÃ OTP'
                  : 'CẬP NHẬT MẬT KHẨU'}
            </Text>
          )}
        </Pressable>

        {mode === 'reset-complete' && challenge ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              disabled={pending || remaining > 0}
              onPress={() => {
                setPending(true);
                setError(null);
                void (async () => {
                  try {
                    const value = await createPasswordOtpGateway().request(email.trim());
                    setChallenge(value);
                    setRemaining(value.resendAfterSeconds);
                    setCode('');
                    setMessage('Đã yêu cầu gửi lại mã OTP mới.');
                  } catch (caught) {
                    setError(mapAuthError(caught));
                  } finally {
                    setPending(false);
                  }
                })();
              }}
              style={({ pressed }) => [
                styles.authTextAction,
                (pending || remaining > 0) && { opacity: 0.5 },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[type.subhead, { color: brand.primary }]}>
                {remaining > 0 ? `Gửi lại mã sau ${remaining}s` : 'Gửi lại mã OTP'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dùng email khác"
              disabled={pending}
              onPress={() => {
                setChallenge(null);
                setMode('reset-request');
                setRemaining(0);
                setCode('');
                setError(null);
                setMessage(null);
              }}
              style={({ pressed }) => [styles.authTextAction, pressed && styles.pressed]}
            >
              <Text style={[type.subhead, { color: brand.primary }]}>Dùng email khác</Text>
            </Pressable>
          </View>
        ) : null}

        {mode === 'login' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMode('reset-request');
              setError(null);
              setMessage(null);
            }}
            style={styles.authTextAction}
          >
            <Text style={[type.subhead, { color: brand.primary }]}>Quên mật khẩu?</Text>
          </Pressable>
        ) : null}

        {mode === 'reset-request' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại đăng nhập"
            onPress={() => {
              setMode('login');
              setError(null);
              setMessage(null);
            }}
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
