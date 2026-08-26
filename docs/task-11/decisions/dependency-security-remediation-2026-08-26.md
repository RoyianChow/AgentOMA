# Task 11 dependency-security remediation record

**Implementation candidate:** `72b3ed6218bd2a06b03a99a7eac0d2753fe774b9`  
**Base:** `a677d7d636fd5d3c3d4576b8b97b9379435320b5`  
**Recorded:** 2026-08-26  
**Status:** `IMPLEMENTED_PENDING_INDEPENDENT_REVIEW`

## Product direction implemented

- Upgrade `next` and `eslint-config-next` together to the current patched
  stable release before introducing a dependency gate.
- Do not baseline-except the Next.js advisories.
- Fail CI for every new finding unless an exact reviewed exception exists.
- Treat critical findings, protected security-impact findings, and high
  production-runtime findings as non-waivable.
- Permit only individual, narrow, expiring, independently reviewed exceptions
  for otherwise waivable findings.

## Measured result

- Root application and sandbox framework packages: `16.3.3`.
- `npm audit`: zero findings.
- `npm audit --omit=dev`: zero findings.
- Production routes, required-server-file fingerprint, and executable
  production runtime scripts are unchanged.
- The portable Next.js runtime trace and production dependency fingerprint
  changed as expected from the framework/dependency remediation. The Task 01
  baseline records the exact old source baseline and this candidate-bound
  amendment; it was not regenerated from an unrelated current commit.
- No sandbox marker entered the production build.

## Authority boundary

This record documents implementation and technical evidence. It is not an
independent Task 11 approval and does not authorize production promotion.
Independent review must be bound to the candidate, audit evidence, and
production-invariance amendment before promotion.
