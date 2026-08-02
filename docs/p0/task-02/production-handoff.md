# Task 02 production handoff

**Tested implementation candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Later harness implementation:** `c17f7bc4`; database execution **NOT RUN**
**Handoff status:** **BLOCKED — DO NOT PROMOTE**
**Live migration authorized:** **NO**

## Completed and proven

- Required assessment audit is in the same transaction as assessment,
  billability evidence, claim draft, follow-up, and intake consumption.
- Deterministic required-audit failure injection proved that all completion
  effects roll back together.
- G3 is **HARD GATE; NO ADMIN OVERRIDE**, and real-PostgreSQL cases passed.
- The exact candidate passed TypeScript, lint, 123 pure tests, production build,
  and the complete 211-test PostgreSQL suite twice.
- From-zero replay installed all 19 migrations through `0018` with the approved
  head hash and enforcement triggers.
- Concurrency, tenant isolation, immutability, red-flag zero-claim,
  completed-referral separation, reference-derived persistence, and export
  evidence tests passed.
- The loopback-only synthetic container, network, and tmpfs were removed.

## Why promotion remains blocked

1. A reviewed local-only runner now exists, but no new exact-candidate G1-D has
   authorized its `0017 → 0018` database execution.
2. The old tmpfs/PID-1 restart attempts remain BLOCKED. The separate
   named-volume restart proof is NOT RUN and cannot inherit the old evidence.
3. S27 canonical export/reconstruction semantics remain unresolved.
4. Task 11 has not independently reviewed this candidate/evidence set.
5. Recovery evidence, G1-L, live preflight/apply/parity, and G4 do not exist.

## Resume sequence

1. Freeze the final clean candidate and grant a new expiring G1-D using
   `g1-d-predecessor-upgrade-approval-contract.md`.
2. Run `npm run test:db:upgrade -- --approval-file <absolute-path>` once. The
   runner owns create, `0017` seed/upgrade, restart, evidence and exact teardown;
   do not operate its Compose service manually.
3. Resolve S27, then obtain exact-candidate Task 11 review.
4. Establish verified recovery evidence and request exact G1-L.
5. Apply once through `npm run db:migrate`, perform metadata-only verification,
   and obtain independent G4 before promotion.

No current approval permits live queries, live migration, production
deployment, or promotion. `db:push` remains banned and LTC remains parked.
