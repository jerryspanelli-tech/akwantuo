# AKWANTUO Phase 0 Audit Report

Status: **Phase 0 research complete; architecture approved by CEO 2026-11-08. Phase 1 implementation underway.**
Audit date: 2026-11-08
Scope: GitHub repository, existing Supabase project and Vercel project. All Supabase inspection was read-only; no production service settings were changed.

## 1. Repository and recovery status

- Repository: `jerryspanelli-tech/akwantuo` (private).
- Default branch: `main`.
- `main` remains at `8aa31d5e730086b894456c14d5f224ab8b837c4e`.
- Isolated working branch: `rebuild/clean-foundation`.
- Current clean branch head after recording the architecture proposal: `4d6dbfbe164cf0b59bf483efd54d88b3469dd70d`.
- Four archive branches remain: `archive/pre-rebuild-main-2026-11-08`, `archive/pre-rebuild-phase1-2026-11-08`, `archive/pre-rebuild-studio-2026-11-08`, `archive/pre-rebuild-transport-2026-11-08`.
- Existing non-archive branches `phase-1/backend-isolation-and-runtime-truth` and `fix/transport-offshore-disembark-test` also remain.
- At the time of the Phase 0 audit, the clean branch had only the README, approved master prompt and architecture proposal. The Phase 1 scaffold is now being created separately; no previous gameplay source is being copied into the clean branch.

Recovery refs are present, but GitHub reports the branches are not protected. The team must avoid force-pushing or deleting these branches. A separate backup/export would provide additional protection before any future destructive repository administration.

## 2. Previous codebase inventory and technology evidence

The preserved source tree contained 129 entries at the archived main commit, including:
- TypeScript game client under `apps/game`.
- Babylon.js 8.x dependency.
- Vite 8.x build tooling.
- npm workspaces and a small `packages/shared` package.
- Character appearance and hairstyle modules.
- World layout, Greater Accra roads, buildings and interiors.
- Road vehicle, motorcycle and watercraft modules.
- Supabase client integration.
- Browser previews and transport verification scripts.
- GitHub CI and transport-preview workflows.

The previous game entry point had a large `main.ts` file (about 92 KB), so the clean implementation should keep gameplay systems modular and avoid recreating a monolithic entry point.

A previous Vercel deployment from the preserved Phase 1 branch reached READY and completed a Vite production build, transforming 2,258 modules. This is evidence that the earlier Vite toolchain could build, not evidence that the new clean branch currently builds.

**Recommendation:** retain TypeScript + Babylon.js + Vite as the client foundation, but implement a fresh modular codebase. This is a technology recommendation, not approval to import old game code.

## 3. Supabase audit — preservation and current capabilities

Existing project: `ugiysogfkclbcryhtkyn`
Status: `ACTIVE_HEALTHY`, PostgreSQL 17.
Recorded migration: `20261107072841_akwantuo_player_economy`.

Existing public tables:
- `player_profiles`
- `player_wallets`
- `shop_products`
- `player_inventory`
- `game_transactions`
- `game_assets`
- `player_owned_assets`

RLS is enabled on all seven tables. Policies inspected are scoped to authenticated users, with player-owned records filtered using `auth.uid()`. The shop catalogue and active game assets are readable by authenticated players.

The schema already provides:
- Player display name, gender, age, appearance JSON and game-save JSON.
- Wallet balance stored in pesewas.
- Product catalogue and stock.
- Per-player product quantities.
- Transaction history.
- Purchasable game assets and ownership records.

Important distinction: the six existing asset catalogue rows and asset type constraint (private island, boat, yacht, jet ski) are ownership/economy catalogue data. They do **not** establish that a playable island map, island settlement, coastal world, ferry route or water gameplay already exists.

The existing inventory is a simple player/product/quantity table. It does not yet represent all of the approved GTA-style inventory requirements such as item use/consumption state, weight/capacity, equipped slots, home/vehicle storage or general non-shop objects. The profile schema also does not yet define a dedicated public player ID-card number. These will need careful additive schema and game-domain design later.

### Security observations

- Economy RPCs `akwantuo_get_economy_state`, `akwantuo_purchase_asset` and `akwantuo_purchase_retail` are SECURITY DEFINER and executable by authenticated users, not anon.
- Their inspected bodies derive the player from `auth.uid()`, reject unauthenticated calls and use fully qualified table references with an empty search_path. This is a useful protection, but SECURITY DEFINER routines still require ongoing review.
- `akwantuo_create_player_economy` is a trigger function and is not executable by anon/authenticated roles.
- Supabase security advisor also reports leaked-password protection disabled. Recommend reviewing/enabling it after owner approval.
- The retail purchase function accepts up to 12 basket lines but does not merge duplicate product IDs before validating stock. Duplicate lines can each pass the stock check against the same pre-update quantity, then decrement stock multiple times. The stock CHECK constraint prevents negative stock, so this can fail the whole transaction rather than silently oversell; it is still a correctness issue to fix in a future reviewed migration.
- No SQL writes, data changes, migration applications, resets or Auth configuration changes were performed.

## 4. Vercel audit — project preserved

Existing project: `akwantuo`.
Project framework: Vite.
Existing Git source is the `jerryspanelli-tech/akwantuo` repository.
Project root directory currently expects `apps/game`.
Configured environment variable names include `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` across production, preview and development. Secret values are deliberately not reproduced. No service-role key was exposed in this audit output.

Latest deployment on the clean branch failed before install/build because the clean branch intentionally has no `apps/game` folder yet:
`The specified Root Directory "apps/game" does not exist.`

This is expected for the current empty foundation, not a TypeScript or Babylon.js build failure. The previous Phase 1 branch deployment reached READY. The existing Vercel project configuration was not modified.

Recommendation: create the first new client scaffold at `apps/game`, then run a preview build. Keep project settings, domains and production branch unchanged until a preview has passed QA and the CEO approves any deployment change.

## 5. Proposed technical architecture

See `docs/ARCHITECTURE_DECISIONS.md`.

Core recommendations:
- Browser client: TypeScript + Babylon.js + Vite.
- Small npm-workspace repository with `apps/game`, `packages/shared`, documentation and additive Supabase migrations.
- Supabase for authentication and durable account/player persistence.
- A separate authoritative realtime server for multiplayer sessions, selected only after a small framework/hosting/cost/latency spike.
- Do not use browser clients as authority for money, inventory or ownership.
- GLB/glTF assets, registered licences, consistent skeleton conventions and animation state machines.
- Streaming, LOD, instancing, adaptive quality and measured mobile performance budgets.
- Keep Vercel for the web client and compatible APIs; do not assume serverless functions are a persistent game-session server.

## 6. CI and QA strategy

Before feature development, create deterministic gates:
1. Reproducible dependency installation with a committed lockfile.
2. TypeScript typecheck.
3. Unit tests for game/domain rules.
4. Production build.
5. Browser smoke test: startup, menu, scene render and responsive mobile layout.
6. Touch and keyboard input checks.
7. Safe Supabase integration tests against a dedicated test project or isolated test schema, never destructive production tests.
8. Secret scanning and client-environment checks.
9. Preview deployment evidence attached to the pull request.

The clean branch currently has no application or CI workflow files, so no build/test pass is claimed.

## 7. Risks and controls

| Risk | Control |
|---|---|
| Accidental loss of old work | Keep main and archive refs unchanged; create an additional backup before any future deletion. |
| Production player data damage | Read-only audit; additive migrations only after review and approval. |
| Economy exploits or incorrect stock | Server-authoritative transactions, RPC tests, duplicate-line validation and concurrency tests. |
| Mobile performance | Representative mobile scene, adaptive quality, asset budgets and device testing. |
| Multiplayer hosting cost/latency | Small measured technical spike before selecting provider. |
| Vercel preview failure | Scaffold at existing `apps/game` root, then test preview without changing production settings. |
| Animation/asset licensing | Asset register and licence review before importing content. |

## 8. Decisions requested from the CEO

1. Approve TypeScript + Babylon.js + Vite for the clean client.
2. Approve the small monorepo layout, keeping `apps/game` to match the existing Vercel root.
3. Approve Supabase for identity and durable player data, while selecting a dedicated authoritative multiplayer server only after a cost/performance spike.
4. Approve Phase 1 as the first implementation milestone: a reliable app shell, AKWANTUO opening/menu, Babylon scene startup, camera, mobile/desktop controls, one representative Ghanaian environment slice, CI and a passing Vercel preview.

No gameplay feature has been implemented in this phase. No production Supabase or Vercel changes have been made. The architecture proposal and first scaffold remain subject to CEO approval.
