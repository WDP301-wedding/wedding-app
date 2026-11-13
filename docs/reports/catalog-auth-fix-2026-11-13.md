# Selection catalog authentication fix — 2026-11-13

The Agreement selection editor displayed an expired-session notice while the user remained signed in. Its selectionChoices request loaded the authenticated /catalog/services endpoint without an Authorization header, outside session.authorize. A read-only unauthenticated request to the deployed endpoint confirmed HTTP 401 / AUTHENTICATION_REQUIRED; the presentation catalog maps that code to the expired-session notice.

selectionChoices now requires an access token and sends it only to the protected service catalog. Public menu requests remain public. CommercialEditor loads choices through the existing session.authorize mechanism, so a genuine 401 can refresh and retry with the new token. Token lifetimes, session implementation, backend authorization and environment configuration are unchanged.

Two regression tests failed before the fix and passed afterward: a wire-level request test rejects missing service authorization, and an editor test uses the real AndroidIdentitySession with an in-memory refresh store to verify one refresh, a retry with the new access token, retained authenticated state and no false expired-session notice.

All 146 tests passed across 32 suites. TypeScript and ESLint passed. Formatting and Android export results are recorded with the local evidence in test-results/catalog-auth-fix-2026-11-13/. The previously recorded coverage gate remains open; coverage was not rerun for this request correction.

Read-only inspection of the running emulator after the change found the selection editor present, no catalog-loading state, no expired-session notice and no other visible catalog/API error from the inspected text. No controls were pressed or business records edited during that inspection. This is not full acceptance of contract submission or payments.

No commit, push or deployment was performed.
