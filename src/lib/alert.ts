import { Alert, type AlertButton, type AlertOptions, Platform } from 'react-native';

export function setupCrossPlatformAlert() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      _options?: AlertOptions,
    ) => {
      const text = [title, message].filter(Boolean).join('\n\n');

      if (!buttons || buttons.length === 0) {
        if (typeof window.alert === 'function') {
          window.alert(text);
        }
        return;
      }

      if (buttons.length === 1) {
        if (typeof window.alert === 'function') {
          window.alert(text);
        }
        buttons[0]?.onPress?.();
        return;
      }

      if (buttons.length === 2) {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        const actionBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[1];
        const confirmed = typeof window.confirm === 'function' ? window.confirm(text) : true;
        if (confirmed) {
          actionBtn?.onPress?.();
        } else {
          cancelBtn?.onPress?.();
        }
        return;
      }

      // 3 or more buttons: show options list
      const optionsText = buttons.map((b, i) => `${i + 1}. ${b.text || 'Lựa chọn'}`).join('\n');
      const choice =
        typeof window.prompt === 'function'
          ? window.prompt(`${text}\n\n${optionsText}\n\nNhập số tương ứng (1-${buttons.length}):`)
          : null;

      if (choice !== null) {
        const idx = parseInt(choice.trim(), 10) - 1;
        if (!isNaN(idx) && buttons[idx]) {
          buttons[idx]?.onPress?.();
          return;
        }
      }
      const cancelBtn = buttons.find((b) => b.style === 'cancel');
      if (choice === null) {
        cancelBtn?.onPress?.();
      } else {
        buttons[0]?.onPress?.();
      }
    };
  }
}

// Auto-run on import so any module importing this gets the polyfill immediately
setupCrossPlatformAlert();
