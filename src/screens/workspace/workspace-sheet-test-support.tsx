import type { ReactNode } from 'react';
import { Modal, View } from 'react-native';

// Native sheets live in a separate window. Model that boundary in Jest so the
// native Host's pointerEvents="none" does not block presses on the sheet content.
export function BottomSheet({
  isPresented,
  onDismiss,
  children,
}: {
  isPresented: boolean;
  onDismiss: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal visible={isPresented} onRequestClose={onDismiss} testID="native-more-sheet">
      {children}
    </Modal>
  );
}

export function RNHostView({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}
