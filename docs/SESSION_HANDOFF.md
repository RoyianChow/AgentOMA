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

## Predecessor/restart harness — failed run preserved

Royian Chowdhury granted implementation-only authority in
`docs/p0/task-02/lead-predecessor-harness-implementation-authorization-2026-08-02.md`
(record commit `210f1f23`). The implementation adds:

- `docker-compose.task-02-upgrade.yml`: separate PostgreSQL 16 service on
  `127.0.0.1:5434`, internal network, named disposable volume;
- strict pure contracts for approval, migration identity, local Docker,
  exact preinstalled image identity, resource ownership and teardown;
- an OS-temp, byte-identical migration view ending at `0017`;
- a Drizzle runner that seeds unmistakably synthetic predecessor rows, applies
  unmodified `0018`, verifies preservation/catalog/grants, restarts, rechecks
  persistence and tears down exact resources in `finally`;
- one non-overwriting, payload-free evidence record per candidate.

Compose startup uses `--pull never`; a future G1-D must bind the exact locally
installed `postgres:16-alpine` image ID.

The first exact-candidate G1-D run used
`dd503a14da24ea80a0f0e046e179f6b4b4e77b3c` and failed closed at the initial
database identity probe with `DATABASE_IDENTITY_DENIED`. It did not migrate,
seed, inspect database rows, access Supabase, use PHI/production credentials,
or call an external integration. The runner's finally teardown passed; the
exact container, network, and volume were removed. Preserve
`docs/p0/task-02/evidence/runs/dd503a14da24ea80a0f0e046e179f6b4b4e77b3c/predecessor-upgrade-run.json`.

The remediation is database-free: bounded read-only loopback readiness, a
five-second connection limit, granular safe diagnostic codes, and pure
regression tests. It does not change any migration or protected runtime surface.

**Current update (supersedes the next-candidate instruction immediately
below):** the remediated candidate was frozen as
`5b576b7ba8be6917c133590aee5e1fa0d33368d4` and received a fresh local G1-D
from Royian Chowdhury. Its single run (2026-08-02T08:53:53.559Z to
2026-08-02T08:55:25.014Z) failed closed with `DATABASE_CONNECTIVITY_DENIED`
before any database migration or synthetic fixture write. The Docker runtime
shape checks passed, but the bounded host-to-loopback database probe did not;
PostgreSQL version, migration history, catalog, and restart checks were not
reached. Finally-block teardown passed and the exact resources were absent.
Preserve
`docs/p0/task-02/evidence/runs/5b576b7ba8be6917c133590aee5e1fa0d33368d4/predecessor-upgrade-run.json`
(`7f866b65138cdb9d0c231d120c739e9e5c7a10defaf838b77978f32519fb8649`).
Do not rerun `5b576b7b…`, manually operate its Compose service, or touch live
systems. A new database-free diagnosis/remediation decision, clean candidate,
and exact G1-D are required before the next runtime proof.
Do not rerun `dd503a14…`; its evidence path is non-overwriting. Freeze the next
clean candidate, then require a fresh exact G1-D.

The exact execution approval schema and command are in
`docs/p0/task-02/g1-d-predecessor-upgrade-approval-contract.md`. The old G1-D
does not apply. Freeze the final clean HEAD, obtain a new expiring G1-D JSON for
that SHA, then run from the clean candidate worktree:

The preceding command is not currently authorized for either failed candidate;
it becomes relevant only after the new diagnosis/remediation/candidate/G1-D
sequence above.

```powershell
npm run test:db:upgrade -- --approval-file <absolute-path-to-approval.json>
```

## Remaining blockers

1. **T02-07/T02-08 FAIL:** preserve both failed evidence records; diagnose the
   host-to-loopback connectivity failure under separate database-free authority,
   then obtain a new G1-D for the next clean candidate and execute the single
   runner.
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
