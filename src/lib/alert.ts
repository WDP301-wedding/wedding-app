import { Alert, type AlertButton, type AlertOptions } from 'react-native';
import { confirmModalStore } from './confirm/store';

export function setupCrossPlatformAlert() {
  const originalAlert = Alert.alert;

  Alert.alert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) => {
    // In test environment, ensure Jest spies/mocks continue to record calls
    if (process.env.NODE_ENV === 'test' && typeof originalAlert === 'function') {
      try {
        originalAlert(title, message, buttons, options);
      } catch {
        // ignore spy runner errors
      }
    }

    // Show custom Hỷ Yến confirmation modal across mobile & web
    confirmModalStore.showFromAlert(title, message, buttons, options);
  };
}

// Auto-run on import so any module importing this gets the custom modal immediately
setupCrossPlatformAlert();
