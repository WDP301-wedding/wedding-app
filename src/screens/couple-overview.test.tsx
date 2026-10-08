import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  Pressable as MockPressable,
  Text as MockText,
  TextInput as MockTextInput,
  View as MockView,
} from 'react-native';
import { useRef as mockUseRef, type ReactNode } from 'react';
import { createExperienceGateway } from '@/features/identity-access/experience-api';
import { AndroidIdentitySession, type IdentityApi } from '@/features/identity-access/session';
import { NativeAccountSettings, CoupleOverviewScreen } from './couple-overview';

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
  gateway.profile.mockResolvedValue({
    accountId: 'account',
    displayEmail: 'couple@example.com',
    displayName: 'Lan',
    revision: 1,
  });
  gateway.overview.mockResolvedValue({ data: [], nextCursor: null });
});
afterEach(async () => {
  await cleanup();
});
it('opens the actual empty overview without requiring a booking code', async () => {
  const current = await session();
  await render(
    <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
  );
  expect(await screen.findByText('Chưa có kế hoạch đã xác nhận')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Mã booking')).toBeNull();
  expect(gateway.overview).toHaveBeenCalledWith('access', undefined);
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
  await fireEvent.press(screen.getByText('Gửi mã OTP'));
  expect(gateway.changePassword).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText('Xác nhận mật khẩu mới'),
    'replacement-password-123',
  );
  await fireEvent.press(screen.getByText('Gửi mã OTP'));
  await screen.findByLabelText('Mã OTP');
  expect(signedOut).not.toHaveBeenCalled();
  expect(gateway.changePassword).not.toHaveBeenCalled();
  expect(gateway.requestPasswordChange).toHaveBeenCalledWith('access', 'initial-password-123');
  await fireEvent.changeText(screen.getByLabelText('Mã OTP'), '123456');
  await fireEvent.press(screen.getByText('Xác nhận và cập nhật mật khẩu'));
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
