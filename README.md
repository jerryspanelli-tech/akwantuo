# AKWANTUO

**A World of Your Own.**  
A realistic Ghanaian open-world life simulation.

AKWANTUO is a browser-first 3D game for phones and computers. Its long-term direction is a large, persistent Ghanaian open world with authentic cities, characters, transportation, work, businesses, properties and social life.

## Project rules

- AKWANTUO is a separate project from Accra Life. Never share game data, backend credentials or deployment configuration between them.
- Improve the existing project; do not replace it with an unrelated demo.
- Ghanaian identity, believable scale, realistic art and stable gameplay take priority over feature count.
- Use original or appropriately licensed assets.
- Mark prototypes and placeholders honestly.
- Validate important economy and ownership changes on trusted server-side systems.

## Current technical architecture

- **Game client:** Babylon.js 8, TypeScript and Vite.
- **Repository:** npm workspaces monorepo.
- **Shared contracts:** `packages/shared`.
- **Online data:** dedicated AKWANTUO Supabase project is provisioned and the initial profile/economy migration is applied. Auth/profile/economy client integration exists; real email-confirmed browser account testing is still outstanding.
- **Multiplayer:** Colyseus is the planned authoritative server architecture, not an implemented or deployed production service.

## Current prototype status

The existing browser prototype includes a Babylon.js scene, a primitive procedural placeholder player, a third-person camera, basic keyboard/touch movement, a character appearance form, procedural Ghana-inspired building geometry, and developing road, vehicle, rail, shop, interior and watercraft modules.

**Important:** The current player avatar is built from primitive Babylon.js meshes, not a finished rigged 3D character model. Many buildings and environment assets are also procedural prototype geometry, not finished production-quality 3D building assets. The appearance form changes the temporary avatar; it does not mean the final character art pipeline is complete.

The current main entry point is `apps/game/src/main.ts`. It still combines startup, world creation, input, character and gameplay orchestration and should be separated incrementally after stabilisation.

## Workspace

- `apps/game` — browser game client.
- `apps/server` — planned multiplayer server; not yet implemented.
- `packages/shared` — shared contracts and validation.
- `docs` — architecture and development notes.

## Development

Requirements: Node.js 22.12 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Build and typecheck:

```bash
npm run typecheck
npm run build
```

## Backend separation and credentials

The dedicated AKWANTUO Supabase project is `ugiysogfkclbcryhtkyn`. It is separate from Accra Life.

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the local environment or hosting provider.
- CI uses GitHub Actions secrets `AKWANTUO_SUPABASE_URL` and `AKWANTUO_SUPABASE_PUBLISHABLE_KEY` for the live connection smoke test.
- Do not reuse Accra Life's Supabase project or credentials.
- Never put a Supabase service-role key or any private server secret in browser-exposed `VITE_*` variables.
- The applied migration creates profiles, wallets, shop catalogue, inventory, transaction ledger and premium asset ownership with RLS.
- The Auth URL allow-list must be verified in the Supabase dashboard. Real email-confirmed account and purchase round-trip tests are still required.
- Retail purchase idempotency, durable world-state saves and a trusted job reward flow remain outstanding.

## Development phases

1. Audit and stabilise the existing game foundation.
2. Establish world scale, districts and a coherent road network.
3. Build a realistic East Legon visual benchmark, then expand Greater Accra.
4. Replace placeholder characters and vehicles with suitable rigged/licensed assets.
5. Build explorable interiors, shops and properties.
6. Complete the phone, inventory and life systems.
7. Implement secure jobs, businesses and economy progression.
8. Add day/night, weather, audio and activities.
9. Implement real multiplayer and persistence.
10. Expand the highway corridor and Kumasi.
11. Test and optimise on physical mobile devices and desktop.

A phase is not complete until its defined behaviours have been tested. Automated browser tests do not replace physical-device testing.

## Ownership and safety

The browser client is untrusted. It must never be allowed to grant itself currency, inventory, property, vehicles, staff privileges or rewards. Such actions require validated server-side logic and appropriate access controls.
