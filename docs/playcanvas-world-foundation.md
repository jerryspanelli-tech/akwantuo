# AKWANTUO PlayCanvas World Foundation

## Decision and release boundary

- The PlayCanvas Engine is the primary runtime for the browser-first game.
- The current Babylon.js client on `main` remains intact as the reference/fallback while the PlayCanvas client is built and verified.
- The Three.js experiment remains isolated; it is not the production base.
- The PlayCanvas client is introduced as a separate route/entry point first. Do not replace the existing game entry point until parity and device tests pass.
- Do not merge this work into `main`, change production deployment aliases, or remove existing world data without the owner's explicit approval.

## Product target

A playable, Ghana-inspired open-world life simulation that opens in Safari/Chrome on phones and desktop browsers. First release is a coherent, compact, explorable Greater Accra game region, not a huge empty map.

## World direction

Use real Ghanaian place references for geography, architecture, road hierarchy, signage conventions, vegetation, coastlines and transport culture. Build original game assets and fictional in-world brands/signs unless a real public landmark is deliberately represented. Clearly distinguish game-scale approximations from surveyed geography.

Initial playable districts and anchors:
- Accra Central / Makola / Circle
- Osu
- Airport City / 37
- East Legon / Tetteh Quarshie
- Achimota
- Labadi coast and beach
- Spintex
- Tema gateway
- Akwaaba Cay as a fictional offshore destination

World content:
- Connected local streets, arterial roads, interchanges and motorway corridors; road widths, lane count, medians, shoulders, kerbs and markings must be explicit data, not guessed at render time.
- Ghana-style directional signs, district signs, road numbers, traffic lights, junction markings, bus stops, trotro stops, fuel stations and street furniture.
- Recognisable but original landmark silhouettes and district-specific building kits; dense street fronts and market/shop blocks rather than isolated random towers.
- Gulf of Guinea shoreline, beach sand, sea, beach access, marina, jetties, boats and watercraft.
- Road vehicles: saloon/taxi, trotro/minibus, bus, pickup and delivery/commercial vehicles. Each has defined dimensions, mass/handling profile, seats, entry points and interaction prompts.
- Pedestrians/NPCs, ambient traffic and basic traffic rules are staged after the player/vehicle loop is reliable.

## Runtime architecture

Keep the engine thin and gameplay systems independent:
- `engine/`: PlayCanvas app bootstrap, graphics profile, lifecycle and capability detection.
- `world/data/`: engine-agnostic coordinates, roads, districts, landmarks, coastline, signage and spawn definitions.
- `world/render/`: terrain, roads, markings, buildings, beach/ocean, vegetation and landmark renderers.
- `world/streaming/`: deterministic spatial chunks, priority queue, cancellation, unload/disposal and LOD.
- `player/`: character asset, animation state machine, input abstraction, movement, collision and third-person camera.
- `vehicles/`: vehicle definitions, handling, collision, enter/exit and camera handoff.
- `interaction/`: proximity queries, prompt arbitration and interaction state.
- `ui/`: touch joystick, camera drag, contextual actions, HUD, pause and accessibility.
- `services/`: adapters for existing Supabase auth/profile/save services; engine code must not own database rules.
- `shared/`: versioned, validated world/player data contracts.

No world renderer may own canonical road/district data. No UI component may mutate player state directly. Inputs feed a single action state; gameplay systems consume it. Use fixed-step simulation for movement/vehicle physics and render interpolation. Clamp frame delta after tab suspension.

## Performance and device budget

- First-class WebGL2 fallback; never require WebGPU.
- Test target includes iPhone 8 Plus Safari. Start with conservative pixel ratio, capped shadow map, limited dynamic lights, compressed textures and GLB assets.
- Use instancing/material reuse, spatial chunking, frustum culling, LOD, texture atlases and explicit asset budgets.
- Avoid building the entire city in one startup frame. Stream near chunks, preload the next likely chunk and dispose far chunks deterministically.
- Keep a low-memory graphics profile and a recovery path after WebGL context loss.
- Measure cold start, memory, draw calls, frame time and touch-to-motion latency. Do not claim a performance target passed without device/browser evidence.

## First playable acceptance gates

1. The player model visibly loads; model-load failure shows a clear error/fallback and never silently hides the player.
2. Idle/walk/run animations bind to the actual skeleton and switch based on movement.
3. Mobile joystick supports pointer/touch capture, analogue direction, dead zone, release reset and does not steal camera gestures.
4. Desktop keyboard controls work independently of touch.
5. Third-person camera follows smoothly and supports touch/mouse orbit without moving the player.
6. Player collision prevents walking through buildings, vehicles and world boundaries; ground height is stable.
7. At least one drivable vehicle supports approach, enter, steering, acceleration, braking, reverse and reliable exit beside the vehicle.
8. Interaction prompts are contextual, accessible and cannot overlap/conflict.
9. One compact district loop is connected: spawn -> streets -> shops/landmark -> vehicle -> beach/marina -> return.
10. A browser smoke test covers startup, character visibility, movement, camera, vehicle enter/exit and save/load.
11. Physical iPhone 8 Plus and desktop manual test records are required before calling the prototype playable.

## Build order

### Stage A — engine and controls proof
PlayCanvas boot, responsive renderer, lifecycle/disposal, input abstraction, camera, real GLB player and animation state machine. No large world yet.

### Stage B — compact Ghana world slice
Terrain, connected roads, kerbs/markings/signs, dense district block, landmark, coast/beach, collision and deterministic chunk boundaries.

### Stage C — gameplay loop
Interact prompts, enter/exit, one drivable saloon/trotro, simple traffic, NPC pedestrians, save/restore and a first exploration objective.

### Stage D — expand the world
Migrate and validate Greater Accra road/district/rail data; add additional landmarks, neighbourhoods, vehicles, shops/interiors and Akwaaba Cay.

### Stage E — release hardening
Automated browser tests, asset/license audit, performance profiling, iPhone/desktop tests, accessibility, error reporting and rollback plan.

## Asset and data rules

- Prefer GLB with meshopt/Draco geometry compression and KTX2/Basis textures where supported by the selected pipeline.
- Every imported asset records source, licence, scale, origin/pivot, collision proxy, LODs and texture budget.
- Keep source art in a documented pipeline; do not put raw high-poly source assets in the runtime bundle.
- Use original Ghana-inspired signage and fictional business names for game brands. Do not copy copyrighted game assets or imply the fictional map is a surveyed map.
- Preserve the existing Greater Accra road/rail/district data as migration inputs. Convert renderer-specific code in deliberate slices; do not rewrite the whole world in one pass.

## Definition of done

A stage is done only when its code is committed, typechecked, production-built, browser-smoke-tested where applicable, and accompanied by truthful evidence. A successful deployment alone is not proof of working gameplay.