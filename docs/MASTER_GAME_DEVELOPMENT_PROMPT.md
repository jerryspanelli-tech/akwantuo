# AKWANTUO — Master Game Development Prompt

## Mission
Build AKWANTUO into a realistic, persistent online 3D open-world Ghanaian life simulation for phones and ordinary computers. Create a living virtual Ghana where players can build their lives, work, earn, shop, own property, travel, socialise, dance, explore mainland cities and islands, and share a persistent world.

## World and geography
Start with Greater Accra, then expand to Kumasi and wider Ghana. Include recognisable districts, towns, villages, highways, streets, junctions, markets, malls, hospitals, police stations, schools, universities, airports, ports, fuel stations, farms, forests, rivers, hills and lakes. Buildings must look like believable real-world Ghanaian architecture rather than repeated grey placeholders.

Islands and coastal environments are core explorable areas, not distant scenery. Include island communities, beaches, resorts, hotels, restaurants, fishing, docks, harbours, boats, ferries, swimming, diving, island businesses and properties, and routes between mainland and islands. Use Ghanaian geographical inspiration, including Volta Lake and coastal environments.

## Player creation and identification
Support male and female characters, Ghanaian names, age, appearance, clothing, footwear, accessories and barbershop hairstyle customisation. Include traditional styles such as kente and fugu alongside modern fashion. Every character gets an in-game identification card with portrait, full character name, unique game ID, age, gender and appropriate character details. Never expose account credentials or private authentication information.

## Player inventory
Create an original inventory interface inspired by GTA 5 item management. Players can carry, organise, inspect and use food, prepared meals, snacks, fruits, groceries, bottled water, soft drinks, juice, personal belongings, wallet, phone, keys, tools, collectibles, mission items and other appropriate objects. Show quantities. Support buying, collecting, consuming, equipping, storing at homes or vehicles, transferring, dropping or selling eligible items, and sensible carrying/storage limits. Inventory persists across sessions. Eating and drinking must remove the correct quantity and update hunger/thirst.

## Animation system
Animations are a core quality requirement: natural idle, walking, running, sprinting, stopping, turning, backwards/sideways movement, jumping, landing, crouching, climbing, swimming, diving, sitting, standing, sleeping and waking. Include eating, drinking, cooking, phone use, shopping, opening doors, object interactions, work tasks, conversations, gestures, greetings, handshakes, hugs, giving/receiving objects, entering/exiting vehicles, driving, steering, boarding boats and aircraft, and believable NPC routines. Require smooth blending, foot contact, natural timing, correct direction and no T-poses, foot sliding, robotic motion or broken transitions.

## Dancing, music and entertainment
Support Azonto, Kpanlogo, Adowa- and Agbadza-inspired cultural performances, highlife/Afrobeats, hip-hop, street, club and freestyle dancing. Include solo, partner and group dances, dance/emote selection, synchronised multiplayer dances, competitions and performances. Create clubs, pubs, lounges, beach parties, festivals, concerts and community celebration venues with dancing crowds, DJ activities, lighting and social interactions. Use original or properly licensed audio and animation assets.

## NPCs and social life
NPCs have varied believable appearances and behaviours: walking, talking, working, shopping, eating, driving, resting, dancing and responding to the world. Include friendships, dating, marriage, social events, parties, festivals and multiplayer social activities.

## Jobs and careers
Provide meaningful jobs with actual tasks, payment and progression: retail, cashier, driving, delivery, police, security, healthcare, construction, skilled trades, transport, logistics, tourism, hospitality, island employment and business ownership.

## Economy
Use Ghanaian cedis (GH₵). Include cash, bank accounts, digital payments, purchases, salaries, rent, bills, savings, investments, shop stock, business income, property and vehicle purchases, and player trading. All valuable financial operations must be server-authoritative, validated and persistent.

## Transportation
Include cars, taxis, tro-tros, buses, motorcycles, trucks, delivery vehicles, boats, ferries and aircraft as the world expands. Support believable handling, sounds, traffic behaviour, ownership, interactions and appropriate entry/exit animations. Players should travel between cities, towns, villages and islands.

## Housing, property and businesses
Players can rent or buy houses and apartments, purchase land, furnish homes, store belongings and own suitable island/coastal property. Include groceries, supermarkets, clothing shops, restaurants, food vendors, dealerships, barbershops, salons, hotels, resorts and other businesses. Players should eventually manage and own businesses.

## Smartphone
Provide an in-game smartphone with banking, maps/navigation, jobs, messages/contacts, shopping, social networking, entertainment, transport and player identification features. Apps must connect to real game systems rather than decorative mockups.

## Online multiplayer
The target is a genuine online multiplayer world. Players should meet, communicate, explore, trade, work, socialise, attend events and operate businesses together. Accounts, characters, money, inventory and ownership must persist securely. Do not claim multiplayer is working until it is implemented and tested.

## Presentation
Create original AKWANTUO studio/logo branding, cinematic Ghanaian loading screens with progress and tips, and a polished main menu with Play, Continue, Character, Settings and News/Updates. Include day/night, weather, Ghanaian-inspired music and ambient sound, realistic visuals and configurable graphics.

## Technical requirements
Use a clean, modular and maintainable architecture. Support phones and ordinary computers. Use secure authentication, server-side validation, reliable saving/loading, automated tests, error handling and performance budgets. Never expose Supabase service-role or secret keys in browser code or commit secrets.

## Retained services
Preserve the existing AKWANTUO Supabase project `ugiysogfkclbcryhtkyn`, its database, auth users and migration history. Preserve the existing Vercel project `akwantuo`, its domains, settings and Git connection. No resets, drops, truncations, production schema changes, Vercel production changes or project deletions without explicit CEO approval. Audit existing schema and settings before proposing changes.

## Development stages
1. Clean foundation, architecture and service verification.
2. Accounts, character creation, identification cards and saving.
3. Core world, player movement and camera.
4. Greater Accra environment.
5. Roads, traffic and transportation.
6. Characters, NPCs and animation systems.
7. Buildings, interiors, homes and properties.
8. Shops, food, drinks and inventory.
9. Jobs, skills and survival systems.
10. Banking, economy and business ownership.
11. Smartphone and digital services.
12. Islands, beaches and water transportation.
13. Dancing, entertainment and social activities.
14. Multiplayer and persistent online world.
15. Kumasi, intercity travel and wider Ghana.
16. Optimisation, security and final QA.

Stages are gated by dependencies and test evidence, not calendar promises.

## Studio responsibilities and workflow
- Management: coordinate scope, dependencies, decisions and reporting.
- Research: investigate architecture, assets, services and technical choices.
- Creative: gameplay concepts and player/world experiences.
- Design: visual direction and mobile/desktop user experience.
- Engineering: implementation and architecture.
- Business: economy, jobs and commerce.
- QA: independent testing, defect reporting and verification.

Required workflow: **Assign → Research → Create → Develop → Test → Report → CEO approval.**

## Non-negotiable rules
AKWANTUO only; never import Accra Life code. Do not claim untested features work. Protect Supabase data and Vercel project. No exposed credentials. Avoid unnecessary complexity and spending. Do not skip QA or advance stages while critical defects remain. Obtain CEO approval for major scope changes, destructive operations, production changes and merges.

## First assignment: Phase 0
1. Verify archive branches and keep main unchanged.
2. Inspect the clean rebuild branch and establish an isolated clean foundation.
3. Inventory repository architecture, dependencies, assets and licensing.
4. Audit Supabase schema, RLS, policies, functions and migration history read-only.
5. Audit Vercel linkage, build settings, domains, deployment history and environment-variable names only.
6. Recommend architecture, multiplayer boundary, mobile performance budgets, CI and testing strategy.
7. Produce staged implementation tasks with acceptance criteria.
8. QA verifies service-preservation boundaries and the clean foundation.

First deliverable: a Phase 0 report with evidence, risks, architecture proposal and next-step recommendation. No broad feature implementation or production changes until CEO approval.
