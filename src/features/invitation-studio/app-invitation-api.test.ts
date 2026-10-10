import { createAppInvitationGateway } from './app-invitation-api';
import type { ApiClient } from '../../lib/api/client';

describe('AppInvitationGateway (IS-W7 Android App Quick Edit)', () => {
  const token = 'app-couple-token';
  const bookingId = '11111111-1111-1111-1111-111111111111';
  const designId = '22222222-2222-2222-2222-222222222222';

  it('lists designs and returns items', async () => {
    const mockClient = {
      GET: jest.fn().mockResolvedValue({
        data: { data: { items: [{ designId, revisionNumber: 1, title: 'Thiệp Mobile' }] } },
      }),
    } as unknown as ApiClient;

    const gateway = createAppInvitationGateway(mockClient);
    const designs = await gateway.listDesigns(token, bookingId);

    expect(designs).toHaveLength(1);
    expect(designs[0]?.title).toBe('Thiệp Mobile');
    expect(mockClient.GET).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitations',
      expect.anything(),
    );
  });

  it('sends textFields on quickEdit without whole content object', async () => {
    const textFields = {
      brideName: 'Thùy Trang',
      groomName: 'Minh Quân',
      greeting: 'Trân trọng kính mời',
      message: 'Tới dự tiệc cưới',
    };

    const mockClient = {
      POST: jest.fn().mockResolvedValue({
        data: { data: { designId, revisionNumber: 2, textFields } },
      }),
    } as unknown as ApiClient;

    const gateway = createAppInvitationGateway(mockClient);
    const result = await gateway.quickEditTextFields(token, bookingId, designId, 1, textFields);

    expect(result.revisionNumber).toBe(2);
    expect(mockClient.POST).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitations/{designId}/revisions',
      expect.objectContaining({
        body: { expectedRevision: 1, textFields },
      }),
    );
  });

  it('lists print orders for couple view', async () => {
    const mockClient = {
      GET: jest.fn().mockResolvedValue({
        data: { data: { items: [{ orderId: 'order-1', status: 'IN_PRODUCTION' }] } },
      }),
    } as unknown as ApiClient;

    const gateway = createAppInvitationGateway(mockClient);
    const orders = await gateway.listPrintOrders(token, bookingId);

    expect(orders).toHaveLength(1);
    expect(orders[0]?.status).toBe('IN_PRODUCTION');
  });
});
