# Task 02 production handoff

**Candidate implementation commit:** `4f8fdd844c243f5dafcf4e78652116a9d632b222`

**Handoff status:** **DO NOT PROMOTE**

**Live migration authorized:** **NO**

Task 02 completed its safe, ungated review and bounded export work. It did not
complete database or production verification, and it found two release-blocking
defects on protected surfaces. This is a resumable handoff, not a production
readiness declaration.

## What is complete

- Baseline identity, migration bytes, predecessor, and ordered chain digest are recorded.
- Migration `0018_clever_mister_fear` received a static SQL/privilege/trigger review; no migration bytes were changed.
- Threat, LTC, orientation, operations, export, and release-readiness notes exist.
- Persisted `assessment_billability_evidence` is included in the authorized record view, assessment PDF, and complete-patient export without deriving billing or clinical state.
- The export schema is version 3; absent evidence stays absent and is not inferred.
- Patient-facing download names no longer include patient names.
- The destructive test harness accepts only exact loopback/container test endpoints, and the Docker port is loopback-bound.
- TypeScript, lint, 110 pure tests, and the production build pass on the candidate.

## Release blockers

1. **Failure atomicity is false.** Assessment/evidence/claim persistence commits
   before the mandatory `assessment_created` audit write, and the audit write is
   best-effort. A lead-approved protected-surface change is required before
   Docker verification can establish the required all-or-nothing behavior.
2. **The orientation hard gate is false.** An admin override currently permits
   billable completion while G3 is unresolved. A lead/professional decision and
   separately approved implementation are required.
3. **G1-D is not granted.** No migration replay, upgrade, role, trigger,
   concurrency, red-flag, referral, or export integration test has run against
   migration `0018`.
4. **Export/manifest determinism is unresolved (S27).** The current hash contract
   includes changing generation/history data and lacks an approved canonical
   content contract and reconstruction verifier.
5. **Task 11 evidence review is not verified.** Task 02 cannot approve itself.
6. **G1-L/G4 are not granted.** Live backup/restore, preflight, apply, parity,
   catalog, grant, and aggregate verification have not occurred.

## Required sequence to resume

1. Obtain explicit lead sign-off for the protected completion/audit change and
   resolve G3. Do not edit `deriveClaimDraft`, reference data, triage content, or
   existing migrations as part of those fixes.
2. Commit the fixes, recompute the candidate SHA, migration hash, and ordered
   migration-chain digest, then update the Task 02 baseline/evidence binding.
3. Obtain G1-D bound to that clean commit, exact migration bytes, image/digest,
   disposable database identity, command list, and expiry.
4. Start Docker Desktop and run a fresh zero replay, predecessor upgrade,
   constraints/grants, failure injection, concurrency, clinical, red-flag, and
   export tests. Capture only synthetic metadata and safe counts.
5. Obtain an explicit product contract for canonical export hashing and
   implement/test reconstruction and tamper detection under separate approval.
6. Have Task 11 review the exact candidate and Task 02 evidence manifest.
7. Only after Docker PASS, recovery proof, and Task 11 review, obtain G1-L for
   the exact live target and migration bytes. Apply once through `npm run
   db:migrate`; never use `db:push` or ad hoc SQL.
8. Perform metadata-only live parity and aggregate verification, then obtain G4
   before promotion.

## Safety boundaries for the next operator

- The current manifest is intentionally non-promotable and must fail a
  promotion-grade validator because mandatory controls are not PASS.
- Do not run `npm test`, `db:migrate`, Docker database commands, or any live
  query under the current Task 02 approvals.
- Do not read live row contents. Live evidence may use only approved catalog
  metadata and aggregate counts.
- LTC remains parked. No LTC fee behavior was implemented or approved.
- Preserve the parallel Task 11 worktree changes; they are not Task 02 evidence.
- If the candidate commit or migration chain changes, all bound approvals and
  evidence must be re-evaluated.

See `evidence-index.md`, `final-report.md`, and
`artifacts/p0/task-02/evidence-manifest.json` for the authoritative stopping
state.
