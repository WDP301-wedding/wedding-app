import { fetch as expoFetch } from 'expo/fetch';

import { createApiClient } from '@/lib/api/client';
import type { components } from '@/lib/api/generated/schema';

import { createPlanningGateway } from './planning-api';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '24dcfaac-4408-4d42-8d66-456ed6ee7ea4'),
}));

type Proposal = components['schemas']['BookingProposalResponse']['data'];
const requestId = '24dcfaac-4408-4d42-8d66-456ed6ee7ea4';
const bookingId = '00000000-0000-4000-8000-000000000101';
const effective: NonNullable<Proposal['effectiveTimeline']> = {
  revisionId: '00000000-0000-4000-8000-000000000201',
  revisionNumber: 2,
  predecessorRevisionId: null,
  managerApprovedAt: '2026-10-07T09:00:00.000Z',
  coupleApprovedAt: '2026-10-07T09:05:00.000Z',
  items: [
    {
      itemId: '00000000-0000-4000-8000-000000000301',
      order: 0,
      startTime: '17:30',
      title: 'Đón khách đã duyệt',
      description: null,
    },
  ],
};

function proposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    bookingId,
    consultationId: '00000000-0000-4000-8000-000000000401',
    phase: 'CONFIRMED',
    revision: 8,
    eventDate: '2026-11-15',
    planningHeadcount: 280,
    capabilities: {
      accessLevel: 'FULL',
      canEditTimeline: true,
      canApproveTimeline: true,
      canRequestCancellation: true,
      canWithdrawApproval: false,
    },
    proposal: {
      hall: {
        id: '00000000-0000-4000-8000-000000000501',
        name: 'Sảnh Ánh Dương',
        description: 'Sảnh tiệc',
        maxGuests: 300,
      },
      shift: { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
      menu: {
        packageId: '00000000-0000-4000-8000-000000000601',
        versionId: '00000000-0000-4000-8000-000000000602',
        versionNumber: 1,
        name: 'Thực đơn',
        description: 'Tiệc cưới',
        priceVndPerTable: 1000000,
      },
      tableCount: 28,
      baseChargeVnd: 28000000,
      depositAmountVnd: 2800000,
    },
    effectiveTimeline: effective,
    timeline: {
      ...effective,
      revisionNumber: 3,
      managerApprovedAt: null,
      coupleApprovedAt: null,
      items: [{ ...effective.items[0]!, title: 'Bản thay đổi chưa duyệt' }],
    },
    ...overrides,
  };
}

function gateway(value: Proposal) {
  return createPlanningGateway(
    createApiClient({
      baseUrl: 'https://api.example.com',
      requestId: () => requestId,
      fetch: (request) => {
        expect(request.headers.get('Authorization')).toBe('Bearer access-token');
        expect(request.url).toBe(`https://api.example.com/bookings/${bookingId}/proposal`);
        return Promise.resolve(Response.json({ data: value }));
      },
    }),
  );
}

describe('confirmed Android planning', () => {
  it.each(['CONFIRMED', 'COMPLETED'] as const)(
    'reads only the effective timeline for %s',
    async (phase) => {
      const result = await gateway(proposal({ phase })).loadConfirmed('access-token', bookingId);
      expect(result).toMatchObject({
        status: 'confirmed',
        snapshot: { phase, timelineRevision: 2, timeline: effective.items },
      });
      expect(JSON.stringify(result)).not.toContain('Bản thay đổi chưa duyệt');
    },
  );

  it('denies restricted access even when the booking is confirmed', async () => {
    const value = proposal();
    const result = await gateway({
      ...value,
      capabilities: { ...value.capabilities, accessLevel: 'RESTRICTED' },
    }).loadConfirmed('access-token', bookingId);
    expect(result).toEqual({ status: 'not-confirmed', snapshot: null });
  });

  it.each(['DRAFT', 'AWAITING_DEPOSIT', 'CANCELLED'] as const)(
    'does not open %s planning',
    async (phase) => {
      expect(await gateway(proposal({ phase })).loadConfirmed('access-token', bookingId)).toEqual({
        status: 'not-confirmed',
        snapshot: null,
      });
    },
  );

  it('returns an empty effective timeline without exposing a pending replacement', async () => {
    expect(
      await gateway(proposal({ effectiveTimeline: null })).loadConfirmed('access-token', bookingId),
    ).toMatchObject({ snapshot: { timelineRevision: null, timeline: [] } });
  });

  it('rejects an empty successful response', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      requestId: () => requestId,
      fetch: () => Promise.resolve(new Response(null, { status: 204 })),
    });
    await expect(
      createPlanningGateway(client).loadConfirmed('access-token', bookingId),
    ).rejects.toThrow('did not include data');
  });

  it('lazily creates the default API client', async () => {
    const original = process.env.EXPO_PUBLIC_API_BASE_URL;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';
    jest.mocked(expoFetch).mockResolvedValueOnce(Response.json({ data: proposal() }) as never);
    try {
      expect(await createPlanningGateway().loadConfirmed('access-token', bookingId)).toMatchObject({
        status: 'confirmed',
      });
    } finally {
      if (original === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
      else process.env.EXPO_PUBLIC_API_BASE_URL = original;
    }
  });
});
