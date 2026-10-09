import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  createHash,
  createHash as mockCreateHash,
  randomUUID,
  randomUUID as mockRandomUUID,
} from 'node:crypto';
import { View as MockView, Pressable as MockPressable, Text as MockText } from 'react-native';
import { AndroidBillingPage, AndroidBillingScreen } from './billing';
import {
  AndroidIdentitySession,
  createIdentityApi,
  createSecureRefreshStore,
} from '@/features/identity-access/session';
import { ApiClientError } from '@/lib/api/client';
import type { CoupleBillingGateway } from '@/features/payments-billing/billing-api';
import {
  createBillingIntents,
  type IntentStorage,
} from '@/features/payments-billing/billing-intents';

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
jest.mock('expo-crypto', () => ({
  randomUUID: () => mockRandomUUID(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: (_algorithm: string, value: string) =>
    Promise.resolve(mockCreateHash('sha256').update(value).digest('hex')),
}));
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
const intents = {
  lastBooking: () => Promise.resolve(null),
  recoverCheckout: () => Promise.resolve(null),
  finishCheckout: () => Promise.resolve(),
  pending: () => Promise.resolve(null),
  runCheckout: <T,>(
    _bookingId: string,
    _body: object,
    operation: (key: string, body: object) => Promise<T>,
  ) => operation('stable-key', _body),
  run: <T,>(_scope: string, _body: object, operation: (key: string, body: object) => Promise<T>) =>
    operation('stable-key', _body),
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
  await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
  await screen.findByText('Còn phải thanh toán');
  await waitFor(() => expect(screen.queryByText('Đang kiểm tra với máy chủ…')).toBeNull());
}
const failure = (code: string, status = 409) =>
  new ApiClientError({ kind: 'api', code, status, message: 'private error', requestId: 'request' });
async function mount(api: CoupleBillingGateway) {
  await render(
    <AndroidBillingScreen
      accountId="actor"
      authorize={authorize}
      gateway={api}
      intents={intents}
    />,
  );
  await load();
}
describe('Android authorized billing', () => {
  it('retains the checkout confirmation after rate limiting and offers an exact retry', async () => {
    const api = gateway();
    await mount(api);
    jest.mocked(api.startBalance).mockRejectedValueOnce(failure('RATE_LIMITED', 429));
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByText('Thử lại cùng yêu cầu');
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await screen.findByText('Đường dẫn thanh toán đã được tạo');
    expect(api.startBalance).toHaveBeenLastCalledWith(
      'token',
      'booking',
      { expectedBillingRevision: 4 },
      'stable-key',
    );
  });
  it('does not read a logged-out actor checkout recovery when billing session memory remains mounted', async () => {
    let stored: string | null = null;
    const store = {
      read: () => Promise.resolve(stored),
      replace: (value: string) => {
        stored = value;
        return Promise.resolve();
      },
      clear: () => {
        stored = null;
        return Promise.resolve();
      },
    };
    const identity = createIdentityApi();
    const credential = {
      accessToken: 'fixture-access',
      refreshToken: 'fixture-refresh',
      sessionId: 'fixture-session',
    };
    jest.spyOn(identity, 'createSession').mockResolvedValue(credential);
    jest.spyOn(identity, 'refreshSession').mockResolvedValue(credential);
    jest.spyOn(identity, 'getCurrentUser').mockResolvedValue({
      accountId: 'fixture-account',
      displayEmail: 'fixture@example.invalid',
      roles: ['COUPLE'],
      sessionId: credential.sessionId,
    });
    jest.spyOn(identity, 'logout').mockRejectedValue(new Error('offline'));
    const home = new AndroidIdentitySession(identity, store);
    const billing = new AndroidIdentitySession(identity, store);
    await home.login('fixture@example.invalid', 'fixture-password');
    await billing.restore();
    await expect(home.logout()).rejects.toThrow('offline');
    const api = gateway();
    await render(<AndroidBillingPage session={billing} gateway={api} />);
    await screen.findByText('Cần tài khoản cặp đôi đã xác nhận');
    expect(screen.queryByText('Thanh toán của hai bạn')).toBeNull();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(api.load).not.toHaveBeenCalled();
  });
  it('recovers a real durable checkout after unmount without creating another attempt', async () => {
    const records = new Map<string, string>();
    const storage: IntentStorage = {
      read: (key) => Promise.resolve(records.get(key) ?? null),
      write: (key, value) => {
        records.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        records.delete(key);
        return Promise.resolve();
      },
    };
    const hash = (value: string) =>
      Promise.resolve(createHash('sha256').update(value).digest('hex'));
    const bookingId = randomUUID();
    const paymentAttemptId = randomUUID();
    const api = gateway();
    const context = await api.loadContext('token', 'booking');
    const billing = await api.load('token', 'booking');
    const checkout = await api.startBalance(
      'token',
      'booking',
      { expectedBillingRevision: 4 },
      'key',
    );
    const attempt = await api.loadAttempt('token', 'booking', 'attempt');
    jest.mocked(api.loadContext).mockResolvedValue({ ...context, bookingId });
    jest.mocked(api.load).mockResolvedValue({ ...billing, bookingId });
    jest
      .mocked(api.startBalance)
      .mockClear()
      .mockResolvedValue({ ...checkout, paymentAttemptId });
    jest
      .mocked(api.loadAttempt)
      .mockClear()
      .mockResolvedValue({ ...attempt, paymentAttemptId });
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={createBillingIntents('actor', storage, hash)}
        initialBookingId={bookingId}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText('Còn phải thanh toán');
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByText('Đường dẫn thanh toán đã được tạo');
    await cleanup();
    const recovered = createBillingIntents('actor', storage, hash);
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={recovered}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveDisplayValue(bookingId),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText('Chưa rõ kết quả · đang kiểm tra');
    expect(api.startBalance).toHaveBeenCalledTimes(1);
    expect(api.loadAttempt).toHaveBeenLastCalledWith('token', bookingId, paymentAttemptId);
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Mã hồ sơ đặt tiệc'), randomUUID());
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveDisplayValue(bookingId);
    expect(await recovered.recoverCheckout(bookingId)).not.toBeNull();
  });
  it('restores the account checkout when reopening billing from Home and reconciles before collection', async () => {
    const api = gateway();
    const checkout = await api.startBalance(
      'token',
      'booking',
      { expectedBillingRevision: 4 },
      'key',
    );
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={{
          ...intents,
          lastBooking: () => Promise.resolve('booking'),
          recoverCheckout: () =>
            Promise.resolve({ metadata: { expectedBillingRevision: 4 }, checkout }),
        }}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveDisplayValue('booking'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText('Chưa rõ kết quả · đang kiểm tra');
    expect(api.loadAttempt).toHaveBeenCalledWith('token', 'booking', checkout.paymentAttemptId);
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).not.toBeEnabled();
    expect(screen.queryByText('Tiếp tục trên VNPay')).toBeNull();
  });
  it('keeps collection blocked for restored settlement awaiting downstream application', async () => {
    const api = gateway();
    jest.mocked(api.loadAttempt).mockResolvedValue({
      paymentAttemptId: 'attempt',
      status: 'SUCCEEDED',
      purpose: 'BALANCE',
      amountVnd: 4000000,
      applicationStatus: 'PENDING',
      expiresAt: '2026-10-09T10:00:00Z',
    });
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
        initialBookingId="booking"
        initialAttemptId="attempt"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText('Tiền đã được xác minh; hồ sơ đang chờ cập nhật.');
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
  });
  it('invalidates old billing after editing the booking and cannot pay the old booking after a failed read', async () => {
    const api = gateway();
    await mount(api);
    await fireEvent.changeText(screen.getByLabelText('Mã hồ sơ đặt tiệc'), 'other-booking');
    expect(screen.queryByRole('button', { name: 'Thanh toán còn lại' })).toBeNull();
    jest.mocked(api.loadContext).mockRejectedValueOnce(failure('UNAVAILABLE', 503));
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText(/Chưa rõ kết quả/);
    expect(screen.queryByText('Còn phải thanh toán')).toBeNull();
    expect(api.startBalance).not.toHaveBeenCalled();
  });
  it('restores route attempt IDs and keeps collection blocked when the first status read fails', async () => {
    const api = gateway();
    jest.mocked(api.loadAttempt).mockRejectedValueOnce(failure('UNAVAILABLE', 503));
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
        initialBookingId="booking"
        initialAttemptId="attempt"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText(/Chưa rõ kết quả/);
    expect(api.loadAttempt).toHaveBeenCalledWith('token', 'booking', 'attempt');
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await screen.findByText('Chưa rõ kết quả · đang kiểm tra');
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
  });
  it.each(['anonymous', 'denied', 'full'] as const)(
    'restores the %s session without reading an unauthorized billing',
    async (access) => {
      const session = new AndroidIdentitySession(createIdentityApi(), createSecureRefreshStore());
      jest.spyOn(session, 'restore').mockResolvedValue(
        access === 'anonymous'
          ? { status: 'anonymous', denial: null }
          : {
              status: 'authenticated',
              access,
              denial: null,
              actor: {
                accountId: 'actor',
                sessionId: 'session',
                displayEmail: 'fixture@example.invalid',
                roles: ['COUPLE'],
              },
            },
      );
      const api = gateway();
      await render(<AndroidBillingPage session={session} gateway={api} />);
      await screen.findByText(
        access === 'full' ? 'Thanh toán của hai bạn' : 'Cần tài khoản cặp đôi đã xác nhận',
      );
      expect(api.load).not.toHaveBeenCalled();
    },
  );
  it('recovers an unresolved original revision even when the fresh server outstanding is zero', async () => {
    const api = gateway();
    const current = await api.load('token', 'booking');
    jest.mocked(api.load).mockResolvedValue({
      ...current,
      billingRevision: 5,
      totals: { ...current.totals, outstandingVnd: 0 },
    });
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={{ ...intents, pending: () => Promise.resolve({ expectedBillingRevision: 4 }) }}
        initialBookingId="booking"
        onAttemptCreated={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
    await screen.findByText(/Khôi phục yêu cầu trước/);
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await waitFor(() =>
      expect(api.startBalance).toHaveBeenCalledWith(
        'token',
        'booking',
        { expectedBillingRevision: 4 },
        'stable-key',
      ),
    );
  });
  it('keeps timeout intent immutable and permits only exact retry, then opens the saved checkout explicitly', async () => {
    const api = gateway();
    const openCheckout = jest.fn().mockResolvedValue({ type: 'opened' });
    const onAttemptCreated = jest.fn();
    await render(
      <AndroidBillingScreen
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
        openCheckout={openCheckout}
        onAttemptCreated={onAttemptCreated}
      />,
    );
    await load();
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
    expect(api.startBalance).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    jest.mocked(api.startBalance).mockRejectedValueOnce(
      new ApiClientError({
        kind: 'timeout',
        code: 'REQUEST_TIMEOUT',
        message: 'timeout',
        requestId: 'request',
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByText('Thử lại cùng yêu cầu');
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await screen.findByText('Đường dẫn thanh toán đã được tạo');
    expect(api.startBalance).toHaveBeenCalledTimes(2);
    expect(onAttemptCreated).toHaveBeenCalledWith('booking', 'attempt');
    await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục trên VNPay' }));
    expect(openCheckout).toHaveBeenCalledWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(screen.queryByText('Đã xác minh nhận tiền')).toBeNull();
  });
  it('retains cached totals on read failure, clears them on denied access and rejects mismatched data', async () => {
    const api = gateway();
    await mount(api);
    jest.mocked(api.loadContext).mockRejectedValueOnce(failure('UNAVAILABLE', 503));
    await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await screen.findByText(/Chưa rõ kết quả/);
    expect(screen.getByText('Còn phải thanh toán')).toBeTruthy();
    jest.mocked(api.loadContext).mockResolvedValueOnce({
      bookingId: 'different',
      accessLevel: 'FULL',
      phase: 'CONFIRMED',
      depositAmountVnd: 1,
      timelineRevisionId: null,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await waitFor(() => expect(api.loadContext).toHaveBeenCalledTimes(3));
    jest.mocked(api.loadContext).mockRejectedValueOnce(failure('FORBIDDEN', 403));
    await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await screen.findByText(/quyền xem hồ sơ không còn/);
    expect(screen.queryByText('Còn phải thanh toán')).toBeNull();
  });
  it('rejects stale balance, renders history and navigates backwards within its fixed revision', async () => {
    const api = gateway();
    const current = await api.load('token', 'booking');
    jest.mocked(api.load).mockResolvedValue({
      ...current,
      history: [
        {
          ledgerEntryId: 'entry',
          kind: 'PAYMENT',
          amountVnd: 1000000,
          occurredAt: '2026-10-09T10:00:00Z',
          sourceType: 'PAYMENT_ATTEMPT',
          sourceEntryId: null,
          sourceRevisionId: 'revision',
          paymentAttemptId: null,
          revision: 4,
        },
      ],
    } as Awaited<ReturnType<CoupleBillingGateway['load']>>);
    await mount(api);
    expect(screen.getByText('entry')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Trang lịch sử tiếp theo' }));
    await screen.findByText('Trang 2');
    await fireEvent.press(screen.getByRole('button', { name: 'Trang lịch sử trước' }));
    await screen.findByText('Trang 1');
    expect(api.load).toHaveBeenLastCalledWith('token', 'booking', { throughBillingRevision: 4 });
    jest.mocked(api.load).mockResolvedValueOnce({ ...current, billingRevision: 5 });
    await fireEvent.press(screen.getByRole('button', { name: 'Trang lịch sử tiếp theo' }));
    await screen.findByText(/Chưa rõ kết quả/);
    expect(screen.getByText('Trang 1')).toBeTruthy();
    expect(screen.getByText('entry')).toBeTruthy();
    jest.mocked(api.startBalance).mockRejectedValueOnce(failure('STALE_BILLING_REVISION'));
    await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByText(/Số dư đã thay đổi/);
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).not.toBeDisabled();
  });
  it.each(['FAILED', 'SUCCEEDED'] as const)(
    'trusts verified %s status and refreshes the billing projection',
    async (status) => {
      const api = gateway();
      await mount(api);
      await fireEvent.press(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
      await screen.findByText('Đường dẫn thanh toán đã được tạo');
      jest.mocked(api.loadAttempt).mockResolvedValue({
        paymentAttemptId: 'attempt',
        status,
        purpose: 'BALANCE',
        amountVnd: 4000000,
        applicationStatus: status === 'SUCCEEDED' ? 'PENDING' : null,
        expiresAt: '2026-10-09T10:00:00Z',
      });
      await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
      await screen.findByText(
        status === 'FAILED' ? 'Thanh toán không thành công' : 'Đã xác minh nhận tiền',
      );
      expect(screen.queryByText('Tiếp tục trên VNPay')).toBeNull();
      if (status === 'SUCCEEDED') {
        expect(screen.getByText('Tiền đã được xác minh; hồ sơ đang chờ cập nhật.')).toBeTruthy();
        jest.mocked(api.loadAttempt).mockResolvedValue({
          paymentAttemptId: 'attempt',
          status,
          purpose: 'DEPOSIT',
          amountVnd: 4000000,
          applicationStatus: 'SUCCEEDED',
          expiresAt: '2026-10-09T10:00:00Z',
        });
        await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
        await screen.findByText('Đã hoàn tất cập nhật hồ sơ.');
      }
      await fireEvent.press(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
      await waitFor(() =>
        expect(screen.queryByText('Đường dẫn thanh toán đã được tạo')).toBeNull(),
      );
    },
  );
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
      await fireEvent.press(screen.getByRole('button', { name: 'Xem thanh toán' }));
      await screen.findByText('Chưa thể xem thanh toán');
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
    expect(screen.getByText('Chưa có giao dịch')).toBeTruthy();
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
    await fireEvent.changeText(screen.getByLabelText('Mã giao dịch thanh toán'), 'attempt');
    await fireEvent.press(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    expect(await screen.findByText('Chưa rõ kết quả · đang kiểm tra')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    expect(api.startBalance).not.toHaveBeenCalled();
  });
});
