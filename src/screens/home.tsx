import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import type {
  AndroidIdentitySession,
  AndroidSessionSnapshot,
} from '@/features/identity-access/session';
import { sharedDeviceSession } from '@/features/identity-access/device-session';
import { IdentityScreen } from './identity-screen';
import { CoupleWorkspace } from './workspace/couple-workspace';
import { Action, Notice, Page, workspaceMessage } from './workspace/workspace-common';
import type { WorkspaceEntryScreen } from './workspace/workspace-types';

export { IdentityScreen };
export function HomeScreen({
  initialResetToken,
  initialBookingId,
  initialScreen,
  initialAttemptId,
  initialMode = 'login',
  session = sharedDeviceSession,
}: Readonly<{
  initialResetToken?: string | null;
  initialBookingId?: string | undefined;
  initialScreen?: WorkspaceEntryScreen | undefined;
  initialAttemptId?: string | undefined;
  initialMode?: 'login' | 'reset-request';
  session?: AndroidIdentitySession;
}>) {
  const incomingUrl = Linking.useURL();
  const [snapshot, setSnapshot] = useState<AndroidSessionSnapshot>(() => session.snapshot());
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreNonce, setRestoreNonce] = useState(0);
  const [mode, setMode] = useState<'login' | 'reset-request'>(
    initialResetToken != null ? 'reset-request' : initialMode,
  );
  const [previousSession, setPreviousSession] = useState(session);
  if (previousSession !== session) {
    setPreviousSession(session);
    setSnapshot(session.snapshot());
    setLoading(true);
    setRestoreError(null);
  }
  const [resetInput, setResetInput] = useState({ initialResetToken, incomingUrl });
  if (
    resetInput.initialResetToken !== initialResetToken ||
    resetInput.incomingUrl !== incomingUrl
  ) {
    setResetInput({ initialResetToken, incomingUrl });
    if (
      initialResetToken != null ||
      (incomingUrl && (incomingUrl.includes('/reset') || incomingUrl.includes('#reset')))
    )
      setMode('reset-request');
  }
  useEffect(() => session.subscribe(() => setSnapshot(session.snapshot())), [session]);
  useEffect(() => {
    let active = true;
    void Promise.all([session.restore(), Linking.getInitialURL().catch(() => null)]).then(
      ([value, url]) => {
        if (!active) return;
        setSnapshot(value);
        if (url && (url.includes('/reset') || url.includes('#reset'))) setMode('reset-request');
        setLoading(false);
      },
      (error: unknown) => {
        if (active) {
          setRestoreError(workspaceMessage(error));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [session, restoreNonce]);
  const signOut = () => {
    void session
      .logout()
      .catch(() => {})
      .finally(() => {
        setSnapshot(session.snapshot());
        setMode('login');
        setRestoreError(null);
        setLoading(false);
      });
  };
  if (loading)
    return (
      <Page title="Hỷ Yến">
        <Notice>Đang kiểm tra đăng nhập…</Notice>
      </Page>
    );
  if (restoreError)
    return (
      <Page title="Chưa kiểm tra được đăng nhập">
        <Notice error>{restoreError}</Notice>
        <Action
          label="Thử lại"
          onPress={() => {
            setLoading(true);
            setRestoreError(null);
            setRestoreNonce((value) => value + 1);
          }}
        />
        <Action label="Đăng nhập bằng tài khoản khác" onPress={signOut} secondary />
      </Page>
    );
  if (snapshot.status === 'anonymous' || mode === 'reset-request')
    return (
      <IdentityScreen
        key={mode}
        session={session}
        initialMode={mode}
        onAuthenticated={(next) => {
          setSnapshot(next);
          setMode('login');
        }}
      />
    );
  if (snapshot.access === 'denied')
    return (
      <Page title="Ứng dụng dành cho cặp đôi">
        <Notice error>
          Tài khoản chưa có quyền truy cập. Ứng dụng dành cho cô dâu chú rể; tài khoản nhà hàng vui
          lòng dùng web quản lý.
        </Notice>
        <Action label="Đăng xuất" onPress={signOut} />
      </Page>
    );
  return (
    <CoupleWorkspace
      key={snapshot.actor.accountId}
      session={session}
      onLogout={signOut}
      initialBookingId={initialBookingId}
      initialScreen={initialScreen}
      initialAttemptId={initialAttemptId}
    />
  );
}
