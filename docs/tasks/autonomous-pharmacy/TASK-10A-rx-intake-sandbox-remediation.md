# Task 10A — Rx Intake Experiment Isolation and Safety Remediation

**Parent task:** [Task 10 — Bounded AI](TASK-10-bounded-ai.md)  
**Priority:** P0 boundary remediation within a P2 research workstream  
**Owner profile:** senior full-stack or applied-AI developer  
**Required reviewers:** Product Lead, Security/Privacy, pharmacist evaluator,
Accessibility, and Task 11 Quality/Test  
**Status:** `RETIRED / TASK01_EVIDENCE_BLOCKED`
**Last verified:** 2026-08-20

> Royian Chowdhury approved `RETIRE` for candidate
> `a31c1143feaab6763e33e34c50b14fa5ae91c8ca`. The binding decision is recorded
> in
> [`../../task-10/decisions/AI-RX-06-retirement-2026-08-20.md`](../../task-10/decisions/AI-RX-06-retirement-2026-08-20.md).
> The complete production feature surface is removed and no replacement is
> authorized. Task 01 route shape is restored; its separate
> `productionScriptsHash` delta remains fail-closed.

## Objective

The approved retirement resolved the `AI-RX-06` production-tree experiment
without weakening the production/sandbox boundary.

Before retirement, the implementation was deterministic and synthetic, but it
lived in the production application tree and created a production route. That
violated the Task 01 isolation contract even though its local tests passed. The
safe choices were:

1. **Retire it:** remove the complete production surface; or
2. **Rebuild it:** first remove the production surface, then create a separately
   approved synthetic-only experiment under `apps/experiment-sandbox/`.

Do not repair or expand the current production route in place.

## Recorded decision

The Product Lead recorded the following decision:

```text
AI-RX-06 disposition: RETIRE | REBUILD_IN_SANDBOX
Approved candidate SHA:
Approved scope:
Approval timestamp (UTC):
Expiry timestamp (UTC):
Approver:
```

`REBUILD_IN_SANDBOX` additionally requires a changed-candidate Task 01 approval
and Task 11 Checkpoint 1 review before runnable implementation begins. Existing
Task 01 evidence does not automatically approve a changed candidate.

The binding record linked above selects `RETIRE`; no replacement is authorized.

## Historical state before retirement

### Production-isolation defect (resolved)

The retired implementation was under these production paths:

- `src/app/(dashboard)/pharmacist/rx-intake/`
- `src/lib/rx-intake/`

Before retirement, `next build` included `/pharmacist/rx-intake` and the Task
01 production verifier failed with:

```text
SBX_INVARIANCE_DENIED:routeShape
```

The route-shape difference from the approved production baseline is the Rx
intake route. This is a real boundary failure, not a false positive.

### Existing protections worth preserving

- An unauthenticated request is redirected to `/sign-in`.
- The page and action re-check authentication and restrict access to
  `pharmacy_admin` and `pharmacist` roles.
- Responses use `private, no-store`, a restrictive CSP, and a no-referrer
  policy.
- The parser does not normalize OCR ambiguity or invent missing values.
- Parsed values are presented as requiring human review.
- No database, billing, audit, model-provider, network, browser-storage, or
  autonomous-effect integration currently exists.

These controls do not make a production-tree experiment acceptable. Preserve
them if a sandbox rebuild is later approved.

### Confirmed gaps

1. **The feature enters the production route graph.** Production invariance
   fails even though normal build and tests pass.
2. **The lifecycle gate is fail-open.** `RX_INTAKE_SYNTHETIC_ENABLED=true` can
   enable the experiment when the expiry is absent. The expiry is optional in
   `src/env.ts`, and the gate does not establish an approved candidate,
   lifecycle revision, reviewer cohort, or production denial.
3. **Unknown request and output fields are stripped instead of rejected.** The
   request and extraction Zod objects are not strict. A valid fixture request
   with an extra `text` property succeeds after silently dropping the property;
   an extraction with an unexpected prohibited field behaves the same way.
4. **The page's “no free text” claim is inaccurate.** Editable inputs and a
   rejection textarea can hold arbitrary data in the DOM and React memory.
   Existing tests cover server action shape and uploads, not the actual form.
5. **Human review is not source-grounded.** Fixture summaries omit source text,
   the UI shows line numbers without the source document, and acceptance is
   immediately available.
6. **Disposition evidence is incomplete.** Decisions are client-only, lack
   server-side reviewer authorization at disposition time, lack structured
   reason/provenance, and use “accepted as read” rather than “accepted as
   draft.” There is no explicit `CONTINUE WITHOUT AI` path.
7. **Synthetic-corpus controls are too weak.** Fixture IDs are not unmistakably
   synthetic, fixture records have no machine-readable synthetic marker, and
   tests do not prevent copied real names, dates, addresses, or prescription
   text.
8. **Rule provenance is unresolved.** Integrity checks refer to a missing
   `SAFETY.md`, while parser markers and mandatory prescriber-verification text
   are hardcoded. Do not expand these rules without an authoritative reviewed
   source and pharmacist sign-off.
9. **Accessibility is incomplete.** Frequent action targets are approximately
   40px rather than 56px; reduced-motion handling, live status announcements,
   semantic source/field associations, and safe unexpected-error handling are
   missing.
10. **Evidence and docs drift.** Runtime data contains 8 fixtures and 96 fields,
    with 165 targeted tests, while documentation and some integration tests
    still describe the original 5-fixture set and older counts.

## Hard fences

Do not:

- weaken, bypass, or delete the Task 01 production-invariance verifier;
- regenerate the production baseline from a commit containing the Rx route;
- add a production route, import, environment variable, package dependency, or
  navigation entry for the experiment;
- import any production module into `apps/experiment-sandbox/`;
- use real, copied, redacted, masked, pseudonymized, or de-identified data;
- accept a real prescription image, file, OCR payload, free-text prescription,
  patient identifier, or pharmacist-entered PHI;
- add a database, model provider, external endpoint, tool, browser storage,
  analytics payload, file persistence, audit write, billing effect, or workflow
  effect without the separate approvals required by Tasks 01, 10, and 11;
- touch triage content, reference PINs, `deriveClaimDraft`, claim creation,
  production migrations, or the production audit log;
- describe a deterministic parser as a clinically validated AI system;
- treat passing tests as production, clinical, privacy, or security approval.

## Slice A — Remove the experiment from production

This slice is mandatory for both `RETIRE` and `REBUILD_IN_SANDBOX`.

### Work

1. Remove the `/pharmacist/rx-intake` production route and every production
   navigation link to it.
2. Remove production-only Rx intake modules, actions, fixtures, tests, scripts,
   and environment variables that have no remaining importer.
3. Confirm each removal with `rg` before deleting. Stop and report any live
   importer outside the known feature boundary.
4. Remove or correct documentation that claims the production feature is
   available, approved, or complete.
5. Do not modify the approved production-invariance baseline to make the check
   pass.

### Required proof

- `next build` contains no `/pharmacist/rx-intake` route.
- No `.next` production trace contains an Rx-intake module or sandbox package.
- `npm run sandbox:verify-production` passes against the original approved
  baseline.
- `rg` finds no production navigation, route, env, package, or import path for
  Rx intake.
- The rest of the pharmacist portal remains unchanged.

If the approved disposition is `RETIRE`, stop after Slice A, update the status
documents to `RETIRED`, and do not create a replacement.

## Slice B — Design the sandbox replacement

Run this slice only for `REBUILD_IN_SANDBOX`, after the changed-candidate Task
01 approval and Task 11 Checkpoint 1 decision are recorded.

The replacement must live entirely under:

```text
apps/experiment-sandbox/
```

Before implementation, submit a short design that freezes:

- one bounded candidate ID and intended use;
- prohibited uses and effects;
- exact authored-synthetic corpus version;
- request, output, review, and safe-error schemas;
- deterministic parser version and provenance;
- reviewer roles and disposition contract;
- lifecycle revision, immutable expiry, and kill-switch behavior;
- evaluation metrics, held-out split, thresholds, and unacceptable failures;
- evidence paths and Task 11 review plan.

The replacement remains a deterministic synthetic parser unless a separate
model-candidate charter, vendor boundary, and Task 11 approval explicitly say
otherwise.

## Slice C — Sandbox implementation requirements

### 1. Fail-closed lifecycle

- Require an exact candidate ID, lifecycle revision, approval version, and
  future server-owned expiry.
- Missing, malformed, expired, contradictory, or unknown state disables the
  experiment.
- Production execution is denied regardless of an enable flag.
- A server-side kill switch blocks new runs and display of stale results.
- Re-check lifecycle and reviewer authority immediately before every run and
  every disposition.
- Delayed results from an old lifecycle revision are rejected.

### 2. Strict boundaries

- Use strict Zod objects at every request, parser-output, and review boundary.
- Unknown fields must return a safe denial; never strip them silently.
- Do not accept arbitrary text, files, images, URLs, or user-authored payloads.
- Initial UI inputs must be server-owned fixture selections and controlled
  synthetic correction choices only.
- No `localStorage`, `sessionStorage`, IndexedDB, URL state, cache, analytics,
  console payload, or error-payload logging.

### 3. Unmistakably synthetic corpus

- Use IDs such as `SYNTHETIC-AI-RX-001`.
- Add a required machine-readable marker such as `synthetic: true`.
- Add a visible watermark to every rendered fixture and generated artifact.
- Add fixture scans that reject plausible real identifiers and any fixture
  missing its marker.
- Never claim an identifier range is “unissued” unless a reviewed authoritative
  source proves it. Prefer obviously artificial formats that cannot be
  mistaken for a real professional or patient identifier.
- Ground truth must remain test-only and must not be sent to the reviewer UI.

### 4. Substantive human review

- Show the synthetic source text beside the parsed draft.
- Associate every parsed field with its exact source span or clearly mark it
  missing/uncertain.
- Label all parser output **UNTRUSTED DRAFT — HUMAN REVIEW REQUIRED**.
- Use `ACCEPT AS DRAFT`, `EDIT WITH CONTROLLED SYNTHETIC CHOICE`, `REJECT`, and
  `CONTINUE WITHOUT AI`; none may be preselected.
- Require a structured reason for edit or rejection.
- Re-check authorized reviewer role server-side at disposition time.
- Capture only content-free synthetic evidence: candidate/corpus/parser/schema
  versions, fixture ID, disposition code, safe reason code, timestamps, and
  reviewer test identity.
- A disposition must never write a clinical record, prescription, claim, audit
  record, message, or external effect.

### 5. Rule provenance

- Inventory every parser rule and map it to a reviewed source or label it an
  experimental heuristic.
- The missing `SAFETY.md` reference is a blocker; do not recreate its contents
  from memory.
- Do not add controlled-substance, prescriber, clinical, dosing, dispensing,
  or billing rules without the responsible human reviewer and source record.
- When source authority is missing, fail closed to manual review rather than
  infer a rule.

### 6. Accessibility and failure handling

- Frequent actions have a minimum 56px target.
- Support keyboard-only operation, visible focus, screen readers, 200%/400%
  zoom, and a 375px viewport.
- Respect `prefers-reduced-motion`.
- Announce run, failure, and disposition status with appropriate live regions.
- Connect source spans, parsed fields, validation messages, and controls
  semantically.
- Unexpected failures return a safe message and leave the no-AI path usable.

## Required tests

### Production-boundary tests

- Production build has no Rx-intake route.
- Production traces contain no sandbox files.
- Production code contains no sandbox import or Rx-intake env variable.
- Original production-invariance baseline passes unchanged.

### Schema and input tests

- Valid fixture ID plus unexpected request key is rejected.
- Valid output plus unexpected output key is rejected.
- Arbitrary text, file, image, URL, and payload fields are rejected.
- Missing synthetic marker or malformed synthetic ID is rejected.
- Plausible real-data fixture is rejected using safe authored test values only.

### Lifecycle tests

- Missing expiry is denied.
- Expired approval is denied.
- Unknown or contradictory lifecycle state is denied.
- Disabled or kill-switched candidate is denied.
- Stale result after lifecycle revision change is denied.
- Unauthorized reviewer disposition is denied.

### Review tests

- Source text is visible to the reviewer and ground truth is not.
- Every field is source-linked or explicitly uncertain/missing.
- No default disposition exists.
- Accept, controlled edit, reject, and continue-without paths work.
- Structured reason is required where specified.
- Every effect spy—database, network, message, claim, file, storage, analytics,
  and production audit—records zero calls.

### Corpus and evaluation tests

- Tests enumerate every corpus fixture dynamically; do not hardcode the first
  five fixtures.
- Counts in reports are generated from the corpus, not copied literals.
- Development, validation, and held-out splits are frozen and non-overlapping.
- Parser-authored fixtures prove regression consistency only. Do not call this
  independent clinical effectiveness evidence.
- Pharmacist evaluation is separate from implementation and bound to the exact
  candidate, parser, schema, and corpus hashes.

### Accessibility tests

- Frequent action targets are at least 56px.
- Keyboard order and focus restoration are deterministic.
- Status changes are announced.
- Reduced-motion behavior is verified.
- 375px, desktop, 200%, and 400% evidence is captured with synthetic content.

## Verification commands

Run from a clean worktree. Use repository scripts as they exist; do not add a
shortcut that skips a gate.

```powershell
npx tsc --noEmit
npm run lint
npm run test:pure
npm run build
npm run sandbox:verify-production
```

For an approved sandbox rebuild, also run:

```powershell
npm run sandbox:build
npm run sandbox:test
npm run sandbox:verify
```

Record exact commands, exit codes, UTC timestamps, full commit SHA, fixture and
contract hashes, safe output artifact paths, and skipped checks. Never record
fixture content, payloads, secrets, absolute runner paths, or real identifiers.

## Definition of done

### Retirement completion

- [x] Product Lead recorded `RETIRE` against an exact candidate.
- [x] Production route, navigation, modules, env, and package surface are gone.
- [ ] Original production-invariance baseline passes unchanged.
- [x] TypeScript, lint, pure tests, and production build pass.
- [x] Task 10 and current-status docs record `AI-RX-06: RETIRED`.

### Sandbox-rebuild completion

- [ ] Slice A is complete first.
- [ ] Product Lead recorded `REBUILD_IN_SANDBOX`.
- [ ] Changed-candidate Task 01 approval and Task 11 Checkpoint 1 are recorded.
- [ ] Replacement exists only in `apps/experiment-sandbox/`.
- [ ] Every strict-boundary, lifecycle, corpus, review, effect, accessibility,
      and production-invariance test passes.
- [ ] Pharmacist evaluation and independent reviews are bound to exact hashes.
- [ ] No PHI, real/de-identified data, production import, production route,
      model/network call, database authority, or external effect exists.
- [ ] Documentation states **synthetic evaluation only**, with no production or
      clinical-readiness claim.

Passing this task does not authorize G2, G3, PHI processing, hosted preview,
production inference, clinical use, or deployment.

## Commit and handoff sequence

1. `fix(task-10): remove rx intake experiment from production`
2. `docs(task-10): record rx intake disposition and boundary evidence`
3. After separate approvals only:
   `feat(task-10): rebuild rx intake evaluation in synthetic sandbox`
4. `test(task-10): bind rx intake evidence to exact candidate`

At every stop, update the handoff with the exact completed slice, outstanding
approvals, tested SHA, commands/results, and next executable action. Do not
leave a half-removed production surface or a partially enabled sandbox.
