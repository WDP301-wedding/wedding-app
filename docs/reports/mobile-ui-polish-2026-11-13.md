# Mobile UI polish — 2026-11-13

Implemented the six approved UI improvements on the existing local `codex/prm-react-native-migration` checkout. The wine/cream palette, Be Vietnam Pro, top-right notification bell and existing business rules remain in place.

## Changes

- Overview places the next action before the smaller hero image. Event identity has a compact rename action and a single event date. Journey shows the current step and an expandable six-step list; a cancelled event has no active step.
- Agreement places the current contract status, server total, deposit and PDF actions before secondary information. Names, submitted selections and history can be expanded. Pending contract details start expanded; legal copy, selection differences, approval confirmations and revision/capability gates remain available.
- Payment emphasizes the server-provided outstanding amount and places the existing eligibility explanation next to the balance action. Ledger breakdown and transaction history can be expanded. Active-attempt recovery and QR remain ahead of the billing summary; payment arithmetic, requests and eligibility checks were not changed.
- Navigation uses different existing icons for agreement and payment, larger labels and consistent selected styling for More. Routes and notification behavior remain unchanged.
- Login uses a compact brand header and a centered form without the repeated introduction. Primary, secondary and text actions are distinguished. Embedded account settings group password changes under an expandable heading.

The shared disclosure keeps hidden children mounted so that input drafts, OTP cooldowns and loaded pagination are retained. The installed native Expo collapsible removes hidden children, so it would reset those views. No dependency was added to implement this behavior.

## Verification

| Check                               | Result                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| Full Jest run                       | 203 passed, 32 suites; no skipped tests                  |
| TypeScript                          | Passed                                                   |
| ESLint                              | Passed, zero warnings                                    |
| Prettier                            | Passed                                                   |
| Generated API against immutable pin | Passed; schema remains current                           |
| Android JavaScript/Hermes export    | Passed; bundle and assets in ignored `dist/`; not an APK |
| Diff whitespace check               | Passed                                                   |

New behavior coverage includes disclosure accessibility and draft retention, current/cancelled journey display, pending contract details and existing approval capabilities, blocked balance payment with an expanded ledger, and password draft retention without an OTP request when toggling the form.

Real Chrome inspection used React Native Web and a separate local API fixture, with no real accounts or database/provider requests. Inspected login at 320×740 and 430×932, Overview at 320×740 and its expanded journey at 430×932, approved contract and expanded legal details at 390×844, blocked balance payment and expanded ledger at 390×844, and expanded account password settings at 390×844. Vietnamese diacritics, line heights, primary actions and tab labels were inspected in rendered screenshots. The checked layouts had no horizontal overflow; inspected tabs had a 54px minimum height. No browser console errors were reported on the inspected fixture pages.

Local screenshots are in ignored `test-results/ui-polish-2026-11-13/`: `overview-320.jpg`, `journey-430.jpg`, `agreement-390.jpg`, `payment-390.jpg`, `login-320.jpg`, `login-430.jpg` and `profile-390.jpg`. Command logs are in the sibling backend's ignored `test-results/wedding-app-review-2026-11-12/ui-polish-*.log` files. These local evidence artifacts are not Git-tracked.

The owner's port 8099 preview and ignored Render `.env` were preserved. The fixture preview at port 8100 used a separate ignored copy and in-memory synthetic responses. No database records, provider transactions, backend application files or Flutter source files were changed for this UI follow-up. No commit, push, merge or deployment was performed.

## Website logo follow-up

The authentication header now uses the original `wedding-web/public/images/hy-yen-logo.png` in place of the temporary HY circle. The bundled copy has the same SHA-256 (`8f83c190b38d1802a31f4c4f5405afe741d888918e0aacc92062322a6fa7813f`), retains transparency and its 394:414 aspect ratio, and is fitted without cropping. The adjacent Vietnamese brand text remains accessible; the duplicate decorative image is excluded from accessibility. This change covers the shared login/password-recovery header; launcher icons and native splash assets remain unchanged.

All 203 tests, TypeScript, ESLint, Prettier, the diff whitespace check and the Android JavaScript export passed again. Chrome inspection at 320×740 and 390×844 confirmed the image loaded, Vietnamese text remained readable, and no horizontal overflow or console errors appeared. Password recovery navigation was inspected without requesting an OTP. Screenshots are saved alongside the earlier local evidence as `logo-login-320.jpg`, `logo-login-390.jpg` and `logo-reset-320.jpg`.

## Payment disclosure follow-up

At the owner's request, only the two payment disclosures now use an inset panel treatment: a white closed header, a subtle cream surface and champagne outline when expanded, and a stronger heading. Other disclosures retain their existing presentation. Hidden children remain mounted.

The debt breakdown pairs labels with right-aligned, selectable server amounts and thin separators. Transaction rows distinguish the document kind and amount from the smaller timestamp. Long rows wrap on narrow screens, keeping amounts aligned to the right. Empty history has an explanatory message and an existing document icon. No per-document payment status was invented: the ledger API exposes kind, amount and occurrence time, not a pending/succeeded status. Active-checkout status remains in its original section. No financial calculation, checkout request, eligibility gate or recovery behavior changed.

All 204 tests passed across 32 suites, including a history pagination check that closes/reopens the panel, retains loaded entries and verifies the original billing-revision cursor request. TypeScript, ESLint, Prettier, diff whitespace and the Android JavaScript export passed. Chrome inspection used synthetic local responses at 320×740 and 390×844 for expanded debt/history plus empty history; no horizontal overflow or console errors were observed. No real account, database write, OTP or payment transaction was used. The normal Render preview at port 8099 was preserved.

Evidence is saved in ignored `test-results/ui-polish-2026-11-13/payment-ledger-390.jpg`, `payment-history-390.jpg`, `payment-ledger-320.jpg`, `payment-history-320.jpg` and `payment-empty-390.jpg`. Test/build logs use the sibling evidence folder's `payment-panel-*.log` names. These are browser-rendering checks, not native-device or deployed-provider acceptance. No commit/push/deployment was performed.

## Preparation section selector follow-up

Replaced the wrapping row of preparation buttons with one full-width dropdown showing the current section. The same four sections remain: Quy mô & nhóm, Sơ đồ, Thiệp and Phụ lục. Adding an option to the existing section catalogue does not add another inline button. Existing section callbacks, direct destinations, access checks and mounted visited sections remain unchanged, preserving drafts when users switch sections.

Native uses the installed universal Expo Picker in menu mode and a theme-seeded Host. The web-specific component uses a browser select because the installed universal web Picker cannot forward an accessible label or styling props. This keeps standard keyboard/popup behavior while providing the Vietnamese label, existing font/palette and a 56px touch target. No package or framework was added.

All 205 tests passed across 32 suites. The added case exercises section selection, callback delivery, retaining an unsaved headcount after leaving/returning, no unnecessary child reload, and a controlled direct section change. The restricted-access case also checks that the picker is absent. TypeScript, ESLint, Prettier, diff whitespace and Android JavaScript export passed. Chrome inspection at 320×740 and 390×844 confirmed one nonwrapping control, switching to seating/invitations, clean Vietnamese text, no horizontal overflow and no console errors. Native picker appearance was not verified on a device; the export only verifies Android bundling.

Screenshots in the existing ignored evidence folder: `prepare-picker-320.jpg`, `prepare-picker-seating-390.jpg`, `prepare-picker-invitation-390.jpg`. Command logs are the sibling evidence folder's `prepare-picker-*.log`. Runtime checks used the local synthetic API only; no provider/DB writes, publication, commit or push was performed. The normal port 8099 preview and its Render configuration were preserved.

## Remaining acceptance boundaries

Browser emulation does not verify native device keyboard/safe-area behavior, native PDF/share/gallery permissions or actual payment callbacks. No APK/device or deployed-provider acceptance was performed here. The migration's recorded coverage gate (last measurement: 50.61% lines / 45.33% branches against 80%), dependency audit gate and Expo Doctor version mismatch remain open as documented in `prm-react-native-migration-2026-11-12.md`; this UI pass does not clear them.
