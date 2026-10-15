/**
 * Deterministic Idempotency Key Utilities
 *
 * Generates stable fallback keys. Durable pending intents are stored separately:
 * - Deterministic hashing across exact payload contents (body, lines, reason, etc.)
 * - Retries of the same intent with unchanged payload reuse the same key.
 * - Any modification to payload produces a distinct key to prevent invalid key reuse.
 */

function hashString(input: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c64e6d ^ 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).slice(0, 12);
}

export function createDeterministicIdempotencyKey(
  operation: string,
  resourceId: string,
  revision: number | string,
  payload?: unknown,
): string {
  const payloadHash = payload !== undefined ? `:${hashString(canonicalSerialize(payload))}` : '';
  return `${operation}:${resourceId}:${revision}${payloadHash}`;
}

export function canonicalSerialize(value: unknown): string {
  if (Array.isArray(value))
    return '[' + value.map((item) => canonicalSerialize(item)).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return (
      '{' +
      entries.map(([key, item]) => JSON.stringify(key) + ':' + canonicalSerialize(item)).join(',') +
      '}'
    );
  }
  return JSON.stringify(value) ?? 'null';
}
