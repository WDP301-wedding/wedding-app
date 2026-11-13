import { NativeAccountSettings } from './native-account-settings';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  Alert,
  Pressable as MockPressable,
  Text as MockText,
  TextInput as MockTextInput,
  View as MockView,
} from 'react-native';

import { useRef as mockUseRef, type ReactNode } from 'react';

import { createExperienceGateway } from '@/features/identity-access/experience-api';

import { AndroidIdentitySession, type IdentityApi } from '@/features/identity-access/session';

import { ApiClientError } from '@/lib/api/client';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 16, top: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/ui', () => ({
  Host: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
  Button: ({
    label,
    onPress,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    disabled: boolean;
  }) => (
    <MockPressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      <MockText>{label}</MockText>
    </MockPressable>
  ),
  useNativeState: (initial: string) =>
    mockUseRef({
      value: initial,
      set(value: string) {
        this.value = value;
      },
    }).current,
  TextInput: ({
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
  }: {
    value: { value: string };
    onChangeText: (value: string) => void;
    placeholder: string;
    secureTextEntry: boolean;
  }) => (
    <MockTextInput
      accessibilityLabel={placeholder}
      value={value.value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
    />
  ),
}));

jest.mock('@/features/identity-access/experience-api', () => {
  const gateway = {
    profile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    requestPasswordChange: jest.fn(),
    overview: jest.fn(),
    listSessions: jest.fn().mockResolvedValue([]),
    revokeSession: jest.fn().mockResolvedValue(undefined),
  };
  return { createExperienceGateway: () => gateway };
});

const gateway = jest.mocked(createExperienceGateway());

const actor = {
  accountId: 'account',
  displayEmail: 'couple@example.com',
  roles: ['COUPLE'] as const,
  sessionId: 'session',
};

async function session() {
  const api: IdentityApi = {
    createSession: jest
      .fn()
      .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', sessionId: 'session' }),
    getCurrentUser: jest.fn().mockResolvedValue(actor),
    refreshSession: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    requestPasswordReset: jest.fn(),
    completePasswordReset: jest.fn(),
  };
  const store = {
    read: jest.fn().mockResolvedValue(null),
    replace: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const value = new AndroidIdentitySession(api, store);
  await value.login('couple@example.com', 'initial-password-123');
  return { value, store };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  gateway.profile.mockResolvedValue({
    accountId: 'account',
    displayEmail: 'couple@example.com',
    displayName: 'Lan',
    revision: 1,
  });
  gateway.overview.mockResolvedValue({ data: [], nextCursor: null });
  gateway.listSessions.mockResolvedValue({ sessions: [] } as any);
  gateway.revokeSession.mockResolvedValue(undefined);
  gateway.requestPasswordChange.mockResolvedValue({
    accepted: true,
    challengeId: 'challenge-default',
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
  });
  gateway.changePassword.mockResolvedValue(undefined);
});

afterEach(async () => {
  await cleanup();
});

it('checks password confirmation before sending and clears secure state after success', async () => {
  const current = await session(),
    signedOut = jest.fn();
  gateway.changePassword.mockResolvedValue(undefined);
  gateway.requestPasswordChange.mockResolvedValue({
    accepted: true,
    challengeId: 'challenge',
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
  });
  await render(<NativeAccountSettings session={current.value} onSignedOut={signedOut} />);
  await screen.findByText('couple@example.com');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'initial-password-123');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'replacement-password-123');
  await fireEvent.changeText(
    screen.getByLabelText('Xác nhận mật khẩu mới'),
    'different-password-123',
  );
  await fireEvent.press(screen.getByText('Gửi mã xác thực'));
  expect(gateway.changePassword).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText('Xác nhận mật khẩu mới'),
    'replacement-password-123',
  );
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  await screen.findByLabelText('Mã xác thực');
  expect(signedOut).not.toHaveBeenCalled();
  expect(gateway.changePassword).not.toHaveBeenCalled();
  expect(gateway.requestPasswordChange).toHaveBeenCalledWith('access', 'initial-password-123');
  await fireEvent.changeText(screen.getByLabelText('Mã xác thực'), '123456');
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  await waitFor(() => expect(signedOut).toHaveBeenCalledTimes(1));
  expect(gateway.changePassword).toHaveBeenCalledWith(
    'access',
    'challenge',
    '123456',
    'replacement-password-123',
  );
  expect(current.store.clear).toHaveBeenCalled();
  expect(current.value.snapshot().status).toBe('anonymous');
});

it('retains the current-password draft when the embedded security section is reopened', async () => {
  const current = await session();
  await render(
    <NativeAccountSettings
      session={current.value}
      onSignedOut={jest.fn()}
      embedded
      showSessions={false}
    />,
  );
  await screen.findByText('couple@example.com');
  expect(screen.queryByLabelText('Mật khẩu hiện tại')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu', expanded: false }));
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'giữ-bản-nháp');
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu', expanded: true }));
  await fireEvent.press(screen.getByRole('button', { name: 'Đổi mật khẩu', expanded: false }));
  expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveProp('value', 'giữ-bản-nháp');
  expect(gateway.requestPasswordChange).not.toHaveBeenCalled();
});

it('saves updated profile display name and handles update errors', async () => {
  const current = await session();
  gateway.updateProfile.mockResolvedValue({
    accountId: 'account',
    displayEmail: 'couple@example.com',
    displayName: 'Lan Mới',
    revision: 2,
  });

  await render(<NativeAccountSettings session={current.value} onSignedOut={jest.fn()} />);
  await screen.findByText('couple@example.com');

  const nameInput = screen.getByLabelText('Tên hiển thị');
  await fireEvent.changeText(nameInput, 'Lan Mới');
  await fireEvent.press(screen.getByText('Lưu thay đổi'));

  expect(await screen.findByText('Đã lưu tên hiển thị.')).toBeOnTheScreen();
  expect(gateway.updateProfile).toHaveBeenCalledWith('access', 'Lan Mới', 1);

  // 409 conflict
  gateway.updateProfile.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'api',
      status: 409,
      code: 'CONFLICT',
      message: 'Conflict',
      requestId: '00000000-0000-0000-0000-000000000003',
    }),
  );
  await fireEvent.press(screen.getByText('Lưu thay đổi'));
  expect(
    await screen.findByText(
      'Thông tin tài khoản vừa được cập nhật. Hãy tải lại trước khi lưu thay đổi.',
    ),
  ).toBeOnTheScreen();
});

it('completes full password change flow with OTP verification', async () => {
  const current = await session();
  const signedOut = jest.fn();
  gateway.requestPasswordChange.mockResolvedValue({
    accepted: true,
    challengeId: 'challenge-123',
    expiresInSeconds: 600,
    resendAfterSeconds: 0 as unknown as 60,
  });
  gateway.changePassword.mockResolvedValue(undefined);

  await render(<NativeAccountSettings session={current.value} onSignedOut={signedOut} />);
  await screen.findByText('couple@example.com');

  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'initial-password-123');
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'new-password-12345');
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'new-password-12345');

  // First press sends challenge
  await fireEvent.press(screen.getByText('Gửi mã xác thực'));
  expect(
    await screen.findByText(
      'Mã xác thực (OTP) đã được gửi qua email. Mã có hiệu lực trong 10 phút.',
    ),
  ).toBeOnTheScreen();

  // Resend OTP test
  await fireEvent.press(screen.getByText('Gửi lại mã xác thực'));
  expect(await screen.findByText('Đã gửi mã xác thực mới qua email.')).toBeOnTheScreen();

  // Invalid OTP format
  const otpInput = screen.getByLabelText('Mã xác thực');
  await fireEvent.changeText(otpInput, '123');
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(await screen.findByText('Nhập mã xác thực gồm 6 chữ số trong email.')).toBeOnTheScreen();

  // Valid OTP format
  await fireEvent.changeText(otpInput, '123456');
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  await waitFor(() =>
    expect(gateway.changePassword).toHaveBeenCalledWith(
      'access',
      'challenge-123',
      '123456',
      'new-password-12345',
    ),
  );
  expect(signedOut).toHaveBeenCalled();
});

it('handles password validation edge cases and error responses in NativeAccountSettings', async () => {
  const current = await session();
  await render(<NativeAccountSettings session={current.value} onSignedOut={jest.fn()} />);
  await screen.findByText('couple@example.com');

  // Missing current password
  await fireEvent.press(screen.getByText('Gửi mã xác thực'));
  expect(await screen.findByText('Vui lòng nhập mật khẩu hiện tại.')).toBeOnTheScreen();

  // The source sends the current-password OTP before validating the replacement.
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu hiện tại'), 'initial-password-123');
  gateway.requestPasswordChange.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'api',
      status: 400,
      code: 'CURRENT_PASSWORD_INVALID',
      message: 'Wrong password',
      requestId: '00000000-0000-0000-0000-000000000000',
    }),
  );
  await fireEvent.press(screen.getByText('Gửi mã xác thực'));
  expect(await screen.findByText('Mật khẩu hiện tại chưa chính xác.')).toBeOnTheScreen();
  gateway.requestPasswordChange.mockResolvedValue({
    accepted: true,
    challengeId: 'c-1',
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
  });
  await fireEvent.press(screen.getByText('Gửi mã xác thực'));
  await screen.findByLabelText('Mã xác thực');
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText('Mật khẩu mới phải có độ dài từ 1 đến 128 ký tự.'),
  ).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'x'.repeat(129));
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText('Mật khẩu mới phải có độ dài từ 1 đến 128 ký tự.'),
  ).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'short');
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'different');
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText('Mật khẩu nhập lại chưa khớp với mật khẩu mới.'),
  ).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'valid-password-123');
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'valid-password-123');
  const otpInput = await screen.findByLabelText('Mã xác thực');
  await fireEvent.changeText(otpInput, '123456');

  gateway.changePassword.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'api',
      status: 400,
      code: 'OTP_INVALID',
      message: 'Invalid OTP',
      requestId: '00000000-0000-0000-0000-000000000000',
    }),
  );
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText(
      'Mã xác thực chưa chính xác. Vui lòng kiểm tra lại 6 chữ số trong email.',
    ),
  ).toBeOnTheScreen();

  gateway.changePassword.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'api',
      status: 400,
      code: 'CHALLENGE_EXPIRED',
      message: 'Expired',
      requestId: '00000000-0000-0000-0000-000000000000',
    }),
  );
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.'),
  ).toBeOnTheScreen();

  gateway.changePassword.mockRejectedValueOnce(
    new ApiClientError({
      kind: 'api',
      status: 429,
      code: 'RATE_LIMIT',
      message: 'Too many',
      requestId: '00000000-0000-0000-0000-000000000000',
    }),
  );
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText('Quá nhiều lần thử sai. Vui lòng đợi trong giây lát.'),
  ).toBeOnTheScreen();

  gateway.changePassword.mockRejectedValueOnce(new Error('Network error'));
  await fireEvent.press(screen.getByText('Xác nhận đổi mật khẩu'));
  expect(
    await screen.findByText('Lỗi kết nối khi đổi mật khẩu. Vui lòng thử lại.'),
  ).toBeOnTheScreen();
});

it('loads sessions and handles revoke flows in NativeAccountSettings', async () => {
  const current = await session();
  const signedOut = jest.fn();
  gateway.listSessions.mockResolvedValue({
    sessions: [
      {
        sessionId: 'session-other',
        clientKind: 'WEB',
        lastSeenAt: '2026-10-14T07:00:00Z',
        status: 'ACTIVE',
      },
      {
        sessionId: 'session',
        clientKind: 'ANDROID',
        lastSeenAt: '2026-10-14T08:00:00Z',
        status: 'ACTIVE',
      },
    ],
  } as any);
  gateway.revokeSession.mockResolvedValue(undefined);

  await render(<NativeAccountSettings session={current.value} onSignedOut={signedOut} />);
  await screen.findByText('couple@example.com');

  await fireEvent.press(screen.getByText('Tải lại danh sách phiên'));
  expect(await screen.findByText(/Trình duyệt Web/)).toBeOnTheScreen();
  expect(screen.getByText(/Phiên hiện tại/)).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Thu hồi phiên này' }));
  expect(Alert.alert).toHaveBeenCalled();
  const calls = jest.mocked(Alert.alert).mock.calls;
  const confirmBtn = calls[calls.length - 1]?.[2]?.find((b) => b.text === 'Thu hồi');
  await confirmBtn?.onPress?.();
  expect(gateway.revokeSession).toHaveBeenCalledWith('access', 'session-other');

  // Revoke failure
  gateway.revokeSession.mockRejectedValueOnce(new Error('Revoke failed'));
  await fireEvent.press(screen.getByRole('button', { name: 'Thu hồi phiên này' }));
  const errorCalls = jest.mocked(Alert.alert).mock.calls;
  const errorConfirmBtn = errorCalls[errorCalls.length - 1]?.[2]?.find((b) => b.text === 'Thu hồi');
  await errorConfirmBtn?.onPress?.();
  expect(
    await screen.findByText('Không thể thu hồi phiên. Vui lòng thử lại sau.'),
  ).toBeOnTheScreen();
});

it('handles general error when updating profile in NativeAccountSettings', async () => {
  const current = await session();
  gateway.updateProfile.mockRejectedValueOnce(new Error('Failed'));

  await render(<NativeAccountSettings session={current.value} onSignedOut={jest.fn()} />);
  await screen.findByText('couple@example.com');

  await fireEvent.changeText(screen.getByLabelText('Tên hiển thị'), 'New Name');
  await fireEvent.press(screen.getByText('Lưu thay đổi'));
  expect(
    await screen.findByText('Chưa lưu được hồ sơ. Nội dung của bạn vẫn được giữ trên màn hình.'),
  ).toBeOnTheScreen();
});
