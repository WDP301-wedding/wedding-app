import { Button, Host } from '@expo/ui';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  AndroidIdentitySession,
  createIdentityApi,
  createSecureRefreshStore,
  readResetCredential,
  type AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import { semanticColors, type, useWeddingTheme } from '@/theme';

import { styles } from './home.styles';

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
  const [planOpened, setPlanOpened] = useState(false);
  const [snapshot, setSnapshot] = useState<AndroidSessionSnapshot>(() => session.snapshot());
  const [loading, setLoading] = useState(true);
  const [resetToken, setResetToken] = useState<string | null>(initialResetToken ?? null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token =
        initialResetToken === undefined
          ? readResetCredential(await Linking.getInitialURL())
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
  }, [initialResetToken, session]);

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

  if (snapshot.status === 'anonymous' || snapshot.access === 'denied') {
    return (
      <IdentityScreen
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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
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
          onPress={() => {
            void session.logout().finally(() => setSnapshot(session.snapshot()));
          }}
          style={({ pressed }) => [styles.logoutAction, pressed && styles.pressed]}
        >
          <Text style={[styles.previewTag, { color: brand.primary }]}>ĐĂNG XUẤT</Text>
        </Pressable>
      </View>

      <View style={styles.heroFrame}>
        <Image
          source={{ uri: VENUE_IMAGE }}
          style={styles.heroImage}
          contentFit="cover"
          accessibilityLabel="Không gian tiệc cưới ngoài trời trang nhã"
        />
        <View style={[styles.heroBand, { backgroundColor: brand.primary }]}>
          <Text selectable style={[styles.heroDate, { color: brand.primaryText }]}>
            15 · 11 · 2026
          </Text>
          <Text selectable style={[styles.heroVenue, { color: brand.primaryText }]}>
            SẢNH ÁNH DƯƠNG
          </Text>
        </View>
      </View>

      <View style={styles.welcomeBlock}>
        <Text style={[styles.scriptTitle, { color: brand.script }]}>Hành trình của hai bạn</Text>
        <Text selectable style={[styles.displayTitle, { color: brand.display }]}>
          Chào Minh &amp; An
        </Text>
        <View style={[styles.goldRule, { backgroundColor: brand.gold }]} />
        <Text style={[type.body, styles.welcomeCopy, { color: colors.secondaryLabel }]}>
          Mọi việc đang tiến triển đúng kế hoạch. Hôm nay chỉ còn một quyết định quan trọng.
        </Text>
      </View>

      <View
        style={[styles.countdownPanel, { backgroundColor: brand.powder, borderColor: brand.gold }]}
        accessibilityLabel="Còn 42 ngày đến lễ cưới"
      >
        <View>
          <Text style={[styles.countdownEyebrow, { color: brand.primary }]}>
            ĐẾM NGƯỢC ĐẾN NGÀY CƯỚI
          </Text>
          <Text selectable style={[styles.countdownValue, { color: brand.display }]}>
            Còn 42 ngày
          </Text>
          <Text style={[styles.countdownCaption, { color: colors.secondaryLabel }]}>
            đến khoảnh khắc của hai bạn
          </Text>
        </View>
        <View style={styles.progressRow} accessibilityLabel="Tiến độ chuẩn bị 68 phần trăm">
          <View style={[styles.progressTrack, { backgroundColor: brand.goldSoft }]}>
            <View style={[styles.progressValue, { backgroundColor: brand.primary }]} />
          </View>
          <Text style={[styles.progressText, { color: brand.primary }]}>68%</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: brand.display }]}>
            Việc cần làm tiếp theo
          </Text>
          <Text style={[type.caption, { color: colors.secondaryLabel }]}>
            Ưu tiên trong tuần này
          </Text>
        </View>
        <Text style={[styles.taskCount, { color: brand.gold }]}>03</Text>
      </View>

      <View style={[styles.taskGroup, { borderColor: brand.gold }]}>
        <TaskRow
          index="01"
          title="Xác nhận thực đơn"
          description="Chọn món chính trước 08 tháng 10"
          accent={brand.primary}
          colors={colors}
        />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <TaskRow
          index="02"
          title="Duyệt sơ đồ bàn"
          description="320 khách · 32 bàn dự kiến"
          accent={brand.gold}
          colors={colors}
        />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <TaskRow
          index="03"
          title="Chọn nhạc đón khách"
          description="12 bài đã được gợi ý"
          accent={brand.gold}
          colors={colors}
        />
      </View>

      <View style={[styles.appointmentSection, { backgroundColor: brand.powder }]}>
        <Text style={[styles.sectionTitle, { color: brand.display }]}>Lịch hẹn gần nhất</Text>
        <View style={[styles.appointmentRow, { borderColor: brand.gold }]}>
          <View style={styles.dateTile}>
            <Text style={[styles.dateMonth, { color: brand.primary }]}>THÁNG 10</Text>
            <Text selectable style={[styles.dateNumber, { color: brand.display }]}>
              09
            </Text>
          </View>
          <View style={styles.appointmentCopy}>
            <Text style={[type.headline, { color: colors.label }]}>
              Thử thực đơn cùng bếp trưởng
            </Text>
            <Text style={[type.caption, { color: colors.secondaryLabel }]}>
              18:30 · Phòng Tasting 02
            </Text>
          </View>
          <Text style={[styles.chevron, { color: brand.gold }]} aria-hidden>
            ›
          </Text>
        </View>
      </View>

      <Host matchContents seedColor={brand.primary}>
        <Button
          label="Xem toàn bộ kế hoạch"
          variant="filled"
          testID="open-plan-button"
          onPress={() => setPlanOpened(true)}
        />
      </Host>

      {planOpened ? (
        <Text
          style={[styles.previewStatus, { color: brand.primary }]}
          accessibilityLiveRegion="polite"
        >
          Bản xem trước kế hoạch đã được mở.
        </Text>
      ) : null}
    </ScrollView>
  );
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

type TaskRowProps = Readonly<{
  index: string;
  title: string;
  description: string;
  accent: string;
  colors: typeof semanticColors;
}>;

function TaskRow({ index, title, description, accent, colors }: TaskRowProps) {
  return (
    <View style={styles.taskRow} accessibilityLabel={`${title}. ${description}`}>
      <Text style={[styles.taskIndex, { color: accent }]}>{index}</Text>
      <View style={styles.taskCopy}>
        <Text style={[type.headline, { color: colors.label }]}>{title}</Text>
        <Text style={[type.caption, { color: colors.secondaryLabel }]}>{description}</Text>
      </View>
      <Text style={[styles.chevron, { color: accent }]} aria-hidden>
        ›
      </Text>
    </View>
  );
}
