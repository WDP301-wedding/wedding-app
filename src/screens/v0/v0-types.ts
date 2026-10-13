import type { ConfirmedPlanningSnapshot } from '@/features/booking-lifecycle/planning-api';
import type { Profile } from '@/features/identity-access/experience-api';
import type { AppInvitationGateway } from '@/features/invitation-studio/app-invitation-api';
import type { AndroidIdentitySession } from '@/features/identity-access/session';

export type V0Screen =
  | 'overview'
  | 'plan'
  | 'invite'
  | 'account'
  | 'edit'
  | 'share'
  | 'schedule'
  | 'media'
  | 'print'
  | 'guests'
  | 'seating'
  | 'billing';

export interface V0EventFacts {
  readonly brideName: string;
  readonly groomName: string;
  readonly coupleDisplay: string;
  readonly eventDate: string;
  readonly formattedDate: string;
  readonly venueName: string;
  readonly hallName: string;
  readonly shiftTime: string;
  readonly planningHeadcount: number;
  readonly revisionNumber: number;
}

export interface V0CommonProps {
  readonly session?: AndroidIdentitySession | undefined;
  readonly activeBooking?: ConfirmedPlanningSnapshot | null | undefined;
  readonly profile?: Profile | null | undefined;
  readonly facts: V0EventFacts;
  readonly onNavigate: (screen: V0Screen) => void;
  readonly onLogout?: (() => void) | undefined;
  readonly invitationGateway?: AppInvitationGateway | undefined;
  readonly onBack?: (() => void) | undefined;
  readonly onSwitchBooking?: (() => void) | undefined;
}
