# AKWANTUO Phase 1 — approved implementation plan

Status: **CEO approved 2026-11-08; implementation and QA in progress.**

## Scope
- Create a clean modular TypeScript + Babylon.js + Vite client in `apps/game`.
- Preserve the current Supabase project/data and Vercel project/settings.
- Add original AKWANTUO opening/menu and settings.
- Start a Babylon.js scene with a first Greater Accra-inspired neighbourhood slice.
- Add responsive camera and keyboard movement; touch camera input.
- Establish typecheck/build/preview verification.
- Keep multiplayer, accounts, production database writes and production deployment changes out of Phase 1.

## Acceptance criteria
1. Vercel's existing configured root `apps/game` resolves.
2. TypeScript typecheck passes.
3. Vite production build passes.
4. Opening/menu renders at phone and desktop viewport sizes.
5. Play enters a real Babylon.js scene; returning to menu works.
6. Keyboard movement and touch camera input work.
7. Scene startup failures show a readable recovery message.
8. No secrets are added; no Supabase production schema/data changes.
9. A preview deployment is READY and is tested without promoting it to production.

## Workflow and roles
- Management: track scope, dependencies and decision gates.
- Research: reuse proven Babylon/Vite versions and verify Vercel root compatibility.
- Creative: define the Ghana neighbourhood slice and AKWANTUO tone.
- Design: mobile-first opening/menu, accessible controls and settings.
- Engineering: implement modular client foundation.
- Business: defer economy implementation; ensure future Ghanaian context is preserved.
- QA: independently verify build, startup, viewport/input behaviour and service-preservation boundaries.

These are coordinated workstreams led through this assistant, not separate autonomous background agents.

## Explicit exclusions
No merge to `main`, production deployment promotion, Supabase migration, auth changes, multiplayer claim, old gameplay source import or destructive repository/service operation.
