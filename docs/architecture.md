# AKWANTUO technical architecture

## Client

The browser client lives in `apps/game` and uses Babylon.js with TypeScript and Vite. It must support touch-first phones as well as keyboard and mouse input on desktop.

The client is responsible for rendering, input, audio presentation and non-authoritative interface state. It is not trusted to decide valuable online outcomes.

## Persistent services

Supabase is the planned service for account authentication and durable player data. The browser will use only a public/anonymous client key with row-level security. Service-role keys and other private credentials must remain on trusted servers.

## Multiplayer

A dedicated Colyseus server is planned for live rooms, movement replication and authoritative gameplay checks. The server will validate valuable state changes such as currency rewards, inventory, vehicle ownership, property and staff permissions.

## Shared rules

Reusable types, protocol messages and deterministic game rules belong in `packages/shared`. Client and server should use the same contracts rather than duplicating message shapes.

## World and assets

World content should be streamed or loaded in manageable areas. Prefer optimised glTF/GLB assets, compressed textures where supported, sensible collision meshes and level-of-detail variants. Every external asset must have a recorded source and licence.

## Security rules

- Never ship private API keys or database service-role credentials to the browser.
- Never trust the client to award currency, items, vehicles, property or privileges.
- Validate and rate-limit network messages on the server.
- Enforce ownership and permissions in database policies and trusted server code.
- Keep moderation and administrator actions auditable.

## Delivery stages

1. **Foundation:** monorepo, responsive startup experience and working 3D client shell.
2. **Core services:** shared contracts, Supabase project integration and secure account/profile flow.
3. **Multiplayer foundation:** Colyseus server, rooms, player presence and server-validated movement.
4. **Playable vertical slice:** one compact Ghana-inspired neighbourhood, one controllable character and basic interactions.
5. **Expansion:** transport, jobs, economy, properties, social systems, wider world and mobile optimisation.

This document describes the intended architecture. Services listed as planned are not yet connected.
