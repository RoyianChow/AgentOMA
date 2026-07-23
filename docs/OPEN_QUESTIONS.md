# Open questions

**Reviewed:** 2026-07-23

These issues require a pharmacist, the ODB Pharmacy Help Desk, or the product lead. Code and documentation must not infer an answer. Until resolved, use the conservative path that cannot create an improper claim or unsafe outcome.

## 1. LTC minor-ailment claim handling

**Status:** open — production blocker

**Owner:** ODB Pharmacy Help Desk, **1-800-668-6641**, with the pilot pharmacist

**Code:** `src/lib/claims/derive-claim-draft.ts`, reason `LTC_PENDING_MINISTRY_CLARIFICATION`

The Notice appears ambiguous:

- The exclusions on p.14 say an LTC resident's minor-ailment service must be provided by the contracted primary pharmacy, with a secondary provider eligible for the fee only in an emergency.
- Footnote 5 on p.7 and the exclusions language say a pharmacy ineligible for a service fee must submit a zero-dollar claim.

**Current safe behaviour:** the pharmacist records the LTC resident, provider-role, and emergency facts, but derivation refuses every LTC scenario and emits no claim draft. This applies to primary providers and secondary providers, whether emergency or non-emergency. The assessment record is retained. The UI directs the pharmacist to speak with Royian before taking billing action.

**Decision required:** confirm the required submission and fee treatment for primary-provider, secondary-emergency, and secondary-non-emergency services, including whether footnote 5 requires a zero-dollar claim when no service fee is payable and whether/when `LT` applies. Record the help-desk response, date, caller, and approved code change before altering the refusal.

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

**Dependent feature:** `/check` is implemented for development review but
returns 404 in production. Do not remove that gate until this decision record is
complete and the patient-facing copy/PDF has been reviewed.

## 4. Orientation admin override

**Status:** open — policy and compliance blocker

**Owner:** product lead with pilot pharmacist/compliance review

**Code:** `src/app/(dashboard)/pharmacist/actions.ts` and `AssessmentWorkspace.tsx`

The intended eligibility rule is a hard block when the prescribing pharmacist or supervisor has no recorded orientation completion. The current implementation permits a pharmacy admin to enter an audited break-glass reason and continue.

**Decision required:** remove the override, or document authoritative approval and tightly defined circumstances. Auditability alone does not establish billing eligibility.
