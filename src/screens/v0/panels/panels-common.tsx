import { sharedResourceStore } from '@/screens/hy/resource-store';
import { toast } from '@/lib/toast/store';
import { reportError } from '@/lib/toast/feedback';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { HyText as Text, HyInput as TextInput } from '@/components/hy-ui';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import { createBillingIntents } from '@/features/payments-billing/billing-intents';
import type { CommercialContractView } from '@/features/payments-billing/billing-api';
import { useWeddingTheme } from '@/theme';
import type { V0CommonProps } from '../v0-types';
import { styles } from './panels.styles';

export const api = createRestoredFlowsGateway();
export const invitations = createAppInvitationGateway();

export type ContextProps = Pick<V0CommonProps, 'activeBooking' | 'session'>;
export type Proposal = Awaited<ReturnType<typeof api.loadProposal>>;
export type Contract = CommercialContractView['revisions'][number];
export type Line = Contract['document']['lines'][number];
export type DraftLine = Pick<Line, 'category' | 'sourceId' | 'sourceRevisionId' | 'quantity'> & {
  name: string;
};

export const message = (e: unknown): string => {
  if (e && typeof e === 'object') {
    const errorWithDetails = e as { details?: { message?: string }[]; message?: string };
    if (Array.isArray(errorWithDetails.details) && errorWithDetails.details.length > 0) {
      const messages = errorWithDetails.details
        .map((d) => d.message)
        .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
      if (messages.length > 0) {
        return messages.join('. ');
      }
    }
    if (
      typeof errorWithDetails.message === 'string' &&
      errorWithDetails.message.trim().length > 0
    ) {
      return errorWithDetails.message;
    }
  }
  return e instanceof Error ? e.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
};

export const money = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

export function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { tokens } = useWeddingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor: tokens.primary, opacity: disabled ? 0.45 : 1 }]}
    >
      <Text style={{ color: tokens.onPrimary }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const { tokens } = useWeddingTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: tokens.text }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={[styles.input, { color: tokens.text, borderColor: tokens.rule }]}
      />
    </View>
  );
}

export function Panel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const { tokens } = useWeddingTheme();
  return (
    <View style={[styles.panel, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: tokens.primary }}>{title}</Text>
      {children}
    </View>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  const { tokens } = useWeddingTheme();
  return error ? (
    <Text accessibilityRole="alert" style={{ color: tokens.tagWarmText }}>
      {error}
    </Text>
  ) : null;
}

// Preserve the exact key and payload fingerprint across unknown outcomes and restarts.
export function useMutation(session: V0CommonProps['session']) {
  const snapshot = session?.snapshot();
  const accountId =
    snapshot?.status === 'authenticated'
      ? ((snapshot as { actor?: { accountId?: string }; session?: { accountId?: string } }).actor
          ?.accountId ??
        (snapshot as { actor?: { accountId?: string }; session?: { accountId?: string } }).session
          ?.accountId ??
        null)
      : null;
  const intents = useMemo(() => (accountId ? createBillingIntents(accountId) : null), [accountId]);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async <T,>(
    scope: string,
    body: object,
    operation: (key: string) => Promise<T>,
  ): Promise<boolean> => {
    if (busy.current || !intents) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await intents.run(scope, body, (key) => operation(key));
      sharedResourceStore.invalidate(`booking:${scope.split(':')[0]}:`);
      toast.success('Đã cập nhật.');
      return true;
    } catch (e) {
      setError(message(e));
      reportError(e);
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return { run, pending, error };
}
