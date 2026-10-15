# Hỷ Yến mobile UI migration

Reference: user supplied `Hỷ Yến Design System.zip`, specifically `00_Chung_Design-System` and `03_Minh_App-Android`. The adjacent customer/admin Web references do not change the mobile platform. Archive inventory and hashes are in `hy-yen-reference-manifest.json`.

The user confirmed React Native / Expo + TypeScript. Flutter hints in the reference and the initial mention of Next.js do not apply. Existing gateways, authorization, server totals, immutable document history, payment intents and revision/conflict controls remain in place.

| Reference                             | Implementation                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared colors, type, controls, states | `src/theme/index.ts`, `src/components/hy-ui.tsx`, bundled licensed fonts in `assets/fonts`                                                           |
| App shell                             | `src/screens/v0/v0-companion-shell.tsx`; Tiệc / Khách / Thiệp / Tài chính, safe areas, notification and profile entry points                         |
| AppAuth                               | `src/screens/identity-screen.tsx`; login, password visibility, recovery and OTP, native keyboard controls                                            |
| AppParty                              | `src/screens/hy/hy-party.tsx`, `hy-detail.tsx`; real proposal/contract state, event facts, countdown, detail links                                   |
| AppGuests                             | `src/screens/hy/hy-guests.tsx`; cursor-complete named guest list, search, groups, independent planned count, detail and settings sheets              |
| AppCard                               | `src/screens/v0/invite/`; content preview, enlarged view, live edit sheet, actual publication URL/QR and existing conflict handling                  |
| AppFinance                            | `src/screens/hy/hy-finance.tsx`, existing billing and commercial subflows; server-calculated totals, progress ring, balance, payments and documents  |
| AppNotifs                             | Existing notification controller with updated cards, preferences/device controls and pull-to-refresh                                                 |
| Additional existing API flows         | Schedule, contracts, appendices, invoices, incidentals, media, print, catalog and sessions use the new visual foundation and retain their operations |

## Data boundaries

Prototype names, amounts, tables, unread counts and success timers are not copied. No mock API responses are added. Group-based seating does not require named guests. Planned headcount stays independent of named guest count. Disabled check-in means unrecorded. Guest-specific attendance/table fields absent from the pinned DTO are not invented. Private image URLs and final print rendering are not fabricated: the mobile card is identified as a content preview, and the accepted print artifact remains authoritative.

The design showcase frame, state selectors, prototype device wrapper, synthetic payment success and demo data are excluded from the shipped app. Unsupported mark-unread/undo is not presented as a completed server operation.

## Validation and manual review

Only static formatting, lint and TypeScript checks are used for this change. No automated tests, sandbox mutations or live payment actions are run. Device appearance, keyboard behavior, screen-reader behavior, native font rendering and real API end-to-end flows still require manual review in Expo.

Start `npx expo start --clear`, open the mobile app and log in. Select a real booking, then inspect Tiệc, pull to refresh, open the timeline/details; inspect Khách search/group chips/details and check-in settings; inspect Thiệp, enlarge, edit/cancel, then publish/share only if intended; inspect Tài chính totals/documents/payment history. Open notification/preferences/devices and profile/session/password pages. Also check empty/error states, smaller screens, larger text and keyboard scrolling. A payment or destructive action must be consciously confirmed against its real data.

## Retired UI cleanup — 2026-10-16

Deleted 17 retired files: the manual booking-code screen, the separate legacy invitation editor and its obsolete renderer test, three compatibility screen re-exports, three unused style sheets, and eight Expo starter icon/splash assets. Removed the unused legacy bottom navigation, decorative QR renderer, old venue-image URL, 83 unused style declarations and ten hidden legacy toolbars. The new shell owns navigation, including invitation deep links.

Removed the unused renderPlan callback and the retired booking-code renderer test case. Existing API, identity/session and payment-idempotency implementations and tests remain. Tests of retained screens import the Hỷ Yến components directly. No automated tests were run.

The remaining `src/screens/v0` and `src/components/v0-*` names identify API-integrated views and shared controls already used by the Hỷ Yến interface; they do not provide a second/legacy UI entry point. These live operations are retained instead of deleting working booking, contract, print, invoice, media or payment flows.
