# Task 02 production handoff

**Latest predecessor-harness result:** exact G1-D candidate
`4e4795145c7acccefed5df47de3113c9e56b664e` failed closed with
`LOOPBACK_TCP_DENIED` before migration or fixture writes. Teardown passed. The
failed evidence is preserved under the candidate-specific evidence folder.
This requires a new clean candidate and new exact G1-D; it does not authorize
live work or a rerun of an evidence-bound candidate.

**Tested implementation candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Latest failed predecessor-harness candidate:** `4e4795145c7acccefed5df47de3113c9e56b664e`
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

1. Four exact predecessor candidates failed closed before completing the
   upgrade proof: `dd503a14...`, `5b576b7b...`, `3a271a7d...`, and
   `4e479514...`. Their evidence and teardown results are preserved. None may
   be rerun; a new clean candidate needs a new exact G1-D.
2. The old tmpfs/PID-1 restart attempts remain BLOCKED. The separate
   named-volume restart proof was not reached after the predecessor failure and
   cannot inherit the old evidence.
3. S27 canonical export/reconstruction semantics remain unresolved.
4. Task 11 has not independently reviewed this candidate/evidence set.
5. Recovery evidence, G1-L, live preflight/apply/parity, and G4 do not exist.

## Resume sequence

1. Finish the database-free readiness/diagnostic remediation, freeze the clean
   candidate, and grant a new expiring G1-D using
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
