# AKWANTUO Initial Development Backlog

**Document ID:** AKW-BACKLOG-001  
**Baseline:** `AKW-AUDIT-001`, main `8aa31d5e730086b894456c14d5f224ab8b837c4e`

All tasks begin as **Not started** unless evidence shows otherwise. Related source files do not constitute acceptance evidence.

| Task ID | Title | Department | Accountable owner | Priority | Status | Acceptance criteria |
|---|---|---|---|---|---|---|
| AKW-QA-001 | Investigate failing main transport-preview CI check | QA | Compatibility Tester | Critical | Not started | Root cause documented; fix passes on target branch |
| AKW-ENG-001 | Reconcile technical architecture documentation | Engineering | CTO | High | Not started | Docs distinguish implemented, unverified and planned systems |
| AKW-QA-002 | Establish clean install, typecheck and production build baseline | QA | Functional Testing Specialist | High | Not started | Reproducible clean-checkout commands pass |
| AKW-QA-003 | Browser smoke test startup, character creation and movement | QA | Functional Testing Specialist | High | Not started | Startup, menu, character form, movement, jump and console checks pass |
| AKW-QA-004 | Verify mobile touch controls on physical devices | QA | Mobile and Device Testing Specialist | High | Not started | Device/OS/browser test record verifies touch controls |
| AKW-ENG-002 | Verify Supabase auth and cloud profile persistence | Engineering | Backend Engineer | High | Not started | Sign-up, sign-in, refresh, profile save/load and RLS tests pass |
| AKW-QA-005 | Verify retail checkout and asset ownership transactions | QA | Functional Testing Specialist | High | Not started | Purchase, insufficient balance/stock, retry and ownership reload tests pass |
| AKW-ENG-003 | Define and implement dedicated multiplayer server foundation | Engineering | Multiplayer Engineer | High | Not started | Server workspace, room lifecycle, authenticated presence and multi-client test exist |
| AKW-DES-001 | Specify realistic player character and animation pipeline | Design | Character Designer | High | Not started | Approved model/rig/animation requirements and mobile budgets documented |
| AKW-ENG-004 | Integrate realistic player character and natural movement | Engineering | 3D Integration Engineer | High | Not started | Approved model and natural movement transitions pass; placeholder no longer presented as final |
| AKW-CRE-001 | Define first playable neighbourhood acceptance specification | Creative | World Experience Designer | High | Not started | Boundaries, activities, landmarks and interactions specified and approved |
| AKW-ENG-005 | Convert first playable neighbourhood into verified gameplay space | Engineering | Lead Game Engineer | High | Not started | Navigation, collision, spawn, boundaries and interactions pass |
| AKW-ENG-006 | Complete staged road navigation, collision and traffic integration | Engineering | Gameplay Engineer | High | Not started | Lane direction, junction rules, collisions and traffic checks pass |
| AKW-QA-006 | Verify transport modes individually | QA | Functional Testing Specialist | High | Not started | Separate evidence for cars, motorcycles, trotro, rail, speedboat and jet ski |
| AKW-DES-002 | Define final-quality island and vehicle asset requirements | Design | World and Environment Designer | Normal | Not started | Approved environment/craft asset brief with performance budgets |
| AKW-ENG-007 | Complete island access, interiors and ownership experience | Engineering | Gameplay Engineer | Normal | Not started | Access, purchase, saved ownership, dock/landing and interior interactions verified |
| AKW-QA-007 | Establish performance and device compatibility baseline | QA | Performance and Optimisation Engineer | High | Not started | FPS/frame-time, memory and load measurements on representative devices |
| AKW-MGT-004 | Publish verified Phase 1 feature matrix and readiness recommendation | Management | Project Manager | High | Not started | Every master-prompt requirement labelled verified, partial, planned or blocked with evidence |

## Priority definitions
- Critical: blocks reliable progression until resolved.
- High: required for the foundation gate or a major dependency.
- Normal: important but sequenced after higher-priority blockers.

## Rules
- One accountable owner per task.
- IDs are unique and never reused.
- Completion requires acceptance evidence and review.
- Blocked tasks must state blocker, impact and next action.
- Phase completion and release remain CEO decisions.
