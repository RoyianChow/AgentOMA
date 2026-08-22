# Task 14 — Regulatory Change and Clinical Knowledge Governance

## Sprint checkpoint — 2026-08-20

**Repository state:** `NOT RUN`; the repository has protected clinical and
billing sources plus compliance documentation, but no dedicated recurring
regulatory-change intake, impact, approval, activation, and rollback contract.
**Sprint slice:** source-register design, provenance rules, impact-mapping
template, approval matrix, effective-date transition plan, and evidence design
only.
**Exit:** no clinical rule, red flag, PIN, fee, claim maximum, intervention
code, migration, billing derivation, consent language, or production behaviour
is changed or activated. Runnable tooling requires an exact Task 14 approval
and Task 11 Checkpoint 1. See
[`CURRENT-IMPLEMENTATION-STATUS.md`](CURRENT-IMPLEMENTATION-STATUS.md).

## Role

Regulatory/change-control lead working with practising Ontario pharmacists,
the product lead, legal/regulatory counsel where required, data/backend owners,
Security/Privacy, Quality/Test, Operations/SRE, training owners, and Task 11
reviewers.

## Priority

P1 as a recurring governance control. It becomes P0 when a binding source is
announced, amended, replaced, withdrawn, or approaching its effective date.

## Status and authority

**Status:** discovery and design only.
**Production authorization:** none.
**Clinical or billing change authorization:** none.

Task 14 defines how authoritative changes are identified, interpreted,
reviewed, implemented, tested, activated, and retired. It does not itself
approve a legal interpretation, clinical algorithm, billing value, migration,
release, or production activation. A green comparison or test suite is never a
substitute for the named human approvals.

## Why this task exists

The application depends on time-sensitive Ministry, OCP, Ontario Health,
privacy, accessibility, and vendor requirements. The repository already keeps
versioned reference rows and protects high-risk files, but it has no single
contract for answering:

- which source is authoritative and whether it has been superseded;
- what changed, when it takes effect, and which workflows are affected;
- which pharmacist, regulatory, privacy, security, operations, and quality
  reviewers must approve the interpretation;
- how old and future rules coexist before an effective date;
- how activation is proven without silently changing historical records;
- what happens when a source, interpretation, or implementation is uncertain.

Without that control, a well-intentioned documentation or dependency update
can silently become a clinical or billing defect. Task 14 makes uncertainty
visible and requires the affected workstream to fail closed.

## Objective

Create a defensible regulatory and clinical-knowledge change programme that:

- maintains a versioned register of authoritative sources, provenance,
  effective dates, supersession, owners, and review cadence;
- captures each proposed change as a bounded package with an exact source hash;
- maps source clauses to affected code, data, UI, tests, documentation,
  training, operations, and external contracts;
- distinguishes source text, human interpretation, implementation decision,
  evidence, and release authorization;
- supports future-effective and historical versions without rewriting prior
  records;
- requires independent review for high-consequence clinical, billing, privacy,
  identity, retention, interoperability, and automation changes;
- proves activation, rollback, stale-source handling, and historical
  reconstruction against an exact candidate;
- produces payload-free evidence consumable by Task 11.

## Dependencies and ownership boundaries

| Dependency | Task 14 may define or verify | Task 14 must not own or change |
|---|---|---|
| Task 01 | Synthetic source/change fixtures and isolated verification | Sandbox approval, hosted preview, or production imports |
| Task 02 | P0 impact mapping and migration/recovery evidence contract | Triage, claim derivation, migrations, auth, audit, LTC, orientation, or live deployment |
| Tasks 03–10 | Change-notification and impact contracts for each capability | Their domain policy, runtime, external integration, or substantive approval |
| Task 11 | Evidence profile, exact-candidate review, and promotion checks | Approval granting or self-review |
| Task 12 | Operational activation, rollback, and recovery procedures | Production operations, restore authority, RTO, or RPO |
| Task 13 | Training-change and human-factors impact requirements | Professional competence, clinical education, or pilot approval |

The owner of the affected source remains accountable for its interpretation.
Task 14 coordinates change control; it never becomes a shortcut around the
protected-surface owner or reviewer.

## Non-negotiable invariants

1. **The authoritative source wins.** For Ontario minor-ailment funding, the
   binding Ministry notice in `docs/regulatory/` wins over summaries, task
   briefs, tests, generated artifacts, agent memory, and this task file.
2. **No values from memory.** Never derive or copy PINs, fees, claim maximums,
   intervention codes, clinical red flags, retention values, or consent wording
   from memory or from an unapproved secondary summary.
3. **No autonomous interpretation or activation.** A crawler, diff tool, AI
   model, agent, CI job, or scheduled task may identify a possible change, but
   may not decide its meaning, edit protected sources, approve it, or activate
   it in production.
4. **Protected surfaces stay protected.** This brief alone grants no authority
   to edit `src/config/triage.ts`, reference billing data,
   `src/lib/db/migrations/`, `deriveClaimDraft`, audit enforcement, LTC billing,
   or pharmacist authentication/orientation.
5. **Effective dates are explicit.** New, current, superseded, withdrawn, and
   future-effective states are distinct. Historical records remain
   reconstructable under the rules in force at their service time.
6. **Source, interpretation, implementation, and release are separate.** Each
   has its own owner, decision, timestamp, scope, and evidence. One stage never
   implies another.
7. **Unknown or contradictory means blocked.** Missing source text, unclear
   applicability, conflicting guidance, uncertain effective date, missing
   reviewer, or failed evidence is `BLOCKED`, never a guessed default.
8. **No silent historical mutation.** Corrections use versioning or
   supersession. Existing clinical, billing, audit, claim-draft, and evidence
   records are never rewritten to appear as though a later rule was always in
   force.
9. **No payment promise.** Regulatory updates never change the rule that HNS
   adjudication is authoritative and the platform's 365-day count is advisory.
10. **Evidence is safe.** Manifests and logs contain source identifiers,
    hashes, clause references, safe reason codes, timestamps, and outcomes—not
    PHI, credentials, tokens, patient narratives, or restricted payloads.
11. **No duplicate source of truth.** Task 14 records provenance and pointers;
    it does not paste the binding PIN table or clinical algorithms into another
    document, fixture, or generated file.
12. **Rollback cannot invent an old state.** A rollback must use an approved,
    tested, retained version and cannot bypass a new rule that is already
    legally effective without an explicit human decision.

## Workstream A — Authoritative source register

Design a versioned register containing, at minimum:

- stable source ID and jurisdiction;
- issuing authority and authoritative URL or repository artifact;
- exact title, publication date, effective date, end/supersession date, and
  status;
- repository path and SHA-256 hash for retained artifacts;
- source type and affected capability domains;
- accountable interpretation owner and backup;
- required pharmacist, legal/regulatory, privacy, security, accessibility,
  quality, operations, vendor, and product reviewers;
- last verification time, next review trigger, and verification evidence;
- superseding and superseded source relationships;
- restrictions on quotation, redistribution, or automated retrieval.

The register stores metadata and pointers, not a second copy of controlled
tables or clinical content.

Deliver:

- `docs/task-14/source-register-schema.md`;
- `docs/task-14/source-register.json` using only approved source metadata;
- provenance and artifact-hash verification rules.

## Workstream B — Change intake and interpretation record

Define a change-intake package that records:

- exact source and hash;
- discovery channel and timestamp;
- whether the source is new, amended, replaced, withdrawn, corrected, or
  merely re-published;
- affected clauses and effective dates;
- verbatim excerpts only where legally permitted and necessary;
- a human-authored interpretation with assumptions and unresolved questions;
- explicit `NO_CHANGE`, `CHANGE_REQUIRED`, `BLOCKED`, or `OUT_OF_SCOPE`
  disposition;
- named owner, independent reviewers, expiry/review date, and signatures;
- affected task owners and required handoffs.

Automated comparison output is untrusted evidence. It cannot be the final
interpretation.

Deliver:

- `docs/task-14/change-intake-template.md`;
- interpretation and conflict-resolution template;
- safe reason-code catalogue for blocked changes.

## Workstream C — Impact and traceability map

Map each approved interpretation to all affected surfaces:

- reference rows, effective-date selection, and seed provenance;
- clinical questions, exclusions, modality, eligibility, consent, follow-up,
  referral, prescription, and documentation behavior;
- claim derivation, export, audit, retention, and historical reconstruction;
- schema, migration, constraints, triggers, roles, grants, and rollback;
- server actions, routes, UI language, print/PDF output, and accessibility;
- synthetic fixtures, unit/integration/concurrency/regression tests;
- `COMPLIANCE.md`, project/status docs, operator runbooks, and training;
- external vendor, interoperability, privacy, security, or contractual impact.

Every affected surface has an owner and disposition. An unassessed surface
blocks activation.

Deliver:

- `docs/task-14/change-impact-matrix.md`;
- source-clause-to-control traceability template;
- cross-task notification and acknowledgement contract.

## Workstream D — Versioning and effective-date transition

Design how the product handles:

- announcement before the effective date;
- future-effective reference and configuration versions;
- service-time selection using an approved Ontario business-date rule;
- coexistence of current and future values;
- same-day cutover, clock, timezone, and retry behavior;
- in-progress assessments spanning a cutover;
- historical export and reconstruction under the original version;
- source correction, withdrawal, delayed effective date, and emergency change;
- safe failure when no applicable approved version exists.

Do not implement schema changes or select a transition policy without the
affected task's approval.

Deliver:

- `docs/task-14/effective-date-transition-contract.md`;
- historical-reconstruction test plan;
- transition, rollback, and forward-fix scenario matrix.

## Workstream E — Approval and separation-of-duties matrix

Define required approvals by change class. At minimum distinguish:

- editorial/documentation-only;
- operational or UI wording with no clinical/billing meaning;
- privacy, consent, identity, retention, or access change;
- clinical/red-flag or professional-scope change;
- PIN, fee, maximum, intervention-code, payer, or claim change;
- schema/migration/constraint/grant change;
- external-integration or vendor change;
- emergency mitigation and later permanent correction.

For each class record accountable owner, independent reviewer(s), evidence,
expiry, approval order, rollback authority, and Task 11 checkpoint. No person or
tool may self-approve where independence is required.

Deliver:

- `docs/task-14/change-classification-and-approval-matrix.md`;
- exact-candidate approval template;
- emergency-change decision template that does not waive non-waivable controls.

## Workstream F — Implementation package and verification contract

Define the package an affected implementation task must produce:

- exact candidate SHA and clean-worktree proof;
- source, artifact, migration-chain, fixture, and generated-output hashes;
- approved interpretation and impact matrix;
- changed-file allowlist and protected-surface authorization;
- generated migration reviewed as SQL before execution;
- from-zero, predecessor-upgrade, concurrency, rollback, and reconstruction
  evidence where applicable;
- proof that unknown lookups fail closed and historical versions remain valid;
- proof that red-flag exits still write zero claim rows and no new payment
  promise appears;
- accessibility, privacy, security, operations, and training evidence;
- exact activation, monitoring, rollback, and post-activation verification plan.

Task 14 must not prescribe expected billing literals in tests. Tests derive
expected values from the approved reference source and verify provenance.

Deliver:

- `docs/task-14/implementation-package-template.md`;
- evidence manifest schema and validator test plan;
- protected-surface review checklist.

## Workstream G — Activation, rollback, and stale-source handling

Design fail-closed controls for:

- scheduled activation using server-owned time and approved version state;
- manual activation authority and separation of duties;
- preflight proof that required data, code, docs, training, and runbooks agree;
- post-activation verification without PHI in logs or evidence;
- kill switch or bounded disablement where legally and operationally valid;
- rollback, forward-fix, and emergency containment;
- expired review, stale source, inaccessible source, hash mismatch, duplicate
  source, contradictory guidance, and unknown applicability;
- notification of affected operators without exposing PHI or implying that a
  system notice replaces professional review.

There is no unattended production activation in this task.

Deliver:

- `docs/task-14/activation-and-rollback-runbook.md`;
- stale-source and contradiction state machine;
- synthetic activation/recovery drill plan coordinated with Task 12.

## Workstream H — Task 11 evidence and recurring review

Register Task 14 with Task 11 and define evidence for:

- source and artifact integrity;
- provenance and supersession correctness;
- approval separation and expiry;
- impact-map completeness;
- effective-date and historical-version behavior;
- missing/unknown source fail-closed behavior;
- protected-surface authorization;
- activation, rollback, and recovery;
- documentation/training synchronization;
- proof that no clinical or billing table was duplicated into task artifacts.

Define recurring review triggers, including a new publication, correction,
withdrawal, approaching effective date, changed authoritative URL, hash
mismatch, implementation drift, failed reconstruction, or expired reviewer
approval. Do not invent a review interval without owner approval.

Deliver:

- `docs/task-14/task-11-registration.md`;
- Task 14 evidence profile and manifest schema;
- final review and handoff template.

## Required synthetic tests after implementation approval

When and only when exact implementation approval exists, test with authored-
synthetic source metadata and rule identifiers:

- unchanged source produces `NO_CHANGE`;
- changed hash requires human interpretation and blocks activation;
- unknown, contradictory, missing, expired, or withdrawn source fails closed;
- future-effective version does not activate early;
- approved cutover selects the correct version at the boundary;
- in-progress work uses the approved transition contract;
- historical reconstruction uses the service-time version;
- rollback uses only an approved retained version;
- expired or wrong-candidate approval cannot activate;
- required independent reviewer absence blocks;
- a protected-file mutation without explicit authorization is denied;
- duplicate source-of-truth content is detected;
- evidence contains no PHI, credentials, tokens, or source payload leakage;
- Task 01 boundary and production-invariance checks remain green.

No test may use real patient data, production credentials, unapproved source
content, or live external services.

## Stop conditions

Stop and report `BLOCKED` when:

- the authoritative source or complete artifact is unavailable;
- source provenance, jurisdiction, applicability, effective date, or
  supersession is uncertain;
- two authoritative sources appear to conflict;
- a needed legal, regulatory, pharmacist, privacy, security, accessibility,
  quality, operations, vendor, or product reviewer is missing;
- a protected surface would be changed without exact written authorization;
- historical reconstruction or rollback cannot be proven;
- an applicable source version cannot be selected deterministically;
- implementation would require `db:push`, manual migration-history editing, or
  mutation of prior immutable records;
- a tool proposes autonomous interpretation, code generation, approval, or
  activation beyond the recorded scope;
- a required check is skipped, filtered, flaky, or unavailable.

## Deliverables

1. Current-state and gap analysis.
2. Authoritative source register schema and approved metadata register.
3. Change-intake and interpretation templates.
4. Impact and traceability matrix.
5. Effective-date and historical-reconstruction contract.
6. Change-classification and approval matrix.
7. Implementation package and evidence contract.
8. Activation, rollback, and stale-source runbook.
9. Task 11 registration and final report template.

## Definition of done

- Every regulated source has provenance, ownership, status, effective dates,
  supersession, artifact integrity, and review triggers recorded.
- Source text, interpretation, implementation, verification, and release are
  visibly separate stages with separate authority.
- Each approved change has a complete impact map with no unowned surface.
- Future-effective, current, superseded, and withdrawn states fail closed.
- Historical records and exports remain reconstructable under the version in
  force at service time.
- Protected clinical, billing, migration, audit, auth, LTC, and orientation
  surfaces cannot change through Task 14 alone.
- Exact-candidate evidence proves effective-date, rollback, approval-expiry,
  stale-source, and unknown-state behavior when implementation is authorized.
- No binding table or clinical algorithm is duplicated into Task 14 artifacts.
- Required independent pharmacist, legal/regulatory, Security/Privacy,
  Quality/Test, Operations/SRE, product, training, and Task 11 reviews are
  recorded where applicable.
- Production remains not authorized until a separate named release decision.

## Final report format

The final report must state:

- exact candidate, source IDs/hashes, artifact paths, environment, and
  worktree state;
- source status, publication/effective/supersession dates, and provenance;
- interpretation owner, affected tasks, reviewers, approvals, expiries, and
  unresolved conflicts;
- impact-map completeness and every protected surface touched;
- commands/checks, results, counts, evidence paths, and artifact hashes;
- effective-date, reconstruction, rollback, and stale-source results;
- confirmation that no PHI, production credential, live external effect,
  autonomous interpretation, or unapproved activation occurred;
- next owner and next authorized action;
- final status using only `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`.

Task 14 completion is not a clinical, billing, legal, privacy, migration, or
production approval. Each substantive change still requires its own exact,
expiring decision and Task 11 evidence review.
