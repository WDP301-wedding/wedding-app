import { openURL } from 'expo-linking';
import { readPublicEnv } from '@/lib/env';

export function prepareWebUrl(bookingId: string, path: string): string {
  const base = readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL;
  if (!base) throw new Error('Chưa cấu hình trang web. Vui lòng liên hệ nhà hàng.');
  const url = new URL(path, base);
  if (url.origin !== new URL(base).origin)
    throw new Error('Đường dẫn không thuộc trang web của ứng dụng.');
  url.searchParams.set('bookingId', bookingId);
  return url.href;
}
export const openWebPrepare = (bookingId: string, path: string) =>
  openURL(prepareWebUrl(bookingId, path));
export const publicInvitationUrl = (slug: string) =>
  new URL(`/t/${encodeURIComponent(slug)}`, readPublicEnv().EXPO_PUBLIC_WEB_PORTAL_URL).href;
export const publicInvitationQrUrl = (slug: string) =>
  `${readPublicEnv().EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '')}/public/invitations/${encodeURIComponent(slug)}/qr`;
const defaultGroupLabels: Readonly<Record<string, string>> = {
  Parents: 'Bố mẹ hai bên',
  'Groom Side': 'Nhà trai',
  'Bride Side': 'Nhà gái',
  Friends: 'Bạn bè',
};
export const groupLabel = (name: string) => defaultGroupLabels[name] ?? name;
