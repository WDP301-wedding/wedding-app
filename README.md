# Wedding Android App

Expo/React Native Android application for Couple workflows. It consumes the backend contract and never owns database access, privileged credentials, or authoritative business rules.

Current framework (2026-11-13): **Expo SDK 58** (`expo` 58.0.25), React Native 0.88.1 and React 19.3.0. See the [upgrade report](docs/reports/expo-sdk-58-upgrade-2026-11-13.md) for compatibility changes and verification limits, and [Expo's SDK 58 release notes](https://expo.dev/changelog/sdk-58).

For the complete four-repository setup and contract workflow, see the backend-owned [cross-repository development guide](https://github.com/WDP301-wedding/wedding-be/blob/main/docs/cross-repo-development.md).

## Quick start

Requires Node.js 24.21.0 (see `.node-version`), npm 11.x, and either an Android emulator or an Android device with Expo Go.

The Expo Go client must support SDK 58. An existing standalone/development APK built with SDK 57 must be rebuilt and reinstalled to use the new native dependencies; reloading JavaScript alone cannot upgrade that binary.

```powershell
npm ci
npm run android
```

The shared backend is `https://wedding-be-render-trial.onrender.com/api/v1`.
The app uses the Render API and web portal defaults without a `.env` file. Copy
`.env.example` to `.env` only when you need to override these values locally.
The existing EAS `preview`
APK profile uses the same Render API and the official web portal. After changing
public environment variables, fully reload Expo Go or your development app; an
installed standalone APK needs a new build and installation because these values
are embedded in its JavaScript bundle. This project does not currently configure
EAS Update for replacing that bundle over the air.

For a backend on the host machine, use
`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001/api/v1` from the standard Android
emulator. A physical device needs a reachable development-machine address. Use
HTTPS outside development.

All `EXPO_PUBLIC_` values are embedded in client output. Never put database credentials, Supabase service-role keys, provider keys, signing material, or EAS access tokens in them. `EXPO_PUBLIC_EAS_PROJECT_ID` remains blank until the Expo project is intentionally linked.

## Source structure

- `src/app/`: Expo Router entries and existing deep links.
- `src/screens/workspace/`: the active Couple screens, navigation and workspace policies at the UI boundary.
- `src/screens/identity-screen.tsx`, `native-account-settings.tsx`, `identity.styles.ts`: login, recovery and account settings.
- `src/features/`: typed API gateways and business policies; server decisions remain authoritative.
- `src/components/`: shared UI, confirmation controls and `icons/`.
- `src/lib/`: shared API/error handling, session-scoped cache, confirmations and feedback.

The inactive v0/v2/hy/public screen trees have been removed after their remaining
dependencies were separated. Test fixtures remain alongside the workspace tests.
See [the cleanup report](docs/reports/codebase-cleanup-2026-11-13.md) for the deletion
scope, migrated verification and remaining acceptance boundaries.

## API contract

The generated type declaration at `src/lib/api/generated/schema.d.ts` comes from the backend OpenAPI artifact pinned by exact commit and SHA-256 digest in `api-contract.lock.json`. Keep `wedding-app` and `wedding-be` as sibling directories for the default local source.

```powershell
npm run api:check
npm run api:generate
```

Run `api:check` for normal verification. Run `api:generate` only after the backend contract has been committed and the lock file has been updated to that immutable artifact. Never hand-edit the generated schema.

## Local Android versus EAS

- `npm run android` starts Expo and opens an Android target for development.
- `npm run build` exports the Android JavaScript bundle to `dist/`; it is the local/CI build gate, not an installable APK.
- `npx eas-cli@23.2.0 build -p android --profile preview` is a manual cloud build. It requires Expo authentication and a linked project, may consume quota or incur cost, and is reserved for the later release stage. CI does not run it.

## Commands

| Command                 | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `npm run start`         | Start the Expo development server                        |
| `npm run android`       | Start Expo and open Android                              |
| `npm run build`         | Export the Android JavaScript bundle locally             |
| `npm run lint`          | Run ESLint with zero warnings allowed                    |
| `npm run typecheck`     | Run TypeScript without emitting files                    |
| `npm run test`          | Run Jest in-band                                         |
| `npm run test:coverage` | Run the Jest coverage gate                               |
| `npm run api:generate`  | Regenerate the typed API schema                          |
| `npm run api:check`     | Verify the locked artifact and committed schema          |
| `npm run audit:ci`      | Run audit-policy tests and the reviewed dependency audit |
| `npm run format:check`  | Check Prettier formatting                                |

## Validation status

The latest local checks (2026-11-13) passed 147 tests across 32 suites, TypeScript,
ESLint, formatting, the locked API check and Android JavaScript export. Release
acceptance remains open: the last recorded coverage is 69.66% lines / 65.32%
branches against 80% required, the dependency audit still reports an unreviewed
high-severity Zod advisory, and full native/provider journeys remain unverified.
See `tasks/todo.md` and the reports under `docs/reports/` for the evidence boundaries.

## Troubleshooting

- If the emulator cannot reach `localhost`, use `10.0.2.2`; on a physical device, use a reachable LAN address and align backend CORS/network settings.
- A digest mismatch means the local OpenAPI file is not the artifact recorded in `api-contract.lock.json`; do not bypass it. Update the lock only after the backend contract commit exists.
- If EAS asks for login, credentials, or project linking during routine development, stop and use the local Expo commands above.
