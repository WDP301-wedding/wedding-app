import { Button, Host } from '@expo/ui';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AndroidIdentitySession,
  createIdentityApi,
  createSecureRefreshStore,
  type AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import {
  createCoupleBillingGateway,
  type BillingView,
  type AttemptView,
  type CheckoutView,
  type CoupleBillingGateway,
} from '@/features/payments-billing/billing-api';
import { createBillingIntents } from '@/features/payments-billing/billing-intents';
import { ApiClientError } from '@/lib/api/client';
import { type, useWeddingTheme } from '@/theme';
import { billingStyles as styles } from './billing.styles';

type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type EntryProps = Readonly<{
  initialBookingId?: string;
  initialAttemptId?: string;
  onAttemptCreated?: (bookingId: string, attemptId: string) => void;
}>;
const deviceSession = new AndroidIdentitySession(createIdentityApi(), createSecureRefreshStore());
const billing = createCoupleBillingGateway();
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const labels: Record<keyof BillingView['totals'], string> = {
  acceptedChargesVnd: 'Giá trị đã chấp nhận',
  paidVnd: 'Đã thanh toán',
  refundedVnd: 'Đã hoàn',
  netPaidVnd: 'Thanh toán ròng',
  outstandingVnd: 'Còn phải thu',
  creditVnd: 'Dư có cần đối soát',
};
const states = {
  CREATED: 'Đã tạo · chờ thanh toán',
  PENDING: 'Đang chờ xác minh',
  SUCCEEDED: 'Đã xác minh nhận tiền',
  FAILED: 'Thanh toán không thành công',
  UNKNOWN: 'Chưa rõ kết quả · đang đối soát',
};
const kinds = {
  CHARGE: 'Khoản phải thu',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
  CREDIT_ADJUSTMENT: 'Điều chỉnh giảm',
};
function denied(error: unknown): boolean {
  return error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0);
}
function unknown(error: unknown): boolean {
  return (
    !(error instanceof ApiClientError) ||
    error.kind !== 'api' ||
    (error.status ?? 500) >= 500 ||
    error.code === 'REQUEST_IN_PROGRESS'
  );
}
function message(error: unknown): string {
  if (denied(error))
    return 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ. Đăng nhập và kiểm tra quyền truy cập.';
  if (error instanceof ApiClientError && error.code === 'STALE_BILLING_REVISION')
    return 'Số dư đã thay đổi. Làm mới hồ sơ và kiểm tra lại trước khi thanh toán.';
  return unknown(error)
    ? 'Chưa rõ kết quả. Giữ nguyên yêu cầu để thử lại và đối soát.'
    : 'Yêu cầu bị từ chối. Kiểm tra số dư và trạng thái trước khi tiếp tục.';
}
function Action({
  label,
  disabled = false,
  onPress,
  secondary = false,
}: Readonly<{ label: string; disabled?: boolean; onPress: () => void; secondary?: boolean }>) {
  const { brand } = useWeddingTheme();
  return (
    <Host matchContents seedColor={brand.primary}>
      <Button
        label={label}
        disabled={disabled}
        onPress={onPress}
        variant={secondary ? 'outlined' : 'filled'}
        style={{ paddingVertical: 12, borderRadius: 4 }}
      />
    </Host>
  );
}
export function AndroidBillingPage({
  session = deviceSession,
  gateway = billing,
  ...entry
}: EntryProps & Readonly<{ session?: AndroidIdentitySession; gateway?: CoupleBillingGateway }>) {
  const { colors } = useWeddingTheme();
  const [snapshot, setSnapshot] = useState<AndroidSessionSnapshot | null>(null);
  useEffect(() => {
    let active = true;
    void session.restore().then((value) => {
      if (active) setSnapshot(value);
    });
    return () => {
      active = false;
    };
  }, [session]);
  if (snapshot === null)
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
        <Text style={[type.body, { color: colors.label }]}>Đang kiểm tra phiên đăng nhập…</Text>
      </View>
    );
  if (snapshot.status === 'anonymous' || snapshot.access !== 'full')
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.label }]}>
          Cần tài khoản cặp đôi đã xác nhận
        </Text>
        <Text style={[type.body, { color: colors.label }]}>
          Quay về trang chính để đăng nhập. Nếu đang tư vấn, tiếp tục đặt cọc trên Public Web.
        </Text>
      </View>
    );
  return (
    <AndroidBillingScreen
      key={snapshot.actor.accountId}
      accountId={snapshot.actor.accountId}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
      {...entry}
    />
  );
}
export function AndroidBillingScreen({
  accountId,
  authorize,
  gateway,
  intents: provided,
  initialBookingId = '',
  initialAttemptId = '',
  onAttemptCreated,
  openCheckout = openBrowserAsync,
}: EntryProps &
  Readonly<{
    accountId: string;
    authorize: Authorize;
    gateway: CoupleBillingGateway;
    intents?: ReturnType<typeof createBillingIntents>;
    openCheckout?: (url: string) => Promise<unknown>;
  }>) {
  const { brand, colors } = useWeddingTheme();
  const insets = useSafeAreaInsets();
  const [intents] = useState(() => provided ?? createBillingIntents(accountId));
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [view, setView] = useState<BillingView | null>(null);
  const [attemptId, setAttemptId] = useState(initialAttemptId);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [intent, setIntent] = useState<{ revision: number; amountVnd: number } | null>(null);
  const [retry, setRetry] = useState(false);
  const [pending, setPending] = useState(false);
  const [gated, setGated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const busy = useRef(false);
  const fail = (caught: unknown) => {
    if (denied(caught)) {
      setView(null);
      setAttempt(null);
      setCheckout(null);
      setIntent(null);
    }
    setError(message(caught));
  };
  const run = async (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await operation();
    } catch (caught) {
      fail(caught);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const load = async () => {
    const id = bookingId.trim();
    const context = await authorize((token) => gateway.loadContext(token, id));
    if (context.bookingId !== id) throw new Error('Booking mismatch');
    if (
      context.accessLevel !== 'FULL' ||
      (context.phase !== 'CONFIRMED' && context.phase !== 'COMPLETED')
    ) {
      setView(null);
      setAttempt(null);
      setCheckout(null);
      setGated(true);
      return;
    }
    setGated(false);
    const value = await authorize((token) => gateway.load(token, id));
    if (value.bookingId !== id) throw new Error('Billing mismatch');
    setView(value);
    setCursors([null]);
    if (attempt?.status === 'SUCCEEDED' || attempt?.status === 'FAILED') setCheckout(null);
  };
  const page = async (next: (string | null)[]) => {
    if (view === null) return;
    const cursor = next.at(-1) ?? null;
    const value = await authorize((token) =>
      gateway.load(token, view.bookingId, {
        ...(cursor === null ? {} : { cursor }),
        throughBillingRevision: view.billingRevision,
      }),
    );
    if (value.bookingId !== view.bookingId || value.billingRevision !== view.billingRevision)
      throw new Error('History mismatch');
    setView(value);
    setCursors(next);
  };
  const start = async () => {
    if (busy.current || view === null || intent === null) return;
    busy.current = true;
    setPending(true);
    setError(null);
    const body = { expectedBillingRevision: intent.revision };
    try {
      const value = await intents.run(`checkout:${view.bookingId}`, body, (key) =>
        authorize((token) => gateway.startBalance(token, view.bookingId, body, key)),
      );
      setCheckout(value);
      setAttemptId(value.paymentAttemptId);
      setAttempt(null);
      setIntent(null);
      setRetry(false);
      onAttemptCreated?.(view.bookingId, value.paymentAttemptId);
    } catch (caught) {
      fail(caught);
      const unresolved = unknown(caught);
      setRetry(unresolved);
      if (!unresolved) setIntent(null);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const blocked =
    pending ||
    intent !== null ||
    checkout !== null ||
    (attempt !== null && attempt.status !== 'SUCCEEDED' && attempt.status !== 'FAILED');
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screen,
        { backgroundColor: colors.background, paddingBottom: 24 + insets.bottom },
      ]}
    >
      <Text style={[styles.title, { color: colors.label }]}>Thanh toán của hai bạn</Text>
      <Text style={[type.body, { color: colors.secondaryLabel }]}>
        Số dư và trạng thái được nhà hàng xác minh. Không suy ra thành công từ trang trả về VNPay.
      </Text>
      <Text style={[type.subhead, { color: colors.label }]}>Mã hồ sơ đặt tiệc</Text>
      <TextInput
        accessibilityLabel="Mã hồ sơ đặt tiệc"
        autoCapitalize="none"
        autoCorrect={false}
        value={bookingId}
        onChangeText={setBookingId}
        editable={!blocked}
        style={[styles.input, { borderColor: colors.separator, color: colors.label }]}
      />
      <Action
        label="Mở billing"
        disabled={blocked || !bookingId.trim()}
        onPress={() => {
          void run(load);
        }}
      />
      {pending && (
        <View accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <Text style={[type.body, { color: colors.label }]}>Đang kiểm tra với máy chủ…</Text>
        </View>
      )}
      {error !== null && (
        <Text accessibilityRole="alert" style={[type.body, { color: brand.script }]}>
          {error}
        </Text>
      )}
      {gated && (
        <View style={[styles.notice, { borderColor: brand.gold }]}>
          <Text style={[styles.title, { color: colors.label }]}>Billing trên app chưa mở</Text>
          <Text style={[type.body, { color: colors.label }]}>
            Cần quyền đầy đủ và hồ sơ đã xác nhận. Tiếp tục đặt cọc, cộng tác trên Public Web.
          </Text>
        </View>
      )}
      {view !== null && (
        <>
          <View style={[styles.totals, { backgroundColor: brand.powder, borderColor: brand.gold }]}>
            {Object.entries(view.totals).map(([key, value]) => (
              <View key={key}>
                <Text style={[type.subhead, { color: colors.secondaryLabel }]}>
                  {labels[key as keyof typeof labels]}
                </Text>
                <Text selectable style={[styles.amount, { color: colors.label }]}>
                  {money(value)}
                </Text>
              </View>
            ))}
            <Text style={[type.caption, { color: colors.secondaryLabel }]}>
              Phiên bản số dư {view.billingRevision}. Dư có không tự động hoàn tiền.
            </Text>
          </View>
          <Action
            label="Làm mới số dư"
            secondary
            disabled={pending || intent !== null}
            onPress={() => {
              void run(load);
            }}
          />
          <Action
            label="Thanh toán còn lại"
            disabled={blocked || view.billingRevision === 0 || view.totals.outstandingVnd === 0}
            onPress={() =>
              setIntent({ revision: view.billingRevision, amountVnd: view.totals.outstandingVnd })
            }
          />
          {intent !== null && (
            <View style={[styles.notice, { borderColor: brand.gold }]}>
              <Text style={[styles.title, { color: colors.label }]}>Kiểm tra khoản còn lại</Text>
              <Text selectable style={[styles.amount, { color: colors.label }]}>
                {money(intent.amountVnd)}
              </Text>
              <Text style={[type.body, { color: colors.label }]}>
                Máy chủ kiểm tra lại toàn bộ số dư trước khi tạo giao dịch.
              </Text>
              <Action
                label={retry ? 'Thử lại cùng yêu cầu' : 'Xác nhận mở VNPay'}
                disabled={pending}
                onPress={() => {
                  void start();
                }}
              />
              <Action
                label="Quay lại"
                secondary
                disabled={pending || retry}
                onPress={() => setIntent(null)}
              />
            </View>
          )}
          {checkout !== null && (
            <View style={[styles.notice, { borderColor: brand.gold }]}>
              <Text style={[styles.title, { color: colors.label }]}>
                Đường dẫn thanh toán đã được tạo
              </Text>
              <Text selectable style={[type.body, { color: colors.label }]}>
                {checkout.paymentAttemptId}
              </Text>
              <Text style={[type.body, { color: colors.secondaryLabel }]}>
                Hết hạn: {new Date(checkout.expiresAt).toLocaleString('vi-VN')}. Hết hạn không chứng
                minh thất bại.
              </Text>
              <Action
                label="Tiếp tục trên VNPay"
                disabled={pending}
                onPress={() => {
                  void run(async () => {
                    await openCheckout(checkout.checkoutUrl);
                  });
                }}
              />
            </View>
          )}
          <View style={[styles.section, { borderColor: colors.separator }]}>
            <Text style={[styles.title, { color: colors.label }]}>Trạng thái thanh toán</Text>
            <Text style={[type.subhead, { color: colors.label }]}>Mã lần thanh toán</Text>
            <TextInput
              accessibilityLabel="Mã lần thanh toán"
              autoCapitalize="none"
              autoCorrect={false}
              value={attemptId}
              onChangeText={setAttemptId}
              editable={!pending && intent === null}
              style={[styles.input, { borderColor: colors.separator, color: colors.label }]}
            />
            <Action
              label="Kiểm tra trạng thái"
              disabled={pending || intent !== null || !attemptId.trim()}
              onPress={() => {
                void run(async () => {
                  const value = await authorize((token) =>
                    gateway.loadAttempt(token, view.bookingId, attemptId.trim()),
                  );
                  setAttempt(value);
                  if (value.status === 'FAILED') setCheckout(null);
                });
              }}
            />
            {attempt !== null && (
              <View accessibilityLiveRegion="polite">
                <Text style={[styles.title, { color: colors.label }]}>
                  {states[attempt.status]}
                </Text>
                <Text selectable style={[type.body, { color: colors.label }]}>
                  {money(attempt.amountVnd)} ·{' '}
                  {attempt.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'}
                </Text>
                {attempt.status === 'SUCCEEDED' ? (
                  <Text style={[type.body, { color: colors.label }]}>
                    {attempt.applicationStatus === 'SUCCEEDED'
                      ? 'Đã hoàn tất cập nhật hồ sơ.'
                      : 'Tiền đã được xác minh; hồ sơ đang chờ cập nhật.'}
                  </Text>
                ) : (
                  attempt.status !== 'FAILED' && (
                    <Text style={[type.body, { color: colors.label }]}>
                      Chờ xác minh kết quả, không tạo giao dịch khác.
                    </Text>
                  )
                )}
              </View>
            )}
          </View>
          <View style={[styles.section, { borderColor: colors.separator }]}>
            <Text style={[styles.title, { color: colors.label }]}>Lịch sử bất biến</Text>
            {view.history.length === 0 ? (
              <Text style={[type.body, { color: colors.label }]}>Chưa có bút toán</Text>
            ) : (
              view.history.map((entry) => (
                <View
                  key={entry.ledgerEntryId}
                  style={[styles.row, { borderColor: colors.separator }]}
                >
                  <Text style={[type.headline, { color: colors.label }]}>
                    {kinds[entry.kind]} · {money(entry.amountVnd)}
                  </Text>
                  <Text style={[type.subhead, { color: colors.secondaryLabel }]}>
                    {new Date(entry.occurredAt).toLocaleString('vi-VN')}
                  </Text>
                  <Text selectable style={[type.caption, { color: colors.secondaryLabel }]}>
                    {entry.ledgerEntryId}
                  </Text>
                </View>
              ))
            )}
            <Text style={[type.caption, { color: colors.secondaryLabel }]}>
              Trang {cursors.length} · phiên bản {view.billingRevision}
            </Text>
            <Action
              label="Trang lịch sử trước"
              secondary
              disabled={pending || cursors.length <= 1}
              onPress={() => {
                void run(() => page(cursors.slice(0, -1)));
              }}
            />
            <Action
              label="Trang lịch sử tiếp theo"
              secondary
              disabled={pending || view.nextCursor === null}
              onPress={() => {
                if (view.nextCursor !== null) void run(() => page([...cursors, view.nextCursor]));
              }}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}
