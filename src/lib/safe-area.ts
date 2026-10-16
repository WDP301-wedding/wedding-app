import * as SafeArea from 'react-native-safe-area-context';

export function useAppInsets(): { top: number; bottom: number; left: number; right: number } {
  try {
    return SafeArea.useSafeAreaInsets();
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}
