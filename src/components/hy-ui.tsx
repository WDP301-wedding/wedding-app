import React, { forwardRef, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeInput,
  View,
  RefreshControl,
  type TextProps,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { hy, motion } from '@/theme';

export function HyText({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style);
  const w = String(flat?.fontWeight ?? '400');
  const family =
    flat?.fontFamily && flat.fontFamily !== 'serif'
      ? flat.fontFamily
      : flat?.fontFamily === 'serif' || (flat?.fontSize ?? 16) >= 24
        ? hy.display
        : ['700', '800', '900', 'bold'].includes(w)
          ? hy.bold
          : w === '600'
            ? hy.semibold
            : w === '500'
              ? hy.medium
              : hy.body;
  return (
    <NativeText
      {...props}
      style={[
        { fontSize: 15, lineHeight: Math.round((flat?.fontSize ?? 15) * 1.5), color: hy.ink },
        style,
        { fontFamily: family },
      ]}
    />
  );
}
export const HyInput = forwardRef<NativeInput, TextInputProps>(function HyInput(
  { style, ...props },
  ref,
) {
  return (
    <NativeInput
      ref={ref}
      placeholderTextColor={hy.muted}
      selectionColor={hy.primary}
      {...props}
      style={[
        {
          fontFamily: hy.body,
          fontSize: 16,
          color: hy.ink,
          backgroundColor: hy.surface,
          borderWidth: 1,
          borderColor: hy.outline,
          borderRadius: 12,
          paddingHorizontal: 16,
          minHeight: 56,
        },
        style,
      ]}
    />
  );
});
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (active) setReduced(v);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
export function HyEnter({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const [progress] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduced ? motion.fast : motion.standard,
      easing: Easing.bezier(...motion.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [reduced ? 0 : 8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
export function HyButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'text';
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      android_ripple={{ color: 'rgba(122,31,61,0.12)' }}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: variant === 'primary' ? hy.primary : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: hy.primary,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy && (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : hy.primary} />
      )}
      <HyText
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: variant === 'primary' ? '#FFFFFF' : hy.primary,
          textAlign: 'center',
        }}
      >
        {label}
      </HyText>
    </Pressable>
  );
}
export function HyRow({
  title,
  subtitle,
  onPress,
  icon,
  tag,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  icon?: React.ReactNode;
  tag?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      android_ripple={{ color: hy.primarySoft }}
      style={({ pressed }) => [s.row, { backgroundColor: pressed ? hy.primarySoft : hy.surface }]}
    >
      <View style={s.rowIcon}>
        {icon ?? <HyText style={{ color: hy.primary, fontSize: 20 }}>◇</HyText>}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <HyText style={{ fontSize: 15, fontWeight: '600' }}>{title}</HyText>
        {subtitle ? (
          <HyText style={{ fontSize: 13, lineHeight: 20, color: hy.secondary }}>{subtitle}</HyText>
        ) : null}
      </View>
      {tag ? <HyText style={s.badge}>{tag}</HyText> : null}
      <HyText style={{ fontSize: 24, color: hy.muted }}>›</HyText>
    </Pressable>
  );
}
export function HyCard({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function HyScreen({
  children,
  refreshing,
  onRefresh,
}: React.PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void }>) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: hy.canvas }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
      {...(onRefresh
        ? {
            refreshControl: (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={hy.primary}
                colors={[hy.primary]}
              />
            ),
          }
        : {})}
    >
      {children}
    </ScrollView>
  );
}
export function HyState({
  kind,
  title,
  body,
  onRetry,
}: {
  kind: 'loading' | 'empty' | 'error' | 'locked';
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  if (kind === 'loading')
    return (
      <View
        accessibilityLabel="Đang tải"
        accessibilityState={{ busy: true }}
        style={{ gap: 16, padding: 16 }}
      >
        <View style={{ width: '45%', height: 24, borderRadius: 8, backgroundColor: hy.rule }} />
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              height: i === 0 ? 148 : 64,
              borderRadius: 20,
              backgroundColor: hy.surface,
              borderWidth: 1,
              borderColor: hy.rule,
            }}
          />
        ))}
      </View>
    );
  return (
    <HyCard style={{ alignItems: 'center', paddingVertical: 36, gap: 12 }}>
      <View style={s.stateIcon}>
        <HyText style={{ fontSize: 26, color: kind === 'error' ? hy.error : hy.primary }}>
          {kind === 'error' ? '!' : kind === 'locked' ? '◇' : '○'}
        </HyText>
      </View>
      <HyText
        accessibilityRole={kind === 'error' ? 'alert' : 'text'}
        style={{ fontSize: 20, fontWeight: '600', textAlign: 'center' }}
      >
        {title ??
          (kind === 'error'
            ? 'Chưa tải được dữ liệu'
            : kind === 'locked'
              ? 'Chưa thể mở nội dung'
              : 'Chưa có dữ liệu')}
      </HyText>
      {body ? <HyText style={{ color: hy.secondary, textAlign: 'center' }}>{body}</HyText> : null}
      {onRetry && <HyButton label="Thử lại" onPress={onRetry} />}
    </HyCard>
  );
}
export function HySheet({
  visible,
  title,
  onClose,
  children,
}: React.PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: hy.scrim }]}
        />
        <View accessibilityViewIsModal style={s.sheet}>
          <View
            style={{
              alignSelf: 'center',
              height: 4,
              width: 32,
              backgroundColor: hy.outline,
              borderRadius: 2,
              marginBottom: 8,
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <HyText style={{ fontSize: 20, fontWeight: '600', flex: 1 }}>{title}</HyText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={onClose}
              style={{
                minHeight: 48,
                minWidth: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HyText style={{ fontSize: 24 }}>×</HyText>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: hy.surface,
    borderWidth: 1,
    borderColor: hy.rule,
    gap: 12,
  },
  row: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hy.rule,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hy.primarySoft,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: hy.successBg,
    color: hy.success,
    fontSize: 11,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: hy.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    maxHeight: '86%',
    minHeight: 220,
    padding: 20,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: hy.canvas,
  },
});
