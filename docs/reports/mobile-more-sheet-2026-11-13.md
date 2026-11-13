# More menu motion — 2026-11-13

The former React Native Modal used `animationType="slide"`, moving both the menu and its full-screen scrim. The More menu now uses the installed universal Expo UI BottomSheet, which presents the sheet separately from its scrim. Existing React Native controls are hosted in RNHostView with content-height measurement. The menu labels, actions, settlement eligibility and safe-area padding are preserved. No package, API or database changes were made.

The installed web implementation separates overlay opacity from panel translation, using its 300ms sheet transition and honoring reduced motion. Native presentation is delegated to the platform sheet.

All 212 tests passed across 33 suites. TypeScript, ESLint and the Android JavaScript/Hermes export passed. Existing navigation tests still cover settlement restrictions and Android Back; an additional case covers native dismissal, reopening, profile navigation and switching bookings. A shared Jest double models the native sheet's separate window rather than letting the native Host's pointerEvents block test presses. These tests do not measure native animation quality.

An isolated UI-only browser entry rendered the actual navigation component without login or API calls. Inspection at 320x740 and 390x844 showed readable Vietnamese labels, no horizontal overflow and no console warnings/errors after the preview asset proxy was configured. Closing and reopening worked. The browser reported reduced motion enabled, so full-motion timing was not visually certified. Screenshots were inspected inline.

No emulator/device was connected. Native appearance, full-motion smoothness and release-device performance remain unverified. No commit, push or deployment was performed.
