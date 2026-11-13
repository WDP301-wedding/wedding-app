import { createApiClient } from '@/lib/api/client';
import { createWorkspaceGateway } from './workspace-api';

it('authenticates the protected service catalog while keeping menu reads public', async () => {
  const requests: Request[] = [];
  const gateway = createWorkspaceGateway(
    createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: async (request) => {
        requests.push(request.clone());
        if (new URL(request.url).pathname === '/catalog/menu-packages')
          return Response.json({ data: { items: [], nextCursor: null } });
        if (request.headers.get('Authorization') !== 'Bearer fixture-access')
          return Response.json(
            {
              error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication is required.',
                requestId: '00000000-0000-4000-8000-000000000001',
              },
            },
            { status: 401 },
          );
        return Response.json({
          data: {
            items: [
              {
                serviceId: 'service',
                sourceRevisionId: 'service-version',
                name: 'Trang trí',
                description: '',
                unit: 'gói',
                unitPriceVnd: 500000,
                active: true,
              },
            ],
            nextCursor: null,
          },
        });
      },
    }),
  );
  await expect(gateway.selectionChoices('fixture-access')).resolves.toEqual([
    expect.objectContaining({ category: 'SERVICE', sourceId: 'service', unitPriceVnd: 500000 }),
  ]);
  expect(requests).toHaveLength(2);
  expect(requests[0]!.headers.get('Authorization')).toBeNull();
  expect(requests[1]!.headers.get('Authorization')).toBe('Bearer fixture-access');
});

it('sends immutable expense review evidence and the same retry key without client money', async () => {
  const requests: Request[] = [];
  const api = createWorkspaceGateway(
    createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: async (request) => {
        requests.push(request.clone());
        return Response.json({ data: {} });
      },
    }),
  );
  const body = {
    expectedRevision: 7,
    reviewId: 'review',
    documentDigest: 'digest',
    decision: 'APPROVE' as const,
  };
  await api.decideExpenses('token', 'booking', body, 'same-key');
  await api.decideExpenses('token', 'booking', body, 'same-key');
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(new URL(request.url).pathname).toBe('/bookings/booking/incidental-expenses/decisions');
    expect(request.headers.get('Authorization')).toBe('Bearer token');
    expect(request.headers.get('Idempotency-Key')).toBe('same-key');
    expect(await request.json()).toEqual(body);
  }
});

it('loads only headcount and groups for the names-free preparation screen', async () => {
  const paths: string[] = [];
  const api = createWorkspaceGateway(
    createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: async (request) => {
        paths.push(new URL(request.url).pathname);
        return Response.json({
          data: request.url.endsWith('guest-plan') ? { revision: 2, planningHeadcount: 95 } : [],
        });
      },
    }),
  );
  await api.preparationGroups('token', 'booking');
  expect(paths.sort()).toEqual(['/bookings/booking/guest-groups', '/bookings/booking/guest-plan']);
});
