# Open questions

**Reviewed:** 2026-07-21

These issues require a pharmacist, the ODB Pharmacy Help Desk, or the product lead. Code and documentation must not infer an answer. Until resolved, use the conservative path that cannot create an improper claim or unsafe outcome.

## 1. LTC secondary provider, non-emergency

**Status:** open — production blocker

**Owner:** ODB Pharmacy Help Desk, **1-800-668-6641**, with the pilot pharmacist

**Code:** `src/lib/claims/derive-claim-draft.ts`, reason `LTC_SECONDARY_NON_EMERGENCY`

The Notice appears ambiguous:

- The exclusions on p.14 say an LTC resident's minor-ailment service must be provided by the contracted primary pharmacy, with a secondary provider eligible for the fee only in an emergency.
- Footnote 5 on p.7 and the exclusions language say a pharmacy ineligible for a service fee must submit a zero-dollar claim.

**Current safe behaviour:** derivation refuses and emits no claim draft. This avoids an improper fee but may omit a required zero-dollar claim.

**Decision required:** confirm whether a secondary, non-emergency service must not generate a claim or must generate a zero-dollar claim. Record the help-desk response, date, caller, and approved code change before altering the branch.

## 2. Tick-bite post-exposure timing threshold

**Status:** open — clinical production blocker

**Owner:** pilot pharmacist using the current OCP Lyme PEP algorithm

**Code:** `src/config/triage.ts`, tick-bite red flags

The current 72-hour value is explicitly marked as a guess. It is time-critical clinical content and must be replaced or confirmed from the approved algorithm before go-live. An agent must not change it based on general knowledge.

## 3. Full triage and red-flag approval

**Status:** open — clinical production blocker

**Owner:** pilot pharmacist / clinical governance lead

**Code:** `src/config/triage.ts`

The narrowing tree and red flags are draft clinical content. They produce a self-reported presenting complaint, not a diagnosis, and require line-by-line pharmacist review, versioning, and sign-off before use with real patients.

**Decision record needed:** reviewer, source algorithm/version, review date, approved effective date, and any required changes.

## 4. Orientation admin override

**Status:** open — policy and compliance blocker

**Owner:** product lead with pilot pharmacist/compliance review

**Code:** `src/app/(dashboard)/pharmacist/actions.ts` and `AssessmentWorkspace.tsx`

The intended eligibility rule is a hard block when the prescribing pharmacist or supervisor has no recorded orientation completion. The current implementation permits a pharmacy admin to enter an audited break-glass reason and continue.

**Decision required:** remove the override, or document authoritative approval and tightly defined circumstances. Auditability alone does not establish billing eligibility.
