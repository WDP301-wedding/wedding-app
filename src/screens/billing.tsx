import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { HyText as Text, HyInput as TextInput } from '@/components/hy-ui';
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
import { readPublicEnv } from '@/lib/env';
import { type, useWeddingTheme } from '@/theme';
import { billingStyles as styles } from './billing.styles';
import {
  Action,
  BillingAttemptSection,
  BillingCheckoutSection,
  BillingHistorySection,
  BillingIntentSection,
  BillingTotalsSection,
  completed,
  denied,
  labels,
  message,
  money,
  unknown,
} from './billing-sections';

export {
  Action,
  BillingAttemptSection,
  BillingCheckoutSection,
  BillingHistorySection,
  BillingIntentSection,
  BillingTotalsSection,
  completed,
  denied,
  labels,
  message,
  money,
  unknown,
};

type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type EntryProps = Readonly<{
  initialBookingId?: string;
  initialAttemptId?: string;
  onAttemptCreated?: (bookingId: string, attemptId: string) => void;
}>;

const deviceSession = new AndroidIdentitySession(createIdentityApi(), createSecureRefreshStore());
const billing = createCoupleBillingGateway();

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
            hoàn thiện đề xuất trên website. Việc đặt cọc cho tài khoản Android bị giới hạn theo
            quyền máy chủ.
          </Text>
          <Action
            label="Mở cổng thông tin Web"
            disabled={pending}
            onPress={() =>
              void run(async () => {
                const portal = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;
                if (!portal)
                  throw new Error(
                    'Chưa cấu hình EXPO_PUBLIC_WEB_PORTAL_URL. Vui lòng liên hệ nhà hàng.',
                  );
                await openBrowserAsync(portal);
              })
            }
          />
        </View>
      )}
      {view !== null && (
        <>
          <BillingTotalsSection view={view} />
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
            <BillingIntentSection
              intent={intent}
              pending={pending}
              retry={retry}
              onStart={() => {
                void start();
              }}
              onCancel={() => setIntent(null)}
            />
          )}
          {checkout !== null && (
            <BillingCheckoutSection
              checkout={checkout}
              attempt={attempt}
              pending={pending}
              onContinue={() => {
                void run(async () => {
                  await openCheckout(checkout.checkoutUrl);
                });
              }}
            />
          )}
          <BillingAttemptSection
            attemptId={attemptId}
            setAttemptId={setAttemptId}
            attempt={attempt}
            pending={pending}
            intent={intent}
            checkout={checkout}
            onCheckStatus={() => {
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
          <BillingHistorySection
            view={view}
            cursors={cursors}
            pending={pending}
            onPageBack={() => {
              void run(() => page(cursors.slice(0, -1)));
            }}
            onPageForward={() => {
              if (view.nextCursor !== null) void run(() => page([...cursors, view.nextCursor]));
            }}
          />
        </>
      )}
    </ScrollView>
  );
}
