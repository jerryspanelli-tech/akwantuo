# AKWANTUO

**A World of Your Own.**  
A realistic Ghanaian open-world life simulation.

AKWANTUO is being built as a browser-first 3D game for phones and computers, with an architecture designed to grow into a persistent online multiplayer world.

## Project principles

- Ghanaian identity comes first: places, architecture, transport, clothing, language, sound and everyday life.
- Mobile-first performance without abandoning desktop quality.
- Server-authoritative multiplayer and economy systems.
- Original or properly licensed art, audio and other assets.
- Build in tested stages; do not add features at the expense of stability.
- Keep development costs low until the project genuinely needs paid infrastructure.

## Technology

- **Game client:** Babylon.js, TypeScript and Vite
- **Online services:** Supabase for authentication and persistent data
- **Multiplayer:** Colyseus dedicated game server
- **Repository:** TypeScript monorepo

Supabase credentials and production service URLs must be supplied through environment variables. Never commit secrets.

## Development

Requirements: Node.js 20 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The initial client foundation includes the AKWANTUO title experience and a lightweight 3D scene placeholder.

## Workspace

- `apps/game` — browser game client
- `apps/server` — multiplayer server (next implementation stage)
- `packages/shared` — shared types and game rules (next implementation stage)
- `docs` — architecture and development notes

## Current stage

**Phase 1 — project foundation.** The first milestone is a reliable, responsive startup experience and a clean technical base. Authentication, persistent profiles, multiplayer, world streaming and production assets are not yet implemented.

## Ownership and safety

The browser client is not trusted to grant currency, property, vehicles, staff privileges or other valuable game state. Those systems must be validated by trusted server-side code.
