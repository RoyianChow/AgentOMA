# Task 06 — Virtual care

**Current phase:** Workstreams A–L complete (design, threat model, contracts, and a synthetic
prototype inside Task 01's sandbox); production integration not started

**Runtime implementation:** synthetic only, inside `apps/experiment-sandbox/`; not reachable
from the production application

**Synthetic code authority:** confined to Task 01's isolated sandbox boundary; grants no
production capability

**Real PHI, vendor, migration, authentication change, or patient pilot:** not authorized

Start with:

1. [`current-state-and-gap-analysis.md`](current-state-and-gap-analysis.md)
2. [`ontario-virtual-care-standards-mapping.md`](ontario-virtual-care-standards-mapping.md)
3. [`build-vs-integrate-decision.md`](build-vs-integrate-decision.md)
4. [`vendor-assessment-scorecard.md`](vendor-assessment-scorecard.md)
5. [`verification-and-procurement-gates.md`](verification-and-procurement-gates.md)
6. [`virtual-care-threat-model.md`](virtual-care-threat-model.md)
7. [`trust-boundaries-and-data-flows.md`](trust-boundaries-and-data-flows.md)
8. [`virtual-visit-contracts-and-schema-proposal.md`](virtual-visit-contracts-and-schema-proposal.md)
9. [`identity-location-consent-privacy-and-suitability.md`](identity-location-consent-privacy-and-suitability.md)
10. [`waiting-room-and-participant-controls.md`](waiting-room-and-participant-controls.md)
11. [`device-connectivity-accessibility-and-fallback.md`](device-connectivity-accessibility-and-fallback.md)
12. [`failure-and-contingency-state-machine.md`](failure-and-contingency-state-machine.md)
13. [`secure-messaging-contract.md`](secure-messaging-contract.md)
14. [`assessment-and-claim-integration-boundary.md`](assessment-and-claim-integration-boundary.md)
15. [`privacy-security-and-retention-plan.md`](privacy-security-and-retention-plan.md)
16. [`audit-event-catalogue.md`](audit-event-catalogue.md)
17. [`virtual-care-incident-response.md`](virtual-care-incident-response.md)
18. [`accessibility-and-responsive-evidence.md`](accessibility-and-responsive-evidence.md)
19. [`privacy-accessibility-security-and-clinical-validation-plan.md`](privacy-accessibility-security-and-clinical-validation-plan.md)
20. [`production-integration-handoff.md`](production-integration-handoff.md)
21. [`../tasks/autonomous-pharmacy/TASK-06-virtual-care.md`](../tasks/autonomous-pharmacy/TASK-06-virtual-care.md)

Synthetic prototype code: `apps/experiment-sandbox/src/virtual-care/` (contracts, 54
deterministic fixtures, guards, server actions) and
`apps/experiment-sandbox/src/app/virtual-care/` (the 13 required synthetic UI surfaces). Tests:
`apps/experiment-sandbox/src/virtual-care/__tests__/`.

---

Workstream A found no virtual-care subsystem on `main` and, at the time of writing, Task 01 was
approved-but-unproven, Task 02's assessment/claim boundary was real and authoritative but
unverified end-to-end, Task 05 did not exist (patient identity gap), and Task 07 did not exist
yet either. Task 07 merged mid-task (2026-08-06) with its own document specifically addressing
Task 06 integration; a dated, non-destructive addendum in `current-state-and-gap-analysis.md`
§13 records that without rewriting the original discovery.

Workstream B recommends a hybrid build-vs-integrate approach and selects no vendor. The
scorecard and procurement gates are real instruments, not filled in against a real candidate.

Workstream C models 8 actor categories, the required asset list, and — after an explicit,
disclosed revision — 54 individually-assessed threats (not grouped categories), each with all 12
required fields, plus three Mermaid trust-boundary/data-flow diagrams.

Workstream D defines the 9-dimension orthogonal state model and, after an explicit, disclosed
revision, gives all 19 entity contracts the full 12-property field treatment (not just
`VirtualVisit`). No migration is proposed or applied.

Workstreams E–G define identity/location/consent/privacy/suitability gating, waiting-room and
participant-authorization controls, and device/connectivity/accessibility/telephone-fallback
design, each built against this repo's real existing patterns (`requirePortalUser`, the
`PHARMACY_ID` single-tenant invariant) where production code already exists, and marked
synthetic-only where it doesn't (Task 05).

Workstream H defines a 28-state, 4-phase failure and contingency state machine whose central
proof is that no technical event, disconnect, timeout, patient departure, or vendor event can
ever complete an assessment or generate a claim — enforced by contract shape, not convention.

Workstream I mirrors Task 07's own published consumer contract for secure messaging rather than
inventing a parallel one.

Workstream J is the safety-critical document: 28 rechecked guards, a full checkpoint matrix, and
every claim-boundary prohibition checked against the actual schema rather than merely asserted.

Workstream K covers privacy/security controls, a retention proposal that honestly marks every
undecided period `UNRESOLVED` rather than inventing one, the audit-event catalogue, and a
13-step incident-response design whose one governing rule is that the application never
concludes on its own that an event is a reportable privacy breach.

Workstream L is the synthetic prototype itself: `contracts.ts`/`fixtures.ts` (54 deterministic,
server-owned scenarios covering every required case), `guards.ts`/`visit-server.ts`/`actions.ts`
(deny-by-default authorization derived fresh from state, never cached or echoed), the 13 required
UI surfaces wired through those guards rather than client-side hiding, and 9 required-test suites
plus a static, honestly-partial accessibility review. Two structural blockers were found and
disclosed rather than routed around: the sandbox's G1 lifecycle window is expired (blocks
`npm run dev`/build/start), and Vitest cannot resolve module paths locally when this workstation's
checkout path contains `#`. The path issue does not block GitHub Actions: CI ran the complete
suite, found four real defects, and the fixes merged in commit `87e6044`. The expired lifecycle
still blocks live browser and accessibility evidence and remains outside this task's authority.

The clinical/operational validation plan (this task's remaining named deliverable before the
final report) is written but not run — no pharmacist has reviewed this prototype yet. The
production integration handoff inventories exactly what has to happen, in what order, before any
of this reaches a real patient, and grants none of it here.
