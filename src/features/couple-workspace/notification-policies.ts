export type NotificationTarget = Readonly<{
  destination: 'overview' | 'agreement' | 'payment' | 'prepare' | 'settlement';
  prepareSection?: 'groups' | 'seating' | 'invitation' | 'appendix';
  agreementStep?: 'timeline' | 'contract';
}>;
export function notificationTarget(
  purpose: string,
  bookingId: string | null,
): NotificationTarget | null {
  if (!bookingId) return null;
  switch (purpose) {
    case 'CONTRACT':
    case 'DEPOSIT_ELIGIBLE':
      return { destination: 'agreement', agreementStep: 'contract' };
    case 'TIMELINE_REVIEW':
    case 'TIMELINE_CHANGED':
      return { destination: 'agreement', agreementStep: 'timeline' };
    case 'APPENDIX':
      return { destination: 'prepare', prepareSection: 'appendix' };
    case 'PRINT':
    case 'PUBLICATION_CHANGED':
    case 'MEDIA_CUTOFF':
      return { destination: 'prepare', prepareSection: 'invitation' };
    case 'GUEST_PLAN':
    case 'GUEST_INVITATION':
      return { destination: 'prepare', prepareSection: 'groups' };
    case 'PAYMENT':
    case 'REFUND':
      return { destination: 'payment' };
    case 'FINAL_INVOICE':
    case 'COMPLETION_NOTICE':
      return { destination: 'settlement' };
    default:
      return { destination: 'overview' };
  }
}
export const readableNotificationMessage = (value: string) =>
  value.replace(/\s*Mã tham chiếu:\s*[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.?/gi, '').trim();
