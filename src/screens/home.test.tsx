import { describe, expect, it } from '@jest/globals';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';
import { Pressable as MockPressable, Text as MockText, View as MockView } from 'react-native';

import {
  AndroidIdentitySession,
  createSecureRefreshStore,
  readResetCredential,
  type IdentityApi,
} from '@/features/identity-access/session';
import type { PlanningGateway } from '@/features/booking-lifecycle/planning-api';
import { ApiClientError } from '@/lib/api/client';

import { ConfirmedPlanningScreen, HomeScreen } from './home';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
}));

jest.mock('@expo/ui', () => ({
  Host: ({ children }: { children: ReactNode }) => <MockView>{children}</MockView>,
  Button: ({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) => (
    <MockPressable testID={testID} onPress={onPress}>
      <MockText>{label}</MockText>
    </MockPressable>
  ),
}));

const actor = {
  accountId: '24dcfaac-4408-4d42-8d66-456ed6ee7ea4',
  displayEmail: 'minhanh@example.com',
  roles: ['COUPLE'] as const,
  sessionId: '3bd38130-13f4-4c14-8c93-cf0c20781d7e',
};

function createApi(): IdentityApi {
  return {
    completePasswordReset: jest.fn().mockResolvedValue(undefined),
    createSession: jest.fn().mockResolvedValue({
      accessToken: 'wia_access',
      refreshToken: 'wir_initial',
      sessionId: actor.sessionId,
    }),
    getCurrentUser: jest.fn().mockResolvedValue(actor),
    logout: jest.fn().mockResolvedValue(undefined),
    refreshSession: jest.fn().mockResolvedValue({
      accessToken: 'wia_rotated',
      refreshToken: 'wir_rotated',
      sessionId: actor.sessionId,
    }),
    requestPasswordReset: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
});

afterEach(async () => {
  await cleanup();
});

describe('AndroidIdentitySession', () => {
  it('reads a reset credential from the fragment without using route params', () => {
    const token = `wip_${'a'.repeat(43)}`;

    expect(readResetCredential(`weddingapp://reset#resetToken=${token}`)).toBe(token);
    expect(readResetCredential('weddingapp://reset?resetToken=not-allowed')).toBeNull();
    expect(readResetCredential('not a valid deep link')).toBeNull();
  });

  it('restores a process from SecureStore and replaces the rotated refresh credential', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('wir_previous');
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    const [first, second] = await Promise.all([session.restore(), session.restore()]);

    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(api.refreshSession).toHaveBeenCalledWith('wir_previous');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'wedding.identity.refresh-token',
      'wir_rotated',
    );
    expect(first).toEqual(second);
    expect(first).toMatchObject({ status: 'authenticated', access: 'full' });
    expect(JSON.stringify(first)).not.toContain('wia_rotated');
    expect(JSON.stringify(first)).not.toContain('wir_rotated');
  });

  it('clears secure state after refresh failure, password reset, and logout', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('wir_previous');
    const api = createApi();
    jest.mocked(api.refreshSession).mockRejectedValueOnce(new Error('replay'));
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    expect(await session.restore()).toEqual({ status: 'anonymous', denial: null });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('wedding.identity.refresh-token');

    await session.login('minhanh@example.com', 'sample-password-123');
    await session.completePasswordReset('wip_reset', 'new-sample-password-123');
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });

    await session.login('minhanh@example.com', 'new-sample-password-123');
    await session.logout();
    expect(api.logout).toHaveBeenCalledWith('wia_access');
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
  });

  it('never falls back to AsyncStorage for authentication credentials', () => {
    const dependencies = require('../../package.json').dependencies as Record<string, string>;
    expect(dependencies).not.toHaveProperty('@react-native-async-storage/async-storage');
  });

  it('deletes secure state when rotated credential replacement cannot complete', async () => {
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keystore unavailable'));
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    await expect(session.login('minhanh@example.com', 'sample-password-123')).rejects.toThrow(
      'keystore unavailable',
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('wedding.identity.refresh-token');
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
  });
});

describe('HomeScreen', () => {
  it('restores the Couple experience and logs out with secure cleanup', async () => {
    const user = userEvent.setup();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('wir_previous');
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    await render(<HomeScreen session={session} />);

    expect(await screen.findByText('Ngày trọng đại của hai bạn')).toBeOnTheScreen();
    expect(screen.getByText('Chưa chọn kế hoạch')).toBeOnTheScreen();
    await user.press(screen.getByTestId('logout-button'));
    await waitFor(() => expect(api.logout).toHaveBeenCalledWith('wia_rotated'));
    expect(await screen.findByText('Đăng nhập cho cặp đôi')).toBeOnTheScreen();
  });

  it('logs in from an empty process and opens the confirmed-planning entry', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    await render(<HomeScreen session={session} initialResetToken={null} />);
    expect(await screen.findByText('Đăng nhập cho cặp đôi')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'minhanh@example.com');
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'sample-password-123');
    await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Ngày trọng đại của hai bạn')).toBeOnTheScreen();
    expect(screen.getByText('Chưa chọn kế hoạch')).toBeOnTheScreen();
  });

  it('renders only a server-confirmed planning summary and timeline', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());
    await session.login('minhanh@example.com', 'sample-password-123');
    const gateway: PlanningGateway = {
      loadConfirmed: jest.fn().mockResolvedValue({
        status: 'confirmed',
        snapshot: {
          bookingId: '00000000-0000-4000-8000-000000000101',
          phase: 'CONFIRMED',
          revision: 8,
          eventDate: '2026-11-15',
          planningHeadcount: 280,
          hallName: 'Sảnh Ánh Dương',
          shift: { startTime: '17:00', endTime: '22:00' },
          timelineRevision: 3,
          timeline: [
            {
              itemId: '00000000-0000-4000-8000-000000000201',
              startTime: '17:30',
              title: 'Đón khách',
              description: 'Chụp ảnh cùng gia đình',
            },
          ],
        },
      }),
    };

    await render(
      <ConfirmedPlanningScreen session={session} gateway={gateway} onLogout={jest.fn()} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Mã booking'), 'booking-101');
    await user.press(screen.getByRole('button', { name: 'MỞ KẾ HOẠCH' }));

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeOnTheScreen();
    expect(screen.getByText('Đón khách')).toBeOnTheScreen();
    expect(screen.getByText('17:30')).toHaveProp('numberOfLines', 1);
    expect(screen.getByText('280 khách')).toBeOnTheScreen();
    expect(gateway.loadConfirmed).toHaveBeenCalledWith('wia_access', 'booking-101');
    for (const status of [403, 404, 401]) {
      jest.mocked(gateway.loadConfirmed).mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          status,
          code: 'BOOKING_NOT_FOUND',
          message: 'Access denied',
          requestId: actor.accountId,
        }),
      );
      await user.press(screen.getByRole('button', { name: 'MỞ KẾ HOẠCH' }));
      expect(await screen.findByText('Không thể tải kế hoạch')).toBeOnTheScreen();
      expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeOnTheScreen();
      expect(screen.queryByText('Đón khách')).not.toBeOnTheScreen();
      if (status === 401) await session.login('minhanh@example.com', 'sample-password-123');
      await user.press(screen.getByRole('button', { name: 'MỞ KẾ HOẠCH' }));
      expect(await screen.findByText('Sảnh Ánh Dương')).toBeOnTheScreen();
    }
  });

  it('shows a recoverable error when login is rejected', async () => {
    const user = userEvent.setup();
    const api = createApi();
    jest.mocked(api.createSession).mockRejectedValueOnce(new Error('invalid'));
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    await render(<HomeScreen session={session} initialResetToken={null} />);
    await screen.findByText('Đăng nhập cho cặp đôi');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'minhanh@example.com');
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'wrong-password');
    await user.press(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(
      await screen.findByText(
        'Không thể hoàn tất yêu cầu. Vui lòng kiểm tra thông tin và thử lại.',
      ),
    ).toBeOnTheScreen();
  });

  it('requests a reset with the generic response and returns to login', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());

    await render(<HomeScreen session={session} initialResetToken={null} />);
    await screen.findByText('Đăng nhập cho cặp đôi');
    await user.press(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    await fireEvent.changeText(screen.getByLabelText('Email'), 'unknown@example.com');
    await user.press(screen.getByRole('button', { name: 'Gửi hướng dẫn' }));

    expect(
      await screen.findByText(
        'Nếu tài khoản đủ điều kiện, hướng dẫn đặt lại mật khẩu đã được gửi.',
      ),
    ).toBeOnTheScreen();
    expect(api.requestPasswordReset).toHaveBeenCalledWith('unknown@example.com');
    await user.press(screen.getByRole('button', { name: 'Quay lại đăng nhập' }));
    expect(screen.getByText('Đăng nhập cho cặp đôi')).toBeOnTheScreen();
  });

  it('validates and completes an Android reset fragment without route state', async () => {
    const user = userEvent.setup();
    const api = createApi();
    const session = new AndroidIdentitySession(api, createSecureRefreshStore());
    const resetToken = `wip_${'a'.repeat(43)}`;

    await render(<HomeScreen session={session} initialResetToken={resetToken} />);
    expect(await screen.findByText('Đặt mật khẩu mới')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'new-sample-password-123');
    await fireEvent.changeText(
      screen.getByLabelText('Xác nhận mật khẩu'),
      'different-password-123',
    );
    await user.press(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
    expect(screen.getByText('Hai mật khẩu chưa trùng khớp.')).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByLabelText('Xác nhận mật khẩu'),
      'new-sample-password-123',
    );
    await user.press(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
    expect(await screen.findByText('Đăng nhập cho cặp đôi')).toBeOnTheScreen();
    expect(api.completePasswordReset).toHaveBeenCalledWith(resetToken, 'new-sample-password-123');
  });
});
