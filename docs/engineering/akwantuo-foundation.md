# AKWANTUO Engineering Foundation

**Status:** Proposed implementation baseline  
**Branch:** `foundation/open-world-platform`  
**Scope:** AKWANTUO only  
**Purpose:** Establish a reusable, testable open-world game platform before expanding the game.

This document adopts public, general engineering principles used by large game teams. It does not copy Rockstar's proprietary RAGE implementation or claim knowledge of its unpublished internals.

## 1. Product and platform constraints

- Browser-first 3D game using the existing Babylon.js and TypeScript stack.
- Must run on ordinary computers and supported mobile browsers, with mobile performance treated as a first-class requirement.
- Preserve existing AKWANTUO game content and assets unless a measured technical reason requires replacement.
- Keep infrastructure costs low; add paid services only when measured requirements justify them.
- Online multiplayer is a future target. Do not describe the game as multiplayer until an authoritative server and multi-client tests exist.
- Never put Supabase service-role credentials or other server secrets in the browser bundle.

## 2. Target architecture

The platform is divided into layers with explicit dependency direction.

```text
GAME EXPERIENCE
  menus | character | missions | vehicles | economy | interactions
                         |
GAMEPLAY SYSTEMS
  player | NPC | traffic | inventory | jobs | world rules
                         |
ENGINE RUNTIME
  lifecycle | scene | input | camera | physics | audio | diagnostics
                         |
WORLD & CONTENT
  districts | streaming cells | entities | assets | LOD | environment
                         |
PLATFORM ADAPTERS
  browser | mobile | storage | network | rendering capabilities
                         |
ONLINE SERVICES
  Supabase identity/persistence | authoritative game server | telemetry
```

Dependency rules:

1. Gameplay systems may depend on engine interfaces; engine core must not import game-specific gameplay modules.
2. World content is data-driven and loaded through an asset registry; game systems must not hard-code deployment URLs.
3. UI must call application services, not write directly to database tables.
4. The browser client is untrusted. Currency, inventory ownership, rewards, purchases, and multiplayer world state require trusted server-side validation.
5. Shared client/server contracts live in `packages/shared` and are versioned.
6. Platform-specific APIs are isolated behind adapters so mobile and desktop behavior can be tested independently.

## 3. Core runtime responsibilities

The runtime is responsible for:

- A single explicit startup/shutdown lifecycle.
- Central configuration and capability detection.
- Input abstraction for keyboard, touch, and future gamepads.
- Scene and camera ownership.
- Asset loading, caching, cancellation, and disposal.
- Frame timing and performance diagnostics.
- Error reporting and recoverable failure states.
- A deterministic cleanup path when the game exits, reloads, or changes scenes.

Startup is a state machine, not a long chain of unrelated promises:

`BOOT -> CONFIGURED -> ENGINE_READY -> CORE_ASSETS_READY -> WORLD_READY -> PLAYER_READY -> ONLINE_READY (optional) -> PLAYABLE`

Online services are optional for reaching a safe offline/guest playable state. A timeout or temporary network outage must not leave the player on an indefinite loading screen. Required failures must produce a visible, actionable error and a retry path.

## 4. Open-world and streaming model

The world is divided into authored districts and bounded streaming cells.

Each cell has:

- Stable ID and world bounds.
- Asset manifest and dependencies.
- Collision and navigation data.
- LOD and visibility metadata.
- Memory and loading estimates.
- Version/hash for cache invalidation.

Streaming policy:

1. Load the player's spawn cell and its immediate safety radius first.
2. Prioritize cells by distance, travel direction, gameplay relevance, and available memory.
3. Load high-detail assets near the player and cheaper LODs at distance.
4. Unload or downgrade distant content with hysteresis to avoid repeated load/unload thrashing.
5. Never unload the active player, current mission dependencies, or required collision safety data.
6. Provide deterministic fallback assets when optional content fails.
7. Track memory, loading latency, dropped frames, and failed asset requests.

Do not build a huge map all at once. Prove streaming on one small, representative district before scaling to the Accra region and highway routes.

## 5. Entity, character, and simulation model

Use stable entity IDs and explicit ownership/lifetimes. Do not introduce a complex ECS solely because large studios use data-oriented systems. First define clear interfaces and measure whether an ECS is needed.

Character responsibilities are separated:

- Appearance and equipment data.
- Skeleton/rig and animation controller.
- Locomotion state machine.
- Input intent.
- Collision/movement controller.
- Camera target.
- Network replication adapter (future).

NPCs and traffic use bounded simulation budgets. Nearby actors receive full behavior; distant actors use simplified update rates or representation. Animation must be driven by movement state and measured velocity, not by arbitrary visual speed multipliers.

Vehicle simulation is an independent system with its own input, physics, camera, audio, damage, and network interfaces.

## 6. Online architecture and trust boundaries

Supabase is for identity, account-linked persistence, transactional economy records, and administrative data. It is not the per-frame multiplayer simulation transport.

The future dedicated game server is authoritative for shared real-time world state, player actions that affect other players, rewards, and contested interactions. The browser sends intent; the server validates and broadcasts accepted state.

Rules:

- Session refresh distinguishes invalid credentials from transient network/server failures.
- Network calls have bounded timeouts and cancellation.
- Transient failures preserve valid refresh credentials and allow retry.
- Player profile, character appearance, and save data are versioned.
- Save writes are validated and atomic.
- Purchases and rewards are idempotent and server-validated.
- RLS is enabled and tested for every user-owned row.
- Never trust client-supplied balance, price, reward, ownership, or role.

## 7. Content and asset pipeline

Every runtime asset must have a manifest entry with:

- Stable asset ID and version.
- Source file and licence/provenance.
- Target format and import settings.
- Dependencies.
- LOD variants where appropriate.
- Texture and geometry budgets.
- Validation result.

The pipeline should validate GLB/GLTF structure, texture dimensions, material references, skeleton/animation compatibility, missing dependencies, and file-size budgets before assets are accepted.

Use incremental builds and caching where practical. Do not make the runtime depend on an unverified external asset hostname.

## 8. Performance budgets

Budgets must be measured on named reference devices, not guessed from desktop results.

Record at minimum:

- Startup time to first interactive frame.
- Time to playable spawn.
- Frame time and frame-time percentiles.
- JS heap and GPU/texture memory where available.
- Visible and simulated actor counts.
- Asset request failures and streaming latency.
- Bundle size and largest chunks.

Mobile must have a supported lower graphics tier, capped expensive effects, bounded NPC/traffic counts, and adaptive render resolution. Desktop quality may scale up without changing gameplay rules.

## 9. Build, test, and release pipeline

Every pull request must have independent checks:

1. Repository and dependency validation.
2. Formatting/linting where configured.
3. Shared-contract typecheck.
4. Game-client typecheck.
5. Production build.
6. Unit tests for pure systems.
7. Browser smoke test for startup and a playable state.
8. Asset validation.
9. Security checks for database migrations and client bundles.

External Supabase availability diagnostics are a separate, non-blocking infrastructure check. A Supabase outage must not prevent a local game build from being evaluated.

A successful build is not a successful runtime test. Reports must distinguish static checks, automated browser tests, manual browser tests, and physical-device tests.

Deploy previews only from explicit branch/PR workflows. Production deployment requires a verified release candidate and a separate approval.

## 10. Observability and failure handling

Every startup phase has a timestamp and a clear result. Capture structured diagnostic events with:

- Build/commit identifier.
- Runtime version.
- Startup phase.
- Error category and safe message.
- Device/browser capability summary.
- Asset or request identifier.

Never log access tokens, passwords, service-role keys, or private player data. Provide a copyable diagnostics report for user-reported failures.

## 11. Implementation sequence and acceptance gates

### Gate 0 — Repository and build integrity
- One agreed source branch and documented branch/PR policy.
- Reproducible dependency installation using a committed lockfile.
- Independent CI for typecheck and production build.
- Build failure logs are accessible and identify the failing step.

### Gate 1 — Runtime reliability
- Explicit startup state machine.
- Bounded network requests and recoverable offline mode.
- No indefinite loading screen.
- Clean engine/scene shutdown and restart.
- Desktop and mobile browser smoke tests.

### Gate 2 — Identity and persistence
- Sign-up/sign-in/sign-out tested.
- Returning session survives transient network failure.
- Character profile round-trip tested.
- Versioned save round-trip tested after reload and a second session.
- RLS and server-side economy tests pass.

### Gate 3 — First representative world cell
- One district loads from a manifest.
- Spawn cell and adjacent cells stream predictably.
- LOD and unload behavior work.
- Collision and player movement remain stable at cell boundaries.
- Measured mobile and desktop budgets are recorded.

### Gate 4 — Character and simulation
- Production rigged character loads with compatible idle/walk/run animations.
- Locomotion transitions are driven by actual movement.
- NPC and vehicle simulation budgets are measured.
- Mobile input and desktop input produce equivalent gameplay intent.

### Gate 5 — Online multiplayer foundation
- Dedicated authoritative server exists and is deployed.
- Two independent clients can join the same test room.
- Server validates movement/actions and shared state.
- Disconnect/reconnect and state recovery are tested.

No gate is considered complete from documentation alone. Each requires code, automated evidence, and manual testing where specified.

## 12. Decisions we are deliberately not making yet

- Replacing Babylon.js with a proprietary engine or a new commercial engine.
- Rewriting the existing game in one large change.
- Building a complete city before streaming is proven.
- Adding multiplayer features before the authoritative server exists.
- Buying paid infrastructure before a measured need.
- Deleting existing branches, assets, Supabase projects, or Vercel projects during the audit.

## 13. Reference principles

- Rockstar's published account of evolving RAGE from separate rendering/physics components into a standardized shared engine foundation: https://www.techradar.com/news/gaming/the-tech-that-built-an-empire-how-rockstar-created-the-world-of-gta-5-1181281
- AWS Games Industry Lens on source control, automated build/test infrastructure, artifact delivery, and device testing: https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/cloud-game-development-cicd.html
- GDC Vault, Ubisoft's Far Cry 5 asset build system: dependency graphs, incremental builds, caching, process isolation, and parallel evaluation: https://gdcvault.com/play/1025444/The-Asset-Build-System-of

These references support general production principles; they do not disclose Rockstar's private source code or imply AKWANTUO can match a AAA studio's staffing, content volume, or budget.
