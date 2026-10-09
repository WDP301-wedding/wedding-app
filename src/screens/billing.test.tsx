import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import type { ReactNode } from 'react';
import { View as MockView, Pressable as MockPressable, Text as MockText } from 'react-native';
import { AndroidBillingScreen } from './billing';
import type { CoupleBillingGateway } from '@/features/payments-billing/billing-api';

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
    <MockPressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
    >
      <MockText>{label}</MockText>
    </MockPressable>
  ),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 16, top: 0, left: 0, right: 0 }),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
const intents = {
  run: <T,>(_scope: string, _body: object, operation: (key: string) => Promise<T>) =>
    operation('stable-key'),
};
function gateway(): CoupleBillingGateway {
  return {
    loadContext: jest.fn().mockResolvedValue({
      bookingId: 'booking',
      accessLevel: 'FULL',
      phase: 'CONFIRMED',
      depositAmountVnd: 1000000,
      timelineRevisionId: 'timeline',
    }),
    load: jest.fn().mockResolvedValue({
      bookingId: 'booking',
      billingRevision: 4,
      history: [],
      nextCursor: 'next',
      totals: {
        acceptedChargesVnd: 5000000,
        paidVnd: 1000000,
        refundedVnd: 0,
        netPaidVnd: 1000000,
        outstandingVnd: 4000000,
        creditVnd: 0,
      },
    }),
    loadAttempt: jest.fn().mockResolvedValue({
      paymentAttemptId: 'attempt',
      status: 'UNKNOWN',
      purpose: 'BALANCE',
      amountVnd: 4000000,
      applicationStatus: null,
      expiresAt: '2026-10-09T10:00:00Z',
    }),
    startBalance: jest.fn().mockResolvedValue({
      paymentAttemptId: 'attempt',
      status: 'PENDING',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      expiresAt: '2026-10-09T10:00:00Z',
    }),
    startDeposit: jest.fn(),
  };
}
afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
});
async function load() {
  await fireEvent.changeText(screen.getByLabelText('Mã hồ sơ đặt tiệc'), 'booking');
  await fireEvent.press(screen.getByRole('button', { name: 'Mở billing' }));
  await screen.findByText('Còn phải thu');
}
describe('Android authorized billing', () => {
  it('keeps FULL plus confirmed-booking gate and never reads restricted billing', async () => {
    for (const gate of [
      { accessLevel: 'RESTRICTED', phase: 'AWAITING_DEPOSIT' },
      { accessLevel: 'FULL', phase: 'DRAFT' },
    ]) {
      const api = gateway();
      jest.mocked(api.loadContext).mockResolvedValue({
        bookingId: 'booking',
        depositAmountVnd: 1000000,
        timelineRevisionId: 'timeline',
        ...gate,
      } as Awaited<ReturnType<CoupleBillingGateway['loadContext']>>);
      await render(
        <AndroidBillingScreen
          accountId="actor"
          authorize={authorize}
          gateway={api}
          intents={intents}
        />,
      );
      await fireEvent.changeText(screen.getByLabelText('Mã hồ sơ đặt tiệc'), 'booking');
      await fireEvent.press(screen.getByRole('button', { name: 'Mở billing' }));
      await screen.findByText('Billing trên app chưa mở');
      expect(api.load).not.toHaveBeenCalled();
      expect(api.startDeposit).not.toHaveBeenCalled();
      await cleanup();
    }
  });
  it('renders server totals and confirms the captured balance revision before creating checkout', async () => {
    const api = gateway();
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    expect(screen.getByText('Chưa có bút toán')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    expect(api.startBalance).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await waitFor(() =>
      expect(api.startBalance).toHaveBeenCalledWith(
        'token',
        'booking',
        { expectedBillingRevision: 4 },
        'stable-key',
      ),
    );
    expect(await screen.findByText('Đường dẫn thanh toán đã được tạo')).toBeTruthy();
  });
  it('displays UNKNOWN without collecting again and reads pagination at its fixed fence', async () => {
    const api = gateway();
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    await fireEvent.press(screen.getByRole('button', { name: 'Trang lịch sử tiếp theo' }));
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith('token', 'booking', {
        cursor: 'next',
        throughBillingRevision: 4,
      }),
    );
    await fireEvent.changeText(screen.getByLabelText('Mã lần thanh toán'), 'attempt');
    await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    expect(await screen.findByText('Chưa rõ kết quả · đang đối soát')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    expect(api.startBalance).not.toHaveBeenCalled();
  });
});
