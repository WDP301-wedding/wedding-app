/** Local, development-only diagnostics. No bodies, credentials or query strings. */
export interface RequestMetric {
  readonly method: string;
  readonly route: string;
  readonly requestId: string;
  readonly headersMs: number | null;
  readonly validationMs: number | null;
  readonly totalMs: number;
  readonly status: number | null;
  readonly outcome: 'ok' | 'error' | 'aborted' | 'timeout';
}
const maxSamples = 60;
const samples: RequestMetric[] = [];
const clock = () => performance.now();
function safeRoute(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts
    .map((part, index) => {
      if (/^[a-f0-9]{8}-[a-f0-9-]{27}$/iu.test(part) || /^\d+$/u.test(part)) return ':id';
      if (
        parts[index - 1] === 'public-invitations' ||
        (parts[index - 1] === 'invitations' && parts[index - 2] === 'public')
      )
        return ':slug';
      return part;
    })
    .join('/');
}
export function beginRequestMetric(request: Request, requestId: string) {
  if (process.env.NODE_ENV !== 'development') return null;
  const started = clock();
  let received: number | null = null;
  let status: number | null = null;
  return {
    headers(response: Response) {
      received = clock();
      status = response.status;
    },
    finish(outcome: RequestMetric['outcome']) {
      const ended = clock();
      samples.push({
        method: request.method,
        route: safeRoute(request.url),
        requestId,
        headersMs: received === null ? null : received - started,
        validationMs: received === null ? null : ended - received,
        totalMs: ended - started,
        status,
        outcome,
      });
      if (samples.length > maxSamples) samples.splice(0, samples.length - maxSamples);
    },
  };
}
export function getRequestMetrics(): readonly RequestMetric[] {
  return samples.map((sample) => ({ ...sample }));
}
export function clearRequestMetrics(): void {
  samples.length = 0;
}
