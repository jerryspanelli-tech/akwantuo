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

**Phase 1 — foundation and first playable prototype.** The client has a responsive startup/menu flow, a third-person placeholder character, follow camera, basic walk/jump controls, and a touch joystick for phones. Supabase authentication, cloud player profiles, and the first economy schema are connected. The game is still a prototype: multiplayer server infrastructure and production-quality character/world assets are not complete.\n\n### Prototype controls\n\n- Desktop: WASD or arrow keys to move; Space to jump; drag the scene to rotate the camera.\n- Touchscreen: use the left virtual joystick to move and the JUMP button to jump; drag the scene to rotate the camera.\n\nThe character, buildings and street remain temporary development geometry. Appearance can be saved locally and to the dedicated AKWANTUO cloud profile when signed in. There is not yet a running multiplayer game server or production art pipeline.

## Ownership and safety

The browser client is not trusted to grant currency, property, vehicles, staff privileges or other valuable game state. Those systems must be validated by trusted server-side code.


## AKWANTUO cloud accounts

The browser client connects to the dedicated AKWANTUO Supabase project using its project URL and **publishable** key. These are public client credentials; database access is protected by Row Level Security. Never add a Supabase secret or service-role key to the browser bundle.

- Account sign-up and email/password sign-in use Supabase Auth.
- Player character appearance is stored in `public.player_profiles` and scoped to the authenticated player's own user ID.
- A signed-in player's character appearance is loaded from and saved to the cloud; local appearance storage remains as an offline fallback.
- Wallets, shop stock, player inventory, purchase receipts, and private-island/watercraft ownership are stored in Supabase and updated by atomic, authenticated Postgres functions. The browser cannot set its own balance or stock.
- New players receive GH₵500 starter cash (50,000 pesewas) for the first-release economy.
- Convenience-store checkout deducts the player's wallet, decrements shared stock, adds items to inventory, and writes a receipt in one database transaction.
- Akwaaba Cay and its five watercraft have server-checked purchase and ownership records. Akwaaba Cay landing is restricted to the saved owner.
- Labadi Marina has a playable speedboat and jet ski rental route marked by buoys across the Gulf of Guinea to Akwaaba Cay. Use WASD or the touch joystick; stop at either dock before exiting.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to override the AKWANTUO project defaults in local or hosted builds.


## First-release economy and watercraft

- Currency is stored as integer pesewas; display amounts are Ghana cedis.
- Starter wallet is GH₵500 per new account.
- Shop purchases use `akwantuo_purchase_retail`, which validates the basket, locks product stock and wallet rows, deducts funds, updates inventory, and writes a transaction atomically.
- Premium property and watercraft purchases use `akwantuo_purchase_asset`; ownership is persisted in `player_owned_assets` and loaded at sign-in.
- Shop stock and the wallet are never writable directly from the browser.
- The Labadi Marina rental speedboat and jet ski are playable without purchase to make the island route accessible for navigation practice. Premium asset ownership is separate from marina rentals.
- Automated Chromium tests cover desktop and mobile-sized layouts. They do not replace testing on a physical iPhone or Android device.
