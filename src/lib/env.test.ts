import { parsePublicEnv } from './env';

describe('public configuration used by the migrated companion', () => {
  it('accepts the HTTPS portal documented for preview builds', () => {
    expect(
      parsePublicEnv(
        {
          EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com/api/v1',
          EXPO_PUBLIC_WEB_PORTAL_URL: 'https://wedding-web-silk.vercel.app',
        },
        'production',
      ).EXPO_PUBLIC_WEB_PORTAL_URL,
    ).toBe('https://wedding-web-silk.vercel.app');
  });

  it.each(['javascript:alert(1)', 'file:///tmp/portal', 'ftp://example.com'])(
    'rejects non-web portal %s',
    (portal) => {
      expect(() =>
        parsePublicEnv({
          EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com',
          EXPO_PUBLIC_WEB_PORTAL_URL: portal,
        }),
      ).toThrow();
    },
  );

  it('keeps a missing portal optional and rejects a production HTTP API', () => {
    expect(
      parsePublicEnv({ EXPO_PUBLIC_API_BASE_URL: 'https://api.example.com' })
        .EXPO_PUBLIC_WEB_PORTAL_URL,
    ).toBeUndefined();
    expect(() =>
      parsePublicEnv({ EXPO_PUBLIC_API_BASE_URL: 'http://localhost:3001' }, 'production'),
    ).toThrow();
  });
});
