import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { hy } from '@/theme';
import type { ConfirmButtonConfig, ConfirmRequest, ConfirmVariant } from '@/lib/confirm/store';

export interface HyConfirmModalProps {
  readonly visible?: boolean;
  readonly request?: ConfirmRequest | null;
  readonly title?: string;
  readonly message?: string;
  readonly buttons?: readonly ConfirmButtonConfig[];
  readonly variant?: ConfirmVariant;
  readonly cancelable?: boolean;
  readonly onDismiss?: () => void;
  readonly onConfirm?: () => void;
  readonly onCancel?: () => void;
  readonly confirmText?: string;
  readonly cancelText?: string;
}

function ConfirmIcon({ variant }: { variant: ConfirmVariant }) {
  if (variant === 'destructive') {
    // Elegant exit / logout glyph badge
    return (
      <View
        style={[styles.iconCircle, { backgroundColor: hy.primarySoft }]}
        accessibilityElementsHidden
      >
        <View style={styles.logoutIcon}>
          {/* Door frame */}
          <View
            style={{
              width: 16,
              height: 22,
              borderWidth: 2,
              borderColor: hy.primary,
              borderRightWidth: 0,
              borderRadius: 3,
            }}
          />
          {/* Arrow pointing right */}
          <View
            style={{
              position: 'absolute',
              right: 1,
              top: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 10, height: 2, backgroundColor: hy.primary }} />
            <View
              style={{
                width: 6,
                height: 6,
                borderTopWidth: 2,
                borderRightWidth: 2,
                borderColor: hy.primary,
                transform: [{ rotate: '45deg' }],
                marginLeft: -3,
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'warning') {
    return (
      <View
        style={[styles.iconCircle, { backgroundColor: hy.warningBg }]}
        accessibilityElementsHidden
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: hy.warning }}>!</Text>
      </View>
    );
  }

  // Primary / info: Diamond seal
  return (
    <View
      style={[styles.iconCircle, { backgroundColor: hy.primarySoft }]}
      accessibilityElementsHidden
    >
      <Text style={{ fontSize: 24, color: hy.primary }}>◇</Text>
    </View>
  );
}

export function HyConfirmModal({
  visible,
  request,
  title,
  message,
  buttons,
  variant,
  cancelable,
  onDismiss,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: HyConfirmModalProps) {
  const isVisible = visible ?? Boolean(request);
  const resolvedTitle = request?.title ?? title ?? 'Xác nhận';
  const resolvedMessage = request?.message ?? message;
  const resolvedVariant = request?.variant ?? variant ?? 'primary';
  const resolvedCancelable = request?.cancelable ?? cancelable ?? true;

  let resolvedButtons: readonly ConfirmButtonConfig[] = request?.buttons ?? buttons ?? [];

  if (resolvedButtons.length === 0) {
    resolvedButtons = [
      {
        text: cancelText ?? 'Ở lại',
        style: 'cancel',
        onPress: onCancel ?? onDismiss ?? undefined,
      },
      {
        text: confirmText ?? 'Xác nhận',
        style: resolvedVariant === 'destructive' ? 'destructive' : 'default',
        onPress: onConfirm ?? undefined,
      },
    ];
  }

  const handleBackdropPress = () => {
    if (resolvedCancelable) {
      if (onDismiss) {
        onDismiss();
      } else {
        const cancelBtn = resolvedButtons.find((b) => b.style === 'cancel');
        cancelBtn?.onPress?.();
      }
    }
  };

  const useVerticalStack =
    resolvedButtons.length > 2 || resolvedButtons.some((b) => (b.text?.length ?? 0) > 12);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        {/* Scrim tap area */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng hộp thoại"
          onPress={handleBackdropPress}
          style={StyleSheet.absoluteFill}
        />

        {/* Dialog card */}
        <View accessibilityRole="alert" accessibilityViewIsModal style={styles.card}>
          {/* Top visual badge icon */}
          <ConfirmIcon variant={resolvedVariant} />

          {/* Dialog Title */}
          <Text style={styles.title}>{resolvedTitle}</Text>

          {/* Dialog Message */}
          {resolvedMessage ? <Text style={styles.message}>{resolvedMessage}</Text> : null}

          {/* Dialog Buttons */}
          <View
            style={[
              styles.actionsContainer,
              useVerticalStack ? styles.actionsVertical : styles.actionsHorizontal,
            ]}
          >
            {resolvedButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';

              return (
                <Pressable
                  key={`${btn.text}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={btn.accessibilityLabel ?? btn.text}
                  onPress={btn.onPress}
                  android_ripple={{
                    color: isCancel ? hy.primarySoft : 'rgba(255, 255, 255, 0.25)',
                  }}
                  style={({ pressed }) => [
                    styles.button,
                    !useVerticalStack && styles.buttonFlex,
                    isCancel
                      ? styles.buttonCancel
                      : isDestructive
                        ? styles.buttonDestructive
                        : styles.buttonPrimary,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel ? styles.buttonTextCancel : styles.buttonTextFilled,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: hy.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: hy.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: hy.rule,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 32px rgba(43, 29, 34, 0.22)',
      },
    }),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutIcon: {
    width: 26,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  title: {
    fontFamily: hy.display,
    fontSize: 20,
    fontWeight: '700',
    color: hy.ink,
    textAlign: 'center',
    lineHeight: 28,
  },
  message: {
    fontFamily: hy.body,
    fontSize: 14.5,
    lineHeight: 22,
    color: hy.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  actionsContainer: {
    width: '100%',
    marginTop: 22,
  },
  actionsHorizontal: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsVertical: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonPrimary: {
    backgroundColor: hy.primary,
  },
  buttonDestructive: {
    backgroundColor: hy.primary,
  },
  buttonCancel: {
    backgroundColor: hy.canvas,
    borderWidth: 1,
    borderColor: hy.rule,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextFilled: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonTextCancel: {
    color: hy.ink,
  },
});
