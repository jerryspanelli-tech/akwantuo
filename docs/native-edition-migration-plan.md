# AKWANTUO Native Edition — Migration Plan

## Decision

AKWANTUO's intended player experience is a standalone native game, not a browser game and not a webview wrapper.

Target platforms:
- Android
- iOS
- Windows

Proposed engine: Godot. The exact Godot version and renderer must be selected only after a compatibility spike confirms that the available development hardware and CI/build environment can support them.

## Repository safety

- Keep the existing Babylon.js game on `main` as a read-only reference during the migration.
- Do not delete, rename, or overwrite the existing game.
- Do not modify the separate Accra Life repository.
- Do not merge native migration work into `main` until the new prototype builds and its scope is reviewed.
- Preserve reusable original assets, design decisions, gameplay requirements, and backend contracts after checking their licenses and technical suitability.

## Current baseline

The current repository is a TypeScript monorepo. The existing game client is Babylon.js 8 + TypeScript + Vite. Supabase is used for authentication and persistent data. The README describes Colyseus multiplayer as planned, not implemented. The current browser prototype is not a native standalone game.

## Migration stages

### Stage 0 — Compatibility and inventory
1. Inventory existing scenes, scripts, models, textures, audio, UI, database schema, and gameplay systems.
2. Identify which assets and backend contracts can be reused without carrying over the browser runtime.
3. Verify Godot editor compatibility with the available 2013 Intel MacBook Air (Intel HD Graphics 5000, 4 GB RAM, macOS Big Sur).
4. Verify a cloud/CI build path for Windows and Android.
5. Verify the iOS signing and build requirements; an iOS release requires Apple's supported signing/build toolchain. Do not promise an iPhone build from the current Mac until verified.

### Stage 1 — Native vertical slice
Create a separate Godot project in this branch. Build only a small, measurable prototype:
- Native application launch and main menu
- One Ghana-inspired test street
- One controllable placeholder character
- Basic camera and movement
- Keyboard and touch input
- A repeatable build for at least one target platform

Keep rendering and scene complexity low for the first compatibility test.

### Stage 2 — Core systems
After the vertical slice passes:
- Character creation and appearance persistence
- Account integration through a secure backend API
- Inventory and wallet with server-side validation
- Vehicle entry, driving, and interaction
- Save/load and cross-device account continuity

Never put Supabase service-role keys or other server secrets in the client.

### Stage 3 — World and online features
Only after performance and build pipelines are stable:
- Stream the Greater Accra world in manageable regions
- Add buildings, roads, shops, transport, and interiors incrementally
- Implement authoritative multiplayer services
- Profile performance on real low-end Android and iPhone devices

## Acceptance gates

Do not declare the migration complete until:
- The game launches as an installed app, without a browser.
- Android and Windows builds are reproducible in CI.
- iOS build/signing requirements are demonstrated with a valid Apple toolchain.
- Touch and keyboard controls work.
- Existing repository and backend data are not destructively changed.
- Performance is measured on real target devices.

## Current hardware constraint

The developer's only computer is a 2013 MacBook Air with a dual-core Intel i5, 4 GB RAM, Intel HD Graphics 5000, and macOS Big Sur 11.7.11. Treat this as a serious editor/build constraint. Prefer cloud CI for heavy builds, but first verify what can actually be built and tested. Avoid requiring paid services without approval.

## Immediate next task

Complete Stage 0. Do not begin a large engine migration or change production data until the compatibility spike and asset/backend inventory are reviewed.
