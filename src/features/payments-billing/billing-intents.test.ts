import {
  createHash,
  randomUUID as mockRandomUUID,
  createHash as mockCreateHash,
} from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import { ApiClientError } from '../../lib/api/client';
import { createBillingIntents, type IntentStorage } from './billing-intents';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-crypto', () => ({
  randomUUID: () => mockRandomUUID(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: (_algorithm: string, value: string) =>
    Promise.resolve(mockCreateHash('sha256').update(value).digest('hex')),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

function memory(): IntentStorage {
  const records = new Map<string, string>();
  return {
    read: (key) => Promise.resolve(records.get(key) ?? null),
    write: (key, value) => {
      records.set(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      records.delete(key);
      return Promise.resolve();
    },
  };
}
const hash = (value: string) => Promise.resolve(createHash('sha256').update(value).digest('hex'));
const unknown = new ApiClientError({
  kind: 'network',
  code: 'NETWORK_ERROR',
  message: 'offline',
  requestId: 'request',
});

describe('durable billing intent identity', () => {
  it.each([401, 403, 404, 429])(
    'keeps an uncertain checkout through access denial or rate limiting %i and reuses it after retry',
    async (status) => {
      const storage = memory();
      const bookingId = mockRandomUUID();
      const keys: string[] = [];
      const first = createBillingIntents('actor', storage, hash);
      await expect(
        first.runCheckout(bookingId, { expectedBillingRevision: 7 }, (key) => {
          keys.push(key);
          return Promise.reject(unknown);
        }),
      ).rejects.toBe(unknown);
      const reloaded = createBillingIntents('actor', storage, hash);
      await expect(
        reloaded.runCheckout(bookingId, { expectedBillingRevision: 8 }, (key) => {
          keys.push(key);
          return Promise.reject(
            new ApiClientError({
              kind: 'api',
              code: 'ACCESS_DENIED',
              status,
              message: 'denied',
              requestId: 'request',
            }),
          );
        }),
      ).rejects.toThrow('denied');
      expect(await reloaded.recoverCheckout(bookingId)).not.toBeNull();
      await reloaded.runCheckout(bookingId, { expectedBillingRevision: 8 }, (key, body) => {
        keys.push(key);
        expect(body).toEqual({ expectedBillingRevision: 7 });
        return Promise.resolve({
          paymentAttemptId: mockRandomUUID(),
          status: 'PENDING',
          checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
          expiresAt: '2026-10-09T10:00:00Z',
        });
      });
      expect(keys).toEqual([keys[0], keys[0], keys[0]]);
    },
  );
  it('retains checkout identity across restart until verified settlement is fully applied', async () => {
    const storage = memory();
    const bookingId = mockRandomUUID();
    const result = {
      paymentAttemptId: mockRandomUUID(),
      status: 'PENDING' as const,
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      expiresAt: '2026-10-09T10:00:00Z',
    };
    const first = createBillingIntents('actor', storage, hash);
    let originalKey = '';
    await first.runCheckout(bookingId, { expectedBillingRevision: 7 }, (key) => {
      originalKey = key;
      return Promise.resolve(result);
    });
    const reloaded = createBillingIntents('actor', storage, hash);
    expect(await reloaded.lastBooking()).toBe(bookingId);
    expect(await reloaded.recoverCheckout(bookingId)).toEqual({
      metadata: { expectedBillingRevision: 7 },
      checkout: result,
    });
    await reloaded.runCheckout(bookingId, { expectedBillingRevision: 8 }, (key, body) => {
      expect(key).toBe(originalKey);
      expect(body).toEqual({ expectedBillingRevision: 7 });
      return Promise.resolve(result);
    });
    await reloaded.finishCheckout(bookingId, {
      paymentAttemptId: result.paymentAttemptId,
      status: 'SUCCEEDED',
      applicationStatus: 'PENDING',
    });
    expect(await reloaded.recoverCheckout(bookingId)).not.toBeNull();
    await reloaded.finishCheckout(bookingId, {
      paymentAttemptId: result.paymentAttemptId,
      status: 'SUCCEEDED',
      applicationStatus: 'SUCCEEDED',
    });
    expect(await reloaded.recoverCheckout(bookingId)).toBeNull();
  });
  it('discovers an uncertain checkout after restart and separates account recovery', async () => {
    const storage = memory();
    const bookingId = mockRandomUUID();
    const first = createBillingIntents('actor', storage, hash);
    await expect(
      first.runCheckout(bookingId, { expectedBillingRevision: 7 }, () => Promise.reject(unknown)),
    ).rejects.toBe(unknown);
    expect(await createBillingIntents('actor', storage, hash).lastBooking()).toBe(bookingId);
    expect(await createBillingIntents('another', storage, hash).lastBooking()).toBeNull();
    expect(
      await createBillingIntents('another', storage, hash).recoverCheckout(bookingId),
    ).toBeNull();
  });
  it('recovers the original revision and uses SecureStore without persisting receipt text', async () => {
    const records = new Map<string, string>();
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation((key) => Promise.resolve(records.get(key) ?? null));
    jest.mocked(SecureStore.setItemAsync).mockImplementation((key, value) => {
      records.set(key, value);
      return Promise.resolve();
    });
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation((key) => {
      records.delete(key);
      return Promise.resolve();
    });
    const body = { amountVnd: 10, expectedBillingRevision: 7, reason: 'private receipt' };
    await expect(
      createBillingIntents('private actor').run('refund:booking', body, () =>
        Promise.reject(unknown),
      ),
    ).rejects.toBe(unknown);
    const saved = [...records.values()][0];
    expect(saved).not.toContain('private');
    const reloaded = createBillingIntents('private actor');
    expect(await reloaded.pending('refund:booking')).toEqual({ expectedBillingRevision: 7 });
    let recovered: object = {};
    await reloaded.run(
      'refund:booking',
      { ...body, expectedBillingRevision: 8 },
      (_key, stableBody) => {
        recovered = stableBody;
        return Promise.resolve();
      },
    );
    expect(recovered).toEqual(body);
    expect(await reloaded.pending('refund:booking')).toBeNull();
  });
  it('keeps the key through network failure, reload and token rotation; success releases it', async () => {
    const storage = memory();
    const keys: string[] = [];
    const first = createBillingIntents('actor', storage, hash);
    await expect(
      first.run('manual:booking', { amount: 10 }, (key) => {
        keys.push(key);
        return Promise.reject(unknown);
      }),
    ).rejects.toBe(unknown);
    const reloaded = createBillingIntents('actor', storage, hash);
    await reloaded.run('manual:booking', { amount: 10 }, (key) => {
      keys.push(key);
      return Promise.resolve('payment');
    });
    await reloaded.run('manual:booking', { amount: 10 }, (key) => {
      keys.push(key);
      return Promise.resolve('next');
    });
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });
  it('blocks changed draft and concurrent submission before executing money', async () => {
    const intents = createBillingIntents('actor', memory(), hash);
    let finish!: () => void;
    const running = intents.run(
      'refund:booking',
      { amount: 10 },
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await expect(
      intents.run('refund:booking', { amount: 20 }, () => Promise.resolve()),
    ).rejects.toThrow('đang');
    await new Promise((resolve) => setTimeout(resolve, 0));
    finish();
    await running;
    await expect(
      intents.run('refund:booking', { amount: 10 }, () => Promise.reject(unknown)),
    ).rejects.toBe(unknown);
    await expect(
      intents.run('refund:booking', { amount: 20 }, () => Promise.resolve()),
    ).rejects.toThrow('giữ nguyên');
  });
  it.each([409, 500, 503])(
    'retains unresolved response %i but removes definitive 422',
    async (status) => {
      const intents = createBillingIntents('actor', memory(), hash);
      const keys: string[] = [];
      const fail = (code: string, status: number) =>
        intents.run('balance:booking', {}, (key) => {
          keys.push(key);
          return Promise.reject(
            new ApiClientError({
              kind: 'api',
              code,
              status,
              message: 'error',
              requestId: 'request',
            }),
          );
        });
      await expect(
        fail(status === 409 ? 'REQUEST_IN_PROGRESS' : 'INTERNAL_ERROR', status),
      ).rejects.toThrow();
      await expect(fail('IDEMPOTENCY_KEY_REUSED', 422)).rejects.toThrow();
      await intents.run('balance:booking', {}, (key) => {
        keys.push(key);
        return Promise.resolve();
      });
      expect(keys[1]).toBe(keys[0]);
      expect(keys[2]).not.toBe(keys[0]);
    },
  );
  it('separates actors and fails closed on unavailable or corrupt storage', async () => {
    const storage = memory();
    await createBillingIntents('one', storage, hash)
      .run('manual', {}, () => Promise.reject(unknown))
      .catch(() => undefined);
    await expect(
      createBillingIntents('two', storage, hash).run('manual', { other: true }, () =>
        Promise.resolve(),
      ),
    ).resolves.toBeUndefined();
    const corrupt = { ...storage, read: () => Promise.resolve('{broken') };
    await expect(
      createBillingIntents('one', corrupt, hash).run('manual', {}, () => Promise.resolve()),
    ).rejects.toThrow();
    const failed = { ...storage, write: () => Promise.reject(new Error('storage unavailable')) };
    await expect(
      createBillingIntents('one', failed, hash).run('new', {}, () => Promise.resolve()),
    ).rejects.toThrow('storage unavailable');
  });
});
