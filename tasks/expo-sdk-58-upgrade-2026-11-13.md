# Expo SDK 58 upgrade — 2026-11-13

Owner requested the latest Expo version after the preparation dropdown follow-up. Upgrade the existing checkout from Expo 57.0.31 to the registry's stable 58.0.25 and align the Expo/React Native/testing dependencies. Preserve all existing UI work, API contracts, auth/payment behavior and environment values. No database, provider transaction, app-store/cloud build, commit, push or deployment is authorized by this task.

- [x] Read Expo's SDK 58 release, Router migration, Strict TypeScript API and FileSystem guidance; record the registry's stable version.
- [x] Save the current package manifest/lock and app configuration in ignored local evidence before modifying dependencies.
- [x] Install the complete compatible dependency tree without force/legacy peer overrides.
- [x] Migrate actual SDK 58 incompatibilities; verify asynchronous PDF/QR file writes before sharing/importing.
- [ ] Pass package-version validation and Expo Doctor; compare dependency audit results without adding waivers. Version validation passed; Doctor is 19/20 because its remote schema request failed twice during TLS connection. Audit comparison is recorded; the pre-existing high Zod finding still blocks `audit:ci`.
- [x] Pass TypeScript, lint, formatting, API check, full tests and Android JavaScript export.
- [x] Inspect the running app and restore the owner's normal port 8099 preview.
- [x] Update setup documentation and record exact acceptance boundaries.

Historical migration coverage/device/provider gaps remain separate from this framework upgrade. No existing test, threshold or strict compiler setting may be weakened to pass the upgrade.

Results: `docs/reports/expo-sdk-58-upgrade-2026-11-13.md`. All 208 tests passed in 33 suites; Android and web JavaScript exports passed. No native device/APK or live provider acceptance is claimed.
