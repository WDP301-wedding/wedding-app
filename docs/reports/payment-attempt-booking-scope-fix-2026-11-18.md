# Payment attempt booking scope — 2026-11-18

Opening a payment deep link for booking A and selecting booking B previously forwarded A's attempt ID to B's payment screen. The resulting attempt lookup returned 404 and caused the combined payment load to fail. Notification navigation to a different owned booking had the same problem.

`CoupleWorkspace` now forwards the linked attempt only when the selected booking matches the booking in the incoming link. Other bookings load their own current payment state. Returning to the original booking still supports its linked attempt, and a new incoming booking/attempt pair replaces the entry context normally. Amounts, checkout requests, payment reconciliation and provider status rules are unchanged.

Two permanent regression tests cover manual switching and return navigation, a new incoming link, and navigation through an owned notification. Both failed against the original code because the second booking received the first booking's attempt; both pass after the fix. The existing unauthorized-notification test remains intact.

Validation:

- All 149 existing and new Jest cases passed across 32 suites using the unchanged project timeout.
- All 18 focused navigation/payment/recovery cases passed.
- TypeScript, ESLint, formatting, the pinned API schema check and Android/Hermes JavaScript export passed. The export is not an installable APK or a provider acceptance test.
- An isolated diagnostic using the real workspace shell and payment screen with synthetic gateways confirmed that switching bookings no longer reads the old attempt under the new booking. The new booking displays an enabled deposit action rather than the synthetic 404 error.

Evidence is retained in ignored `test-results/payment-attempt-booking-scope-2026-11-18/`. The separate diagnostic needed a 20-second startup budget after its cold run timed out at 5 seconds; the project's test configuration and timeouts were not changed. This is local fixture evidence, not a live VNPay or deployed-provider test. No account, booking, checkout, payment or database records were created.

The previously reported session-restoration issue, dependency audit and coverage acceptance gaps remain separate open work. This fix does not mark those items passed.
