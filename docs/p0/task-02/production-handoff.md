# Task 02 production handoff

**Candidate implementation commit:** `813e360546f6dc1b4c03ead5de7d22002f063759`

**Handoff status:** **BLOCKED — DO NOT PROMOTE**

**Live migration authorized:** **NO**

## Completed in the candidate

- The required assessment-created audit now runs inside the same transaction as
  assessment, billability evidence, claim draft, follow-up, and intake
  consumption. Its failure propagates and rolls the transaction back.
- A deterministic, synthetic real-PostgreSQL test injects failure at that audit
  insert and checks all completion rows remain absent and intake unconsumed.
- G3 is decided as **HARD GATE; NO ADMIN OVERRIDE**. The server branch, request
  field, client UI/state, and override event were removed.
- TypeScript, lint, 113 pure tests, and production build pass on the candidate.
- Workstream F evidence export/PDF behavior and local database safeguards from
  the prior candidate remain intact.
- No migration, triage, reference data, claim derivation, LTC, auth architecture,
  live database, claim, or external system changed.

## Why promotion remains blocked

1. G1-D is not granted and Docker Desktop is unavailable. The new atomicity
   fault test and full 0018 database suite have not run.
2. Manifest/reconstruction semantics remain blocked by S27.
3. Task 11 has not reviewed the exact candidate/evidence.
4. Recovery proof, G1-L, live preflight/apply/parity, and G4 do not exist.

## Resume sequence

1. Keep candidate `813e3605…` unchanged and obtain expiring G1-D bound to its
   full SHA, migration hash, chain digest, exact Docker image/environment, and
   commands.
2. Start Docker Desktop. Run the complete real-PostgreSQL suite from zero and
   the independent 0017→0018 upgrade. The audit fault-injection test must pass.
3. Rebind the manifest to the tested commit and obtain Task 11 review.
4. Resolve S27 under a separate approved export contract.
5. Establish verified recovery evidence, then request exact G1-L. Apply once
   through `npm run db:migrate`; never use `db:push` or ad hoc SQL.
6. Perform metadata-only live verification and obtain G4 before promotion.

No current approval permits `npm test`, Docker database commands, live queries,
live migration, or production deployment. LTC remains parked.
