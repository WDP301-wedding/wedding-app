import { describe, expect, it, jest } from '@jest/globals';
import { AndroidIdentitySession, type IdentityApi, type RefreshStore } from './session';

function sharedStore(): RefreshStore {
  let credential: string | null = null;
  return {
    read: () => Promise.resolve(credential),
    replace: (value) => {
      credential = value;
      return Promise.resolve();
    },
    clear: () => {
      credential = null;
      return Promise.resolve();
    },
  };
}
function identity(): IdentityApi {
  const credential = {
    accessToken: 'fixture-access',
    refreshToken: 'fixture-refresh',
    sessionId: 'fixture-session',
  };
  return {
    createSession: jest.fn<IdentityApi['createSession']>().mockResolvedValue(credential),
    refreshSession: jest.fn<IdentityApi['refreshSession']>().mockResolvedValue(credential),
    getCurrentUser: jest.fn<IdentityApi['getCurrentUser']>().mockResolvedValue({
      accountId: 'fixture-account',
      displayEmail: 'fixture@example.invalid',
      roles: ['COUPLE'],
      sessionId: credential.sessionId,
    }),
    logout: jest.fn<IdentityApi['logout']>().mockResolvedValue(undefined),
    requestPasswordReset: jest
      .fn<IdentityApi['requestPasswordReset']>()
      .mockResolvedValue(undefined),
    completePasswordReset: jest
      .fn<IdentityApi['completePasswordReset']>()
      .mockResolvedValue(undefined),
  };
}

describe('session restoration across independently mounted screens', () => {
  it.each([false, true])(
    'clears Billing cached actor after Home clears the shared credential (offline logout: %s)',
    async (offline) => {
      const store = sharedStore();
      const api = identity();
      const home = new AndroidIdentitySession(api, store);
      const billing = new AndroidIdentitySession(api, store);
      await home.login('fixture@example.invalid', 'fixture-password');
      expect(await billing.restore()).toMatchObject({
        status: 'authenticated',
        actor: { accountId: 'fixture-account' },
      });
      if (offline) {
        jest.mocked(api.logout).mockRejectedValueOnce(new Error('offline'));
        await expect(home.logout()).rejects.toThrow('offline');
      } else await home.logout();
      expect(await billing.restore()).toEqual({ status: 'anonymous', denial: null });
      expect(billing.snapshot()).toEqual({ status: 'anonymous', denial: null });
      const readBilling = jest
        .fn<(token: string) => Promise<string>>()
        .mockResolvedValue('private billing');
      await expect(billing.authorize(readBilling)).rejects.toThrow('Authentication is required');
      expect(readBilling).not.toHaveBeenCalled();
    },
  );
});
