# AKWANTUO Architecture Decision Record — Phase 0 Proposal

Status: **Proposed for CEO review; not yet approved for implementation**

## 1. Constraints established from the preserved project

- GitHub default branch is `main`; it remains untouched.
- Clean work happens only on `rebuild/clean-foundation`.
- Vercel project root currently expects `apps/game`; retain this path in the first scaffold so the existing project can be preview-tested without changing Vercel settings.
- The preserved codebase used TypeScript, Vite, Babylon.js 8.x, npm workspaces and a small shared package. A prior Vercel deployment from the preserved Phase 1 branch completed a Vite production build successfully.
- Supabase already contains player profiles, wallets, shop products, inventory, transactions, game assets and owned assets. Seven public tables have RLS enabled. Existing migration history and user data must be treated as production data.
- The clean branch currently contains only the README and approved master prompt. No game runtime has been implemented on it.

## 2. Recommended client technology

**Recommend:** TypeScript + Babylon.js + Vite.

Reasons:
- Babylon.js is already the established 3D engine in the preserved project and is suited to browser-based 3D on mobile and desktop.
- TypeScript supports clear contracts between gameplay, UI, networking and persistence.
- Vite already has a successful production-build history in the existing Vercel project.
- This avoids introducing a second rendering engine or an expensive migration before a playable foundation exists.

This is a clean reimplementation using the chosen technology, not copying old gameplay code. Existing archived source remains recovery/reference material only. No old code should be imported wholesale.

## 3. Recommended repository layout

Keep the initial layout small and understandable:

- `apps/game` — browser game client, menus, UI and Babylon.js runtime.
- `packages/shared` — validated data contracts and types shared by client/server.
- `apps/server` — later authoritative multiplayer/session server, added only after a technical spike confirms hosting and networking choices.
- `supabase/migrations` — additive, reviewed database migrations only.
- `docs` — architecture, security, feature specifications and QA evidence.

Avoid creating many empty packages or microservices. Split systems only when there is a real dependency or ownership boundary.

## 4. Game client boundaries

Separate these concerns from the start:
- App startup, loading, error recovery and main menu.
- Rendering, scene lifecycle, camera and quality settings.
- Player input and character controller.
- Character model/animation controller.
- World streaming and district/region content.
- Interaction system.
- Vehicle and watercraft systems.
- UI (phone, identity card, inventory, settings and HUD).
- Client-side data adapters and network transport.

Gameplay rules should not be buried in UI click handlers or one giant main.ts file. Define typed interfaces and keep scene creation separate from account/database calls.

## 5. Supabase responsibilities

Use the existing Supabase project for:
- Authentication and account identity.
- Player profile and character identity.
- Persistent player-owned data that belongs in relational storage.
- Inventory, wallets, transactions, catalogues and ownership, after verifying and extending the existing schema safely.
- Storage metadata or asset manifests if justified.

Security rules:
- The authenticated player identity must come from the verified session, never from a client-supplied player ID.
- Keep service-role/secret credentials server-only; never expose them in VITE variables.
- Financial and inventory-changing operations must be atomic and server-authoritative.
- Preserve current users and records.
- New schema changes must be additive, have rollback notes, be tested in a safe environment and receive CEO approval before production application.
- Review existing SECURITY DEFINER RPC grants and bodies before relying on them. The current grants limit the economy RPCs to authenticated users, and the functions derive the player from auth.uid(); this is a positive control but not a substitute for a full security review.
- Review and recommend enabling leaked-password protection, but do not change Auth settings without approval.

## 6. Multiplayer architecture — decision deferred pending spike

Do not implement multiplayer by writing shared world state directly from every browser into Supabase tables.

Recommended separation:
- Supabase: account identity and durable persistence.
- Authoritative session server: player movement/session state, validation, proximity, interaction arbitration and real-time replication.
- Client: prediction/interpolation and presentation, never the authority for money or ownership.

Before choosing Colyseus or another realtime framework, run a small comparison/spike covering:
- Concurrent players per room and target update rate.
- Mobile network latency and reconnect behaviour.
- Server hosting, uptime, scaling and monthly cost.
- Authentication handoff from Supabase.
- Persistence boundaries and abuse prevention.

Do not assume Vercel Functions are a persistent multiplayer game server. Keep Vercel for the browser client and compatible APIs unless a measured deployment test proves otherwise. No multiplayer hosting provider is selected yet.

## 7. 3D assets, animation and performance

- Use glTF/GLB as the standard runtime asset format.
- Maintain an asset register recording source, licence, attribution, file size, texture budget and intended use.
- Prefer authored/appropriately licensed character rigs and animation clips with consistent skeleton conventions.
- Build animation state machines with blending and movement synchronisation; test foot contact, direction, transitions, dance loops and interaction alignment.
- Use level-of-detail, instancing, frustum/occlusion culling, texture compression and adaptive quality.
- Set measurable mobile and desktop performance targets after the first representative scene is profiled; do not invent FPS guarantees before measurement.
- Stream world regions and assets rather than loading the entire eventual Ghana world at once.

## 8. CI and quality gates

Required automated gates:
1. Clean dependency install using a committed lockfile.
2. TypeScript typecheck.
3. Unit tests for deterministic game/domain logic.
4. Production Vite build.
5. Browser smoke test for startup, menu, scene render and mobile layout.
6. Accessibility/keyboard and touch input checks for core UI.
7. Supabase integration tests against a safe test project or isolated test schema, never destructive tests against production.
8. Security checks for accidental secrets and unsafe client configuration.
9. Artifact and preview evidence attached to the relevant pull request.

Keep CI fast and deterministic. Separate game-client build checks from tests that require credentials or external services.

## 9. Delivery order and acceptance gates

### Phase 0 — foundation approval
- Verify recovery branches and protected boundaries.
- Document architecture and service contracts.
- Agree on engine, repository layout and hosting boundaries.
- Define mobile performance budgets and QA plan.
- No production database or Vercel settings changes.

### Phase 1 — playable technical foundation
- App shell, original AKWANTUO menu/loading flow.
- Babylon.js scene startup and graceful failure handling.
- Camera and responsive touch/keyboard controls.
- One representative Ghanaian environment slice.
- CI green and Vercel preview green.
- No fake multiplayer claims.

### Phase 2 — account and player foundation
- Secure sign-in and saved character lifecycle.
- Character profile and in-game identification card.
- Server-validated save/load and recovery behaviour.

### Later feature phases
Build the approved vision in dependency order: world and regions; characters/NPCs/animations; inventory/food/survival; economy/jobs/businesses; vehicles and watercraft; islands/coasts; smartphone/social/dancing; multiplayer; wider Ghana; optimisation and release.

## 10. Decisions requiring CEO approval

1. Approve the recommended TypeScript + Babylon.js + Vite foundation.
2. Approve the small monorepo layout above, retaining `apps/game` for the existing Vercel root.
3. Approve keeping Supabase as identity and persistence, with an authoritative realtime server chosen only after the spike.
4. Approve Phase 1 as the first implementation milestone after Phase 0.

No code scaffold, database mutation, Vercel configuration change, production deployment switch or merge is authorised by this proposal alone.
