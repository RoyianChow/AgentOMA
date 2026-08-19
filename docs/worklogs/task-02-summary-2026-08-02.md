# Worklog — Task 02 P0 readiness

**Recorded:** 2026-08-02
**Branch:** `feat/moh-compliance-migration`
**Repository HEAD when recorded:** `5e10a62ca20160328d82685c21ca4d9b4c16a492`
**Overall status:** **BLOCKED — DO NOT PROMOTE**

> This is a historical worklog, not an approval or a production handoff.
> Current status and gate decisions remain in [`docs/p0/task-02/final-report.md`](../p0/task-02/final-report.md), [`docs/p0/task-02/evidence-index.md`](../p0/task-02/evidence-index.md), and [`docs/NEXT_STEPS.md`](../NEXT_STEPS.md).

## Task goal

Task 02 closed two high-risk P0 defects and built the evidence needed to show
that assessment completion is atomic, orientation is a real billability gate,
and migration `0018` can be evaluated without touching live Supabase. The work
was deliberately split between implementation, disposable PostgreSQL proof,
and separate approval-gated deployment work.

## What was implemented

### Assessment completion and orientation boundary

- Moved assessment, billability evidence, claim draft, follow-up plan, intake
  consumption, and the required assessment-created audit event into one
  PostgreSQL transaction.
- Added failure-injection coverage proving that an audit-write failure rolls
  back every related completion effect.
- Removed the pharmacy-admin orientation override from the completion path.
  Orientation is now an unconditional server-side billability gate, recorded
  as **G3: HARD GATE; NO ADMIN OVERRIDE**.
- Preserved the server-side authorization model: `proxy.ts` remains an
  optimistic navigation gate; server actions re-check session, TOTP, role,
  pharmacy, and orientation as applicable.

### P0-C evidence and export boundary

- Added the immutable `assessment_billability_evidence` sidecar in migration
  `0018_clever_mister_fear`.
- Persisted the inspected eligibility evidence, self/family gate, structured
  existing-prescription evidence, patient self-report, advisory platform
  lookback, and clinical-viewer attestation together with the completion.
- Added the persisted evidence to the schema-v3 complete-patient export,
  manifest projection, server-rendered record view, and assessment PDF.
- Export code copies persisted values and never recomputes PINs, fees,
  maximums, SSC, clinical state, or claim logic.
- Kept export routes authenticated and pharmacy-scoped; genericized download
  filenames; retained private/no-store responses; and kept payload-free audit
  failure handling.
- Resolved no billing value from memory and did not change the approved PIN
  data, clinical triage, claim derivation, or LTC billing behavior.

### Test-only predecessor/restart harness

Under separate implementation authorization, added a fail-closed harness that:

1. validates the exact candidate, migration bytes, chain digest, Docker image,
   Compose bytes, endpoint, and named-resource ownership;
2. creates only a loopback-bound PostgreSQL 16 service with a disposable named
   volume and internal network;
3. migrates through `0017` with the repository migration runner;
4. inserts synthetic predecessor rows;
5. applies the unmodified `0018` migration;
6. verifies preservation, catalog objects, and non-owner application grants;
7. restarts the same database and checks persistence; and
8. removes the exact container, network, and volume in a `finally` path.

The harness never permits production credentials, Supabase access, PHI,
external integrations, `db:push`, migration edits, or manual migration-history
edits.

### Safe remediation after failed runtime attempts

After the first predecessor-harness failure, added a database-free bounded
readiness diagnostic. It probes the exact loopback TCP endpoint before creating
a PostgreSQL client or touching migrations, sends no SQL, discards raw errors,
and distinguishes safe reasons for loopback denial from PostgreSQL protocol
denial. This remediation still requires a new exact candidate and a new G1-D;
it does not itself prove the upgrade path.

## Verification completed

The exact implementation candidate
`dcaab91f9adba7457a85214d51d1614c8560f404` passed:

- TypeScript, lint, and production build;
- 123 database-free tests with zero skipped or focused tests;
- the complete from-zero PostgreSQL suite twice: 20 files, 211 tests, zero
  skipped or focused tests;
- migration replay through `0018`;
- required-audit rollback atomicity;
- patient/evidence/intake/export tenant isolation;
- audit and evidence immutability;
- one-per-day and insect/tick concurrency constraints;
- claim-draft and invitation/follow-up idempotency/concurrency;
- red-flag zero-claim behavior;
- separation of completed referral from red-flag exit;
- unknown PIN refusal and seeded-reference persistence;
- orientation hard-gate behavior;
- LTC fact persistence with the parked billing path; and
- persisted evidence export projection without recomputation.

The machine-readable evidence is under:
[`docs/p0/task-02/evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/`](../p0/task-02/evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/).

## G1-D runtime attempts

Two exact, single-run predecessor/restart attempts were made under separate
expiring G1-D approvals. Neither candidate may be rerun.

| Candidate | Result | What was proven |
|---|---|---|
| `dd503a14da24ea80a0f0e046e179f6b4b4e77b3c` | **FAIL — fail closed** with `DATABASE_IDENTITY_DENIED` | Docker identity boundary denied before migration or fixture writes; teardown passed |
| `5b576b7ba8be6917c133590aee5e1fa0d33368d4` | **FAIL — fail closed** with `DATABASE_CONNECTIVITY_DENIED` | Connectivity boundary denied before migration or fixture writes; teardown passed |

Evidence is preserved in the corresponding run directories under
[`docs/p0/task-02/evidence/runs/`](../p0/task-02/evidence/runs/). No live rows,
PHI, production credentials, claims, external integrations, or deployments
were used.

## What remains open

- There is no passing predecessor-upgrade/restart runtime proof.
- S27 canonical repeat-export and reconstruction/tamper-verification semantics
  remain undecided; no hash behavior was invented to force a pass.
- Independent Task 11 review has not verified the exact candidate and evidence.
- Recovery proof, G1-L, live migration, post-apply parity, and G4 promotion
  approval have not occurred.
- Live Supabase remains at `0017`; `0018` is checked in but not applied live.
- The LTC billing question remains open in [`OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md).
- `/api/fhir` remains disabled and its mapping has not been expanded.

## Required next order

1. Freeze a new clean candidate after the current repository state is final.
2. Create a new exact, expiring G1-D approval using the
   [`G1-D approval contract`](../p0/task-02/g1-d-predecessor-upgrade-approval-contract.md).
3. With Docker Desktop running, execute only:

   ```powershell
   npm run test:db:upgrade -- --approval-file <absolute-path-to-approval.json>
   ```

4. If that run passes, preserve its evidence and resolve S27.
5. Obtain independent Task 11 review bound to the exact candidate, migration
   hashes, G1-D evidence, and S27 decision.
6. Complete recovery proof, obtain G1-L, and apply `0018` once in the approved
   change window with `npm run db:migrate` — never `db:push`.
7. Verify migration state, triggers, grants, tenancy aggregates, and safe
   post-apply parity; then obtain independent G4 approval.

Task 02 is not complete until those approval-gated steps pass. A green
from-zero suite does not substitute for predecessor/restart, live, or
promotion evidence.
