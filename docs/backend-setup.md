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

The game sends the current app origin in the `X-Redirect-To` header when a player signs up. The corresponding origin must match an allowed redirect URL. The production Site URL is the fallback for confirmation and recovery emails.

If the Vercel team slug or production domain changes, update these patterns. Add any later custom domain explicitly.

## Database

The initial migration is:

`supabase/migrations/20261106164000_akwantuo_player_economy.sql`

It creates player profiles, wallets, shop products, inventory, transaction records, game assets and player-owned assets. RLS is enabled on all seven public tables. Economy mutations are exposed through authenticated RPCs; they use `SECURITY DEFINER` with an empty `search_path`, check `auth.uid()`, and lock affected rows before atomic updates.

The three authenticated economy RPCs are intentionally executable by signed-in players. Supabase Security Advisor reports this as a warning because they are SECURITY DEFINER functions; retain the explicit identity checks and empty search path when changing them.

## Verification

The GitHub Actions CI checks the dedicated Auth endpoint, confirms sign-up is enabled, and verifies anonymous requests cannot read protected economy tables. The transport preview workflow separately tests offline/local play and desktop/mobile-sized browser interaction.

A real signup, email confirmation, authenticated cloud profile reload and purchase test still requires a test account. Browser viewport emulation is not a substitute for a physical phone test.
