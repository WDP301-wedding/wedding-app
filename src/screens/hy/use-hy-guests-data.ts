import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCoupleBillingGateway } from '@/features/payments-billing/billing-api';
import { createRestoredFlowsGateway } from '@/features/restored-flows/restored-flows-api';
import type { V0CommonProps } from '../v0/v0-types';
import { useHyResource } from './use-hy-resource';
import {
  normalize,
  type Guest,
  type Group,
  type AttendanceSummary,
  type GuestPlan,
} from './hy-guest-types';

const billing = createCoupleBillingGateway();
const api = createRestoredFlowsGateway();

export function useHyGuestsData({
  session,
  activeBooking,
  facts,
}: Pick<V0CommonProps, 'session' | 'activeBooking' | 'facts'>) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [additionalGuests, setAdditionalGuests] = useState<Guest[]>([]);
  const [loadingAdditional, setLoadingAdditional] = useState(false);
  const paginationRequestIdRef = useRef(0);

  const bookingId = activeBooking?.bookingId;

  // Primary loader: critical path for guest list
  const loader = useCallback(async () => {
    if (!session || !bookingId) throw new Error('Chưa chọn tiệc cưới.');
    setAdditionalGuests([]);
    const [groupsRes, firstRes] = await Promise.allSettled([
      session.authorize((t) => billing.loadGuestGroups(t, bookingId)),
      session.authorize((t) => billing.loadGuests(t, bookingId)),
    ]);

    if (groupsRes.status === 'rejected') throw groupsRes.reason;
    if (firstRes.status === 'rejected') throw firstRes.reason;

    return {
      groups: groupsRes.value,
      guests: firstRes.value.items,
      nextCursor: firstRes.value.nextCursor ?? null,
      sourceSequence: firstRes.value.sourceSequence,
    };
  }, [session, bookingId]);

  const { data, error, loading, reload } = useHyResource(loader, {
    key: bookingId ? `booking:${bookingId}:guests-data` : undefined,
    ttlMs: 60_000,
  });

  // Secondary non-blocking aux loader
  const auxLoader = useCallback(async () => {
    if (!session || !bookingId) return null;
    const [attendanceRes, guestPlanRes] = await Promise.allSettled([
      session.authorize((t) => api.attendanceSummary(t, bookingId)),
      billing.loadGuestPlan
        ? session.authorize((t) => billing.loadGuestPlan!(t, bookingId)).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      attendance:
        attendanceRes.status === 'fulfilled' ? (attendanceRes.value as AttendanceSummary) : null,
      guestPlan: guestPlanRes.status === 'fulfilled' ? (guestPlanRes.value as GuestPlan) : null,
    };
  }, [session, bookingId]);

  const {
    data: auxData,
    loading: auxLoading,
    reload: reloadAux,
  } = useHyResource(auxLoader, {
    key: bookingId ? `booking:${bookingId}:guests-aux` : undefined,
    ttlMs: 60_000,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([reload(), reloadAux()]);
  }, [reload, reloadAux]);

  // Background progressive pagination for remaining guests
  useEffect(() => {
    if (!data?.nextCursor || !session || !bookingId) return;

    let active = true;
    const reqId = ++paginationRequestIdRef.current;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoadingAdditional(true);
      let cursor: string | null = data.nextCursor;
      const seen = new Set<string>();
      const accumulated: Guest[] = [];

      try {
        while (cursor && active && reqId === paginationRequestIdRef.current) {
          if (seen.has(cursor)) break;
          seen.add(cursor);
          const page = await session.authorize((t) => billing.loadGuests(t, bookingId, cursor!));
          if (page.sourceSequence !== data.sourceSequence) {
            if (active) void reload(true);
            return;
          }
          accumulated.push(...page.items);
          if (active && reqId === paginationRequestIdRef.current) {
            setAdditionalGuests([...accumulated]);
          }
          cursor = page.nextCursor ?? null;
        }
      } catch {
        // Non-blocking background pagination failure
      } finally {
        if (active && reqId === paginationRequestIdRef.current) {
          setLoadingAdditional(false);
        }
      }
    })();

    return () => {
      active = false;
      paginationRequestIdRef.current += 1;
    };
  }, [data?.nextCursor, data?.sourceSequence, session, bookingId, reload]);

  const allRawGuests = useMemo(
    () => [...(data?.guests ?? []), ...additionalGuests],
    [data?.guests, additionalGuests],
  );

  const guests = useMemo(() => allRawGuests.filter((g) => g.status === 'ACTIVE'), [allRawGuests]);
  const groups = useMemo(
    () => (data?.groups.filter((g) => g.status === 'ACTIVE') ?? []) as Group[],
    [data?.groups],
  );
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.guestGroupId, g])), [groups]);

  const currentHeadcount = auxData?.guestPlan?.planningHeadcount ?? facts.planningHeadcount ?? 0;

  const normalizedSearch = useMemo(() => normalize(search.trim()), [search]);
  const filtered = useMemo(() => {
    if (!normalizedSearch && !group) return guests;
    return guests.filter((g) => {
      if (group && g.guestGroupId !== group) return false;
      if (!normalizedSearch) return true;
      return normalize(g.name).includes(normalizedSearch);
    });
  }, [guests, group, normalizedSearch]);

  return {
    bookingId,
    data,
    loading,
    error,
    reload,
    auxData,
    auxLoading,
    reloadAux,
    handleRefresh,
    loadingAdditional,
    guests,
    groups,
    groupMap,
    currentHeadcount,
    search,
    setSearch,
    group,
    setGroup,
    filtered,
  };
}
