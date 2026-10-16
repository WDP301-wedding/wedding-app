import { HyText as Text, HyButton } from '@/components/hy-ui';
import '@/lib/alert';
import { useAppInsets } from '@/lib/safe-area';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import {
  createExperienceGateway,
  type Overview,
  type Profile,
} from '@/features/identity-access/experience-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';
import {
  createPlanningGateway,
  type ConfirmedPlanningSnapshot,
} from '@/features/booking-lifecycle/planning-api';
import { ApiClientError } from '@/lib/api/client';
import { useWeddingTheme, type as typeTokens } from '@/theme';
import { styles } from './home.styles';
import { createAppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { V0CompanionShell } from './v0/v0-companion-shell';
import type { V0EventFacts, V0Screen } from './v0/v0-types';

const type = typeTokens;

export function deriveInitials(
  bride?: string,
  groom?: string,
  displayName?: string | null,
): string {
  const b = bride?.trim();
  const g = groom?.trim();
  if (b && g) {
    return `${b.charAt(0)}${g.charAt(0)}`.toUpperCase();
  }
  const d = displayName?.trim();
  if (d) {
    const parts = d.split(/\s+/).filter(Boolean);
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (first && last && parts.length >= 2) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return d.slice(0, 2).toUpperCase();
  }
  return 'CD';
}

const experience = createExperienceGateway();
const planning = createPlanningGateway();
const invitation = createAppInvitationGateway();
const billing = createCoupleBillingGateway();

function ActionButton({
  label,
  action,
  disabled,
}: {
  readonly label: string;
  readonly action: () => void;
  readonly disabled?: boolean;
}) {
  return <HyButton label={label} onPress={action} disabled={disabled ?? false} variant="outline" />;
}

export function CoupleOverviewScreen({
  session,
  onLogout,
  initialBookingId,
  initialScreen,
}: Readonly<{
  session: AndroidIdentitySession;
  onLogout: () => void;
  initialBookingId?: string | undefined;
  initialScreen?: V0Screen | undefined;
}>) {
  const { brand, colors } = useWeddingTheme();
  const insets = useAppInsets();
  const [view, setView] = useState<'selector' | 'overview' | 'account'>('selector');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [plan, setPlan] = useState<ConfirmedPlanningSnapshot | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canonicalBride, setCanonicalBride] = useState<string>('');
  const [canonicalGroom, setCanonicalGroom] = useState<string>('');
  const [venueName, setVenueName] = useState<string>('Chưa cung cấp');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const currentBookingRequestIdRef = useRef(0);

  const load = useCallback(
    async (cursor?: string) => {
      setPending(true);
      setError(null);
      try {
        const [page, prof, restaurant] = await Promise.all([
          session.authorize((token) => experience.overview(token, cursor)),
          session.authorize((token) => experience.profile(token)).catch(() => null),
          invitation.getRestaurantCatalog().catch(() => null),
        ]);
        setOverview((old) =>
          cursor && old ? { ...page, data: [...old.data, ...page.data] } : page,
        );
        if (prof) setProfile(prof);
        if (restaurant?.displayName) setVenueName(restaurant.displayName);
        setLastRefreshedAt(new Date());
      } catch (caught) {
        if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
          setOverview(null);
          setPlan(null);
        }
        setError('Chưa tải được kế hoạch. Kiểm tra kết nối và thử lại.');
      } finally {
        setPending(false);
      }
    },
    [session],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const open = useCallback(
    async (id: string) => {
      currentBookingRequestIdRef.current += 1;
      const reqId = currentBookingRequestIdRef.current;
      setPending(true);
      setError(null);
      try {
        const result = await session.authorize((token) => planning.loadConfirmed(token, id));
        if (reqId !== currentBookingRequestIdRef.current) return;
        if (result.status === 'confirmed') {
          setPlan(result.snapshot);
          // Load canonical couple names from consultation profile, contract snapshot, or invitation designs
          try {
            const consultationId = result.snapshot.consultationId;
            if (consultationId && typeof experience.coupleProfile === 'function') {
              const cProfile = await session
                .authorize((token) => experience.coupleProfile(token, consultationId))
                .catch(() => null);
              if (reqId !== currentBookingRequestIdRef.current) return;
              if (cProfile?.brideName) setCanonicalBride(cProfile.brideName.trim());
              if (cProfile?.groomName) setCanonicalGroom(cProfile.groomName.trim());
            }

            if (typeof billing.loadContracts === 'function') {
              const contracts = await session
                .authorize((token) => billing.loadContracts(token, id))
                .catch(() => null);
              if (reqId !== currentBookingRequestIdRef.current) return;
              const latestContract = contracts?.revisions?.[0]?.document;
              if (latestContract) {
                if (latestContract.brideName) setCanonicalBride(latestContract.brideName.trim());
                if (latestContract.groomName) setCanonicalGroom(latestContract.groomName.trim());
                if (latestContract.restaurantName)
                  setVenueName(latestContract.restaurantName.trim());
              }
            }

            if (typeof invitation.listDesigns === 'function') {
              const designs = await session
                .authorize((token) => invitation.listDesigns(token, id))
                .catch(() => []);
              if (reqId !== currentBookingRequestIdRef.current) return;
              const firstDesign = designs[0];
              if (firstDesign?.textFields) {
                if (firstDesign.textFields.brideName)
                  setCanonicalBride((prev) => prev || firstDesign.textFields.brideName!.trim());
                if (firstDesign.textFields.groomName)
                  setCanonicalGroom((prev) => prev || firstDesign.textFields.groomName!.trim());
              }
            }
          } catch {
            // Non-blocking fallback
          }
        } else {
          setPlan(null);
          setError('Kế hoạch chưa sẵn sàng trên ứng dụng. Hãy tiếp tục trên Web.');
        }
      } catch {
        if (reqId === currentBookingRequestIdRef.current) {
          setPlan(null);
          setError('Không tải được kế hoạch. Hãy kiểm tra quyền truy cập và thử lại.');
        }
      } finally {
        if (reqId === currentBookingRequestIdRef.current) {
          setPending(false);
        }
      }
    },
    [session],
  );

  useEffect(() => {
    if (!initialBookingId) return;
    const timer = setTimeout(() => void open(initialBookingId), 0);
    return () => clearTimeout(timer);
  }, [initialBookingId, open]);

  const handleSwitchBooking = useCallback(() => {
    currentBookingRequestIdRef.current += 1;
    setPlan(null);
    setView('selector');
    setCanonicalBride('');
    setCanonicalGroom('');
    setError(null);
    void load();
  }, [load]);

  const handleSelectBooking = useCallback(() => {
    setError(null);
    if (plan) {
      setView('overview');
      return;
    }
    const firstBooking = overview?.data?.[0];
    if (firstBooking) {
      void open(firstBooking.bookingId);
      return;
    }
    void load();
  }, [plan, overview, open, load]);

  const brideName = canonicalBride;
  const groomName = canonicalGroom;
  const coupleDisplay =
    brideName && groomName
      ? `${brideName} & ${groomName}`
      : profile?.displayName || 'Chưa cung cấp';

  const currentFacts: V0EventFacts = plan
    ? {
        brideName,
        groomName,
        coupleDisplay,
        eventDate: plan.eventDate,
        formattedDate: new Date(`${plan.eventDate}T00:00:00+07:00`).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        venueName: venueName || 'Chưa cung cấp',
        hallName: plan.hallName,
        shiftTime: `${plan.shift.startTime}–${plan.shift.endTime}`,
        planningHeadcount: plan.planningHeadcount,
        revisionNumber: plan.revision,
      }
    : {
        brideName: '',
        groomName: '',
        coupleDisplay,
        eventDate: '',
        formattedDate: 'Chưa cung cấp',
        venueName: venueName || 'Chưa cung cấp',
        hallName: 'Chưa cung cấp',
        shiftTime: 'Chưa cung cấp',
        planningHeadcount: 0,
        revisionNumber: 0,
      };

  // Render V0 companion shell as the primary native experience once a confirmed booking is loaded
  // or when explicitly entering overview / account from the top menu
  if (plan || view === 'overview' || view === 'account') {
    return (
      <V0CompanionShell
        facts={currentFacts}
        initialScreen={view === 'account' ? 'account' : (initialScreen ?? 'overview')}
        session={session}
        profile={profile}
        activeBooking={plan}
        allBookings={overview?.data ?? []}
        onSelectBooking={(bId) => void open(bId)}
        invitationGateway={invitation}
        onLogout={onLogout}
        onSwitchBooking={handleSwitchBooking}
      />
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <View style={styles.topBar}>
        <Text style={[type.largeTitle, { color: brand.primary }]}>Hỷ Yến</Text>
        <ActionButton label="Đăng xuất" action={onLogout} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 16 }}>
        <ActionButton
          label={plan ? 'Vào tiệc' : 'Chọn tiệc'}
          action={handleSelectBooking}
          disabled={pending}
        />
        <ActionButton
          label="Tài khoản"
          action={() => {
            setView('account');
            setError(null);
          }}
        />
      </View>

      <>
        <View style={[styles.planningHero, { backgroundColor: brand.primary }]}>
          <Text style={[styles.countdownEyebrow, { color: brand.goldSoft }]}>
            HÀNH TRÌNH CỦA HAI BẠN
          </Text>
          <Text style={[type.largeTitle, { color: brand.primaryText }]}>
            Cùng chuẩn bị ngày chung đôi
          </Text>
          <Text style={[type.body, { color: brand.primaryText }]}>
            Thông tin đã được nhà hàng xác nhận, luôn sẵn sàng để hai bạn theo dõi.
          </Text>
        </View>
        {pending && <ActivityIndicator accessibilityLabel="Đang tải" color={brand.primary} />}
        {error && (
          <View style={styles.planningNotice}>
            <Text accessibilityRole="alert" style={[type.body, { color: brand.script }]}>
              {error}
            </Text>
            <ActionButton label="Thử lại" action={() => void load()} />
          </View>
        )}
        {!overview && !pending && !error && (
          <ActionButton label="Tải kế hoạch" action={() => void load()} />
        )}
        {overview?.data.length === 0 && (
          <View style={styles.planningNotice}>
            <Text style={[type.title, { color: brand.display }]}>Chưa có kế hoạch đã xác nhận</Text>
            <Text style={[type.body, { color: colors.secondaryLabel }]}>
              Sau khi tiền cọc được xác nhận, kế hoạch sẽ xuất hiện tại đây. Bạn có thể tiếp tục
              trao đổi với nhà hàng trên Web.
            </Text>
            {lastRefreshedAt && (
              <Text style={[type.caption, { color: brand.script, marginTop: 4 }]}>
                Đã kiểm tra lúc{' '}
                {lastRefreshedAt.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}{' '}
                · Chưa có tiệc nào ở trạng thái đã xác nhận cọc
              </Text>
            )}
          </View>
        )}
        {overview?.data.map((item) => (
          <View
            key={item.bookingId}
            style={[
              styles.planningNotice,
              { borderColor: brand.gold, backgroundColor: brand.powder },
            ]}
          >
            <Text style={[type.caption, { color: brand.script }]}>
              {item.phase === 'COMPLETED' ? 'ĐÃ HOÀN THÀNH' : 'ĐÃ XÁC NHẬN'}
            </Text>
            <Text style={[type.title, { color: brand.display }]}>{item.hallName}</Text>
            <Text style={[type.body, { color: colors.label }]}>
              {new Date(`${item.eventDate}T00:00:00+07:00`).toLocaleDateString('vi-VN')} ·{' '}
              {item.shiftCode === 'LUNCH' ? 'Tiệc trưa' : 'Tiệc tối'} · {item.planningHeadcount}{' '}
              khách
            </Text>
            <Text style={[type.subhead, { color: colors.secondaryLabel }]}>
              {!item.hasTimeline
                ? 'Kịch bản đang được chuẩn bị'
                : item.coupleApproved && item.managerApproved
                  ? 'Kịch bản đã được hai bên thống nhất'
                  : 'Kịch bản cần được thống nhất'}
            </Text>
            <ActionButton
              label="Xem kế hoạch"
              action={() => void open(item.bookingId)}
              disabled={pending}
            />
          </View>
        ))}
        {overview?.nextCursor && (
          <ActionButton label="Xem thêm kế hoạch" action={() => void load(overview.nextCursor!)} />
        )}
        {overview && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <ActionButton
              label={pending ? 'Đang cập nhật...' : 'Cập nhật tổng quan'}
              action={() => void load()}
              disabled={pending}
            />
            {lastRefreshedAt && overview.data.length > 0 && (
              <Text style={[type.caption, { color: colors.secondaryLabel }]}>
                Cập nhật lần cuối:{' '}
                {lastRefreshedAt.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Text>
            )}
          </View>
        )}
      </>
    </ScrollView>
  );
}

export { NativeAccountSettings } from './native-account-settings';
