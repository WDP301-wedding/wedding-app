import type { OtpChallenge } from '@/features/identity-access/password-otp-api';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button, Host, TextInput, useNativeState } from '@expo/ui';
import {
  createExperienceGateway,
  type Overview,
  type Profile,
} from '@/features/identity-access/experience-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import {
  createPlanningGateway,
  type ConfirmedPlanningSnapshot,
} from '@/features/booking-lifecycle/planning-api';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme, type } from '@/theme';
import { styles } from './home.styles';

const experience = createExperienceGateway();
const planning = createPlanningGateway();
export function CoupleOverviewScreen({
  session,
  onLogout,
  renderPlan,
}: Readonly<{
  session: AndroidIdentitySession;
  onLogout: () => void;
  renderPlan: (snapshot: ConfirmedPlanningSnapshot) => ReactNode;
}>) {
  const { brand, colors } = useWeddingTheme();
  const [view, setView] = useState<'overview' | 'account' | 'plan'>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [plan, setPlan] = useState<ConfirmedPlanningSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (cursor?: string) => {
      setPending(true);
      setError(null);
      try {
        const page = await session.authorize((token) => experience.overview(token, cursor));
        setOverview((old) =>
          cursor && old ? { ...page, data: [...old.data, ...page.data] } : page,
        );
      } catch (caught) {
        if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
          setOverview(null);
          setPlan(null);
        }
        setError('Chưa tải được kế hoạch. Kiểm tra kết nối và thử lại.');
      } finally {
        setPending(false);
      }
    },
    [session],
  );
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function open(id: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await session.authorize((token) => planning.loadConfirmed(token, id));
      if (result.status === 'confirmed') {
        setPlan(result.snapshot);
        setView('plan');
      } else {
        setPlan(null);
        setError('Kế hoạch chưa sẵn sàng trên ứng dụng. Hãy tiếp tục trên Web.');
      }
    } catch {
      setPlan(null);
      setError('Không tải được kế hoạch. Hãy kiểm tra quyền truy cập và thử lại.');
    } finally {
      setPending(false);
    }
  }
  const button = (label: string, action: () => void) => (
    <Host matchContents>
      <Button
        label={label}
        variant="text"
        disabled={pending}
        onPress={action}
        style={{ height: 48 }}
      />
    </Host>
  );
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}
    >
      <View style={styles.topBar}>
        <Text style={[type.headline, { color: brand.display }]}>WEDDING ESTATE</Text>
        {button('Đăng xuất', onLogout)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 16 }}>
        {button('Tổng quan', () => {
          setView('overview');
          setError(null);
        })}
        {button('Tài khoản', () => {
          setView('account');
          setError(null);
        })}
      </View>
      {view === 'account' ? (
        <NativeAccountSettings session={session} onSignedOut={onLogout} />
      ) : (
        <>
          <View style={[styles.planningHero, { backgroundColor: brand.primary }]}>
            <Text style={[styles.countdownEyebrow, { color: brand.goldSoft }]}>
              HÀNH TRÌNH CỦA HAI BẠN
            </Text>
            <Text style={[type.largeTitle, { color: brand.primaryText }]}>
              {view === 'plan' ? 'Kế hoạch ngày cưới' : 'Cùng chuẩn bị ngày chung đôi'}
            </Text>
            <Text style={[type.body, { color: brand.primaryText }]}>
              Thông tin đã được nhà hàng xác nhận, luôn sẵn sàng để hai bạn theo dõi.
            </Text>
          </View>
          {pending && <ActivityIndicator accessibilityLabel="Đang tải" color={brand.primary} />}
          {error && (
            <View style={styles.planningNotice}>
              <Text accessibilityRole="alert" style={[type.body, { color: brand.script }]}>
                {error}
              </Text>
              {button('Thử lại', () => void load())}
            </View>
          )}
          {view === 'plan' && plan ? (
            <>
              {button('Quay về tổng quan', () => setView('overview'))}
              {renderPlan(plan)}
            </>
          ) : (
            <>
              {!overview && !pending && !error && button('Tải kế hoạch', () => void load())}
              {overview?.data.length === 0 && (
                <View style={styles.planningNotice}>
                  <Text style={[type.title, { color: brand.display }]}>
                    Chưa có kế hoạch đã xác nhận
                  </Text>
                  <Text style={[type.body, { color: colors.secondaryLabel }]}>
                    Sau khi tiền cọc được xác nhận, kế hoạch sẽ xuất hiện tại đây. Bạn có thể tiếp
                    tục trao đổi với nhà hàng trên Web.
                  </Text>
                </View>
              )}
              {overview?.data.map((item) => (
                <View
                  key={item.bookingId}
                  style={[
                    styles.planningNotice,
                    { borderColor: brand.gold, backgroundColor: brand.powder },
                  ]}
                >
                  <Text style={[type.caption, { color: brand.script }]}>
                    {item.phase === 'COMPLETED' ? 'ĐÃ HOÀN THÀNH' : 'ĐÃ XÁC NHẬN'}
                  </Text>
                  <Text style={[type.title, { color: brand.display }]}>{item.hallName}</Text>
                  <Text style={[type.body, { color: colors.label }]}>
                    {new Date(`${item.eventDate}T00:00:00+07:00`).toLocaleDateString('vi-VN')} ·{' '}
                    {item.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'} ·{' '}
                    {item.planningHeadcount} khách
                  </Text>
                  <Text style={[type.subhead, { color: colors.secondaryLabel }]}>
                    {!item.hasTimeline
                      ? 'Kịch bản đang được chuẩn bị'
                      : item.coupleApproved && item.managerApproved
                        ? 'Kịch bản đã được hai bên thống nhất'
                        : 'Kịch bản cần được thống nhất'}
                  </Text>
                  {button('Xem kế hoạch', () => void open(item.bookingId))}
                </View>
              ))}
              {overview?.nextCursor &&
                button('Xem thêm kế hoạch', () => void load(overview.nextCursor!))}
              {overview && button('Cập nhật tổng quan', () => void load())}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

export function NativeAccountSettings({
  session,
  onSignedOut,
}: Readonly<{ session: AndroidIdentitySession; onSignedOut: () => void }>) {
  const { brand, colors } = useWeddingTheme();
  const [profile, setProfile] = useState<Profile | null>(null),
    [name, setName] = useState('');
  const [current, setCurrent] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const value = await session.authorize((token) => experience.profile(token));
      setProfile(value);
      setName(value.displayName ?? '');
    } catch {
      setError('Không tải được hồ sơ. Hãy thử lại.');
    } finally {
      setPending(false);
    }
  }, [session]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  async function save() {
    if (pending || !profile || !name.trim()) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      setProfile(
        await session.authorize((token) =>
          experience.updateProfile(token, name.trim(), profile.revision),
        ),
      );
      setMessage('Đã lưu tên hiển thị.');
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 409
          ? 'Hồ sơ đã thay đổi. Tải lại trước khi tiếp tục.'
          : 'Chưa lưu được hồ sơ. Nội dung của bạn vẫn được giữ.',
      );
    } finally {
      setPending(false);
    }
  }
  async function changeRequest() {
    if (pending || remaining > 0) return;
    setPending(true);
    setError(null);
    try {
      const value = await session.authorize((token) =>
        experience.requestPasswordChange(token, current),
      );
      setChallenge(value);
      setRemaining(value.resendAfterSeconds);
      setCode('');
      setMessage('Đã gửi mã OTP mới vào email.');
    } catch {
      setError('Chưa gửi được mã. Hãy thử lại sau.');
    } finally {
      setPending(false);
    }
  }
  async function change() {
    if (pending) return;
    if (!current || next.length < 12 || next.length > 128 || next !== confirm) {
      setError('Mật khẩu mới cần 12–128 ký tự và xác nhận trùng khớp.');
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (!challenge) {
        const value = await session.authorize((token) =>
          experience.requestPasswordChange(token, current),
        );
        setChallenge(value);
        setRemaining(value.resendAfterSeconds);
        setMessage('Mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.');
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        setError('Nhập mã OTP gồm 6 chữ số.');
        return;
      }
      await session.authorize((token) =>
        experience.changePassword(token, challenge.challengeId, code, next),
      );
      setCurrent('');
      setNext('');
      setConfirm('');
      await session.discardRevokedSession();
      onSignedOut();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.code === 'CURRENT_PASSWORD_INVALID'
          ? 'Mật khẩu hiện tại chưa đúng.'
          : 'Mã OTP chưa đúng, đã hết hạn hoặc chưa gửi được. Kiểm tra mã mới nhất rồi thử lại.',
      );
    } finally {
      setPending(false);
    }
  }
  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    secret = false,
  ) => <NativeField label={label} value={value} onChangeText={onChangeText} secret={secret} />;
  const action = (label: string, onPress: () => void) => (
    <Host matchContents>
      <Button
        label={label}
        disabled={pending}
        onPress={onPress}
        style={{ height: 48, backgroundColor: brand.primary, borderRadius: 4 }}
      />
    </Host>
  );
  return (
    <View
      style={[
        styles.authPanel,
        { marginTop: 0, backgroundColor: brand.powder, borderColor: brand.gold },
      ]}
    >
      <Text style={[type.largeTitle, { color: brand.display }]}>Hồ sơ và bảo mật</Text>
      {pending && <ActivityIndicator color={brand.primary} />}
      {error && (
        <Text accessibilityRole="alert" style={[type.body, { color: brand.script }]}>
          {error}
        </Text>
      )}
      {message && (
        <Text accessibilityLiveRegion="polite" style={[type.body, { color: brand.primary }]}>
          {message}
        </Text>
      )}
      {action('Tải lại hồ sơ', () => void load())}
      {profile && (
        <>
          <Text selectable style={[type.body, { color: colors.label }]}>
            {profile.displayEmail}
          </Text>
          {field('Tên hiển thị', name, setName)}
          {action('Lưu thay đổi', () => void save())}
          <Text style={[type.title, { color: brand.display }]}>Đổi mật khẩu</Text>
          {field('Mật khẩu hiện tại', current, setCurrent, true)}
          {field('Mật khẩu mới', next, setNext, true)}
          {field('Xác nhận mật khẩu mới', confirm, setConfirm, true)}
          <Text style={[type.caption, { color: colors.secondaryLabel }]}>
            Dùng 12–128 ký tự. Sau khi đổi, hãy đăng nhập lại trên các thiết bị.
          </Text>
          {challenge && (
            <NativeField label="Mã OTP" value={code} onChangeText={setCode} secret={false} otp />
          )}
          {action(challenge ? 'Xác nhận và cập nhật mật khẩu' : 'Gửi mã OTP', () => void change())}
          {challenge &&
            remaining === 0 &&
            action('Gửi lại mã OTP', () => {
              void changeRequest();
            })}
          {challenge && remaining > 0 && <Text>Gửi lại sau {remaining}s</Text>}
        </>
      )}
    </View>
  );
}

function NativeField({
  label,
  value,
  onChangeText,
  secret,
  otp = false,
}: Readonly<{
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secret: boolean;
  otp?: boolean;
}>) {
  const state = useNativeState(value);
  const { colors } = useWeddingTheme();
  useEffect(() => {
    state.set(value);
  }, [state, value]);
  return (
    <View style={styles.authField}>
      <Text style={[type.subhead, { color: colors.label }]}>{label}</Text>
      <Host matchContents>
        <TextInput
          value={state}
          onChangeText={(text) => {
            state.set(text);
            onChangeText(text);
          }}
          placeholder={label}
          secureTextEntry={secret}
          autoComplete={otp ? 'one-time-code' : secret ? 'off' : 'name'}
          keyboardType={otp ? 'number-pad' : 'default'}
          maxLength={otp ? 6 : secret ? 512 : 120}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            height: 52,
            borderWidth: 1,
            borderColor: '#C5A880',
            borderRadius: 4,
            padding: 12,
          }}
        />
      </Host>
    </View>
  );
}
