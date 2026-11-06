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

- **Game client:** Babylon.js 8, TypeScript and Vite
- **Repository:** npm workspaces monorepo
- **Shared contracts:** `packages/shared`
- **Online data:** Supabase client integration exists, but the current default backend was previously shared with the separate Accra Life project and has been disconnected from the AKWANTUO client.
- **Multiplayer:** Colyseus is a planned architecture, not an implemented production server.

## Current prototype status

The existing browser prototype includes a Babylon.js scene, a primitive placeholder player, a third-person camera, basic keyboard/touch movement, a character appearance form, procedural Ghana-inspired building geometry, and developing road, vehicle, rail, shop, interior and watercraft modules.

**Important:** The current player and many visible environment assets are temporary procedural geometry. The presence of district layouts, road plans, catalogues or code modules does not mean those systems are complete, fully populated, production-art quality or fully playable.

The current main entry point is `apps/game/src/main.ts`. It still combines startup, world creation, input, character and gameplay orchestration and should be separated incrementally after stabilisation.

## Workspace

- `apps/game` — browser game client
- `apps/server` — planned multiplayer server; verify implementation status before relying on it
- `packages/shared` — shared contracts and validation
- `docs` — architecture and development notes

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

A dedicated AKWANTUO Supabase project must be provisioned before online accounts, cloud saves, wallets, inventory, purchases or ownership can be treated as AKWANTUO production features.

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the local environment or hosting provider.
- CI uses GitHub Actions secrets `AKWANTUO_SUPABASE_URL` and `AKWANTUO_SUPABASE_PUBLISHABLE_KEY` for the optional live connection smoke test.
- Do not reuse Accra Life's Supabase project or credentials.
- Never put a Supabase service-role key or any private server secret in browser-exposed `VITE_*` variables.
- Until the dedicated project is configured, online account/economy requests fail with an explicit configuration message; local prototype play should remain separate.
- Database migrations and RLS policies must be reviewed and applied to the dedicated project before enabling online economy operations.

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
