/** Historical view shapes from the previous pinned contract. Not live API contracts. */
export type GuestItem = Readonly<{
  bookingId: string;
  guestGroupId: string;
  guestId: string;
  name: string;
  operationalNote: string | null;
  phone: string | null;
  revision: number;
  status: 'ACTIVE' | 'ARCHIVED';
}>;

export type NamedGuestView = Readonly<{
  items: readonly GuestItem[];
  nextCursor: string | null;
  sourceSequence: number;
}>;

export type PersonalInvitationLinkView = Readonly<{
  credential: string;
  credentialId: string;
  expiresAt: string;
  fragment: string;
  revision: number;
}>;

export function retiredGuestOperation(): never {
  throw new Error(
    'Danh sách khách mời và check-in đã ngừng sử dụng. Vui lòng dùng quy mô và nhóm khách.',
  );
}
