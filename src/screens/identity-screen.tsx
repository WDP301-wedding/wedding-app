import { toast } from '@/lib/toast/store';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { useAppInsets } from '@/lib/safe-area';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { HyText as Text, HyInput as TextInput, HyAlert } from '@/components/hy-ui';

import {
  createPasswordOtpGateway,
  type OtpChallenge,
} from '@/features/identity-access/password-otp-api';
import {
  type AndroidIdentitySession,
  type AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import { EyeIcon, EyeOffIcon } from '@/components/icons';
import { type, useWeddingTheme } from '@/theme';
import { styles } from './identity.styles';

export type IdentityScreenProps = Readonly<{
  initialMode?: 'login' | 'reset-request';
  onAuthenticated: (snapshot: AndroidSessionSnapshot) => void;
  session: AndroidIdentitySession;
  onBackToPublic?: () => void;
}>;

export function mapAuthError(caught: unknown): string {
  if (caught instanceof ApiClientError) {
    if (caught.status === 401) return 'Email hoặc mật khẩu chưa chính xác. Vui lòng thử lại.';
    if (caught.status === 422)
      return 'Dữ liệu không hợp lệ. Mật khẩu phải có độ dài từ 1 đến 128 ký tự.';
    if (caught.status === 429)
      return 'Đã vượt quá số lần thử cho phép. Vui lòng đợi trong giây lát trước khi thử lại.';
    if (caught.status === 503 || caught.code === 'EMAIL_WORKER_DISABLED')
      return 'Hiện chưa gửi được mã xác thực qua email. Vui lòng thử lại sau.';
    if (caught.code === 'OTP_INVALID')
      return 'Mã xác thực chưa chính xác. Vui lòng kiểm tra lại 6 chữ số trong email.';
    if (caught.code === 'CHALLENGE_EXPIRED')
      return 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.';
    if (caught.kind === 'network') return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.';
    if (caught.kind === 'timeout') return 'Chưa nhận được phản hồi. Vui lòng thử lại sau.';
    if (caught.message) return caught.message;
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.';
}

export function IdentityScreen({
  initialMode = 'login',
  onAuthenticated,
  session,
  onBackToPublic,
}: IdentityScreenProps) {
  const { brand, colors } = useWeddingTheme();
  const insets = useAppInsets();
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
  const [showPassword, setShowPassword] = useState(false);
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
          toast.success('Đã đăng nhập.');
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
            'Nếu tài khoản đủ điều kiện, bạn sẽ nhận được mã xác thực (OTP) qua email. Mã có hiệu lực trong 10 phút.',
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
      setError('Chưa có yêu cầu cấp mã xác thực. Vui lòng yêu cầu mã mới.');
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Nhập mã xác thực gồm 6 chữ số trong email.');
      return;
    }
    if (password.length === 0 || password.length > 128) {
      setError('Mật khẩu không được để trống và tối đa 128 ký tự.');
      return;
    }
    if (password !== confirmation) {
      setError('Mật khẩu nhập lại chưa khớp với mật khẩu mới.');
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
        setMessage('Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.authContent,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        {onBackToPublic ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại khám phá"
            onPress={onBackToPublic}
            style={({ pressed }) => [
              {
                alignSelf: 'flex-start',
                paddingVertical: 8,
                paddingHorizontal: 12,
                marginBottom: 8,
              },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={{ fontSize: 14, color: brand.primary, fontWeight: '600' }}>
              ← Khám phá sảnh & thực đơn
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.authBrand} accessibilityLabel="Hỷ Yến">
          <Image
            source={require('../../assets/images/hy-yen-logo.png')}
            contentFit="contain"
            accessible={false}
            style={{ width: 64 * (394 / 414), height: 64 }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.largeTitle, { fontSize: 28, lineHeight: 38, color: brand.primary }]}>
              Hỷ Yến
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.secondaryLabel }}>
              Không gian cưới của hai bạn
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.authPanel,
            { backgroundColor: colors.background, borderColor: colors.background },
          ]}
        >
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
              secureTextEntry={!showPassword}
              editable={!pending}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  disabled={pending}
                  hitSlop={8}
                  onPress={() => setShowPassword((v) => !v)}
                  style={({ pressed }) => [
                    {
                      width: 44,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  {showPassword ? (
                    <EyeOffIcon size={22} color={brand.primary} />
                  ) : (
                    <EyeIcon size={22} color="#6E5D63" />
                  )}
                </Pressable>
              }
            />
          ) : null}

          {mode === 'reset-complete' && challenge ? (
            <LabeledInput
              label="Mã xác thực"
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
              secureTextEntry={!showPassword}
              editable={!pending}
              rightAccessory={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  disabled={pending}
                  hitSlop={8}
                  onPress={() => setShowPassword((v) => !v)}
                  style={({ pressed }) => [
                    {
                      width: 44,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  {showPassword ? (
                    <EyeOffIcon size={22} color={brand.primary} />
                  ) : (
                    <EyeIcon size={22} color="#6E5D63" />
                  )}
                </Pressable>
              }
            />
          ) : null}

          {error === null ? null : (
            <HyAlert variant="error" message={error} style={{ marginBottom: 16 }} />
          )}

          {message === null ? null : (
            <HyAlert
              variant="info"
              message={message}
              onDismiss={() => setMessage(null)}
              style={{ marginBottom: 16 }}
            />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              mode === 'login'
                ? 'Đăng nhập'
                : mode === 'reset-request'
                  ? 'Gửi mã xác thực'
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
                  ? 'Đăng nhập'
                  : mode === 'reset-request'
                    ? 'Gửi mã xác thực'
                    : 'Cập nhật mật khẩu'}
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
                      setMessage('Đã yêu cầu gửi lại mã xác thực.');
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
                  {remaining > 0 ? `Gửi lại mã sau ${remaining} giây` : 'Gửi lại mã xác thực'}
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
    </KeyboardAvoidingView>
  );
}

export function LabeledInput({
  label,
  rightAccessory,
  style,
  ...input
}: Readonly<React.ComponentProps<typeof TextInput>> & {
  label: string;
  rightAccessory?: React.ReactNode;
}) {
  return (
    <View style={styles.authField}>
      <Text style={styles.authFieldLabel}>{label}</Text>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          {...input}
          accessibilityLabel={label}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.authInput, rightAccessory ? { paddingRight: 48 } : null, style]}
        />
        {rightAccessory ? (
          <View
            style={{
              position: 'absolute',
              right: 6,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {rightAccessory}
          </View>
        ) : null}
      </View>
    </View>
  );
}
