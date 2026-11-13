import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { HyText as Text } from '@/components/hy-ui';
import { createExperienceGateway } from '@/features/identity-access/experience-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import { createProposalGateway } from '@/features/booking-lifecycle/proposal-api';
import { createNotificationGateway } from '@/features/notifications/notification-api';
import { connectWorkspaceRealtime } from '@/features/couple-workspace/realtime';
import { defaultBooking, phaseLabel } from '@/features/couple-workspace/policies';
import type { NotificationTarget } from '@/features/couple-workspace/notification-policies';
import { confirmModal } from '@/lib/confirm';
import { hy } from '@/theme';
import { NativeAccountSettings } from '../native-account-settings';
import type { WorkspaceEntryScreen } from './workspace-types';
import { WorkspaceNavigation } from './workspace-navigation';
import { WorkspaceOverview } from './workspace-overview';
import { WorkspaceAgreement } from './workspace-agreement';
import { WorkspacePayment } from './workspace-payment';
import { WorkspacePrepare } from './workspace-prepare';
import { WorkspaceSettlement } from './workspace-settlement';
import { WorkspaceNotifications } from './workspace-notifications';
import {
  Action,
  Notice,
  Page,
  ReadState,
  s,
  useRead,
  type Booking,
  type Destination,
  type WorkspaceProps,
} from './workspace-common';

const experience = createExperienceGateway();
const proposalApi = createProposalGateway();
const notifications = createNotificationGateway();
type Detail = NonNullable<Parameters<WorkspaceProps['navigate']>[1]>;
export function initialWorkspaceTarget(
  screen?: WorkspaceEntryScreen,
): { destination: Destination } & Detail {
  if (screen === 'account' || screen === 'sessions') return { destination: 'profile' };
  if (screen === 'notifications') return { destination: 'notifications' };
  if (screen === 'payments' || screen === 'finance' || screen === 'billing')
    return { destination: 'payment' };
  if (screen === 'incidentals' || screen === 'invoices') return { destination: 'settlement' };
  if (screen === 'contracts') return { destination: 'agreement', agreementStep: 'contract' };
  if (screen === 'schedule' || screen === 'plan')
    return { destination: 'agreement', agreementStep: 'timeline' };
  if (screen === 'appendices') return { destination: 'prepare', prepareSection: 'appendix' };
  if (screen === 'seating') return { destination: 'prepare', prepareSection: 'seating' };
  if (
    screen === 'invite' ||
    screen === 'edit' ||
    screen === 'share' ||
    screen === 'media' ||
    screen === 'print'
  )
    return { destination: 'prepare', prepareSection: 'invitation' };
  if (screen === 'prepare' || screen === 'guests')
    return { destination: 'prepare', prepareSection: 'groups' };
  return { destination: 'overview' };
}

export function CoupleWorkspace({
  session,
  onLogout,
  initialBookingId,
  initialScreen,
  initialAttemptId,
}: {
  session: AndroidIdentitySession;
  onLogout: () => void;
  initialBookingId?: string | undefined;
  initialScreen?: WorkspaceEntryScreen | undefined;
  initialAttemptId?: string | undefined;
}) {
  const [revision, setRevision] = useState(0);
  const [badgeRevision, setBadgeRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialBookingId ?? null);
  const [destination, setDestination] = useState<Destination>(
    () => initialWorkspaceTarget(initialScreen).destination,
  );
  const [detail, setDetail] = useState<Detail>(() => initialWorkspaceTarget(initialScreen));
  const [picker, setPicker] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const [entry, setEntry] = useState({ initialScreen, initialBookingId, initialAttemptId });
  if (
    entry.initialScreen !== initialScreen ||
    entry.initialBookingId !== initialBookingId ||
    entry.initialAttemptId !== initialAttemptId
  ) {
    setEntry({ initialScreen, initialBookingId, initialAttemptId });
    const target = initialWorkspaceTarget(initialScreen);
    setDestination(target.destination);
    setDetail(target);
    if (initialBookingId) setSelectedId(initialBookingId);
  }
  const reloadBadge = useCallback(() => setBadgeRevision((value) => value + 1), []);
  const loadBookings = useCallback(async () => {
    let page = await session.authorize((token) => experience.overview(token));
    const items = [...page.data];
    const seen = new Set<string>();
    while (page.nextCursor) {
      if (seen.has(page.nextCursor)) throw new Error('Chưa tải đầy đủ danh sách tiệc.');
      seen.add(page.nextCursor);
      const cursor = page.nextCursor;
      page = await session.authorize((token) => experience.overview(token, cursor));
      items.push(...page.data);
    }
    return items;
  }, [session]);
  const bookings = useRead(loadBookings, revision);
  const loadBadge = useCallback(
    () => session.authorize((token) => notifications.countUnread(token)),
    [session],
  );
  const badge = useRead(loadBadge, `${revision}:${badgeRevision}`);
  const booking =
    bookings.data?.find((item) => item.bookingId === selectedId) ??
    defaultBooking(bookings.data ?? []);
  const bookingId = booking?.bookingId ?? null;
  useEffect(
    () => connectWorkspaceRealtime(session, bookingId, refresh),
    [session, bookingId, refresh],
  );
  const navigate = useCallback((next: Destination, nextDetail?: Detail) => {
    setDestination(next);
    if (nextDetail) setDetail((old) => ({ ...old, ...nextDetail }));
  }, []);
  const openBooking = (id: string, target: NotificationTarget) => {
    if (!bookings.data?.some((item) => item.bookingId === id)) {
      setNotice(
        'Bạn hiện không có quyền xem tiệc trong thông báo này. Hãy tải lại danh sách tiệc hoặc liên hệ nhà hàng.',
      );
      return;
    }
    setNotice(null);
    setSelectedId(id);
    setDetail(target);
    setDestination(target.destination);
  };
  const profile = (
    <Page title="Hồ sơ tài khoản">
      <NativeAccountSettings
        session={session}
        onSignedOut={onLogout}
        showSessions={false}
        embedded
      />
      <Action
        label="Đăng xuất"
        secondary
        onPress={() =>
          void confirmModal
            .confirm({
              title: 'Đăng xuất?',
              message: 'Bạn sẽ cần đăng nhập lại để tiếp tục chuẩn bị tiệc.',
              confirmText: 'Đăng xuất',
              cancelText: 'Ở lại',
            })
            .then((agreed) => {
              if (agreed) onLogout();
            })
        }
      />
    </Page>
  );
  return (
    <WorkspaceNavigation
      destination={destination}
      phase={booking?.phase}
      navigate={navigate}
      canSwitch={(bookings.data?.length ?? 0) > 1}
      onSwitchBooking={() => setPicker(true)}
      unreadCount={badge.data ?? 0}
    >
      {notice && <Notice error>{notice}</Notice>}
      {bookings.error && booking && <Notice error>{bookings.error}</Notice>}
      {booking && (
        <View
          style={[
            s.flex,
            (destination === 'profile' || destination === 'notifications') && { display: 'none' },
          ]}
        >
          <BookingWorkspace
            key={booking.bookingId}
            session={session}
            booking={booking}
            revision={revision}
            refresh={refresh}
            navigate={navigate}
            destination={destination}
            detail={detail}
            onDetailChange={setDetail}
            initialAttemptId={initialAttemptId}
            contextReady={!bookings.loading && !bookings.error}
          />
        </View>
      )}
      {destination === 'profile' ? (
        profile
      ) : destination === 'notifications' ? (
        <WorkspaceNotifications
          session={session}
          revision={revision}
          onOpenBooking={openBooking}
          onUnreadChanged={reloadBadge}
        />
      ) : (
        !booking && (
          <Page title="Không gian của hai bạn">
            <ReadState state={bookings} />
            {!bookings.loading && !bookings.error && (
              <>
                <Notice>
                  Tài khoản này chưa có thông tin tiệc. Thông tin sẽ xuất hiện khi nhà hàng cấp
                  quyền xem tiệc cho hai bạn.
                </Notice>
                <Action label="Cập nhật danh sách tiệc" secondary onPress={bookings.reload} />
              </>
            )}
            <Action label="Mở hồ sơ tài khoản" secondary onPress={() => navigate('profile')} />
          </Page>
        )
      )}
      <Modal
        transparent
        visible={picker}
        animationType="slide"
        onRequestClose={() => setPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: hy.scrim }}>
          <View style={{ backgroundColor: hy.canvas, maxHeight: '85%', padding: 20, gap: 12 }}>
            <Text accessibilityRole="header" style={s.heading}>
              Đổi tiệc đang xem
            </Text>
            <ScrollView>
              {bookings.data?.map((item) => (
                <Pressable
                  key={item.bookingId}
                  accessibilityRole="button"
                  accessibilityLabel={`Chọn tiệc ${item.alias || item.hallName} ngày ${item.eventDate}`}
                  onPress={() => {
                    setSelectedId(item.bookingId);
                    setPicker(false);
                    setNotice(null);
                  }}
                  style={s.item}
                >
                  <Text style={s.heading}>
                    {item.alias ||
                      (item.brideName && item.groomName
                        ? `${item.brideName} & ${item.groomName}`
                        : item.hallName)}
                  </Text>
                  <Text style={s.muted}>
                    {item.eventDate} · {item.hallName} · {phaseLabel(item.phase)}
                    {item.bookingId === bookingId ? ' · Đang xem' : ''}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Action label="Đóng danh sách tiệc" secondary onPress={() => setPicker(false)} />
          </View>
        </View>
      </Modal>
    </WorkspaceNavigation>
  );
}

function BookingWorkspace({
  session,
  booking,
  revision,
  refresh,
  navigate,
  destination,
  detail,
  onDetailChange,
  initialAttemptId,
  contextReady,
}: {
  session: AndroidIdentitySession;
  booking: Booking;
  revision: number;
  refresh: () => void;
  navigate: WorkspaceProps['navigate'];
  destination: Destination;
  detail: Detail;
  onDetailChange: (detail: Detail) => void;
  initialAttemptId?: string | undefined;
  contextReady: boolean;
}) {
  const load = useCallback(
    () => session.authorize((token) => proposalApi.loadProposal(token, booking.bookingId)),
    [session, booking.bookingId],
  );
  const state = useRead(load, revision);
  const [visited, setVisited] = useState<ReadonlySet<Destination>>(() => new Set([destination]));
  if (!visited.has(destination)) setVisited(new Set([...visited, destination]));
  const props: WorkspaceProps = {
    session,
    booking,
    proposal: state.data,
    revision,
    refresh,
    navigate,
    contextReady: contextReady && !state.loading && !state.error,
  };
  if (!state.data)
    return (
      <Page title="Thông tin tiệc">
        <ReadState state={state} />
        <Action
          label="Cập nhật hồ sơ tiệc"
          onPress={() => {
            state.reload();
            refresh();
          }}
          secondary
        />
      </Page>
    );
  return (
    <View style={s.flex}>
      {state.error && <Notice error>{state.error}</Notice>}
      {(visited.has('overview') || destination === 'overview') && (
        <View style={[s.flex, destination !== 'overview' && { display: 'none' }]}>
          <WorkspaceOverview {...props} />
        </View>
      )}
      {(visited.has('agreement') || destination === 'agreement') && (
        <View style={[s.flex, destination !== 'agreement' && { display: 'none' }]}>
          <WorkspaceAgreement
            {...props}
            step={detail.agreementStep ?? 'timeline'}
            onStepChange={(step) => onDetailChange({ ...detail, agreementStep: step })}
          />
        </View>
      )}
      {(visited.has('payment') || destination === 'payment') && (
        <View style={[s.flex, destination !== 'payment' && { display: 'none' }]}>
          <WorkspacePayment {...props} initialAttemptId={initialAttemptId} />
        </View>
      )}
      {(visited.has('prepare') || destination === 'prepare') && (
        <View style={[s.flex, destination !== 'prepare' && { display: 'none' }]}>
          <WorkspacePrepare
            {...props}
            section={detail.prepareSection ?? 'groups'}
            onSectionChange={(section) => onDetailChange({ ...detail, prepareSection: section })}
          />
        </View>
      )}
      {(visited.has('settlement') || destination === 'settlement') && (
        <View style={[s.flex, destination !== 'settlement' && { display: 'none' }]}>
          <WorkspaceSettlement {...props} />
        </View>
      )}
    </View>
  );
}
