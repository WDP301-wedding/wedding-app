# Clean-install lockfile repair

PR #16 initially failed during `npm ci` with npm 11.19.0 because the committed lockfile lacked optional `fsevents@2.3.3`, required by `jest-haste-map`. Lint, typecheck and export did not run in that attempt. The developer runtime used npm 11.6.0, whose local dry-run did not expose the missing entry.

The failure was reproduced with npm 11.19.0 in an isolated directory containing only the committed manifests and npm configuration, using Linux/x64 resolution. Regenerating the lockfile with `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` added the missing optional Darwin package and corrected 34 dependency `dev` classifications. A structural comparison confirmed that no existing package version, source or integrity value changed, and no manifest or application source changed.

The same isolated `npm ci --dry-run --ignore-scripts --no-audit --no-fund` check then passed. The existing GitHub CI must rerun on the repair commit to verify the real Linux clean install and downstream checks. Local evidence is retained in ignored `test-results/publish-2026-11-13/`. Coverage, audit and device/provider acceptance limits in `tasks/todo.md` remain open; this repair does not waive them.

## Clean-checkout Expo types

The next GitHub run passed dependency installation, Expo Doctor and lint, then failed TypeScript on the side-effect import of `src/safe-area.css`. Local development had generated the ignored `expo-env.d.ts`, which referenced Expo's supplied CSS declarations; a fresh checkout had no such file yet. Removing generated Expo files from the compiler's input reproduced TS2307 locally. Adding `expo/types` to the existing `compilerOptions.types` loads those official declarations explicitly, preserving `noUncheckedSideEffectImports` and every other strict setting. No wildcard declaration or error suppression was added. The same clean-input typecheck is used to verify the fix before rerunning CI.
