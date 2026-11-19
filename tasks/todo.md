# Migration acceptance checklist

## 1 — Configuration and wire contract

- [x] Valid documented HTTPS public configuration parses; invalid protocols are rejected by regression tests.
- [x] Pin/generate against the exact current committed backend artifact; api:check passes without bypasses.
- [x] Shared phase/access/capacity/payment policies match Flutter cases; unknown or missing capabilities fail closed.

## 2 — Identity and workspace

- [x] Login, restoration, OTP reset/change and Couple-only access follow Flutter flow using existing secure storage.
- [x] Paginated bookings choose the same default; switcher works and account/booking changes clear old scoped state.
- [x] Four main tabs and Thêm destinations match Flutter; Back, direct links and closed/read-only phases are handled.

## 3 — Overview

- [x] Show actual names/date/hall/phase and next actions from current proposal, contract and billing states.
- [x] Completion blockers point to the unresolved appendix; empty/loading/error/retry states are functional.
- [x] Narrow-screen text and action hierarchy pass runtime/taste inspection.

## 4 — Agreement

- [x] Profile/timeline edit, review/withdraw/request changes use exact revisions and source capabilities.
- [x] Selection preview/save/submit preserves versions, server totals, idempotency and current table capacity.
- [x] Contract snapshot/history/standard terms and selected PDF revision/layout behave like Flutter, including byte signature verification.

## 5 — Payments

- [x] Deposit eligibility, existing-attempt recovery and payment history match Flutter.
- [x] Balance requires COMPLETED, server canPay and current billing revision; unresolved attempts cannot be bypassed.
- [x] QR visibility/status/open/save flows distinguish deposit from balance and do not claim payment success from a return URL.

## 6 — Preparation

- [x] Headcount and group actions use current APIs only; no named-guest/check-in requests in active flows.
- [x] Seating and invitation/print Web handoffs preserve source policy and authenticated-safe navigation.
- [x] Invitation lists/publication/share and appendix draft/preview/submission/approval/cancellation match source revisions and capabilities.

## 7 — Settlement

- [x] Direct entry is blocked before COMPLETED; read-only cancellation and existing ledger remain understandable.
- [x] Expense and adjustment decisions submit exact revision/review/digest/reason with stable retry idempotency.
- [x] Current invoice, history and cancellation-request policy match Flutter without client money recalculation.

## 8 — Account, notifications and final verification

- [x] Inbox/unread/read actions and source profile/password/session flows work with scoped invalidation.
- [x] API, formatting, lint, typecheck, all Jest tests and Android JS export pass without lowering checks.
- [ ] Runtime/screenshots at narrow and regular phone widths verify typography, Back, keyboard, empty/error/busy/read-only states.
- [x] Final report distinguishes local mocked evidence, browser evidence and untested device/provider behavior; verification does not imply APK, database or deployment acceptance.

## Remaining acceptance work

Current local verification, 2026-11-19: API pin, formatting, lint, TypeScript and Android JavaScript export pass. All 190 Jest cases pass across 38 suites with a cold cache, and all configured coverage files are collected without transform errors. Coverage is 83.55% lines and 80.46% branches against the unchanged 80% required for each. The workflow enforces formatting, API artifact/type checks, tests/coverage and the existing dependency audit policy alongside its SDK, lint, type and export gates; hosted CI still needs verification for these changes. Audit passes the unchanged high/critical policy (0 critical, 0 high, 27 moderate, 0 low). Zod is patched to 4.6.6. Picomatch advisory GHSA-fc5q-39xc-vjpf was withdrawn upstream on 2026-11-18; this is an advisory-database change, not a Picomatch patch or local waiver. Remaining moderate findings originate from Glob and Minimatch. Expo Doctor passes 19 of 20 local checks; the remote config-schema check fails during TLS connection setup. Native/provider journey acceptance remains open. Publishing or merging these changes does not certify release readiness.

Implementation/focused-test checkmarks above do not certify device or deployed-provider acceptance. The overall migration has not passed release gates.

- [x] Raise meaningful regression coverage to the unchanged 80% branch and line requirements. The complete suite's current passing cases do not waive the coverage result.
- [ ] Resolve the remaining moderate dependency findings through reviewed compatible changes; retain the passing high/critical gate without expanding audit exceptions.
- [x] Review the existing Expo SDK 57 patch-version mismatches: superseded by the owner-requested SDK 58 upgrade and the six-package SDK 58 alignment. Local package compatibility passes; the remote config-schema check hit a TLS connection failure. See `../docs/reports/expo-sdk-58-alignment-2026-11-18.md` and PR #17 for CI verification.
- [ ] Verify the native Android keyboard/safe area, gallery permission/QR save, PDF/share chooser, background/resume and process restart on a device.
- [ ] Run the source commercial journey against an authorized test backend/provider before release acceptance. Local fixture results are not live integration evidence.

Detailed source mapping, evidence boundaries and validation results: `docs/reports/prm-react-native-migration-2026-11-12.md`.
