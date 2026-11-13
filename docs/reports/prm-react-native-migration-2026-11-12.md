# PRM Flutter → React Native implementation report

Date: 2026-11-12. Status: implemented locally for review; release acceptance is **not met**. No commit, push, merge, deployment, APK build, database change or real payment was performed for this migration.

## References and scope

- Flutter behavior/UI reference: `WDP301`'s sibling `PRM393/PRM-app`, commit `0b82778d0d1abf62b2a2f780b5d0416714a8eddb`.
- React Native starting point: `wedding-app` commit `c2137f3be3181cb635fedd02d1c81c30941ef18a`.
- Backend contract: `wedding-be` commit `37ee17a1fd9fb88db17bfecdd763d3ae78d35101`, artifact SHA-256 `5e6ea2a0e3f9de33f458b5e82c6dffb11f7211a2b903f31804cb23a625eaa57d`. Generated client was regenerated from this exact artifact.
- Branch: `codex/prm-react-native-migration`. Backend, Flutter and the two Next.js application sources were not modified.

The source's four sections and Thêm menu replace the old startup shell. Existing Expo SDK 57, secure session storage, generated HTTP client and payment idempotency infrastructure are retained. The port uses Be Vietnam Pro and the source wine/cream Hỷ Yến palette. Vietnamese labels preserve authored case and normal letter spacing. The source hero image is copied unchanged (`FAF1FD5D47978C385795FDB7617F4D70AACAA6F81621EBE2ADE659D864776F4D`). Native controls differ from Flutter Material widgets; this is a React Native implementation of the source flows, not a pixel-identical Flutter renderer.

## Source-to-target map

| Flutter reference under `lib/features/`                   | React Native implementation                                                                                                 | Behavior                                                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace/space_shell.dart`, workspace providers/helpers | `src/screens/workspace/couple-workspace.tsx`, `workspace-navigation.tsx`, `src/features/couple-workspace/policies.ts`       | Paginated authorized bookings, nearest active default, scoped switching, four tabs, Thêm and Android Back                                                  |
| `workspace/overview_screen.dart`, `overview_tasks.dart`   | `workspace-overview.tsx`                                                                                                    | Alias, source hero/date/phase, six steps, completion blockers, current financial status and recent notifications                                           |
| Agreement/timeline/contracts and customer selections      | `workspace-agreement.tsx`, `workspace-timeline.tsx`, `commercial-editor.tsx`, `commercial-policies.ts`, `contract-files.ts` | Names, revisioned timeline, server price preview, submission/contract differences, approvals/change requests, immutable PDF/history                        |
| `payments/`                                               | `workspace-payment.tsx`, `payment-qr.tsx`                                                                                   | Contract-based deposit, active-attempt recovery, bounded polling, manual reconciliation, QR, ledger and explicit server balance eligibility                |
| `prepare/` groups and seating                             | `workspace-groups.tsx`, `workspace-seating.tsx`                                                                             | Headcount/capacity, groups, seating snapshot with zoom/pan, existing web editor handoff                                                                    |
| Invitation/printing preparation                           | `workspace-invitations.tsx`                                                                                                 | Design text preview, current publication, exact revision publish/unpublish, public link/QR/share; design/media/printing editing stays on web as in Flutter |
| `prepare/appendix_section.dart`                           | `workspace-appendices.tsx`, shared commercial editor                                                                        | Effective predecessor/frozen prices, draft/review/submit/approve/cancel; print-linked requests stay outside generic cancellation                           |
| `settlement/`                                             | `workspace-settlement.tsx`                                                                                                  | COMPLETED gate, immutable expense/adjustment review evidence, current invoice/history and ledger navigation                                                |
| Notifications and profile                                 | `workspace-notifications.tsx`, embedded `native-account-settings.tsx`                                                       | Inbox/read/paging, owned-booking destinations, display name and current-password OTP change                                                                |
| Source realtime service                                   | `src/features/couple-workspace/realtime.ts`                                                                                 | Fresh handshake token, selected-booking subscription, schema/event deduplication, revoked session handling, resume resync and cleanup                      |

Source-compatible `/dang-nhap`, `/quen-mat-khau` and `/khong-gian/...` entries are accepted alongside existing app entries. In-app tabs use component state; the browser URL does not change on every tab press. Seating uses explicit zoom controls and scroll/pan rather than Flutter's pinch gesture. Native PDF handling uses the OS share/open chooser. These implementation differences require device review.

## Correctness boundaries

- Totals, deposit amount, accepted commercial prices, invoice contents and payment outcomes come from backend snapshots. The app does not recalculate contractual money or infer success from a return URL.
- Balance admission requires COMPLETED, a current billing fence and explicit `canPay: true / PAY_BALANCE / reasonCode: null`. Missing or unknown advice remains blocked.
- Review requests carry exact review/revision/digest evidence and stable retry keys. Commercial/timeline drafts retain entered content and block saving when their captured booking revision becomes stale.
- Only owning Couple accounts enter this workspace. Notification destinations must also be in the authorized booking list. Tokens are sent in authorization headers/socket handshake, never in public invitation or web handoff links.
- Active preparation uses guest groups and headcount. Retired named-guest/link/check-in mutation helpers now reject locally. Historical DTOs are isolated solely to compile the retained inactive legacy UI; they are not presented as live API contracts.
- This change adds no FCM/device-push feature. Flutter's web handoffs and existing backend capabilities remain the scope boundary.

## Verification and evidence

The ignored local evidence folder is `../wedding-be/test-results/wedding-app-review-2026-11-12/`. It contains command logs and the synthetic in-memory browser API. Test data and credentials use clearly synthetic `.invalid` identities; no Supabase or provider records were written. The temporary `.env.local` and both local servers were removed/stopped after inspection; the original `.env` was retained.

Focused tests cover configuration, role admission, phase/capacity policies, selection pricing/version rules, immutable review requests, revision conflicts, contract/PDF guards, payment admission, notification pagination/read failure, owned-booking navigation, print-linked appendices and realtime deduplication/cleanup. Existing tests were updated to current labels, legal-name precedence, OTP sequence, tab structure and toast presentation. No test case was skipped or deleted, no CI step was removed and no coverage/audit threshold was reduced.

Real browser inspection used React Native Web at 320×740, 390×844 and 430×932. It covered login, overview, agreement/contracts, preparation/groups, no-plan seating, pending payment/QR, completed settlement, profile and inbox navigation. Vietnamese glyphs and heading line heights were inspected in screenshots. Checked pages had no horizontal overflow. Entering 101 guests against ten tables disabled save; a synthetic unresolved checkout displayed a QR, blocked another checkout and exercised the browser PNG download path. This proves browser rendering/control behavior only. Fixture defects encountered during setup were corrected to match the contract; fixture results do not prove a deployed backend integration.

Existing development warnings from the shared confirmation components' import cycles remain. Device keyboard/safe-area behavior, native gallery permission/save, Android PDF/share chooser, real app background/resume and real-provider callbacks were not verified on an Android device. No native/APK build was requested or run.

## Open acceptance gates

Latest verification (local, 2026-11-12):

| Check                               | Result                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| Generated API against immutable pin | Passed                                                             |
| Formatting / lint / TypeScript      | Passed                                                             |
| Full Jest cases                     | 196 passed, 31 suites; no skipped cases                            |
| Coverage gate                       | **Failed**: 50.61% lines, 45.33% branches; required 80% each       |
| Android JavaScript export           | Passed; Hermes bundle and assets exported to ignored `dist/`       |
| Dependency audit policy tests       | 16 passed                                                          |
| Dependency audit gate               | **Failed**: inherited unreviewed high advisories                   |
| Expo Doctor                         | **Failed**: 20/21; SDK 57 patch-version check                      |
| Browser UI inspection               | Passed within the explicitly documented fixture/browser boundaries |

The companion checklist retains the overall acceptance item as incomplete because the required coverage/audit gates remain failed.

- The full coverage gate remains below the repository's unchanged 80% line/branch requirement. Passing test cases do not make this gate pass. The final command results are recorded in `tasks/todo.md`; further meaningful regression coverage is required before release acceptance.
- Dependency audit reports 27 affected packages: 6 high, 12 moderate, 9 low. Auditing the original committed package lock on the same date produces the same affected-package set and counts. No finding is waived here; `audit:ci` still fails on unreviewed high advisories. The migration does not claim these inherited findings are harmless.
- Expo Doctor passes 20/21 checks; its version check asks for seven newer SDK 57 patch releases. The existing seven versions were retained. No SDK migration or exclusion was introduced to hide this result.
- Android-device and deployed backend/provider acceptance remain outstanding. The old inactive screen tree is retained for a separate reviewed cleanup; it is not used by the new app entry.

Framework implementation references: [Expo SVG](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), [Expo media library](https://docs.expo.dev/versions/v57.0.0/sdk/media-library/), [QR component API](https://github.com/Expensify/react-native-qrcode-svg), [Socket.IO authentication](https://socket.io/docs/v4/client-options/#auth).

## Notification placement follow-up — 2026-11-12

At the owner's request, notifications now open from a bell at the upper-right of each signed-in workspace page title. The bell uses the existing account unread-count API, shows `99+` above 99 and no badge at zero. Its touch area is 44×44. The notification preview and duplicate inbox link were removed from the bottom of Overview, and notifications were removed from More. Inbox operations, authorization checks and destination routing remain unchanged; notifications select the header bell rather than the More tab.

All 198 Jest cases passed across 31 suites, including header navigation, badge updates/zero/99+, signed-out visibility, removal of the bottom preview and existing foreign-booking protection. TypeScript and workspace lint passed. Browser inspection uses an isolated copy with synthetic data at port 8100; the owner's port 8099 and Render `.env` remain unchanged. This follow-up does not clear the migration's outstanding coverage/audit/device acceptance gates above.
