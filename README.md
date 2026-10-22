# Wedding Android App

Expo/React Native Android application for Couple workflows. It consumes the backend contract and never owns database access, privileged credentials, or authoritative business rules.

For the complete four-repository setup and contract workflow, see the backend-owned [cross-repository development guide](https://github.com/WDP301-wedding/wedding-be/blob/main/docs/cross-repo-development.md).

## Quick start

Requires Node.js 24.21.0 (see `.node-version`), npm 11.x, and either an Android emulator or an Android device with Expo Go.

```powershell
npm ci
Copy-Item .env.example .env
npm run android
```

The shared backend is `https://wedding-be-render-trial.onrender.com/api/v1`.
Copy `.env.example` to `.env` for local Expo development. The existing EAS `preview`
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

## Troubleshooting

- If the emulator cannot reach `localhost`, use `10.0.2.2`; on a physical device, use a reachable LAN address and align backend CORS/network settings.
- A digest mismatch means the local OpenAPI file is not the artifact recorded in `api-contract.lock.json`; do not bypass it. Update the lock only after the backend contract commit exists.
- If EAS asks for login, credentials, or project linking during routine development, stop and use the local Expo commands above.
