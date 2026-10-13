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
import { NativeAccountSettings, CoupleOverviewScreen, deriveInitials } from './couple-overview';
import { createPlanningGateway } from '@/features/booking-lifecycle/planning-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
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
  };
  return { createExperienceGateway: () => gateway };
});
const gateway = jest.mocked(createExperienceGateway());

jest.mock('@/features/booking-lifecycle/planning-api', () => {
  const planGateway = {
    loadConfirmed: jest.fn(),
  };
  return { createPlanningGateway: () => planGateway };
});

jest.mock('@/features/invitation-studio/app-invitation-api', () => {
  const invGateway = {
    getRestaurantCatalog: jest
      .fn()
      .mockResolvedValue({ id: 'r1', displayName: 'Nhà hàng Wedding Estate' }),
    listDesigns: jest.fn().mockResolvedValue([]),
    getDesign: jest.fn(),
    quickEditTextFields: jest.fn(),
    publishInvitation: jest.fn(),
    unpublishInvitation: jest.fn(),
    listPrintOrders: jest.fn().mockResolvedValue([]),
    approvePrintOrderQuote: jest.fn(),
    approvePrintOrderReplacement: jest.fn(),
    cancelPrintOrder: jest.fn(),
    uploadWeddingMedia: jest.fn(),
  };
  return { createAppInvitationGateway: () => invGateway };
});
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

describe('deriveInitials', () => {
  it('derives initials correctly from bride and groom names', () => {
    expect(deriveInitials('Thùy Trang', 'Hoàng Nam')).toBe('TH');
    expect(deriveInitials('  Lan  ', '  Điệp  ')).toBe('LĐ');
  });

  it('falls back to displayName words or characters when bride/groom absent', () => {
    expect(deriveInitials('', '', 'Nguyễn Văn An')).toBe('NA');
    expect(deriveInitials(undefined, undefined, 'Admin')).toBe('AD');
    expect(deriveInitials(undefined, undefined, 'A')).toBe('A');
    expect(deriveInitials(undefined, undefined, '')).toBe('CD');
    expect(deriveInitials(undefined, undefined, null)).toBe('CD');
  });
});

describe('CoupleOverviewScreen booking and navigation flows', () => {
  it('renders confirmed bookings list, opens plan, and supports switching bookings', async () => {
    const planningGateway = jest.mocked(createPlanningGateway());
    const invitationGateway = jest.mocked(createAppInvitationGateway());

    gateway.overview.mockResolvedValue({
      data: [
        {
          accessLevel: 'FULL',
          bookingId: 'booking-101',
          consultationId: 'consultation-101',
          coupleApproved: true,
          eventDate: '2027-01-18',
          hallName: 'Sảnh Lavender',
          hasTimeline: true,
          managerApproved: true,
          phase: 'CONFIRMED',
          planningHeadcount: 280,
          shiftCode: 'DINNER',
        },
      ],
      nextCursor: null,
    });

    planningGateway.loadConfirmed.mockResolvedValue({
      status: 'confirmed',
      snapshot: {
        bookingId: 'booking-101',
        phase: 'CONFIRMED',
        revision: 4,
        eventDate: '2027-01-18',
        planningHeadcount: 280,
        hallName: 'Sảnh Lavender',
        shift: { startTime: '18:00', endTime: '21:30' },
        timelineRevision: 3,
        timeline: [],
      },
    });

    invitationGateway.listDesigns.mockResolvedValue([
      {
        designId: 'des-1',
        textFields: { brideName: 'Trang', groomName: 'Nam' },
      } as never,
    ]);

    const current = await session();
    await render(
      <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
    );

    expect(await screen.findByText('Sảnh Lavender')).toBeOnTheScreen();
    expect(await screen.findByText('ĐÃ XÁC NHẬN')).toBeOnTheScreen();

    // Open booking plan
    await fireEvent.press(screen.getByRole('button', { name: 'Xem kế hoạch' }));

    // Now inside V0CompanionShell
    expect(await screen.findByText('Chào buổi sáng, Trang & Nam')).toBeOnTheScreen();

    // Switch booking back to selector
    await fireEvent.press(screen.getByRole('button', { name: 'Đổi tiệc cưới' }));
    expect(await screen.findByText('Sảnh Lavender')).toBeOnTheScreen();
  });

  it('handles overview API errors and displays retry button', async () => {
    gateway.overview.mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server down',
        requestId: '00000000-0000-0000-0000-000000000002',
      }),
    );

    const current = await session();
    await render(
      <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
    );

    expect(
      await screen.findByText('Chưa tải được kế hoạch. Kiểm tra kết nối và thử lại.'),
    ).toBeOnTheScreen();

    gateway.overview.mockResolvedValueOnce({ data: [], nextCursor: null });
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có kế hoạch đã xác nhận')).toBeOnTheScreen();
  });

  it('switches between Overview and Account views without crashing', async () => {
    const current = await session();
    await render(
      <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
    );

    expect(await screen.findByText('Chưa có kế hoạch đã xác nhận')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tài khoản' }));
    expect(await screen.findByText('couple@example.com')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tổng quan' }));
    expect(await screen.findByText('Chưa có kế hoạch đã xác nhận')).toBeOnTheScreen();
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
      await screen.findByText('Hồ sơ đã thay đổi. Tải lại trước khi tiếp tục.'),
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
    await fireEvent.changeText(
      screen.getByLabelText('Xác nhận mật khẩu mới'),
      'new-password-12345',
    );

    // First press sends challenge
    await fireEvent.press(screen.getByText('Gửi mã OTP'));
    expect(
      await screen.findByText('Mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.'),
    ).toBeOnTheScreen();

    // Resend OTP test
    await fireEvent.press(screen.getByText('Gửi lại mã OTP'));
    expect(await screen.findByText('Đã gửi mã OTP mới vào email.')).toBeOnTheScreen();

    // Invalid OTP format
    const otpInput = screen.getByLabelText('Mã OTP');
    await fireEvent.changeText(otpInput, '123');
    await fireEvent.press(screen.getByText('Xác nhận và cập nhật mật khẩu'));
    expect(await screen.findByText('Nhập mã OTP gồm 6 chữ số.')).toBeOnTheScreen();

    // Valid OTP format
    await fireEvent.changeText(otpInput, '123456');
    await fireEvent.press(screen.getByText('Xác nhận và cập nhật mật khẩu'));
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

  it('resets overview and plan state when overview fails with 401/403/404', async () => {
    gateway.overview.mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        requestId: '00000000-0000-0000-0000-000000000001',
      }),
    );

    const current = await session();
    await render(
      <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
    );

    expect(
      await screen.findByText('Chưa tải được kế hoạch. Kiểm tra kết nối và thử lại.'),
    ).toBeOnTheScreen();
  });

  it('displays message when planning snapshot is not confirmed', async () => {
    const planningGateway = jest.mocked(createPlanningGateway());

    gateway.overview.mockResolvedValueOnce({
      data: [
        {
          accessLevel: 'RESTRICTED',
          bookingId: 'booking-202',
          consultationId: 'consultation-202',
          coupleApproved: false,
          eventDate: '2027-02-14',
          hallName: 'Sảnh Rose',
          hasTimeline: false,
          managerApproved: false,
          phase: 'CONFIRMED',
          planningHeadcount: 150,
          shiftCode: 'LUNCH',
        },
      ],
      nextCursor: null,
    });

    planningGateway.loadConfirmed.mockResolvedValueOnce({
      status: 'not-confirmed',
      snapshot: null,
    });

    const current = await session();
    await render(
      <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Xem kế hoạch' }));
    expect(
      await screen.findByText('Kế hoạch chưa sẵn sàng trên ứng dụng. Hãy tiếp tục trên Web.'),
    ).toBeOnTheScreen();
  });

  it('handles loadConfirmed rejection gracefully', async () => {
    const planningGateway = jest.mocked(createPlanningGateway());

    gateway.overview.mockResolvedValueOnce({
      data: [
        {
          accessLevel: 'FULL',
          bookingId: 'booking-303',
          consultationId: 'consultation-303',
          coupleApproved: true,
          eventDate: '2027-03-08',
          hallName: 'Sảnh Diamond',
          hasTimeline: true,
          managerApproved: true,
          phase: 'CONFIRMED',
          planningHeadcount: 200,
          shiftCode: 'DINNER',
        },
      ],
      nextCursor: null,
    });

    planningGateway.loadConfirmed.mockRejectedValueOnce(new Error('Network error'));

    const current = await session();
    await render(
      <CoupleOverviewScreen session={current.value} onLogout={jest.fn()} renderPlan={() => null} />,
    );

    await fireEvent.press(await screen.findByRole('button', { name: 'Xem kế hoạch' }));
    expect(
      await screen.findByText('Không tải được kế hoạch. Hãy kiểm tra quyền truy cập và thử lại.'),
    ).toBeOnTheScreen();
  });
});
