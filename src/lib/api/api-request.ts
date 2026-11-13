import { Platform } from 'react-native';

/** Keep native whatwg-fetch from appending an unsupported `_` query parameter. */
export class ApiRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const cache = init?.cache;
    if (Platform.OS !== 'web' && (cache === 'no-store' || cache === 'no-cache')) {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      headers.set('Cache-Control', cache === 'no-store' ? 'no-store, no-cache' : 'no-cache');
      super(input, { ...init, headers, cache: 'default' });
    } else {
      super(input, init);
    }
  }
}
