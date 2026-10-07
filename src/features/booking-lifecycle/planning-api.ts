import { createApiClient, type ApiClient } from '@/lib/api/client';

export type ConfirmedPlanningSnapshot = Readonly<{
  bookingId: string;
  phase: 'CONFIRMED' | 'COMPLETED';
  revision: number;
  eventDate: string;
  planningHeadcount: number;
  hallName: string;
  shift: Readonly<{ startTime: string; endTime: string }>;
  timelineRevision: number | null;
  timeline: readonly Readonly<{
    itemId: string;
    startTime: string;
    title: string;
    description: string | null;
  }>[];
}>;

export type PlanningResult =
  | Readonly<{ status: 'confirmed'; snapshot: ConfirmedPlanningSnapshot }>
  | Readonly<{ status: 'not-confirmed'; snapshot: null }>;

export interface PlanningGateway {
  loadConfirmed(accessToken: string, bookingId: string): Promise<PlanningResult>;
}

type ProposalPayload = Readonly<{
  bookingId: string;
  phase: string;
  revision: number;
  eventDate: string;
  planningHeadcount: number;
  proposal: Readonly<{
    hall: Readonly<{ name: string }>;
    shift: Readonly<{ startTime: string; endTime: string }>;
  }>;
  timeline: null | Readonly<{
    revisionNumber: number;
    items: readonly Readonly<{
      itemId: string;
      startTime: string;
      title: string;
      description: string | null;
    }>[];
  }>;
}>;

function readPayload(value: unknown): ProposalPayload {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('bookingId' in value) ||
    !('phase' in value) ||
    !('proposal' in value)
  ) {
    throw new Error('The planning response is malformed.');
  }
  return value as ProposalPayload;
}

export function createPlanningGateway(client?: ApiClient): PlanningGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  return {
    async loadConfirmed(accessToken, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/proposal', {
        params: { path: { bookingId } },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (data === undefined) throw new Error('The planning response did not include data.');
      const value = readPayload(data.data);
      if (value.phase !== 'CONFIRMED' && value.phase !== 'COMPLETED') {
        return { status: 'not-confirmed', snapshot: null };
      }
      return {
        status: 'confirmed',
        snapshot: {
          bookingId: value.bookingId,
          phase: value.phase,
          revision: value.revision,
          eventDate: value.eventDate,
          planningHeadcount: value.planningHeadcount,
          hallName: value.proposal.hall.name,
          shift: value.proposal.shift,
          timelineRevision: value.timeline?.revisionNumber ?? null,
          timeline: value.timeline?.items ?? [],
        },
      };
    },
  };
}
