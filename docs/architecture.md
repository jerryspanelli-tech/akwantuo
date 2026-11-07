# AKWANTUO technical architecture

## Client

The browser client lives in `apps/game` and uses Babylon.js 8 with TypeScript and Vite. It must support touch-first phones as well as keyboard and mouse input on desktop.

The client is responsible for rendering, input, audio presentation and non-authoritative interface state. It is not trusted to decide valuable online outcomes.

## Persistent services

The client-side Supabase integration code exists in `apps/game/src/services/supabase.ts`, including account, profile, wallet, inventory and purchase request helpers. This does **not** mean a dedicated AKWANTUO backend is provisioned or that online persistence is ready for players.

The AKWANTUO client must not use Accra Life credentials or its Supabase project. Configure only a dedicated AKWANTUO Supabase project using the public project URL and publishable key. Until that project is configured and verified, online features must fail clearly and local prototype play must remain available.

The economy migration in `supabase/migrations` defines profile, wallet, catalogue, inventory, transaction and ownership tables, row-level security policies, and trusted purchase functions. Its presence in the repository does not prove that it has been applied to a dedicated project. Migration application, RLS behaviour, account/profile round trips, purchase edge cases and ownership reload must be verified against that project before online economy features are enabled.

Never expose service-role keys or other private server secrets in browser-exposed `VITE_*` variables.

## Multiplayer

A dedicated Colyseus server is a planned architecture, not an implemented production service. The inspected repository currently contains no `apps/server` workspace. Shared contracts exist in `packages/shared`, but there is no verified authoritative room lifecycle, authenticated presence, server-side movement validation or multi-client gameplay.

Multiplayer must not be advertised as available until a server workspace, authenticated room lifecycle, server-authoritative state validation and multi-client tests are implemented.

## Shared rules

Reusable types, protocol messages and deterministic game rules belong in `packages/shared`. Client and server should use the same contracts rather than duplicating message shapes.

## World and assets

World content should be streamed or loaded in manageable areas. Prefer optimised glTF/GLB assets, compressed textures where supported, sensible collision meshes and level-of-detail variants. Every external asset must have a recorded source and licence.

The current player avatar and multiple world/vehicle assets are procedural first-pass geometry. They are not final production art or a complete rigged character/vehicle pipeline. Road and rail layouts are prototype geometry where their modules explicitly describe them as schematic; do not infer surveyed alignments, complete collision, lane-level navigation or operational traffic control from visual meshes.

## Delivery stages

1. **Foundation:** monorepo, responsive startup experience and working 3D client shell.
2. **Core services:** dedicated Supabase project integration and secure account/profile flow.
3. **Multiplayer foundation:** Colyseus server, rooms, player presence and server-validated movement.
4. **Playable vertical slice:** one compact Ghana-inspired neighbourhood, one controllable character and basic interactions.
5. **Expansion:** transport, jobs, economy, properties, social systems, wider world and mobile optimisation.

This document distinguishes repository code from deployed and verified services. A phase is not complete until its defined behaviours have been tested. Automated browser tests do not replace physical-device testing.

## Security rules

- Never ship private API keys or database service-role credentials to the browser.
- Never trust the client to award currency, items, vehicles, property or privileges.
- Validate and rate-limit network messages on the server.
- Enforce ownership and permissions in database policies and trusted server code.
- Keep moderation and administrator actions auditable.
