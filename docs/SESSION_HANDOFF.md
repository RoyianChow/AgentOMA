# Session handoff

**Updated:** 2026-08-02
**Branch:** `feat/moh-compliance-migration`
**Release status:** **BLOCKED — DO NOT PROMOTE**

## Product and migration boundary

AgentOMA is an authenticated, single-pharmacy Ontario minor-ailments pilot,
not a production-ready service. Public `/check` and `/assessment` collect no
identifying data. `/pharmacist/*` requires password, TOTP, and server-side role,
orientation, and pharmacy checks. Claim drafts are for hand-entry only; no HNS
submission exists.

The repository chain ends at `0018_clever_mister_fear`; live Supabase remains
documented at `0017_tense_pandemic`. `db:push` is banned. No live command,
credential, row, PHI, external integration, or claim was used here.

## Existing Task 02 evidence

Exact candidate `dcaab91f9adba7457a85214d51d1614c8560f404` remains the
last database-tested candidate. It passed TypeScript/lint/build, 123 pure tests,
and the 211-test PostgreSQL suite twice. From-zero replay, atomic audit rollback,
isolation, immutability, concurrency, red-flag zero-claim, referral separation,
reference-derived persistence and evidence export passed. Its evidence remains
unchanged under `docs/p0/task-02/evidence/runs/dcaab91f…/`.

## Newly implemented; deliberately NOT RUN

Royian Chowdhury granted implementation-only authority in
`docs/p0/task-02/lead-predecessor-harness-implementation-authorization-2026-08-02.md`
(record commit `210f1f23`). The implementation adds:

- `docker-compose.task-02-upgrade.yml`: separate PostgreSQL 16 service on
  `127.0.0.1:5434`, internal network, named disposable volume;
- strict pure contracts for approval, migration identity, local Docker,
  resource ownership and teardown;
- an OS-temp, byte-identical migration view ending at `0017`;
- a Drizzle runner that seeds unmistakably synthetic predecessor rows, applies
  unmodified `0018`, verifies preservation/catalog/grants, restarts, rechecks
  persistence and tears down exact resources in `finally`;
- one non-overwriting, payload-free evidence record per candidate.

Fourteen database-free contract tests pass, and the no-approval command was
proved to return `TASK02_UPGRADE_DENIED:APPROVAL_FILE_DENIED` before Docker.
**No Docker command or database connection for this new harness has run.**

The exact execution approval schema and command are in
`docs/p0/task-02/g1-d-predecessor-upgrade-approval-contract.md`. The old G1-D
does not apply. Freeze the final clean HEAD, obtain a new expiring G1-D JSON for
that SHA, then run from the clean candidate worktree:

```powershell
npm run test:db:upgrade -- --approval-file <absolute-path-to-approval.json>
```

## Remaining blockers

1. **T02-07/T02-08 NOT RUN:** execute the new predecessor/restart harness only
   after exact-candidate G1-D.
2. **S27 BLOCKED:** canonical repeat-export and reconstruction/tamper semantics
   still need an approved contract.
3. **Task 11 BLOCKED:** no independent review of the resulting candidate and
   evidence set.
4. **Recovery/G1-L/live/G4 NOT RUN:** no verified restore proof, live target,
   operator/observer/window, live approval, parity evidence or promotion grant.

## Standing fences

Do not edit existing migrations, migration history, triage/red-flag content,
reference PIN data, `deriveClaimDraft`, LTC billing, the five outcomes, or the
zero-PHI intake without separate lead authority. The 365-day count is advisory;
only HNS adjudication determines payment. `proxy.ts` is UX only; every server
action independently re-verifies authorization.
