import React, { useSyncExternalStore } from 'react';
import { confirmModalStore } from '@/lib/confirm/store';
import { HyConfirmModal } from './hy-confirm-modal';

export function ConfirmHost() {
  const request = useSyncExternalStore(
    confirmModalStore.subscribe,
    confirmModalStore.getSnapshot,
    () => null,
  );

  if (!request) return null;

  return (
    <HyConfirmModal
      visible={Boolean(request)}
      request={request}
      onDismiss={() => confirmModalStore.dismiss(true)}
    />
  );
}
