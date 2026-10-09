import { z } from 'zod';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { ApiClientError } from '../../lib/api/client';
import type { AttemptView, BalanceBody, CheckoutView } from './billing-api';

export interface IntentStorage {
  read(this: void, key: string): Promise<string | null>;
  write(this: void, key: string, value: string): Promise<void>;
  remove(this: void, key: string): Promise<void>;
}
const metadataSchema = z.strictObject({
  expectedBillingRevision: z.number().int().positive().optional(),
  timelineRevisionId: z.uuid().optional(),
});
const recordSchema = z.strictObject({
  key: z.uuid(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  metadata: metadataSchema.default({}),
  checkout: z
    .strictObject({
      paymentAttemptId: z.uuid(),
      status: z.enum(['CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'UNKNOWN']),
      checkoutUrl: z.url().refine((value) => {
        const url = new URL(value);
        return (
          url.origin === 'https://sandbox.vnpayment.vn' &&
          url.pathname === '/paymentv2/vpcpay.html' &&
          !url.username &&
          !url.password
        );
      }),
      expiresAt: z.iso.datetime({ offset: true }),
    })
    .optional(),
});
const deviceStorage: IntentStorage = {
  read: (key) => SecureStore.getItemAsync(key),
  write: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};
async function digest(value: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, value);
}

// Keep the original server revision for recovery, never tokens or receipt text.
export function createBillingIntents(
  accountId: string,
  storage: IntentStorage = deviceStorage,
  hash: (value: string) => Promise<string> = digest,
) {
  const busy = new Set<string>();
  const slotFor = async (scope: string) =>
    `wedding.billing.${await hash(JSON.stringify([accountId, scope]))}`;
  async function read(scope: string) {
    const saved = await storage.read(await slotFor(scope));
    return saved === null ? null : recordSchema.parse(JSON.parse(saved) as unknown);
  }
  async function execute<T>(
    scope: string,
    body: object,
    operation: (key: string, stableBody: object) => Promise<T>,
    retainCheckout = false,
  ): Promise<T> {
    if (busy.has(scope)) throw new Error('Yêu cầu này đang được xử lý.');
    busy.add(scope);
    try {
      const slot = await slotFor(scope);
      const previous = await read(scope);
      const payload = body as Record<string, unknown>;
      const metadata =
        previous?.metadata ??
        metadataSchema.parse({
          ...(payload.expectedBillingRevision === undefined
            ? {}
            : { expectedBillingRevision: payload.expectedBillingRevision }),
          ...(payload.timelineRevisionId === undefined
            ? {}
            : { timelineRevisionId: payload.timelineRevisionId }),
        });
      const stableBody = { ...body, ...metadata };
      const fingerprint = await hash(JSON.stringify(stableBody, Object.keys(stableBody).sort()));
      const record = previous ?? { key: randomUUID(), hash: fingerprint, metadata };
      if (record.hash !== fingerprint)
        throw new Error(
          'Yêu cầu trước chưa rõ kết quả. Hãy giữ nguyên nội dung và thử lại để kiểm tra kết quả.',
        );
      await storage.write(slot, JSON.stringify(record));
      try {
        const result = await operation(record.key, stableBody);
        if (retainCheckout)
          await storage.write(
            slot,
            JSON.stringify({
              ...record,
              checkout: recordSchema.shape.checkout.unwrap().parse(result),
            }),
          );
        else await storage.remove(slot);
        return result;
      } catch (error) {
        if (
          !previous?.checkout &&
          error instanceof ApiClientError &&
          error.kind === 'api' &&
          error.status !== undefined &&
          error.status >= 400 &&
          error.status < 500 &&
          ![401, 403, 404, 429].includes(error.status) &&
          error.code !== 'REQUEST_IN_PROGRESS'
        )
          await storage.remove(slot);
        throw error;
      }
    } finally {
      busy.delete(scope);
    }
  }
  return {
    async lastBooking() {
      const saved = await storage.read(await slotFor('last-checkout-booking'));
      return saved === null ? null : z.uuid().parse(JSON.parse(saved) as unknown);
    },
    async recoverCheckout(bookingId: string) {
      const saved = await read(`checkout:${bookingId}`);
      return saved === null ? null : { metadata: saved.metadata, checkout: saved.checkout ?? null };
    },
    async runCheckout(
      bookingId: string,
      body: BalanceBody,
      operation: (key: string, stableBody: object) => Promise<CheckoutView>,
    ): Promise<CheckoutView> {
      // Discover the booking after a restart even when the request never returns.
      await storage.write(
        await slotFor('last-checkout-booking'),
        JSON.stringify(z.uuid().parse(bookingId)),
      );
      return execute(`checkout:${bookingId}`, body, operation, true);
    },
    async finishCheckout(
      bookingId: string,
      attempt: Pick<AttemptView, 'paymentAttemptId' | 'status' | 'applicationStatus'>,
    ) {
      if (
        attempt.status !== 'FAILED' &&
        !(attempt.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED')
      )
        return;
      const saved = await read(`checkout:${bookingId}`);
      if (saved?.checkout?.paymentAttemptId === attempt.paymentAttemptId)
        await storage.remove(await slotFor(`checkout:${bookingId}`));
    },
    async pending(scope: string) {
      return (await read(scope))?.metadata ?? null;
    },
    async run<T>(
      scope: string,
      body: object,
      operation: (key: string, stableBody: object) => Promise<T>,
    ): Promise<T> {
      return execute(scope, body, operation);
    },
  };
}
