# Task 02 production handoff

**Tested implementation candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
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

1. No reviewed runner has proved `0017 → 0018` with preserved synthetic rows.
2. Restart persistence is incompatible with the exact tmpfs/PID-1 environment;
   both failed attempts are retained as BLOCKED.
3. S27 canonical export/reconstruction semantics remain unresolved.
4. Task 11 has not independently reviewed this candidate/evidence set.
5. Recovery evidence, G1-L, live preflight/apply/parity, and G4 do not exist.

## Resume sequence

1. Approve and add a local-only predecessor-upgrade runner without editing
   migration `0018` or migration history manually; freeze a new candidate and
   rerun G1-D if code changes.
2. Resolve the restart-persistence evidence contract with a separately reviewed
   disposable harness; do not weaken tmpfs silently.
3. Resolve S27, then obtain exact-candidate Task 11 review.
4. Establish verified recovery evidence and request exact G1-L.
5. Apply once through `npm run db:migrate`, perform metadata-only verification,
   and obtain independent G4 before promotion.

No current approval permits live queries, live migration, production
deployment, or promotion. `db:push` remains banned and LTC remains parked.
