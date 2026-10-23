import type { AlertButton, AlertOptions } from 'react-native';

export type ConfirmVariant = 'destructive' | 'primary' | 'warning' | 'info';

export interface ConfirmButtonConfig {
  text: string;
  style?: 'default' | 'cancel' | 'destructive' | undefined;
  onPress?: (() => void) | undefined;
  accessibilityLabel?: string | undefined;
}

export interface ConfirmRequest {
  id: string;
  title: string;
  message?: string | undefined;
  buttons: readonly ConfirmButtonConfig[];
  variant: ConfirmVariant;
  cancelable: boolean;
  onDismiss?: (() => void) | undefined;
}

export interface ShowConfirmOptions {
  title: string;
  message?: string | undefined;
  buttons?: readonly (AlertButton | ConfirmButtonConfig)[] | undefined;
  confirmText?: string | undefined;
  cancelText?: string | undefined;
  variant?: ConfirmVariant | undefined;
  destructive?: boolean | undefined;
  cancelable?: boolean | undefined;
  onConfirm?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
}

export interface ConfirmPromptOptions {
  title: string;
  message?: string | undefined;
  confirmText?: string | undefined;
  cancelText?: string | undefined;
  variant?: ConfirmVariant | undefined;
  destructive?: boolean | undefined;
  cancelable?: boolean | undefined;
}

class ConfirmModalStore {
  private current: ConfirmRequest | null = null;
  private readonly listeners = new Set<() => void>();
  private nextId = 1;

  getSnapshot = (): ConfirmRequest | null => {
    return this.current;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  dismiss = (fromBackdrop = false): void => {
    if (!this.current) return;
    const request = this.current;
    this.current = null;
    this.notify();
    if (fromBackdrop) {
      request.onDismiss?.();
    }
  };

  show = (options: ShowConfirmOptions): string => {
    const id = `confirm-${Date.now()}-${this.nextId++}`;
    const isDestructive =
      options.destructive === true ||
      options.variant === 'destructive' ||
      (options.buttons?.some((b) => b.style === 'destructive') ?? false) ||
      /đăng xuất|thu hồi|hủy|xóa/iu.test(options.title);

    const variant: ConfirmVariant =
      options.variant ??
      (isDestructive
        ? 'destructive'
        : /lưu ý|cảnh báo/iu.test(options.title)
          ? 'warning'
          : 'primary');

    let configuredButtons: ConfirmButtonConfig[];

    if (options.buttons && options.buttons.length > 0) {
      configuredButtons = options.buttons.map((b) => ({
        text: b.text || 'Xác nhận',
        style: b.style ?? (isDestructive && b.style !== 'cancel' ? 'destructive' : 'default'),
        onPress: () => {
          this.dismiss(false);
          b.onPress?.();
        },
      }));
    } else {
      const cancelBtn: ConfirmButtonConfig = {
        text: options.cancelText ?? 'Hủy',
        style: 'cancel',
        onPress: () => {
          this.dismiss(false);
          options.onCancel?.();
        },
      };

      const confirmBtn: ConfirmButtonConfig = {
        text: options.confirmText ?? 'Xác nhận',
        style: isDestructive ? 'destructive' : 'default',
        onPress: () => {
          this.dismiss(false);
          options.onConfirm?.();
        },
      };

      configuredButtons = [cancelBtn, confirmBtn];
    }

    this.current = {
      id,
      title: options.title,
      message: options.message,
      buttons: configuredButtons,
      variant,
      cancelable: options.cancelable ?? true,
      onDismiss: options.onCancel,
    };

    this.notify();
    return id;
  };

  confirm = (options: ConfirmPromptOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      this.show({
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  showFromAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ): string => {
    return this.show({
      title,
      message,
      buttons,
      cancelable: options?.cancelable ?? true,
      onCancel: options?.onDismiss,
    });
  };
}

export const confirmModalStore = new ConfirmModalStore();
export const confirmModal = confirmModalStore;
