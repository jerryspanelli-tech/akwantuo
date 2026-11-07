# AKWANTUO Repository Baseline Audit

**Document ID:** AKW-AUDIT-001  
**Date:** 2026-11-07  
**Audited ref:** `main` at `8aa31d5e730086b894456c14d5f224ab8b837c4e`  
**Scope:** Read-only inspection of repository tree, source files, documentation and GitHub check metadata. No live database, full local runtime, physical device or multiplayer session was tested.

## Executive finding

AKWANTUO is a substantial TypeScript/Babylon.js prototype with Greater Accra transport/world foundations and Supabase client/database code. It is **not yet a complete online open-world game**. The README describes an early prototype with temporary development geometry. The Colyseus multiplayer server is planned, and no `apps/server` directory was present in the inspected main tree.

## Findings

1. **Client foundation exists.** `apps/game` uses Babylon.js 8, TypeScript and Vite. `apps/game/src/main.ts` contains startup/menu, player, camera, input, character, vehicle and service integration code.
2. **Player character is still placeholder geometry.** `createPlayer` in `apps/game/src/main.ts` builds a character from primitive capsule/sphere meshes. Appearance presets exist, but this is not a finished realistic character/animation pipeline.
3. **Appearance persistence exists in two forms.** `apps/game/src/character/appearanceStore.ts` implements browser-local storage; `apps/game/src/services/supabase.ts` and the migration contain cloud profile code. Live auth, profile persistence and RLS behaviour still require testing against the intended Supabase project.
4. **Dedicated multiplayer server is absent from the inspected tree.** README/architecture describe Colyseus as planned. Shared contracts exist in `packages/shared`; no server workspace was found. Server-authoritative rooms, presence, movement validation and multi-client verification remain outstanding.
5. **Greater Accra world/transport foundations exist but are not a complete drivable city.** `greaterAccraPlayableWorld.ts` and related modules create compressed map, road/rail meshes, interchange geometry and planned markers. Source comments explicitly state that this is not surveyed GIS/engineering data and that road/rail meshes are visual-only; full collision, lane navigation and traffic control are not implied.
6. **Transport modules have mixed completion levels.** Vehicle dynamics, public transport, rail and watercraft code exists. File presence does not prove every vehicle, route, collision, boarding/alighting, camera transition or multiplayer path is fully integrated. The transport closeout document records explicit limitations.
7. **Economy and ownership database code exists.** The migration `supabase/migrations/20261106164000_akwantuo_player_economy.sql` defines profiles, wallets, shop products, inventory, transactions, assets, ownership, RLS and purchase functions. Live migration state, concurrency, insufficient-funds/stock and ownership reload tests remain outstanding.
8. **Island environment is first-pass procedural geometry.** `privateIsland.ts` builds beach, villa, dock, helipad, palms and displayed boats from primitive meshes. Its own comment calls this first-pass landmark geometry; it does not prove a final detailed island or five drivable owned craft.
9. **CI has limited coverage.** `.github/workflows/ci.yml` installs dependencies, checks Supabase Auth endpoint reachability, typechecks and builds. Auth endpoint reachability is not proof of full account/profile/economy functionality.
10. **Main check state has a known failure.** For audited main SHA `8aa31d5e730086b894456c14d5f224ab8b837c4e`, the TypeScript/typecheck/build check completed successfully on 2026-11-06, while the transport-preview check completed with failure. A later successful PR run on a different branch/SHA does not erase this main-branch failure.
11. **Architecture documentation is stale.** `docs/architecture.md` still describes Supabase as planned while README and current source describe client/profile/economy integration. Docs must distinguish code present, live behaviour verified and systems still planned.

## Priority follow-up

- Diagnose and rerun the failed main transport-preview check.
- Establish clean install, typecheck, production build and browser smoke-test evidence.
- Verify Supabase auth, profile persistence, RLS and economy transactions on the actual project.
- Keep multiplayer marked planned until a server and multi-client tests exist.
- Replace primitive player placeholder with approved realistic model/animation pipeline.
- Convert visual-only transport geometry into staged, tested playable navigation/collision/traffic.
- Verify road vehicles, trotro, rail, speedboat and jet ski independently.
- Verify island access, interiors, ownership and the difference between rentals and purchased craft.
- Establish real-device mobile performance and compatibility baselines.
- Reconcile README, architecture and transport report claims with tested evidence.

## Next gate

Phase 1 foundation readiness requires a passing relevant CI suite, clean build, browser smoke tests, Supabase verification, a feature matrix with evidence and CEO approval. This audit is not a full runtime audit or security penetration test. No screenshots were captured and no live multiplayer or physical phone test was performed.
