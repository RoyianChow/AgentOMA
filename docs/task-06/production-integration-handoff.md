# Task 06 — Production Integration Handoff

This document is for whoever picks up production virtual care after this task. It does not
authorize anything — it inventories what exists, what's proven, what's still a synthetic
placeholder, and exactly what has to happen, in what order, before any of this can touch a real
patient.

**This task grants no production authority of any kind.** No migration is applied, no vendor is
selected, no authentication is changed, and no code in this task's scope is reachable from the
production application (`apps/experiment-sandbox` is a separate, isolated workspace — see
`docs/task-01/`).

---

## 1. What exists today, and where

| Layer | Status | Location |
|---|---|---|
| Discovery, standards mapping, build-vs-integrate decision | Complete | `current-state-and-gap-analysis.md`, `ontario-virtual-care-standards-mapping.md`, `build-vs-integrate-decision.md` |
| Vendor scorecard and procurement gates | Instrument only — **no vendor evaluated** | `vendor-assessment-scorecard.md`, `verification-and-procurement-gates.md` |
| Threat model | Complete — 54 individually-assessed threats | `virtual-care-threat-model.md` |
| Trust boundaries / data flows | Complete | `trust-boundaries-and-data-flows.md` |
| State model and entity contracts | Complete, conceptual only — **no migration applied** | `virtual-visit-contracts-and-schema-proposal.md` |
| Identity/location/consent/privacy/suitability design | Complete | `identity-location-consent-privacy-and-suitability.md` |
| Waiting-room and participant-control design | Complete | `waiting-room-and-participant-controls.md` |
| Device/connectivity/accessibility/fallback design | Complete | `device-connectivity-accessibility-and-fallback.md` |
| Failure and contingency state machine | Complete | `failure-and-contingency-state-machine.md` |
| Secure-messaging contract | Complete, aligned to Task 07's published boundary | `secure-messaging-contract.md` |
| Assessment/claim integration boundary | Complete | `assessment-and-claim-integration-boundary.md` |
| Privacy/security/retention/audit/incident design | Complete | `privacy-security-and-retention-plan.md`, `audit-event-catalogue.md`, `virtual-care-incident-response.md` |
| Synthetic prototype | Built and committed, **not runnable right now** (see §3) | `apps/experiment-sandbox/src/virtual-care/*`, `apps/experiment-sandbox/src/app/virtual-care/*` |
| Required tests | Written, **not executed by the test runner** (see §3) | `apps/experiment-sandbox/src/virtual-care/__tests__/*` |
| Accessibility/responsive evidence | Partial — static review only | `accessibility-and-responsive-evidence.md` |
| Clinical/operational validation plan | Plan only — **no pharmacist has run it yet** | `privacy-accessibility-security-and-clinical-validation-plan.md` |

## 2. What production integration actually requires, in order

This is a dependency-ordered list, not a menu — an item is not safely startable until the ones
above it are resolved.

1. **Task 01's G1/G2 approval renewed.** The sandbox's own lifecycle window expired
   2026-08-05; nothing in this task's prototype can even be demonstrated live until that's
   renewed. This is the very first blocker and it's outside this task's authority to clear.
2. **Task 05 (patient identity)** reaches a stable contract. Every "synthetic-only" marking in
   this task's documents — patient sessions, delegate grants, actor-to-subject binding — is a
   stand-in for what Task 05 must actually provide. None of Task 06's identity/authorization
   design can be implemented against production data before this exists.
3. **Task 02's assessment/claim boundary** is re-verified against whatever state it's in by the
   time this is picked up (it was read-only/authoritative-but-unproven as of this task's
   writing — re-check `current-state-and-gap-analysis.md`'s addendum for the latest known
   state).
4. **Task 07's messaging boundary** is re-confirmed compatible — Workstream I of this task
   already mirrors Task 07's own published consumer contract
   (`docs/task-07/appointment-follow-up-and-task-06-integration.md`); re-verify that contract
   hasn't changed since.
5. **Vendor selection (Workstream B).** No vendor is selected. The scorecard and procurement
   gates are ready to run once a candidate exists, but selecting one requires privacy/security/
   accessibility/residency/subprocessor evidence this task cannot gather unilaterally.
6. **Migration sign-off.** The schema in `virtual-visit-contracts-and-schema-proposal.md` is a
   proposal. Applying it requires the lead's explicit `db:generate` → `db:migrate` approval per
   `AGENTS.md` — this task does not have that approval and does not request it.
7. **Task 11's security/release gate** actually exists and is verified for this capability (as
   of this task's writing, Task 11 was only a first slice — re-check its current state).
8. **PIA, TRA, professional review, and cross-jurisdictional review**, all named in the task's
   required final report format, none of which this task is authorized to conduct or approve.
9. **The clinical/operational validation plan is actually run** by a practising Ontario
   pharmacist (§2 of that document) — not just written.
10. Only after all of the above: a real implementation, behind Task 11's release gate, with its
    own PR and its own review — never as a continuation of this task's synthetic work.

## 3. Known defects in the current synthetic state that a future implementer must not inherit silently

- **The sandbox's G1 lifecycle window is expired** (§2.1) — no live demonstration is currently
  possible.
- **`npm run test` cannot execute in this repository's current directory** — Vitest refuses to
  resolve module paths because the directory name contains `#` (confirmed, pre-existing, not
  caused by this task). The required tests are written and individually verified by other means
  (see `docs/task-06/README.md` and the L4 commit message), but have never been run end-to-end
  by their intended runner. **Do not treat "the tests exist" as equivalent to "the tests pass"
  until this is fixed and they're actually executed.**
- **Consent, privacy, and UI copy throughout the prototype is structural placeholder text**, not
  reviewed legal or patient-facing wording. Do not ship any of it verbatim.
- **Retention periods are `UNRESOLVED` by design** (`privacy-security-and-retention-plan.md`
  §3) — a future implementer must get an actual privacy/legal decision, not infer one from the
  synthetic default.

## 4. Explicit non-authorizations (restated from the task brief, not softened)

Real PHI, a live vendor account, a production migration, a production authentication change, a
live patient pilot, and any production deployment of this feature are all **out of scope for
this task and remain unauthorized by everything in `docs/task-06/`.** A future PR that builds on
this work must obtain its own approvals — it does not inherit authorization from this task
having been "complete."
