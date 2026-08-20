# Task 02A — Record Governance Integrity and UX Remediation

**Parent:** [Task 02 — P0 Production Readiness](TASK-02-p0-production-readiness.md)  
**Route:** `/pharmacist/governance`  
**Priority:** P0 for database-role and destruction controls; P1 for workflow and UX  
**Owner profile:** senior backend/database developer paired with a product/UI developer  
**Required reviewers:** Product Lead, Security/Privacy, Operations/SRE, Quality/Test, and Task 11  
**Status:** `BLOCKED_APPROVAL_REQUIRED`  
**Audit baseline:** `625b9f6f4fde22aad3d5a87ae0712c1e7cb30c97`  
**Audit date:** 2026-08-19

**Status reviewed:** 2026-08-20 — no Task 02A remediation implementation was
observed on `origin/main`

## Outcome

Make the record-governance workspace operationally usable and defensible while
preserving server-only PHI handling, append-only evidence, pharmacy scoping,
two-administrator destruction, and database-enforced immutability.

The current page compiles and is authenticated, but it must not be treated as a
complete production governance console. The audit found:

- the active Supabase connection in this checkout uses the `postgres` owner;
- destruction execution does not prove that the reviewed dry-run snapshot is
  still current;
- correction targets and supersession links are insufficiently validated;
- access/correction requests cannot be completed from the page because their
  identifiers and individual workflow records are not displayed;
- restore drills may be marked passed without counts, hashes, completion time,
  or evidence;
- the export route places a patient record identifier in the URL;
- errors, confirmations, pending states, autocomplete controls, timezone
  semantics, dark mode, and navigation are incomplete; and
- export reconstruction/hash semantics remain separately blocked under S27.

## Authority and stop conditions

This file is a remediation contract, not approval to edit protected surfaces.

The parent Task 02 brief makes these areas read-only until a new exact approval
is recorded:

- every existing migration, including `0016_brown_lightspeed.sql`;
- migration registry and ordering;
- audit semantics and immutability guards;
- tenant/patient authorization and authentication;
- production infrastructure, secrets, database roles, and network policy; and
- export hash/reconstruction semantics governed by S27.

### Required approval record

Before implementation, record:

```text
Task: 02A Record Governance Integrity and UX Remediation
Decision: GRANTED | DENIED
Exact candidate SHA:
Approved workstreams:
Approved schema/migration scope, if any:
Approved deployment/configuration scope, if any:
Environment: disposable Docker only | staging | production
Product Lead:
Security/Privacy reviewer:
Operations/SRE reviewer:
Quality/Test reviewer:
Task 11 checkpoint decision:
Approved at (UTC):
Expires at (UTC):
```

Approval for UI/application work does not authorize a migration or live role
change. Approval for a disposable-Docker migration candidate does not authorize
applying it to Supabase. Live changes require the parent Task 02 recovery,
G1-L, change-window, parity, and G4 gates.

### Mandatory stops

Stop and report rather than guess if:

- destruction dry-run expiry or reviewer-freshness policy is not supplied;
- allowed correction targets or corrigible fields are not approved;
- access/correction status transitions are not approved;
- post-destruction retention of manifests, hashes, holds, or stable identifiers
  is not documented;
- S27 canonical repeat-export and reconstruction semantics remain unresolved
  for a proposed export change;
- the exact application and migration database roles are unknown;
- any change would weaken audit, hold, retention, authorization, or
  immutability enforcement; or
- a required independent reviewer is also the implementer.

## Existing controls to preserve

- The page is available only to `pharmacy_admin`.
- Every server action and export handler independently re-verifies the session,
  TOTP, role, configured pharmacy, and current database state. `proxy.ts` is UX
  only.
- Reads and writes are pharmacy-scoped from server-owned context.
- Governance state changes and required audit events share a transaction.
- The page is server-rendered; no complete record set is sent to a client
  component.
- Responses use `private, no-store`, a restrictive CSP, and `no-referrer`.
- Holds, corrections, requests, exports, and destruction evidence are not
  silently deleted or rewritten.
- Destruction requires elapsed retention, no active hold, and a different
  pharmacy administrator from the preparer.
- Patient exports use persisted records and do not recompute claim or clinical
  logic.

## Workstream A — Runtime database-role enforcement

### Problem

The audit command `npm run db:verify` returned:

```text
current_role: postgres
can_delete: true
can_update_due_date: true
```

The runtime uses `DATABASE_URL`. In this checkout, the page therefore connects
as the owner rather than the restricted application role described by the
documentation. An owner connection is not evidence that application-role
`REVOKE` controls work.

### Required implementation

1. Inventory the role used by local development, preview/staging, and Vercel
   production without printing connection strings, passwords, tenant names, or
   host details.
2. Ensure runtime `DATABASE_URL` uses the approved non-owner application role.
3. Keep the owner/migration credential limited to `DIRECT_URL` and the reviewed
   migration workflow.
4. Fail startup or deployment verification when a protected environment uses an
   owner, superuser, role with bypass capability, or a role that can mutate
   protected columns directly.
5. Expand the safe aggregate verifier to report only role classification and
   required capability booleans—never credential values.
6. Verify grants for at least audit log, claims, follow-ups, governance
   corrections, holds, requests, manifests, restore drills, and destruction
   execution.

### Acceptance

- Runtime role is non-owner and non-superuser.
- `UPDATE`, `DELETE`, and `TRUNCATE` are denied where required.
- Only approved supersession/workflow columns are mutable.
- Required inserts and the approved destruction function remain available.
- Migration role is never used by the application runtime.
- Evidence is catalog-only or synthetic; no live patient rows are read.

## Workstream B — Destruction snapshot integrity

### Problem

The dry run stores record counts and hashes, but execution rechecks only the
run state, administrator separation, retention horizon, and holds. It does not
recompute and compare the current patient record against the reviewed snapshot.
A record created after preparation may therefore be deleted without appearing
in the evidence reviewed by the second administrator.

### Required design

1. Do not edit `0016_brown_lightspeed.sql`. Generate a new forward migration
   only after migration authority is granted.
2. Bind every executable run to a canonical snapshot version, complete artifact
   inventory, aggregate snapshot hash, preparation timestamp, preparer, and the
   approved freshness/expiry policy.
3. Immediately before deletion, inside the same transaction:
   - lock the destruction run and patient governance scope;
   - recheck the executing administrator and preparer separation;
   - recheck retention using the database date;
   - recheck active patient-wide and record-specific holds;
   - recompute the canonical artifact inventory and hashes; and
   - compare it exactly with the reviewed dry run.
4. Any new, removed, changed, unknown, expired, or contradictory state must
   fail closed with a safe reason such as `DESTRUCTION_SNAPSHOT_STALE`.
5. A stale run is never silently refreshed. A new dry run and a new review are
   required.
6. Preserve the existing rule that the destruction audit event is written
   before authorized deletion and survives it.
7. Record only safe counts, hashes, IDs, timestamps, and reason codes in test
   evidence—never clinical payloads.

### Required tests on disposable PostgreSQL

- unchanged reviewed snapshot executes once;
- new assessment after preparation denies execution;
- new follow-up, correction, request, export manifest, or linked audit record
  after preparation denies execution according to the approved inventory;
- changed retention or a new hold denies execution;
- expired dry run denies execution;
- preparer attempting execution is denied;
- two concurrent executions produce exactly one success;
- audit-write failure rolls the entire deletion back;
- unknown snapshot version or malformed artifact set denies execution;
- restart between preparation and execution preserves and revalidates state;
- no denied path deletes any governed row.

## Workstream C — Correction integrity

### Problem

The current correction service proves that a correction request exists, but it
does not prove that the target record:

- exists;
- belongs to the request's patient and configured pharmacy;
- matches the declared entity type; or
- is eligible for the submitted correction fields.

Supersession is patient-scoped but not guaranteed to reference the same request,
target type, and target record.

### Required implementation

1. Define reviewed, strict Zod schemas for each approved target type.
2. Reject unknown fields; never silently strip or persist them.
3. Load the target server-side and prove pharmacy, patient, entity type, and
   request scope before inserting an overlay.
4. Require an approved request state before accepting a correction.
5. Require a superseded correction to have the same pharmacy, patient, request,
   entity type, and target ID.
6. Keep supersession atomic and final; never edit the old correction body.
7. Do not allow an overlay to manually invent or replace a PIN, fee, claim
   maximum, intervention code, prescriber reference, quantity, SSC, or any
   other derived claim value.
8. Decide explicitly whether `claim_draft` remains a generic correction target.
   Until approved, do not implement claim-draft field correction through this
   workflow; use the existing immutable claim-draft replacement contract.
9. Show original value, proposed overlay, reason, request authority, and prior
   corrections together before confirmation, without placing PHI in client
   JavaScript.

### Required tests

- wrong-patient target is denied;
- wrong-pharmacy target is denied;
- nonexistent and mismatched target types are denied;
- unknown and prohibited fields are denied;
- billing-value overlay is denied;
- correction from an unapproved/terminal request state is denied;
- cross-target and cross-request supersession are denied;
- valid same-target supersession is atomic;
- audit failure rolls back correction and supersession;
- source records remain unchanged.

## Workstream D — Complete access/correction workflow

### Required UI and behavior

1. Replace aggregate-only request status output with a server-rendered request
   worklist containing the minimum necessary information:
   - request ID and kind;
   - patient context;
   - requester type;
   - received date;
   - current state;
   - assigned/deciding administrator where approved; and
   - contextual actions allowed from the current state.
2. Do not make administrators copy UUIDs between unrelated cards. Choose a
   patient/request/hold/run from a scoped server-rendered result and keep the
   action visually attached to that record.
3. Implement only the human-approved request transition matrix. Invalid,
   repeated, or terminal transitions fail closed.
4. Preserve prior decision evidence. Do not overwrite a prior authoritative
   decision without an immutable event/history contract approved for that
   purpose.
5. Add a structured fulfilled state that references the approved delivery or
   access evidence; do not imply fulfillment merely because “fulfilled” was
   selected from a dropdown.
6. Provide safe success, validation, conflict, authorization, and database
   failure messages without exposing PHI, SQL, IDs from other records, or stack
   traces.
7. Every server action continues to reverify the administrator; a page-level
   check is not sufficient.

## Workstream E — Export privacy and S27 boundary

### Required now

1. Remove patient record IDs from export URLs and browser history. Use an
   authenticated POST/body workflow or another reviewed same-origin design that
   does not expose the patient identifier in the URL.
2. Keep the export filename free of patient identifiers.
3. Add a clear warning that the downloaded bundle contains PHI and must be
   stored/transferred only through the pharmacy's approved process.
4. Replace “secure export” language unless the actual delivery and at-rest
   handling justify that claim. Prefer precise wording such as “Generate and
   download JSON record.”
5. Prevent browser or framework prefetch/retry from generating duplicate
   manifests or audit events.
6. Continue assembling the record server-side and return `private, no-store`.

### S27 stop

Do not change canonical JSON, artifact ordering, bundle hashes, retained
manifest inclusion, repeat-export behavior, or reconstruction verification
until S27 has an approved contract. The current bundle changes as export and
audit history grows. Record this as `BLOCKED(S27)`, not as an implementation
detail to settle locally.

## Workstream F — Restore-drill evidence

### Required implementation

1. A drill cannot be marked `passed` or `failed` without:
   - server-validated start and completion timestamps;
   - completion later than start;
   - the required row-count evidence;
   - the required integrity hashes;
   - isolated-environment identification; and
   - a safe evidence reference under the approved policy.
2. `planned` and `running` records must not carry fields that falsely imply
   completion.
3. Use an explicit Ontario timezone for display. Persist instants with offsets
   or server-owned timestamps; do not parse timezone-free `datetime-local`
   input using the server's local timezone.
4. Decide whether drill state is append-only events or controlled workflow
   mutation. Do not invent that policy during implementation.
5. Display counts/hashes as reviewable safe evidence without exposing restored
   payloads.

## Workstream G — Audit-failure operations

The schema supports acknowledgement metadata, but the page only lists recent
failures.

After audit-semantics approval:

1. Add a server-rendered failure queue with state, occurrence time, safe action
   and failure code, acknowledgement state, and contextual action.
2. Require a server-reverified administrator for acknowledgement.
3. Record acknowledgement without mutating or deleting the original failure
   identity and occurrence evidence.
4. Never display or log failed payloads, SQL, health information, secrets, or
   stack traces.
5. Add pagination/filtering without putting patient identifiers or PHI in query
   strings.

## Workstream H — UX, accessibility, and human-error controls

### Information architecture

- Add a consistent pharmacist-portal shell or at minimum a visible return to
  dashboard, current page title, signed-in role, and sign-out path.
- Separate the page into clear workflows: overview, access/corrections, holds,
  exports, destruction, restore evidence, and audit failures.
- Use contextual record cards/tables and actions instead of ten independent raw
  forms.
- Keep dashboard metrics distinct from actionable queues.

### Destructive-action design

- Put irreversible execution in a dedicated danger zone.
- Use amber for preparation/review and red only for irreversible execution.
- Show preparer, preparation time, expiry/freshness, retention horizon, hold
  state, counts, hashes, and whether the current admin may execute.
- Require an explicit confirmation step with safe wording. Whether step-up TOTP
  reauthentication is required is a Security/Product decision; do not invent it.
- Disable repeat submission while pending and show the final safe outcome.

### Forms and privacy

- Set `autoComplete="off"` on governance forms and sensitive fields.
- Do not use `localStorage`, `sessionStorage`, IndexedDB, URL state, analytics,
  caches, or console logging for form data.
- Keep PHI in necessary transient authenticated form fields only and clear it
  after success, cancellation, navigation, session expiry, or sign-out.
- Use strict boundary schemas and field-level validation; avoid raw JSON entry
  as the normal correction interface.
- Preserve progressive enhancement where practical.

### Accessibility and responsive behavior

- Fix automatic dark mode using shared theme variables; do not hardcode a white
  card under dark global typography.
- Maintain at least 44px interactive targets and visible keyboard focus.
- Add an error summary, field associations, and an `aria-live` status region.
- Verify keyboard-only operation and screen-reader labels.
- Verify 375px, desktop, 200%, and 400% zoom/reflow.
- Long UUIDs and hashes must wrap without horizontal scrolling and remain easy
  to copy where genuinely needed.
- Format human-facing states without raw underscores.
- Display all operational timestamps explicitly in the approved Ontario
  timezone and label it.

## Server and data-boundary requirements

- No complete patient or governance record set may become a client-component
  prop.
- Select only fields needed for the rendered list; do not fetch full artifact
  arrays merely to display their count.
- Every query and mutation remains configured-pharmacy scoped.
- Every action independently rechecks the current session and role.
- Do not place patient IDs, health numbers, names, request scope, correction
  content, or other PHI in URLs, logs, analytics, cache keys, or error messages.
- All required audit writes are transactionally atomic with their governed
  state change.
- Unknown, stale, contradictory, or unauthorized state fails closed.

## Test plan

### Pure/application tests

- Every governance action re-verifies `pharmacy_admin`.
- Non-admin, missing TOTP, expired session, and foreign-pharmacy actors are
  denied safely.
- Zod boundaries reject unknown, malformed, oversized, and contradictory input.
- Status transition matrix accepts only approved transitions.
- Restore evidence rejects incomplete or timezone-ambiguous passed/failed rows.
- Export uses no patient identifier in the URL.
- No governance code uses browser storage, analytics, payload logging, or PHI in
  query strings.
- Server-rendered views expose only the minimum necessary fields.
- Dark/light theme and responsive render tests cover every workflow state.

### Real PostgreSQL tests

- Run migrations from zero on disposable PostgreSQL.
- Prove exact app-role grants and owner separation.
- Prove hold and immutability triggers under the app role.
- Prove correction target isolation and supersession constraints.
- Prove request transition and audit atomicity.
- Prove stale destruction rejection and one-success concurrency behavior.
- Prove audit failure causes complete rollback.
- Prove no denied path changes or deletes governed records.
- Prove authorized destruction leaves only the approved surviving evidence.
- Restart PostgreSQL and verify governance state persists.

Do not mock a database-enforced rule and call it proven.

## Verification commands

Run from a clean worktree. Docker Desktop is required for the database suite.

```powershell
npx tsc --noEmit
npm run lint
npm run test:pure
npm run test:db:up
npm test
npm run test:db:down
npm run build
```

For any approved schema change:

```powershell
npm run db:generate
# Stop and show the generated SQL for review.
npm run db:migrate
```

The migration command above is for an explicitly approved target only. Never
run it against live Supabase under a Docker-only approval. `db:push`, editing an
existing migration, and manual migration-history changes remain prohibited.

## Definition of done

- [ ] Runtime uses the approved non-owner application role in every protected
      environment; migration credentials are isolated.
- [ ] Destruction execution proves an unchanged, unexpired reviewed snapshot in
      the same transaction that deletes records.
- [ ] Correction targets, fields, requests, and supersession links are strictly
      patient/pharmacy/target scoped.
- [ ] Access/correction requests can be completed end-to-end without copying
      hidden UUIDs or overwriting prior decision evidence.
- [ ] Restore drills cannot claim success without complete evidence.
- [ ] Audit failures have an approved acknowledgement workflow.
- [ ] Patient identifiers and PHI do not appear in URLs, logs, storage,
      analytics, caches, or unsafe errors.
- [ ] Export wording and behavior are honest; S27 remains blocked until its
      separate decision is approved.
- [ ] Dark mode, keyboard, screen reader, 375px, and zoom evidence pass.
- [ ] TypeScript, lint, pure tests, full real-PostgreSQL tests, and build pass.
- [ ] No test is skipped, filtered, mocked around a database invariant, or
      converted from `BLOCKED`/`NOT RUN` to `PASS`.
- [ ] Security/Privacy, Operations/SRE, Quality/Test, and Task 11 reviews are
      bound to the exact candidate and migration hashes.
- [ ] Live deployment remains blocked until the parent Task 02 G1-L, recovery,
      parity, and G4 requirements are independently satisfied.

## Suggested commit sequence

1. `test(governance): add failing workflow and isolation cases`
2. `fix(governance): validate correction and request boundaries`
3. `feat(governance): complete server-rendered admin workflows`
4. `fix(governance): harden restore evidence and timezone handling`
5. `fix(governance): improve privacy accessibility and dark mode`
6. With separate migration approval only:
   `fix(db): bind destruction to reviewed governance snapshot`
7. `docs(governance): bind verification and reviewer evidence`

At every slice boundary, update the handoff with the tested SHA, approvals,
commands/results, blocked decisions, migration effects, and next safe action.

