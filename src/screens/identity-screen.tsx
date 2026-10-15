import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import {
  createPasswordOtpGateway,
  type OtpChallenge,
} from '@/features/identity-access/password-otp-api';
import {
  type AndroidIdentitySession,
  type AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import { type, useWeddingTheme } from '@/theme';
import { styles } from './home.styles';

export const VENUE_IMAGE =
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85';

export type IdentityScreenProps = Readonly<{
  initialMode?: 'login' | 'reset-request';
  onAuthenticated: (snapshot: AndroidSessionSnapshot) => void;
  session: AndroidIdentitySession;
}>;

export function mapAuthError(caught: unknown): string {
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

export function IdentityScreen({
  initialMode = 'login',
  onAuthenticated,
  session,
}: IdentityScreenProps) {
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

export function LabeledInput({
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
