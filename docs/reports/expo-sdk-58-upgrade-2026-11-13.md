# Expo SDK 58 upgrade — 2026-11-13

Upgraded the existing local migration checkout from Expo 57.0.31 to **58.0.25**, the npm registry's stable `latest` at verification time. The compatible versions installed by Expo are React Native **0.88.1**, React/React DOM **19.3.0**, Expo Router **58.0.31**, Jest **30.5.2** and jest-expo **58.0.14**. The Expo modules, React Native support packages, React/Jest types and Expo lint configuration were aligned with the SDK 58 version map. Application version remains 0.1.0.

## Compatibility changes

- Replaced component-class ref types with React Native's `TextInputInstance` and `ScrollViewInstance` types. Kept the Strict API and existing strict compiler settings enabled. The legacy guest-list footer now omits its component with `undefined`; the legacy payment listener handles an initially unknown AppState.
- SDK 58 `File.write()` is asynchronous. PDF sharing and QR gallery import now wait for the write to complete. Regression tests use delayed/rejected writes to prove that incomplete files are not shared/imported and a QR write failure produces an error instead of success. The tests first failed against the previous implementation and then passed after adding the awaits.
- Added CSS safe-area spacing to the web root, following SDK 58's change from automatic web measurements to CSS insets. Native inset handling stays in place. Explicit SPA web output and existing routes are retained.
- Jest's CommonJS transform now handles dynamic native imports with the development-only Babel dynamic-import plugin. The rest of the Expo preset, including asset transforms, remains intact; Metro's production transformation is unchanged. Jest roots now match the already-existing `src/` test scope, avoiding duplicate package names in generated evidence directories. No test, coverage threshold, assertion or compiler check was disabled.

The existing TypeScript 5.9.3 pin and its prior Expo validation exclusion were retained; strict compilation passes. No unrelated SDK features, new architecture options, React Compiler setting or app-store configuration were enabled.

## Installation and preservation

The prior package manifest, lock and app configuration were saved under ignored `test-results/expo-sdk-58-upgrade-2026-11-13/`. The initial incremental installation encountered peer resolution against the previous SDK 57 lock. A clean resolution with all SDK 58 dependencies succeeded without `--force` or `--legacy-peer-deps`, followed by a successful `npm ci`. The explicit development-only Babel plugin was subsequently installed through Expo CLI.

Moving the old generated preview directory interrupted the first clean installation because it contained a node_modules junction. That operation ended; the junction itself was removed nonrecursively after checking its path/target, and a second clean installation succeeded. Product source files were preserved. The old preview artifacts are outside this app's source tree; no generated native directories or platform regeneration were required.

The `.env` connection values, API pin, authentication/financial rules and prior UI changes were preserved. No backend/Flutter application code, database records, real accounts, OTP requests or provider transactions were modified. No APK/EAS build, commit, push, merge or deployment was performed.

## Verification

| Check                            | Result                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Clean dependency installation    | Passed, without peer overrides                                                                                                    |
| Expo dependency compatibility    | Passed                                                                                                                            |
| Strict TypeScript / ESLint       | Passed                                                                                                                            |
| Full Jest run                    | 208 passed, 33 suites; none skipped                                                                                               |
| Async native file-write cases    | 5 focused tests passed, including existing PDF validation/download cases                                                          |
| Android JavaScript/Hermes export | Passed with cleared cache; ignored `dist/`, not an APK                                                                            |
| Web export                       | Passed; output retained in ignored evidence `web-dist/`                                                                           |
| Generated API pin                | Unchanged; verified separately                                                                                                    |
| Browser rendering                | Login at 320×740, password-recovery navigation at 390×844; logo/font loaded, no horizontal overflow or console errors             |
| Expo Doctor                      | 19/20 checks completed successfully; remote configuration-schema check failed twice with a TLS connection failure to the Expo API |
| Audit policy tests               | 16 passed                                                                                                                         |
| Dependency audit gate            | Failed: the pre-existing direct Zod advisory remains unreviewed                                                                   |

Browser inspection used a fresh signed-out context with the normal Render configuration at port 8099; it did not submit credentials or request an OTP. Private workspace browser/provider flows were not replayed in this upgrade. Their source behavior remains covered by the complete unit suite, and historical UI screenshots are not presented as new SDK 58 device evidence. The usual confirmation-component require-cycle development warnings remain.

Before/after audits were run on the saved old lock and the new lock on the same date. Package-level findings changed from 27 (6 high, 12 moderate, 9 low) to 29 (1 high, 27 moderate, 1 low). The remaining high finding is the same Zod `<4.6.6` advisory, GHSA-mrhx-c7xc-m3w5; direct Zod 4.6.5 was not changed by this Expo upgrade. No audit exception was added or expanded. This result is not a clean security gate.

Command logs, old manifests and the two rendered screenshots (`login-320.jpg`, `reset-390.jpg`) are local ignored evidence in `test-results/expo-sdk-58-upgrade-2026-11-13/`. Formatting/API/diff checks are recorded alongside the suite and export logs. The framework upgrade does not clear the earlier migration coverage gate or substitute for Android-device acceptance. Expo Go must support SDK 58; previously installed standalone/development binaries need rebuilding for the changed native dependencies.

Primary implementation references: [SDK 58 release](https://expo.dev/changelog/sdk-58), [Router migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/), [React Native Strict API](https://reactnative.dev/docs/strict-typescript-api), [SDK 58 FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [web safe areas](https://docs.expo.dev/develop/user-interface/safe-areas/).
