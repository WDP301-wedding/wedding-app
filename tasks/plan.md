# PRM Flutter → React Native migration

## Contract

Owner request, 2026-11-12: migrate both the interface and existing business logic of PRM-app to wedding-app, using the taste/design guidance to avoid common UI defects. PRM-app is the behavior and information-architecture reference; current backend OpenAPI is the wire contract. Preserve server authority over prices, approvals, revisions, access and payment results. Do not invent features or reproduce retired named-guest/check-in flows just because historical API helpers remain in Flutter.

Source baseline: PRM-app 0b82778d0d1abf62b2a2f780b5d0416714a8eddb. Target baseline: wedding-app c2137f3be3181cb635fedd02d1c81c30941ef18a. Backend baseline: 37ee17a1fd9fb88db17bfecdd763d3ae78d35101. Both mobile checkouts matched origin/main when fetched at the start. Work on codex/prm-react-native-migration.

## Implementation boundaries

Follow-up, 2026-11-13: the owner explicitly requested the latest Expo version. The original SDK 57 boundary below is superseded by `expo-sdk-58-upgrade-2026-11-13.md`; business and API boundaries remain unchanged.

- Keep Expo SDK 57 and existing React Native/API/session infrastructure. Translate Dart state and widgets to typed TypeScript/hooks/native components, rather than embedding Flutter or replacing the backend.
- Port Flutter's four primary sections (Tổng quan, Thoả thuận, Thanh toán, Chuẩn bị) and Thêm destinations (Quyết toán, Thông báo, Hồ sơ, booking switcher).
- Port the source's native read/command flows and preserve intentional Web handoffs for seating/design/printing where Flutter already uses them. No new device-push or provider integration beyond source capability.
- Follow the approved Wedding tokens, Vietnamese-safe fonts, accessible touch targets, real loading/empty/error/closed states and calm native composition. Flutter is the content/behavior reference; exact Flutter Material widgets need native React Native equivalents.
- No backend/Flutter code changes, database operations, live payments, deployment or APK/native packaging. Publishing/merging is outside this implementation request.
- Preserve or strengthen verification. Existing baseline failures must be reconciled with the migrated behavior, not hidden through skipped tests or lowered thresholds.

## Ordered slices

1. Public configuration, current API pin and shared policy tests.
2. Session/identity and account-scoped workspace state; booking selection and navigation.
3. Overview, event/completion notices and derived next actions.
4. Agreement: couple profile, timeline, selections/capacity, contract revision/PDF/change request.
5. Deposit/payment history, unresolved attempts, QR and server balance eligibility.
6. Preparation: headcount/groups, seating Web handoff, invitation/publication/sharing/printing, appendices and effective-commercial selection editor.
7. Settlement: phase gate, immutable expense/invoice decisions, invoice history, cancellation policy.
8. Notifications/profile/security, invalidation/realtime behavior and final regression/runtime/taste audit.

Each slice requires focused behavior tests before its implementation is accepted, then relevant TypeScript/lint checks. Keep all unfinished acceptance criteria visible in tasks/todo.md. Final checks: API pin verification, formatting, lint, typecheck, complete Jest suite, Android JavaScript export (not APK), and rendered runtime inspection at narrow/regular phone widths. Device-only and live-provider verification must be described separately and must not be marked passed from mocks.

## Initial evidence

The pre-migration review is stored locally at sibling wedding-be/test-results/wedding-app-review-2026-11-12/review.md. Baseline typecheck/lint passed after npm ci. Isolated Jest baseline: 111 passed / 32 failed, three failing suites. Current backend API differs from the old app pin; the old generated client passes against its own exact historical artifact. The optional Web portal validator rejects valid HTTPS URLs. These are baseline facts, not completed migration work.
