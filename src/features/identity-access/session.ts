import * as SecureStore from 'expo-secure-store';

import type { components } from '@/lib/api/generated/schema';
import { ApiClientError, createApiClient, type ApiClient } from '@/lib/api/client';

type Role = components['schemas']['CurrentUserResponse']['data']['roles'][number];

export type CurrentActor = Readonly<{
  accountId: string;
  displayEmail: string;
  roles: readonly Role[];
  sessionId: string;
}>;

type AndroidCredential = Readonly<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}>;

export interface IdentityApi {
  completePasswordReset(this: void, token: string, newPassword: string): Promise<void>;
  createSession(this: void, email: string, password: string): Promise<AndroidCredential>;
  getCurrentUser(this: void, accessToken: string): Promise<CurrentActor>;
  logout(this: void, accessToken: string): Promise<void>;
  refreshSession(this: void, refreshToken: string): Promise<AndroidCredential>;
  requestPasswordReset(this: void, email: string): Promise<void>;
}

export interface RefreshStore {
  clear(): Promise<void>;
  read(): Promise<string | null>;
  replace(refreshToken: string): Promise<void>;
}

export type AndroidSessionSnapshot =
  | Readonly<{ status: 'anonymous'; denial: null }>
  | Readonly<{
      status: 'authenticated';
      access: 'denied' | 'full';
      actor: CurrentActor;
      denial: 'forbidden' | 'not-found' | null;
    }>;

const refreshTokenKey = 'wedding.identity.refresh-token';
const anonymousSnapshot = { status: 'anonymous', denial: null } as const;
const resetPattern = /^wip_[A-Za-z0-9_-]{43}$/u;

export function readResetCredential(url: string | null): string | null {
  if (url === null) return null;
  try {
    const raw = new URL(url).hash.slice(1);
    const token =
      new URLSearchParams(raw).get('resetToken') ?? (resetPattern.test(raw) ? raw : null);
    return token !== null && resetPattern.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function createSecureRefreshStore(): RefreshStore {
  return {
    clear: () => SecureStore.deleteItemAsync(refreshTokenKey),
    read: () => SecureStore.getItemAsync(refreshTokenKey),
    async replace(refreshToken) {
      try {
        await SecureStore.setItemAsync(refreshTokenKey, refreshToken);
      } catch (error) {
        await SecureStore.deleteItemAsync(refreshTokenKey);
        throw error;
      }
    },
  };
}

export class AndroidIdentitySession {
  private accessToken: string | null = null;
  private restoreOperation: Promise<AndroidSessionSnapshot> | null = null;
  private state: AndroidSessionSnapshot = anonymousSnapshot;

  constructor(
    private readonly api: IdentityApi,
    private readonly refreshStore: RefreshStore,
  ) {}

  snapshot(): AndroidSessionSnapshot {
    return this.state;
  }

  async discardRevokedSession(): Promise<void> {
    await this.clear();
  }

  async login(email: string, password: string): Promise<AndroidSessionSnapshot> {
    return this.installCredential(await this.api.createSession(email, password));
  }

  restore(): Promise<AndroidSessionSnapshot> {
    this.restoreOperation ??= this.restoreProcess().finally(() => {
      this.restoreOperation = null;
    });
    return this.restoreOperation;
  }

  async refresh(): Promise<AndroidSessionSnapshot> {
    const refreshToken = await this.refreshStore.read();
    if (refreshToken === null) {
      await this.clear();
      return this.state;
    }
    try {
      return await this.installCredential(await this.api.refreshSession(refreshToken));
    } catch (error) {
      await this.clear();
      throw error;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.api.requestPasswordReset(email);
  }

  async completePasswordReset(token: string, password: string): Promise<void> {
    try {
      await this.api.completePasswordReset(token, password);
    } finally {
      await this.clear();
    }
  }

  async logout(): Promise<void> {
    const token = this.accessToken;
    try {
      if (token !== null) await this.api.logout(token);
    } finally {
      await this.clear();
    }
  }

  async authorize<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    if (this.accessToken === null) throw new Error('Authentication is required.');
    try {
      return await operation(this.accessToken);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        await this.clear();
      } else if (
        this.state.status === 'authenticated' &&
        error instanceof ApiClientError &&
        (error.status === 403 || error.status === 404)
      ) {
        this.state = {
          ...this.state,
          denial: error.status === 403 ? 'forbidden' : 'not-found',
        };
      }
      throw error;
    }
  }

  private async restoreProcess(): Promise<AndroidSessionSnapshot> {
    const refreshToken = await this.refreshStore.read();
    if (refreshToken === null) {
      await this.clear();
      return this.state;
    }
    try {
      return await this.installCredential(await this.api.refreshSession(refreshToken));
    } catch {
      await this.clear();
      return this.state;
    }
  }

  private async installCredential(credential: AndroidCredential): Promise<AndroidSessionSnapshot> {
    await this.refreshStore.replace(credential.refreshToken);
    this.accessToken = credential.accessToken;
    try {
      const actor = await this.api.getCurrentUser(credential.accessToken);
      this.state = {
        status: 'authenticated',
        access: actor.roles.includes('COUPLE') ? 'full' : 'denied',
        actor,
        denial: null,
      };
      return this.state;
    } catch (error) {
      await this.clear();
      throw error;
    }
  }

  private async clear(): Promise<void> {
    this.accessToken = null;
    this.state = anonymousSnapshot;
    await this.refreshStore.clear();
  }
}

function requireData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('The identity response did not include data.');
  return data;
}

export function createIdentityApi(client?: ApiClient): IdentityApi {
  let resolvedClient = client;
  const api = () => (resolvedClient ??= createApiClient());

  return {
    async completePasswordReset(token, newPassword) {
      await api().POST('/auth/password-reset-completions', {
        body: { resetToken: token, newPassword },
      });
    },
    async createSession(email, password) {
      const { data } = await api().POST('/auth/android-sessions', {
        body: { email, password },
      });
      return requireAndroidCredential(requireData(data).data);
    },
    async getCurrentUser(accessToken) {
      const { data } = await api().GET('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return normalizeActor(requireData(data).data);
    },
    async logout(accessToken) {
      await api().DELETE('/auth/sessions/current', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    async refreshSession(refreshToken) {
      const { data } = await api().POST('/auth/android-session-refreshes', {
        body: { refreshToken },
      });
      return requireAndroidCredential(requireData(data).data);
    },
    async requestPasswordReset(email) {
      await api().POST('/auth/password-reset-requests', { body: { email } });
    },
  };
}

function normalizeActor(
  actor: Readonly<{
    accountId: string;
    displayEmail: string;
    roles: ArrayLike<Role>;
    sessionId: string;
  }>,
): CurrentActor {
  return { ...actor, roles: Array.from(actor.roles) };
}

function requireAndroidCredential(
  credential:
    | components['schemas']['IssuedSessionResponse']['data']
    | components['schemas']['RefreshedSessionResponse']['data'],
): AndroidCredential {
  if (credential.refreshToken === undefined) {
    throw new Error('The Android identity response did not include a refresh credential.');
  }
  return {
    accessToken: credential.accessToken,
    refreshToken: credential.refreshToken,
    sessionId: credential.sessionId,
  };
}
