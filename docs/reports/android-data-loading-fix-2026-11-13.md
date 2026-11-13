# Native API data loading — 2026-11-13

The owner could sign in on the Android emulator but saw a validation error instead of settlement data. Inspection of the running app showed that booking/proposal reads succeeded; the completed-event task and payment reads failed.

Temporary development diagnostics captured HTTP 422 `VALIDATION_ERROR` from both `/bookings/:id/billing` and `/bookings/:id/final-invoices`. The error detail was `unrecognized_keys` for `_`. Diagnostics recorded status/code, correlation ID, a redacted route and rejected field names, without credentials or customer payloads; the temporary logging was removed after diagnosis.

## Cause and fix

The native `whatwg-fetch` Request constructor appends a timestamp query parameter `_` when passed `cache: 'no-store'` or `'no-cache'` on GET/HEAD. The backend rejects unknown query keys. A browser/Node Request does not append this parameter, so the previous tests did not reproduce the native wire behavior. This issue was observed on SDK 58; no claim is made about the first affected SDK.

Added a shared `ApiRequest` constructor and configured the existing OpenAPI client to use it. On native, cache prevention is expressed through `Cache-Control: no-store, no-cache` (or `no-cache`) while the polyfill receives the default cache option. Browser requests retain their original browser cache mode. URL/query parameters are preserved rather than removed after construction. Direct authenticated PDF downloads use the same constructor.

The fix preserves authorization, request IDs, timeout/abort handling, idempotency headers, revision bodies, response validation and business gates. No backend schema was loosened and no financial result was calculated on the client.

## Verification

- A regression test with the actual paired native Request/Headers polyfills reproduced `?limit=25&_=...`, `?_=...` and `?layout=readable&_=...` before the fix.
- The fixed transport preserves exact billing/invoice/PDF queries, authorization and correlation headers, and native cache prevention. A mocked balance POST additionally checks its exact revision body and idempotency key. A separate case verifies the browser's `no-store` mode.
- All **211 tests passed across 33 suites**, none skipped. Android JavaScript/Hermes export passed. Strict TypeScript, lint, formatting, API-pin and diff checks were run with existing rules/thresholds retained.
- On the already signed-in Android emulator (`emulator-5554`), hot refresh loaded the completed-event settlement state and then the payment ledger successfully. The previous validation error disappeared. These are real read/display checks against the configured Render API; no checkout, approval, publication or business mutation was triggered.

ESLint now excludes the existing, Git-ignored `test-results/` artifact directory, consistent with its `dist/` and `coverage/` exclusions. The full lint command had otherwise scanned minified web-export evidence retained by the SDK upgrade. No maintained source, script or test file was excluded and no lint rule was disabled.

Evidence is in local ignored `test-results/android-data-debug-2026-11-13/`: initial/after-fix emulator captures, payment-load capture, red/green regression logs, full-suite/build/check logs. Runtime captures remain local and are not included in this report. No direct database access, backend application change, commit, push or deployment was performed. Existing audit/coverage and broader native/provider acceptance limits recorded in earlier reports remain separate.
