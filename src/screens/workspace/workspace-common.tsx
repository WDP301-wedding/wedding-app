import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';
import { HyInput, HyText as Text } from '@/components/hy-ui';
import { BellIcon, ChevronRightIcon } from '@/components/icons';
import { hy } from '@/theme';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import type { Overview } from '@/features/identity-access/experience-api';
import type { ProposalView } from '@/features/booking-lifecycle/proposal-api';
import { createDeterministicIdempotencyKey } from '@/lib/idempotency';
import { message } from '@/lib/api/error-message';
import { ApiClientError } from '@/lib/api/client';
import { codeMessages } from '@/lib/api/error-messages.vi';

export function workspaceMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (codeMessages[error.code]) return codeMessages[error.code]!;
    if (error.kind === 'network')
      return 'Chưa kết nối được. Hãy kiểm tra mạng và thử lại với nội dung đang có.';
    if (error.kind === 'timeout')
      return 'Chưa nhận được phản hồi. Hãy giữ nguyên nội dung và kiểm tra lại trước khi gửi lại.';
  }
  return message(error);
}

export type Booking = Overview['data'][number];
export type Destination =
  'overview' | 'agreement' | 'payment' | 'prepare' | 'settlement' | 'notifications' | 'profile';
export type WorkspaceProps = Readonly<{
  session: AndroidIdentitySession;
  booking: Booking;
  proposal: ProposalView | null;
  revision: number;
  contextReady?: boolean | undefined;
  refresh: () => void;
  navigate: (
    destination: Destination,
    detail?: {
      prepareSection?: 'groups' | 'seating' | 'invitation' | 'appendix';
      agreementStep?: 'timeline' | 'contract';
    },
  ) => void;
}>;

export function useRead<T>(load: () => Promise<T>, invalidation: string | number = 0) {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    request: object | null;
  }>({
    data: null,
    error: null,
    request: null,
  });
  const [nonce, setNonce] = useState(0);
  const request = useMemo(() => ({ load, nonce, invalidation }), [load, nonce, invalidation]);
  useEffect(() => {
    let active = true;
    void load().then(
      (data) => {
        if (active) setState({ data, error: null, request });
      },
      (error: unknown) => {
        if (active)
          setState((previous) => ({
            data:
              error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0)
                ? null
                : previous.data,
            error: workspaceMessage(error),
            request,
          }));
      },
    );
    return () => {
      active = false;
    };
  }, [load, request]);
  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const loading = state.request !== request;
  return { data: state.data, error: loading ? null : state.error, loading, reload };
}

export function useClock(interval = 60000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

export function useCommand(refresh: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = useRef(false);
  const run = async (operation: () => Promise<unknown>, text = 'Đã cập nhật.') => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      if ((await operation()) === false) return false;
      setSuccess(text);
      refresh();
      return true;
    } catch (caught) {
      setError(workspaceMessage(caught));
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return { pending, error, success, run };
}
export const commandKey = (operation: string, resource: string, body: unknown) =>
  createDeterministicIdempotencyKey(operation, resource, 'request', body);

export const NotificationHeaderContext = createContext<{
  unreadCount: number;
  active: boolean;
  onPress: () => void;
} | null>(null);

export function Page({
  title,
  children,
  scrollRef,
}: {
  title: string;
  children: ReactNode;
  scrollRef?: Ref<ScrollViewInstance> | undefined;
}) {
  const notifications = useContext(NotificationHeaderContext);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <View style={s.column}>
          <View testID="workspace-page-heading" style={s.pageHeading}>
            <Text accessibilityRole="header" style={[s.title, s.pageTitle]}>
              {title}
            </Text>
            {notifications && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thông báo"
                accessibilityHint={
                  notifications.unreadCount > 0
                    ? `${notifications.unreadCount} thông báo chưa đọc`
                    : 'Mở hộp thư thông báo'
                }
                accessibilityState={{ selected: notifications.active }}
                onPress={notifications.onPress}
                style={({ pressed }) => [
                  s.notificationButton,
                  notifications.active && s.notificationActive,
                  pressed && s.pressed,
                ]}
              >
                <BellIcon size={22} color={hy.primary} />
                {notifications.unreadCount > 0 && (
                  <View style={s.notificationBadge}>
                    <Text maxFontSizeMultiplier={1.2} style={s.notificationBadgeText}>
                      {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.heading}>
        {title}
      </Text>
      {children}
    </View>
  );
}
/** Keep form state mounted while details are hidden; the native Expo collapsible removes hidden children. */
export function Disclosure({
  title,
  children,
  initiallyOpen = false,
  variant = 'plain',
}: {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
  variant?: 'plain' | 'panel';
}) {
  const [expanded, setExpanded] = useState(initiallyOpen);
  return (
    <View
      style={[
        s.disclosure,
        variant === 'panel' && s.disclosurePanel,
        variant === 'panel' && expanded && s.disclosurePanelOpen,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [
          s.disclosureHeading,
          variant === 'panel' && s.disclosurePanelHeading,
          pressed && s.pressed,
        ]}
      >
        <Text style={[s.disclosureLabel, variant === 'panel' && expanded && s.disclosureLabelOpen]}>
          {title}
        </Text>
        <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
          <ChevronRightIcon size={16} color={hy.muted} />
        </View>
      </Pressable>
      <View
        style={[
          s.disclosureBody,
          variant === 'panel' && s.disclosurePanelBody,
          !expanded && { display: 'none' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
}) {
  const resolvedVariant = variant ?? (secondary ? 'secondary' : 'primary');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        resolvedVariant === 'secondary' && s.secondary,
        resolvedVariant === 'text' && s.textAction,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.actionText, resolvedVariant !== 'primary' && s.secondaryText]}>{label}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  numeric = false,
  multiline = false,
  secure = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  secure?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <HyInput
        accessibilityLabel={label}
        value={value}
        editable={!disabled}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'number-pad' : 'default'}
        multiline={multiline}
        secureTextEntry={secure}
        style={s.input}
      />
    </View>
  );
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <View accessibilityRole={error ? 'alert' : undefined} style={[s.notice, error && s.error]}>
      <Text style={error ? s.errorText : s.muted}>{children}</Text>
    </View>
  );
}
export function Feedback({ command }: { command: ReturnType<typeof useCommand> }) {
  return (
    <>
      {command.error && <Notice error>{command.error}</Notice>}
      {command.success && <Notice>{command.success}</Notice>}
    </>
  );
}
export function ReadState({
  state,
}: {
  state: { loading: boolean; error: string | null; reload: () => void };
}) {
  return (
    <>
      {state.loading && (
        <View style={s.loading}>
          <ActivityIndicator color={hy.primary} />
          <Text>Đang tải thông tin…</Text>
        </View>
      )}
      {state.error && (
        <>
          <Notice error>{state.error}</Notice>
          <Action label="Thử lại" onPress={state.reload} secondary />
        </>
      )}
    </>
  );
}
export const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hy.canvas },
  page: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
  title: { fontSize: 26, lineHeight: 36, fontFamily: hy.bold, color: hy.ink },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { flex: 1 },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: hy.rule,
    backgroundColor: hy.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationActive: { backgroundColor: hy.primarySoft, borderColor: hy.primary },
  notificationBadge: {
    pointerEvents: 'none',
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    minHeight: 18,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: hy.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    lineHeight: 16,
    fontFamily: hy.semibold,
    color: hy.surface,
  },
  heading: { fontSize: 18, lineHeight: 26, fontFamily: hy.semibold },
  disclosure: { borderTopWidth: 1, borderTopColor: hy.rule },
  disclosurePanel: {
    borderWidth: 1,
    borderColor: hy.rule,
    borderRadius: 8,
    backgroundColor: hy.surface,
  },
  disclosurePanelOpen: { backgroundColor: hy.surfaceMuted, borderColor: hy.gold },
  disclosurePanelHeading: { paddingHorizontal: 16, minHeight: 56 },
  disclosurePanelBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 0 },
  disclosureLabelOpen: { fontFamily: hy.semibold },
  disclosureHeading: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  disclosureLabel: {
    flex: 1,
    fontFamily: hy.medium,
    fontSize: 15,
    lineHeight: 23,
    color: hy.primary,
  },
  disclosureBody: { paddingBottom: 12, gap: 12 },
  summaryPanel: { padding: 16, gap: 10, backgroundColor: hy.surfaceMuted, borderRadius: 8 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  section: { paddingVertical: 16, gap: 12, borderTopWidth: 1, borderTopColor: hy.rule },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  action: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: hy.primary,
    borderWidth: 1,
    borderColor: hy.primary,
    borderRadius: 8,
  },
  actionText: {
    color: hy.surface,
    fontFamily: hy.semibold,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  secondary: { backgroundColor: hy.surface, borderColor: hy.rule },
  textAction: { backgroundColor: 'transparent', borderColor: 'transparent' },
  secondaryText: { color: hy.primary },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
  field: { gap: 6 },
  label: { fontSize: 14, lineHeight: 22, fontFamily: hy.medium },
  input: { borderRadius: 8, minHeight: 48 },
  muted: { color: hy.muted, fontSize: 14, lineHeight: 22 },
  notice: {
    padding: 14,
    backgroundColor: hy.surfaceMuted,
    borderLeftWidth: 3,
    borderLeftColor: hy.gold,
    gap: 8,
  },
  error: { backgroundColor: hy.errorBg, borderLeftColor: hy.error },
  errorText: { color: hy.error },
  loading: { padding: 20, alignItems: 'center', gap: 12 },
  item: { paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: hy.rule },
  amount: { fontSize: 26, lineHeight: 36, fontFamily: hy.bold, color: hy.primary },
});
