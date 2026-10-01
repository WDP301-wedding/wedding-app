import { fetch as expoFetch } from 'expo/fetch';

import { createApiClient, type ApiClientError } from './client';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '24dcfaac-4408-4d42-8d66-456ed6ee7ea4'),
}));

const requestId = '24dcfaac-4408-4d42-8d66-456ed6ee7ea4';
const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const mockedExpoFetch = jest.mocked(expoFetch);

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();

  if (originalApiBaseUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  }
});

describe('createApiClient', () => {
  it('returns typed successful data and sends a request ID to the configured base URL', async () => {
    const fetch = jest.fn((request: Request) => {
      expect(request.url).toBe('https://api.example.com/health/live');
      expect(request.headers.get('x-request-id')).toBe(requestId);

      return Promise.resolve(
        Response.json(
          { data: { status: 'live', requestId } },
          { headers: { 'x-request-id': requestId } },
        ),
      );
    });
    const client = createApiClient({
      baseUrl: 'https://api.example.com/',
      fetch,
      requestId: () => requestId,
    });

    const result = await client.GET('/health/live');

    expect(result.data).toEqual({ data: { status: 'live', requestId } });
    expect(result.response.headers.get('x-request-id')).toBe(requestId);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('normalizes a structured API error and preserves its correlation data', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                details: [
                  {
                    code: 'dependency_unavailable',
                    message: 'PostgreSQL is unavailable.',
                    path: 'database',
                  },
                ],
                message: 'The service is not ready.',
                requestId,
              },
            },
            { status: 503 },
          ),
        ),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/ready')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'api',
      code: 'SERVICE_UNAVAILABLE',
      message: 'The service is not ready.',
      requestId,
      status: 503,
      details: [
        {
          code: 'dependency_unavailable',
          message: 'PostgreSQL is unavailable.',
          path: 'database',
        },
      ],
    });
  });

  it('rejects a malformed JSON response with a normalized client error', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () =>
        Promise.resolve(
          new Response('{not-json', {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          }),
        ),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/live')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'malformed-response',
      code: 'MALFORMED_API_RESPONSE',
      requestId,
      status: 200,
    });
  });

  it('rejects an unstructured HTTP error as a malformed response', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () =>
        Promise.resolve(
          new Response('<h1>Unavailable</h1>', {
            status: 502,
            headers: {
              'content-type': 'text/html',
              'x-request-id': requestId,
            },
          }),
        ),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/ready')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'malformed-response',
      code: 'MALFORMED_API_RESPONSE',
      requestId,
      status: 502,
    });
  });

  it('aborts a slow request at the configured timeout', async () => {
    jest.useFakeTimers();
    const fetch = jest.fn(
      (request: Request) =>
        new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener('abort', () => reject(new Error('Request aborted.')), {
            once: true,
          });
        }),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch,
      requestId: () => requestId,
      timeoutMs: 500,
    });

    const expectation = expect(client.GET('/health/live')).rejects.toEqual(
      expect.objectContaining<Partial<ApiClientError>>({
        name: 'ApiClientError',
        kind: 'timeout',
        code: 'REQUEST_TIMEOUT',
        requestId,
      }),
    );
    await jest.advanceTimersByTimeAsync(500);

    await expectation;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('normalizes an offline fetch rejection as a network error', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () => Promise.reject(new TypeError('Network request failed')),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/live')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'network',
      code: 'NETWORK_ERROR',
      requestId,
    });
  });

  it('distinguishes a caller abort from a timeout', async () => {
    const controller = new AbortController();
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: (request) =>
        new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener('abort', () => reject(new Error('Request aborted.')), {
            once: true,
          });
        }),
      requestId: () => requestId,
    });

    const expectation = expect(
      client.GET('/health/live', { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'aborted',
      code: 'REQUEST_ABORTED',
      requestId,
    });
    controller.abort();

    await expectation;
  });

  it.each([0, 1.5])('rejects the invalid timeout value %s', (timeoutMs) => {
    expect(() =>
      createApiClient({
        baseUrl: 'https://api.example.com',
        timeoutMs,
      }),
    ).toThrow('API timeout must be a positive safe integer in milliseconds.');
  });

  it('uses Expo environment, fetch, and UUID defaults when no options are provided', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://default-api.example.com';
    mockedExpoFetch.mockImplementation((input) => {
      if (!(input instanceof Request)) {
        throw new TypeError('Expected a Request instance.');
      }

      const generatedRequestId = input.headers.get('x-request-id');
      expect(input.url).toBe('https://default-api.example.com/health/live');
      expect(generatedRequestId).toBe(requestId);

      return Promise.resolve(
        Response.json({ data: { status: 'live', requestId: generatedRequestId } }) as never,
      );
    });

    const result = await createApiClient().GET('/health/live');

    expect(result.data?.data.status).toBe('live');
    expect(mockedExpoFetch).toHaveBeenCalledTimes(1);
  });
});
