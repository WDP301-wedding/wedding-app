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
  type BalanceBody,
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
  acceptedChargesVnd: 'Tổng tiền phải thanh toán',
  paidVnd: 'Đã thanh toán',
  refundedVnd: 'Đã hoàn tiền',
  netPaidVnd: 'Đã thanh toán sau hoàn tiền',
  outstandingVnd: 'Còn phải thanh toán',
  creditVnd: 'Tiền thanh toán thừa',
};
const states = {
  CREATED: 'Đã tạo · chờ thanh toán',
  PENDING: 'Đang chờ xác minh',
  SUCCEEDED: 'Đã xác minh nhận tiền',
  FAILED: 'Thanh toán không thành công',
  UNKNOWN: 'Chưa rõ kết quả · đang kiểm tra',
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
    error.status === 429 ||
    error.code === 'REQUEST_IN_PROGRESS'
  );
}
function completed(attempt: AttemptView): boolean {
  return (
    attempt.status === 'FAILED' ||
    (attempt.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED')
  );
}
function message(error: unknown): string {
  if (denied(error))
    return 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ. Đăng nhập và kiểm tra quyền truy cập.';
  if (error instanceof ApiClientError && error.code === 'STALE_BILLING_REVISION')
    return 'Số dư đã thay đổi. Làm mới hồ sơ và kiểm tra lại trước khi thanh toán.';
  return unknown(error)
    ? 'Chưa rõ kết quả. Giữ nguyên yêu cầu để thử lại và kiểm tra kết quả.'
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
  const [intent, setIntent] = useState<{ revision: number; amountVnd: number | null } | null>(null);
  const [retry, setRetry] = useState(false);
  const [needsAttemptStatus, setNeedsAttemptStatus] = useState(false);
  const [pending, setPending] = useState(false);
  const [gated, setGated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!initialBookingId) {
          const remembered = await intents.lastBooking();
          if (active && remembered !== null) setBookingId(remembered);
        }
      } catch (caught) {
        if (active) setError(message(caught));
      } finally {
        if (active) setRecoveryReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [intents, initialBookingId]);
  const fail = (caught: unknown) => {
    if (denied(caught)) {
      setView(null);
      setAttempt(null);
      setCheckout(null);
      setIntent(null);
      setNeedsAttemptStatus(false);
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
      setIntent(null);
      setNeedsAttemptStatus(false);
      return;
    }
    setGated(false);
    const saved = await intents.recoverCheckout(id);
    const restoreAttemptId =
      saved?.checkout?.paymentAttemptId ??
      (view?.bookingId === id || initialBookingId === id ? attemptId.trim() : '');
    if (saved?.checkout) {
      setCheckout(saved.checkout);
      setAttemptId(saved.checkout.paymentAttemptId);
      setIntent(null);
      setRetry(false);
      onAttemptCreated?.(id, saved.checkout.paymentAttemptId);
    }
    setNeedsAttemptStatus(restoreAttemptId !== '');
    const value = await authorize((token) => gateway.load(token, id));
    if (value.bookingId !== id) throw new Error('Billing mismatch');
    setView(value);
    setCursors([null]);
    const metadata = saved?.metadata ?? (await intents.pending(`checkout:${id}`));
    if (!saved?.checkout && metadata?.expectedBillingRevision !== undefined) {
      setIntent({ revision: metadata.expectedBillingRevision, amountVnd: null });
      setRetry(true);
    }
    if (restoreAttemptId !== '') {
      const restored = await authorize((token) => gateway.loadAttempt(token, id, restoreAttemptId));
      if (restored.paymentAttemptId !== restoreAttemptId) throw new Error('Attempt mismatch');
      await intents.finishCheckout(id, restored);
      setAttempt(restored);
      setNeedsAttemptStatus(false);
      if (completed(restored)) setCheckout(null);
    }
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
    if (busy.current || view === null || intent === null || view.bookingId !== bookingId.trim())
      return;
    busy.current = true;
    setPending(true);
    setError(null);
    const body = { expectedBillingRevision: intent.revision };
    try {
      const value = await intents.runCheckout(view.bookingId, body, (key, stableBody) =>
        authorize((token) =>
          gateway.startBalance(token, view.bookingId, stableBody as BalanceBody, key),
        ),
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
    !recoveryReady ||
    pending ||
    intent !== null ||
    checkout !== null ||
    needsAttemptStatus ||
    (attempt !== null && !completed(attempt));
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
        Xem số tiền đã thanh toán, khoản còn lại và trạng thái giao dịch.
      </Text>
      <Text style={[type.subhead, { color: colors.label }]}>Mã hồ sơ đặt tiệc</Text>
      <TextInput
        accessibilityLabel="Mã hồ sơ đặt tiệc"
        autoCapitalize="none"
        autoCorrect={false}
        value={bookingId}
        onChangeText={(value) => {
          if (blocked) return;
          setBookingId(value);
          setView(null);
          setAttempt(null);
          setAttemptId('');
          setCheckout(null);
          setGated(false);
          setError(null);
          setCursors([null]);
        }}
        editable={!blocked}
        style={[styles.input, { borderColor: colors.separator, color: colors.label }]}
      />
      <Action
        label="Xem thanh toán"
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
          <Text style={[styles.title, { color: colors.label }]}>Chưa thể xem thanh toán</Text>
          <Text style={[type.body, { color: colors.label }]}>
            Bạn cần quyền xem đầy đủ và hồ sơ đặt tiệc đã được xác nhận. Hãy tiếp tục đặt cọc và
            hoàn thiện đề xuất trên website.
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
          </View>
          <Action
            label="Cập nhật thông tin"
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
                {intent.amountVnd === null
                  ? 'Khôi phục yêu cầu trước; kiểm tra số tiền qua trạng thái đã xác minh.'
                  : money(intent.amountVnd)}
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
              {((attempt?.status ?? checkout.status) === 'CREATED' ||
                (attempt?.status ?? checkout.status) === 'PENDING') && (
                <Action
                  label="Tiếp tục trên VNPay"
                  disabled={pending}
                  onPress={() => {
                    void run(async () => {
                      await openCheckout(checkout.checkoutUrl);
                    });
                  }}
                />
              )}
            </View>
          )}
          <View style={[styles.section, { borderColor: colors.separator }]}>
            <Text style={[styles.title, { color: colors.label }]}>Trạng thái thanh toán</Text>
            <Text style={[type.subhead, { color: colors.label }]}>Mã giao dịch thanh toán</Text>
            <TextInput
              accessibilityLabel="Mã giao dịch thanh toán"
              autoCapitalize="none"
              autoCorrect={false}
              value={attemptId}
              onChangeText={setAttemptId}
              editable={!pending && intent === null && checkout === null}
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
                  if (value.paymentAttemptId !== attemptId.trim())
                    throw new Error('Attempt mismatch');
                  await intents.finishCheckout(view.bookingId, value);
                  setAttempt(value);
                  setNeedsAttemptStatus(false);
                  if (completed(value)) setCheckout(null);
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
            <Text style={[styles.title, { color: colors.label }]}>Lịch sử giao dịch</Text>
            {view.history.length === 0 ? (
              <Text style={[type.body, { color: colors.label }]}>Chưa có giao dịch</Text>
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
              Trang {cursors.length}
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
