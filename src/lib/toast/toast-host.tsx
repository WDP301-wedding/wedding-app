import {
  useEffect,
  useLayoutEffect,
  useId,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hy } from '@/theme';
import { useAppInsets } from '@/lib/safe-area';
import { toast, toastStore, type ToastKind } from './store';
const palette: Record<ToastKind, { color: string; backgroundColor: string; icon: string }> = {
  success: { color: hy.success, backgroundColor: hy.successBg, icon: '✓' },
  error: { color: hy.error, backgroundColor: hy.errorBg, icon: '!' },
  warning: { color: hy.warning, backgroundColor: hy.warningBg, icon: '!' },
  info: { color: hy.primary, backgroundColor: hy.primarySoft, icon: 'i' },
};
/** Latest mounted modal outlet owns presentation; root host yields while it is visible. */
export function ToastHost({
  modal = false,
  visible = true,
}: {
  modal?: boolean;
  visible?: boolean;
}) {
  const state = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getServerSnapshot,
  );
  const outlet = useId();
  const insets = useAppInsets();
  const [opacity] = useState(() => new Animated.Value(0));
  useLayoutEffect(() => {
    if (!modal || !visible) return;
    toastStore.register(outlet);
    return () => toastStore.unregister(outlet);
  }, [modal, visible, outlet]);
  const current = state.items[0];
  const lastOutlet = state.outlets[state.outlets.length - 1];
  const ownsPresentation = visible && (modal ? outlet === lastOutlet : lastOutlet === undefined);
  useEffect(() => {
    if (!current || !ownsPresentation) return;
    let active = true;
    opacity.setValue(0);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active)
        Animated.timing(opacity, {
          toValue: 1,
          duration: reduced ? 0 : 150,
          useNativeDriver: true,
        }).start();
    });
    if (toastStore.announce(current.id))
      AccessibilityInfo.announceForAccessibility(`${current.title}. ${current.message}`);
    return () => {
      active = false;
      opacity.stopAnimation();
    };
  }, [current, ownsPresentation, opacity]);
  if (!current || !ownsPresentation) return null;
  const colors = palette[current.kind];
  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { top: insets.top + 8, left: insets.left + 12, right: insets.right + 12 },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          { opacity, backgroundColor: colors.backgroundColor, borderColor: colors.color },
        ]}
      >
        <Text accessible={false} style={[styles.icon, { color: colors.color }]}>
          {colors.icon}
        </Text>
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.color }]}>{current.title}</Text>
          <Text style={styles.message}>{current.message}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo"
          onPress={() => toast.dismiss(current.id)}
          style={styles.close}
        >
          <Text style={[styles.dismiss, { color: colors.color }]}>×</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
export function ToastProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    toastStore.setForeground(AppState.currentState === 'active');
    const app = AppState.addEventListener('change', (state) =>
      toastStore.setForeground(state === 'active'),
    );
    let active = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (active) toastStore.setScreenReader(enabled);
    });
    const reader = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      toastStore.setScreenReader,
    );
    return () => {
      active = false;
      app.remove();
      reader.remove();
      toast.clear();
    };
  }, []);
  return (
    <View style={styles.root}>
      {children}
      <ToastHost />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { zIndex: 1000, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 8,
    elevation: 6,
  },
  icon: { fontSize: 22, width: 24, textAlign: 'center', fontFamily: hy.bold },
  body: { flex: 1, minWidth: 0 },
  title: { fontFamily: hy.bold, fontSize: 15, lineHeight: 23 },
  message: { fontFamily: hy.body, color: hy.ink, fontSize: 14, lineHeight: 22 },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dismiss: { fontSize: 26 },
});
