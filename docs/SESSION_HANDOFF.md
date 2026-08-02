# Session handoff

**Updated:** 2026-08-02
**Branch:** `feat/moh-compliance-migration`
**Task 02 tested candidate:** `dcaab91f9adba7457a85214d51d1614c8560f404`
**Task 02 status:** **BLOCKED — DO NOT PROMOTE**

## Product boundary

AgentOMA is an authenticated, single-pharmacy Ontario minor-ailments pilot,
not a production-ready service. Public `/check` and `/assessment` collect no
identifying data. `/pharmacist/*` requires password, TOTP, and server-side role,
orientation, and pharmacy checks. Claim drafts are for hand-entry only; this
application does not submit claims to HNS.

The repository migration chain ends at `0018_clever_mister_fear`; live
Supabase remains documented at `0017_tense_pandemic`. `db:push` is banned.
No live database command was authorized or run in this session.

## Task 02 completed and proven

- Required assessment audit is transactionally atomic with assessment,
  billability evidence, claim draft, follow-up, and intake consumption.
- Deterministic audit-failure injection proved that every completion effect
  rolls back together.
- G3 is **HARD GATE; NO ADMIN OVERRIDE**; server and PostgreSQL cases pass.
- Exact candidate `dcaab91…` passed TypeScript, lint, production build, 123 pure
  tests, and the full 211-test PostgreSQL suite twice with zero skipped/focused.
- All 19 migrations replayed from zero through `0018`; the installed head hash
  matched the approved migration hash.
- Tenant isolation, evidence/audit immutability, retention, governed deletion,
  duplicate/concurrency rules, red-flag zero-claim, completed-referral
  separation, seeded-reference persistence, and evidence export cases passed.
- The G1-D approval is repository-bound at
  `docs/p0/task-02/grant-g1-d` (approval record commit `f82f0fec…`).
- Evidence is under
  `docs/p0/task-02/evidence/runs/dcaab91f9adba7457a85214d51d1614c8560f404/`.
- The disposable Docker container/network/tmpfs were removed. No PHI,
  production credential, live row, or external route was used.

## Remaining blockers

1. **Predecessor upgrade NOT RUN.** There is no reviewed local-only runner that
   migrates through `0017`, inserts synthetic existing rows, then applies the
   unmodified `0018` through Drizzle and verifies preservation/deltas.
2. **Restart persistence BLOCKED.** Container restart clears required tmpfs;
   PostgreSQL is PID 1, so `pg_ctl restart` exits the container. Both attempts
   are retained. Do not weaken tmpfs or call reload a restart.
3. **S27 BLOCKED.** Canonical repeat-export and reconstruction/tamper semantics
   need an approved product/governance contract.
4. **Task 11 BLOCKED.** No independent exact-candidate/evidence review yet.
5. **Recovery/G1-L/live/G4 NOT RUN.** No live target, operator, observer,
   change window, restore proof, or promotion approval exists.

## Safe next sequence

1. Decide whether to authorize a new local-only predecessor-upgrade runner and
   a persistence-capable disposable harness. Any code/config change creates a
   new candidate and requires a new exact G1-D run.
2. Resolve S27 without silently changing canonical export content.
3. Obtain independent Task 11 review of the resulting exact evidence set.
4. Establish recovery proof, then separately request G1-L for one exact live
   target/window/operator/observer. Apply `0018` once via `npm run db:migrate`.
5. Perform metadata-only live verification and obtain independent G4.

## Standing fences

Do not edit triage/red-flag content, reference PIN data, existing migrations,
`deriveClaimDraft`, LTC billing behavior, the five-outcome structure, or
zero-PHI intake without separate explicit authorization. The 365-day count is
advisory; only HNS adjudication determines payment. `proxy.ts` is UX only;
every server action re-verifies authorization.
