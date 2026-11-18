# Expo SDK 58 dependency alignment — 2026-11-18

PR #17's payment fix passed local tests, but GitHub Expo CI run `44309636979` failed the SDK compatibility check: Expo Doctor passed 19/20 checks and requested six newer package versions. The owner authorized updating these six packages, retesting and merging the PR.

## Final dependency scope

| Package                        | Before  | After   |
| ------------------------------ | ------- | ------- |
| `@expo/ui`                     | 58.0.28 | 58.0.29 |
| `expo`                         | 58.0.25 | 58.0.26 |
| `expo-file-system`             | 58.0.13 | 58.0.14 |
| `expo-router`                  | 58.0.31 | 58.0.32 |
| `expo-web-browser`             | 58.0.8  | 58.1.0  |
| `jest-expo` (development only) | 58.0.14 | 58.0.15 |

The project remains on SDK 58, React Native 0.88.1 and React 19.3.0. Only these six direct dependency ranges changed. The package manager also updated their transitive packages; the lockfile comparison recorded 20 changed package versions in total, with no package paths added or removed. The optional `fsevents@2.3.3` entry is retained. npm 11.19.0 and the existing script-blocking policy were used; no overrides, audit exceptions or validation exclusions were added.

The Expo CLI required registering `expo-web-browser` in the dynamic `app.config.ts`. Its default plugin is registered without enabling experimental launcher behavior. Application routes, payment amounts, checkout requests and provider-status rules are unchanged by this alignment. Existing native builds need rebuilding to incorporate native dependency updates; an Android JavaScript export does not perform that rebuild.

## Source review

Reviewed the version-specific entries in the official SDK 58 changelogs:

- [Expo 58.0.26](https://github.com/expo/expo/blob/sdk-58/packages/expo/CHANGELOG.md): development connection fix and updated bundled tooling.
- [Expo UI 58.0.29](https://github.com/expo/expo/blob/sdk-58/packages/expo-ui/CHANGELOG.md): native sheet/menu fixes.
- [File System 58.0.14](https://github.com/expo/expo/blob/sdk-58/packages/expo-file-system/CHANGELOG.md): Android content-provider copy/upload fixes.
- [Router 58.0.32](https://github.com/expo/expo/blob/sdk-58/packages/expo-router/CHANGELOG.md): navigation/native tab fixes.
- [WebBrowser 58.1.0](https://github.com/expo/expo/blob/sdk-58/packages/expo-web-browser/CHANGELOG.md): optional authentication-session HTTP headers. This app adds no use of that feature.
- [Jest Expo 58.0.15](https://github.com/expo/expo/blob/sdk-58/packages/jest-expo/CHANGELOG.md): Expo UI native-state mocks.

## Validation boundaries

An isolated manifest-only Linux/x64 `npm ci --dry-run` passed with npm 11.19.0, without modifying the working installation. Detailed local evidence, including the direct/transitive package comparison, is retained in ignored `test-results/payment-attempt-booking-scope-2026-11-18/`.

After alignment, all 149 Jest cases passed across 32 suites with the unchanged project timeout. The coverage command still exits 1 because measured coverage is 70.60% lines / 66.97% branches against the unchanged 80% requirements; the test cases themselves passed. See `sdk-coverage.log` for the complete result.

TypeScript, lint, formatting, the pinned API check and Android/Hermes JavaScript export passed locally. The 5.1 MB export is not an APK. Expo Doctor passed package compatibility and all other local checks except the remote config-schema request, which failed before establishing its TLS connection. No TLS bypass or Doctor exclusion was introduced. [PR #17](https://github.com/WDP301-wedding/wedding-app/pull/17) tracks the full Linux CI result on the resulting commit.

Audit policy tests passed 16/16, while the audit gate still fails with 0 critical, 72 high, 10 moderate and 0 low affected packages, primarily the shared [Picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) and [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). These are recorded failures, not waivers or evidence of a proven exploit in the app.

The known coverage, dependency audit and real device/provider acceptance limits remain open unless explicitly recorded as resolved by new evidence. This work adds no live checkout, database write, cloud native build or production deployment.
