# AKWANTUO Phase 1 — implementation and QA status

Date: 2026-11-08  
Status: **Core scaffold implemented; Vercel preview build READY; physical-device/browser QA pending.**  
Branch: `rebuild/clean-foundation`  
Latest verified preview commit: `49ee755eda6bfde7e4232781dee13ba5d2adcc13`

## Implemented
- Clean npm workspace with a TypeScript + Vite + Babylon.js client at the existing Vercel root `apps/game`.
- Original AKWANTUO opening screen and responsive main menu.
- Settings panel with locally persisted graphics quality (Auto, High, Performance).
- Babylon.js runtime lazy-loaded only when the player selects Enter the world.
- First Greater Accra-inspired neighbourhood blockout: laterite ground, road markings, low-rise shopfronts, palm trees and a controllable player preview.
- Keyboard movement (WASD/arrow keys), touch movement joystick and touch/pointer camera control.
- Return-to-menu and readable scene-startup error handling.
- GitHub Actions workflow `.github/workflows/phase1-ci.yml` for typecheck and production build.

## Verified evidence
- Existing Vercel project automatically created a preview for commit `49ee755eda6bfde7e4232781dee13ba5d2adcc13`.
- Deployment: `akwantuo-nlf2qfwc8-jerry-03e4.vercel.app`.
- Deployment state: **READY**.
- Vercel build completed successfully; Vite transformed 418 modules.
- Initial application JS: 4.35 kB (2.06 kB gzip).
- Lazy-loaded Babylon world chunk: 693.93 kB (166.36 kB gzip).
- Build emitted a chunk-size advisory because the deferred world chunk exceeds 500 kB uncompressed. It is deferred until Enter the world; this is recorded for later performance profiling.
- The build script runs TypeScript compilation before Vite production build; the deployment completed successfully.
- Earlier intermediate preview failures/cancellations were superseded by the READY deployment above.

## QA not yet complete
- No automated browser smoke test or physical iPhone/desktop test has been recorded yet.
- GitHub Actions workflow has been committed, but the Actions runs endpoint currently reports zero runs; do not claim CI green until a run is observed.
- Preview access is subject to the existing Vercel deployment protection. No protection setting was changed.
- The scene is a technical blockout, not final realistic Ghanaian art.
- The visible player is a temporary capsule preview, not the final Ghanaian character model.
- Continue/account, saved characters, online multiplayer, economy and production Supabase integration are not part of this milestone's implementation.

## Service and release safety
- Supabase project, schema, migrations, Auth users and data were not changed.
- Vercel project settings, domains, environment variables and production configuration were not changed.
- This is a preview deployment only. It was not promoted to production.
- No merge to `main` was performed.
- No archived branches or preserved game source were deleted or modified.

## Required next QA pass
1. Open the preview on an iPhone and an ordinary desktop browser.
2. Confirm the opening screen and main menu render correctly.
3. Select Enter the world; confirm the 3D environment renders.
4. Test WASD/arrow movement on desktop.
5. Test joystick movement and camera drag on phone.
6. Return to the menu and re-enter the world; confirm no duplicate render loops or startup failure.
7. Report any black screen, missing input, visual issue or browser console error before Phase 1 is signed off.

**Decision:** Phase 1 is not declared complete until this QA pass and a successful CI run are recorded.
