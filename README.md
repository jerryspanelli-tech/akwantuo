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

Requirements: Node.js 22.12 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The current prototype includes the AKWANTUO title experience, a basic character creator with local appearance saving, a third-person placeholder character, a Ghana-inspired street preview, keyboard movement and mobile touch movement. Shared client/server message contracts are being established. It is an early local prototype, not yet an online or production-ready game.

## Workspace

- `apps/game` — browser game client
- `apps/server` — planned multiplayer server (not implemented yet)
- `packages/shared` — versioned client/server message contracts and validation
- `docs` — architecture and development notes

## Current stage

**Phase 1 — foundation and first playable prototype.** The client now has a responsive startup/menu flow, a simple third-person character, follow camera, basic walk/jump controls, and a touch joystick for phones.\n\n### Prototype controls\n\n- Desktop: WASD or arrow keys to move; Space to jump; drag the scene to rotate the camera.\n- Touchscreen: use the left virtual joystick to move and the JUMP button to jump; drag the scene to rotate the camera.\n\nThe character, buildings and street are temporary development geometry. Character appearance is saved only in this browser; there is no cloud profile, authentication, multiplayer server or production art yet.

## Ownership and safety

The browser client is not trusted to grant currency, property, vehicles, staff privileges or other valuable game state. Those systems must be validated by trusted server-side code.


## AKWANTUO cloud accounts

The browser client connects to the dedicated AKWANTUO Supabase project using its project URL and **publishable** key. These are public client credentials; database access is protected by Row Level Security. Never add a Supabase secret or service-role key to the browser bundle.

- Account sign-up and email/password sign-in use Supabase Auth.
- Player character appearance is stored in `public.player_profiles` and scoped to the authenticated player's own user ID.
- A signed-in player's character appearance is loaded from and saved to the cloud; local appearance storage remains as an offline fallback.
- The game world, inventory, wallet, purchases, property ownership and multiplayer state are not yet cloud-backed. Those require server-authoritative services before valuable transactions are enabled.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to override the AKWANTUO project defaults in local or hosted builds.
