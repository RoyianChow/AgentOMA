# Task 11 dependency-security policy

**Reviewed:** 2026-08-26  
**Implementation status:** candidate in review  
**Production promotion:** blocked pending exact-candidate independent review

## What this slice changes

- The production app and isolated experiment sandbox use `next` and
  `eslint-config-next` `16.3.3` together.
- The obsolete esbuild edge under Drizzle Kit's development-only loader is
  overridden to patched `esbuild` `0.25.12`. The repository's direct build and
  test dependency is `esbuild` `0.28.2`.
- CI runs `npm run security:dependencies` in the stable
  `security-dependencies` job.
- `npm audit` and `npm audit --omit=dev` both report zero findings on this
  candidate. Counts are point-in-time evidence, not a permanent baseline.

Before remediation, the audit feed reported 31 package-level findings overall
and 9 under `--omit=dev`. Those aggregate counts repeated concrete advisories
through transitive parents. Policy therefore tracks exact package + advisory
identities rather than treating a headline count as the release contract.

## Gate behavior

The checker parses concrete npm advisory objects and fails closed when:

- a new package/advisory identity appears;
- a registered finding's severity increases;
- an active finding lacks an exact, unexpired, independently reviewed
  exception;
- an exception uses a wildcard, omits its dependency path, owner, rationale,
  compensating controls, approval, or expiry, or outlives its approval;
- an exception is orphaned after its finding disappears; or
- a critical, high-severity production-runtime, PHI/secret-disclosure,
  authentication/authorization-bypass, tenant-escape, or unsafe-production
  finding is presented as waivable.

The finding and exception registers start empty because the remediation leaves
no active advisory. Future exceptions must be one finding per record. Grouped,
wildcard, permanent, and developer-self-approved exceptions are invalid.

## Evidence and commands

Run from the repository root:

```powershell
npm run security:dependencies
npm audit
npm audit --omit=dev
```

Exact-candidate audit output is stored under `docs/task-11/evidence/` after the
implementation commit is frozen. A green scanner is technical evidence only;
it does not grant release authority or replace the required independent Task 11
review.
