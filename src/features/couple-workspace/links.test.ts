import { groupLabel, prepareWebUrl, publicInvitationUrl, publicInvitationQrUrl } from './links';
import { notificationTarget, readableNotificationMessage } from './notification-policies';
it('uses the configured public origin without passing authentication credentials', () => {
  const url = new URL(prepareWebUrl('booking with space', '/khong-gian/chuan-bi/khach?xem=so-do'));
  expect(url.pathname).toBe('/khong-gian/chuan-bi/khach');
  expect(url.searchParams.get('xem')).toBe('so-do');
  expect(url.searchParams.get('bookingId')).toBe('booking with space');
  expect(url.searchParams.has('token')).toBe(false);
  expect(publicInvitationUrl('slug')).toMatch(/\/t\/slug$/);
  expect(publicInvitationQrUrl('slug')).toMatch(/\/public\/invitations\/slug\/qr$/);
  expect(groupLabel('Parents')).toBe('Bố mẹ hai bên');
  expect(groupLabel('Đồng nghiệp')).toBe('Đồng nghiệp');
});
it('maps the source notification destinations and removes technical references from copy', () => {
  expect(notificationTarget('PAYMENT', 'booking')).toEqual({ destination: 'payment' });
  expect(notificationTarget('CONTRACT', null)).toBeNull();
  expect(
    readableNotificationMessage('Hợp đồng. Mã tham chiếu: 00000000-0000-4000-8000-000000000001.'),
  ).toBe('Hợp đồng.');
});
