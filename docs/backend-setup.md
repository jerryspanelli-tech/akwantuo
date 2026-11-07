# AKWANTUO backend setup

## Dedicated project

- Supabase project: `AKWANTUO`
- Project ref: `ugiysogfkclbcryhtkyn`
- Region: `eu-west-1`
- Project URL: `https://ugiysogfkclbcryhtkyn.supabase.co`

This project is separate from Accra Life. Never point AKWANTUO at Accra Life's Supabase project.

## Browser configuration

Set these Vercel project environment variables for Production, Preview and Development:

- `VITE_SUPABASE_URL`: `https://ugiysogfkclbcryhtkyn.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: the AKWANTUO project's `sb_publishable_` key

The publishable key is intended for browser use. Never put a Supabase `service_role` key in a `VITE_` variable or browser bundle.

## Supabase Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration, set:

**Site URL**

`https://akwantuo-eta.vercel.app`

**Additional Redirect URLs**

```text
https://akwantuo-eta.vercel.app/**
https://*-jerry-03e4.vercel.app/**
http://localhost:5173/**
```

The signup request uses Supabase's supported `redirect_to` query parameter with the current app origin. That origin must match an allowed redirect URL. The production Site URL is the fallback for confirmation and recovery emails.

These dashboard settings still require direct verification in the Supabase dashboard; the connected project tools do not expose the Auth URL Configuration values.

If the Vercel team slug or production domain changes, update these patterns. Add any later custom domain explicitly.

## Database

The applied initial migration is:

`supabase/migrations/20261107072841_akwantuo_player_economy.sql`

It creates player profiles, wallets, shop products, inventory, transaction records, game assets and player-owned assets. All seven public application tables have RLS enabled. Economy mutations are exposed through authenticated RPCs; they use `SECURITY DEFINER` with an empty `search_path`, check `auth.uid()`, and lock affected rows before atomic updates.

The three authenticated economy RPCs are intentionally executable by signed-in players. Supabase Security Advisor reports this as a warning because they are SECURITY DEFINER functions; retain the explicit identity checks and empty `search_path` when changing them.

The existing retail checkout still needs an idempotency key so a client retry after a timeout cannot accidentally create a second purchase. A trusted job-earning RPC is also not implemented. The current `game_save` value is only a placeholder metadata object; durable world-state saving is not implemented.

## Multiplayer status

Multiplayer is **not implemented or deployed**. The repository architecture currently identifies a Colyseus authoritative server as planned work; the Supabase project has no deployed Edge Functions, and there is no verified room lifecycle, authenticated player presence, server-authoritative movement validation, reconnect handling or two-client gameplay test.

Do not advertise online multiplayer as available until the dedicated game server is deployed and the complete two-client test suite passes. Supabase Auth and the economy database are not themselves a multiplayer game server.

## Verification and Phase 1 sign-off

Automated CI currently verifies the dedicated Supabase Auth endpoint, signup availability, anonymous denial on protected tables, TypeScript typecheck, production build and browser-bundle isolation.

Phase 1 cannot be signed off until all of the following are complete:

1. Verify the Supabase Auth Site URL and redirect allow-list in the dashboard.
2. Run a real test account through email confirmation, sign-in, profile/character cloud save and reload, and a low-cost shop purchase; verify wallet, inventory and transaction records. Never share the account password.
3. Add and verify purchase idempotency, durable game-save read/write, and a trusted job-reward flow if those are included in the Phase 1 acceptance scope.
4. Implement and deploy the authoritative multiplayer service, then test at least two separately authenticated clients in the same room, including movement, disconnect/reconnect and invalid-message rejection.
5. Complete the transport-preview workflow and inspect its screenshots/report.
6. Test on a physical phone, including touch controls, startup, account flow and reconnect behaviour.

Chromium mobile viewport emulation is not a substitute for a physical phone test. A successful build or database SQL simulation is not proof of the real email-confirmed browser flow or multiplayer service.
