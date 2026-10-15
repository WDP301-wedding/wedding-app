import { HyText as Text, HyButton, HyInput } from '@/components/hy-ui';
import '@/lib/alert';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import {
  createExperienceGateway,
  type Profile,
  type SessionSummary,
} from '@/features/identity-access/experience-api';
import type { OtpChallenge } from '@/features/identity-access/password-otp-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme, type } from '@/theme';
import { styles } from './home.styles';

const experience = createExperienceGateway();

export function NativeAccountSettings({
  session,
  onSignedOut,
}: Readonly<{ session: AndroidIdentitySession; onSignedOut: () => void }>) {
  const { brand, colors } = useWeddingTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<readonly SessionSummary[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const result = await session.authorize((token) => experience.listSessions(token));
      setSessions(Array.from(result.sessions));
    } catch {
      // Sessions listing is non-blocking
    } finally {
      setLoadingSessions(false);
    }
  }, [session]);

  const load = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const value = await session.authorize((token) => experience.profile(token));
      setProfile(value);
      setName(value.displayName ?? '');
      void loadSessions();
    } catch {
      setError('Không tải được hồ sơ từ máy chủ. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setPending(false);
    }
  }, [session, loadSessions]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function save() {
    if (pending || !profile || !name.trim()) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await session.authorize((token) =>
        experience.updateProfile(token, name.trim(), profile.revision),
      );
      setProfile(updated);
      setMessage('Đã lưu tên hiển thị.');
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 409) {
        try {
          const fresh = await session.authorize((token) => experience.profile(token));
          setProfile(fresh);
        } catch {}
        setError('Hồ sơ đã thay đổi. Tải lại trước khi tiếp tục.');
      } else {
        setError(
          caught instanceof ApiClientError && caught.message
            ? caught.message
            : 'Chưa lưu được hồ sơ. Nội dung của bạn vẫn được giữ trên màn hình.',
        );
      }
    } finally {
      setPending(false);
    }
  }

  async function changeRequest(isResend = false) {
    if (pending || remaining > 0) return;
    if (!current) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const value = await session.authorize((token) =>
        experience.requestPasswordChange(token, current),
      );
      setChallenge(value);
      setRemaining(value.resendAfterSeconds);
      setCode('');
      setMessage(
        isResend
          ? 'Đã gửi mã OTP mới vào email.'
          : 'Mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.',
      );
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        (caught.code === 'CURRENT_PASSWORD_INVALID' ||
          caught.status === 400 ||
          caught.status === 401)
      ) {
        setError('Mật khẩu hiện tại chưa chính xác.');
      } else {
        setError('Chưa gửi được mã. Hãy thử lại sau.');
      }
    } finally {
      setPending(false);
    }
  }

  async function change() {
    if (pending) return;
    if (!current) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (next.length < 12 || next.length > 128) {
      setError('Mật khẩu mới phải có độ dài từ 12 đến 128 ký tự.');
      return;
    }
    if (next !== confirm) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    if (!challenge) {
      await changeRequest(false);
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Nhập mã OTP gồm 6 chữ số.');
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await session.authorize((token) =>
        experience.changePassword(token, challenge.challengeId, code.trim(), next),
      );
      setCurrent('');
      setNext('');
      setConfirm('');
      setCode('');
      setChallenge(null);
      await session.discardRevokedSession();
      onSignedOut();
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        if (caught.code === 'CURRENT_PASSWORD_INVALID' || caught.status === 401) {
          setError('Mật khẩu hiện tại chưa chính xác.');
        } else if (caught.code === 'CHALLENGE_EXPIRED') {
          setError('Mã OTP đã hết hiệu lực. Vui lòng gửi lại mã mới.');
        } else if (caught.code === 'OTP_INVALID' || caught.status === 400) {
          setError('Mã OTP 6 chữ số chưa chính xác.');
        } else if (caught.status === 429) {
          setError('Quá nhiều lần thử sai. Vui lòng đợi trong giây lát.');
        } else {
          setError(caught.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
        }
      } else {
        setError('Lỗi kết nối khi đổi mật khẩu. Vui lòng thử lại.');
      }
    } finally {
      setPending(false);
    }
  }

  const revoke = (sessionId: string) => {
    Alert.alert(
      'Xác nhận thu hồi phiên',
      'Bạn có chắc chắn muốn thu hồi phiên đăng nhập này? Thiết bị đó sẽ bị đăng xuất ngay lập tức.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setPending(true);
              setError(null);
              setMessage(null);
              try {
                await session.authorize((token) => experience.revokeSession(token, sessionId));
                await loadSessions();
                setMessage('Đã thu hồi phiên làm việc thành công.');
              } catch {
                setError('Không thể thu hồi phiên. Vui lòng thử lại sau.');
              } finally {
                setPending(false);
              }
            })();
          },
        },
      ],
    );
  };

  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    secret = false,
  ) => <NativeField label={label} value={value} onChangeText={onChangeText} secret={secret} />;

  const action = (label: string, onPress: () => void) => (
    <HyButton label={label} disabled={pending} onPress={onPress} />
  );

  const snap = session.snapshot();
  const currentSessionId = snap.status === 'authenticated' ? (snap.actor?.sessionId ?? null) : null;

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
          <Text style={[type.caption, { color: colors.secondaryLabel, marginBottom: 8 }]}>
            Phiên bản hồ sơ: #{profile.revision}
          </Text>
          {field('Tên hiển thị', name, setName)}
          {action('Lưu thay đổi', () => void save())}

          <Text style={[type.title, { color: brand.display, marginTop: 18 }]}>Đổi mật khẩu</Text>
          {field('Mật khẩu hiện tại', current, setCurrent, true)}
          {field('Mật khẩu mới', next, setNext, true)}
          {field('Xác nhận mật khẩu mới', confirm, setConfirm, true)}
          <Text style={[type.caption, { color: colors.secondaryLabel }]}>
            Dùng 12–128 ký tự. Sau khi đổi, hệ thống sẽ thu hồi các phiên và bạn cần đăng nhập lại.
          </Text>
          {challenge && (
            <NativeField label="Mã OTP" value={code} onChangeText={setCode} secret={false} otp />
          )}
          {action(challenge ? 'Xác nhận và cập nhật mật khẩu' : 'Gửi mã OTP', () => void change())}
          {challenge &&
            remaining === 0 &&
            action('Gửi lại mã OTP', () => {
              void changeRequest(true);
            })}
          {challenge && remaining > 0 && (
            <Text style={[type.caption, { color: colors.secondaryLabel }]}>
              Gửi lại sau {remaining}s
            </Text>
          )}

          <Text style={[type.title, { color: brand.display, marginTop: 24 }]}>
            Quản lý các phiên đăng nhập
          </Text>
          <Text style={[type.caption, { color: colors.secondaryLabel, marginBottom: 8 }]}>
            Danh sách phiên làm việc an toàn của tài khoản trên máy chủ.
          </Text>
          {loadingSessions ? (
            <ActivityIndicator color={brand.primary} />
          ) : sessions && sessions.length > 0 ? (
            sessions.map((s) => {
              const isCurrent = currentSessionId === s.sessionId;
              const lastSeen = new Date(s.lastSeenAt).toLocaleString('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
              });
              return (
                <View
                  key={s.sessionId}
                  style={{
                    padding: 12,
                    borderWidth: 1,
                    borderColor: isCurrent ? brand.primary : brand.gold,
                    borderRadius: 6,
                    marginBottom: 8,
                    backgroundColor: isCurrent ? '#F4F0EB' : 'transparent',
                  }}
                >
                  <Text style={[type.subhead, { fontWeight: '700', color: colors.label }]}>
                    {s.clientKind === 'ANDROID' ? 'Thiết bị di động Android' : 'Trình duyệt Web'}
                    {isCurrent ? ' (Phiên hiện tại)' : ''}
                  </Text>
                  <Text style={[type.caption, { color: colors.secondaryLabel, marginVertical: 4 }]}>
                    Hoạt động gần nhất: {lastSeen} · Trạng thái: {s.status}
                  </Text>
                  {!isCurrent && s.status === 'ACTIVE' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Thu hồi phiên này"
                      disabled={pending}
                      onPress={() => revoke(s.sessionId)}
                      style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: brand.script }}>
                        Thu hồi phiên này
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={[type.caption, { color: colors.secondaryLabel }]}>
              Chưa tải được danh sách phiên. Bấm &quot;Tải lại danh sách phiên&quot; bên dưới.
            </Text>
          )}
          {action('Tải lại danh sách phiên', () => void loadSessions())}
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
  const { colors } = useWeddingTheme();

  return (
    <View style={styles.authField}>
      <Text style={[type.subhead, { color: colors.label }]}>{label}</Text>

      <HyInput
        value={value}
        onChangeText={(text) => {
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
          minHeight: 56,
          borderWidth: 1,
          borderColor: '#9A877F',
          borderRadius: 12,
          padding: 12,
        }}
      />
    </View>
  );
}
