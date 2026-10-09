import { z } from 'zod';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { ApiClientError } from '../../lib/api/client';

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
  return {
    async pending(scope: string) {
      const saved = await storage.read(await slotFor(scope));
      return saved === null ? null : recordSchema.parse(JSON.parse(saved) as unknown).metadata;
    },
    async run<T>(
      scope: string,
      body: object,
      operation: (key: string, stableBody: object) => Promise<T>,
    ): Promise<T> {
      if (busy.has(scope)) throw new Error('Yêu cầu này đang được xử lý.');
      busy.add(scope);
      try {
        const slot = await slotFor(scope);
        const saved = await storage.read(slot);
        const previous = saved === null ? null : recordSchema.parse(JSON.parse(saved) as unknown);
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
            'Yêu cầu trước chưa rõ kết quả. Hãy giữ nguyên nội dung và thử lại để đối soát.',
          );
        await storage.write(slot, JSON.stringify(record));
        try {
          const result = await operation(record.key, stableBody);
          await storage.remove(slot);
          return result;
        } catch (error) {
          if (
            error instanceof ApiClientError &&
            error.kind === 'api' &&
            error.status !== undefined &&
            error.status >= 400 &&
            error.status < 500 &&
            error.code !== 'REQUEST_IN_PROGRESS'
          )
            await storage.remove(slot);
          throw error;
        }
      } finally {
        busy.delete(scope);
      }
    },
  };
}
