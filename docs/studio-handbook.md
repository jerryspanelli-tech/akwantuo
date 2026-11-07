# AKWANTUO Studio Handbook

**Document ID:** AKW-STUDIO-001  
**Version:** 1.0  
**Status:** Operating standard — organisational design  
**Project:** AKWANTUO only  
**Authority:** CEO

## 1. Purpose and project boundary

This handbook defines the coordinated virtual studio structure for AKWANTUO: responsibilities, task ownership, departmental handoffs, evidence standards, approvals and reporting.

AKWANTUO is an independent project. This handbook, its tasks, assets, repositories and decisions must not be mixed with any other game or project. The approved AKWANTUO Master Game Development Prompt remains the controlling product specification. If this handbook conflicts with the master prompt, the master prompt controls product scope; the CEO resolves governance conflicts.

This is an operating framework for coordinated AI-assisted work. Role profiles are specialist instructions, not 44 separately deployed autonomous agents. No role is working in the background unless a specific tool or scheduled process has actually been configured and verified.

## 2. Governance and authority

### CEO
The user is CEO and final decision-maker. CEO approval is required for:
- Changes to the core game identity or master prompt.
- Major features and scope changes.
- Major technical architecture changes.
- Paid services, subscriptions or spending.
- Commercial agreements, publishing commitments or public promises.
- Phase completion and public release.

### Studio Director
Coordinates all departments, assigns priorities, resolves routine cross-department coordination and escalates CEO decisions. The Studio Director cannot override CEO authority.

### Chief of Staff
Maintains task records, decision records, outstanding work, approvals, blockers and documentation indexes.

### Project Manager
Breaks approved phases into tasks, tracks dependencies, coordinates delivery and prepares phase-readiness evidence. A Project Manager cannot independently close a phase.

### Decision rule
Specialists investigate and recommend. The accountable department lead reviews. The Studio Director coordinates. The CEO decides matters reserved to the CEO. No specialist may silently change approved scope.

## 3. Department structure and role register

| Department | Code | Lead | Specialist roles |
|---|---|---|---|
| Management | MGT | Studio Director | Studio Director (MGT-001); Chief of Staff (MGT-002); Project Manager (MGT-003) |
| Research | RES | Research Director (RES-001) | Ghanaian Culture (RES-002); Geography and Architecture (RES-003); Transportation (RES-004); Technical (RES-005); Gaming Market (RES-006); Business and Economy (RES-007) |
| Creative | CRE | Creative Director (CRE-001) | Game Designer (CRE-002); Story and Lore Writer (CRE-003); Mission and Activities Designer (CRE-004); Dialogue and Character Writer (CRE-005); World Experience Designer (CRE-006) |
| Design | DES | Art Director (DES-001) | UI/UX (DES-002); World and Environment (DES-003); Character (DES-004); Vehicle (DES-005); 3D Asset and Technical Art (DES-006); Animation and Visual Effects (DES-007) |
| Engineering | ENG | CTO (ENG-001) | Lead Game Engineer (ENG-002); Gameplay (ENG-003); Frontend (ENG-004); Backend (ENG-005); Multiplayer (ENG-006); 3D Integration (ENG-007); Technical Infrastructure (ENG-008) |
| Business | BUS | Business Director (BUS-001) | Game Economy (BUS-002); Monetisation (BUS-003); Marketing and Branding (BUS-004); Community (BUS-005); Partnerships and Publishing (BUS-006) |
| Quality Assurance | QA | QA Director (QA-001) | Functional Testing (QA-002); Mobile and Device Testing (QA-003); Performance and Optimisation (QA-004); Security and Privacy (QA-005); Compatibility (QA-006); Release and Deployment (QA-007) |

**Total:** 7 departments and 44 defined role profiles.

## 4. Department mandates

- **Management:** planning, task ownership, coordination, records, dependencies and executive reporting.
- **Research:** verifiable evidence, source quality, comparisons, uncertainty and research handoffs.
- **Creative:** gameplay concepts, stories, lore, missions, dialogue and player experiences.
- **Design:** visual direction, UI/UX, environment, character, vehicle, 3D asset and animation specifications.
- **Engineering:** implementation, integration, backend, multiplayer, infrastructure and technical maintenance.
- **Business:** economy, fair monetisation, branding, community, publishing and commercial research.
- **Quality Assurance:** independent verification, defect management, compatibility, security, performance and release readiness.

Each role's mission, responsibilities, operating instructions, deliverables and acceptance criteria are maintained in its approved specialist profile. A profile defines responsibility; it does not prove that work has been performed.

## 5. Standard workflow

1. **Intake:** capture the request and identify the relevant master-prompt requirement.
2. **Assignment:** create a unique task ID, accountable owner, department and reviewer.
3. **Research:** gather and verify relevant evidence where needed.
4. **Creative/design specification:** define intended player experience and measurable requirements.
5. **Implementation:** Engineering changes code or assets only against an approved specification.
6. **QA:** independently tests against acceptance criteria.
7. **Review:** department lead and Studio Director review results, evidence and outstanding issues.
8. **CEO decision:** obtain approval for reserved decisions, phase completion or release.
9. **Closeout:** record outcome, evidence, commit/build reference and any follow-up tasks.

Not every task requires every department. The Project Manager records which stages are applicable and why. A task must not skip a necessary dependency merely to appear complete.

## 6. Task ownership and status

Every task has exactly one accountable owner. Contributors may collaborate, but ownership remains explicit.

Official statuses:
- **Not started**
- **In progress**
- **Blocked**
- **Under review**
- **Completed**

A task may be marked **Completed** only when its acceptance criteria pass, evidence is attached or linked, required review is recorded, and no unresolved blocker prevents the stated outcome. If a task is rejected, it returns to In progress or is split into a corrective task. Do not delete failed history.

### Task ID convention

Use `AKW-[DEPT]-[3-digit number]`, for example `AKW-ENG-014`. IDs are unique and never reused. The Chief of Staff maintains the register.

### Minimum task fields

- Task ID and title
- Department and accountable owner
- Requesting role
- Master-prompt requirement or approved decision
- Objective and scope
- Dependencies
- Deliverables
- Acceptance criteria
- Status and priority
- Evidence and test/build/commit reference
- Reviewer and review result
- Blockers, risks and next action
- Created, updated and closed dates

## 7. Handoff standards

A handoff must contain:
- The problem or opportunity being addressed.
- Relevant research and traceable sources, if applicable.
- The intended player-facing outcome.
- Functional, visual or technical requirements.
- Dependencies and constraints.
- Deliverables and acceptance criteria.
- Known uncertainties and unresolved questions.

The receiving department may accept, request clarification or reject an incomplete handoff. Rejection must state what is missing. A handoff is not implementation approval unless the relevant authority has approved it.

Typical flow:

**Research → Creative → Design → Engineering → QA → Management review → CEO approval**

Business and Management support all stages. Direct handoffs are allowed when a task does not require an intermediate department, provided dependencies and approvals are recorded.

## 8. Evidence and truthfulness standards

- Research claims require traceable sources; record source title, publisher, URL, date and access date where available.
- Separate verified facts, estimates, assumptions and creative proposals.
- Code completion requires a repository path and commit or pull-request reference.
- Runtime claims require an actual run or test record.
- Multiplayer claims require multiple-client verification.
- Device compatibility claims require the device, OS, browser and test conditions.
- Performance claims require measured results and hardware details.
- Screenshots must come from the actual build being reported.
- A prototype, mockup, placeholder, source file or proposal is not proof of a finished in-game feature.
- Never invent screenshots, tests, sources, percentages, deployment results or agent activity.

## 9. QA severity and release gates

- **Critical:** game cannot start, serious security/privacy failure, major data loss or equivalent release-stopping failure. Block release.
- **High:** major gameplay/system feature broken. Resolve before phase approval unless the CEO explicitly accepts a documented exception.
- **Medium:** partial failure or significant defect. Track, prioritise and resolve according to phase requirements.
- **Low:** minor visual or usability issue. Record and schedule appropriately.

Before a phase or release recommendation, QA checks:
- Required core functionality passes.
- No unresolved critical defects.
- High-severity defects are resolved or explicitly dispositioned by the CEO.
- Mobile and computer compatibility is tested against declared targets.
- Performance is measured on representative hardware.
- Security and privacy are reviewed.
- Deployment and rollback are verified.
- Evidence and known limitations are documented.

QA recommends readiness; the CEO approves phase completion and release.

## 10. Reporting cadence and format

Each department report includes:
1. Department, lead and reporting period.
2. Work completed, with evidence.
3. Work in progress and current status.
4. Outstanding tasks and their owners.
5. Blockers, dependencies and risks.
6. QA results and unresolved defects.
7. Recommendations.
8. Decisions required from the CEO.
9. Honest department assessment.

Progress percentages may be used only when calculated from a defined task denominator. Do not estimate completion by impression.

## 11. Shared records

Maintain these records in the project documentation:
- Master vision and approved prompt.
- Task register and outstanding-work register.
- CEO decision register.
- Research library and source register.
- Creative bible and lore records.
- Design standards and asset register.
- Technical architecture and implementation records.
- Business and economy records.
- QA plans, test evidence and defect register.
- Release and deployment records.

The GitHub repository is the source of truth for project code. Approved project documentation belongs in version control where appropriate. Sensitive credentials must never be committed.

## 12. Change control

Every proposed change to scope, architecture, design standards or master requirements must record:
- What is changing and why.
- Which requirements and files are affected.
- Benefits, costs, risks and dependencies.
- Compatibility and migration implications.
- Test and rollback plan.
- Required approval.

Do not overwrite approved decisions silently. Preserve decision history and record the CEO's approval or rejection.

## 13. Studio operating principles

1. AKWANTUO only; never mix projects.
2. One accountable owner per task.
3. Inspect existing systems before replacing them.
4. Build against approved requirements.
5. Keep mobile and ordinary-computer constraints in view.
6. Report blockers and failed tests immediately.
7. Carry unfinished work forward.
8. No unapproved spending or commercial commitments.
9. No unsupported completion claims.
10. No phase advancement without CEO approval.

## 14. Operational limitation

This handbook establishes governance and specialist role instructions. It does not itself deploy autonomous agents, create background workers, connect every specialist to external services, or prove any game feature is implemented. Tool access, repository permissions, scheduled execution and persistent agent infrastructure must be configured and tested separately.

---

# Appendix A — Task record template

Copy for each task:

```yaml
task_id: AKW-XXX-000
title:
department:
accountable_owner:
contributors: []
requester:
master_prompt_reference:
objective:
scope_in:
scope_out:
dependencies: []
deliverables: []
acceptance_criteria: []
priority: normal
status: Not started
evidence: []
reviewer:
review_result:
blockers: []
risks: []
next_action:
created_at:
updated_at:
closed_at:
```

# Appendix B — Department report template

```markdown
# Department Report

- Department:
- Department lead:
- Reporting period:
- Prepared on:

## Completed work
| Task ID | Deliverable | Evidence | Review result |
|---|---|---|---|

## Work in progress
| Task ID | Owner | Status | Next action |
|---|---|---|---|

## Outstanding work
| Task ID | Owner | Reason outstanding | Target/checkpoint |
|---|---|---|---|

## Blockers and risks
- Issue:
- Impact:
- Owner:
- Required action:

## QA and evidence
- Tests performed:
- Results:
- Defects remaining:
- Evidence links:

## Recommendations
- Recommendation:
- Reason:
- Cost/risk/dependency:

## CEO decisions required
- Decision:
- Options:
- Department recommendation:
- Deadline or dependency:

## Department assessment
- Ready / Not ready / Blocked:
- Explanation:
```

# Appendix C — CEO decision record

| Field | Entry |
|---|---|
| Decision ID | AKW-DEC-000 |
| Date | |
| Subject | |
| Requested by | |
| Options considered | |
| Recommendation | |
| CEO decision | Approved / Rejected / Deferred |
| Conditions | |
| Affected tasks/documents | |
| Recorded by | Chief of Staff |
