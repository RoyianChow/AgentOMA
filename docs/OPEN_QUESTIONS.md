# Open questions

**Reviewed:** 2026-07-30

These issues require a pharmacist, the ODB Pharmacy Help Desk, or the product lead. Code and documentation must not infer an answer. Until resolved, use the conservative path that cannot create an improper claim or unsafe outcome.

P0-A triage approval, including the tick-bite section, was resolved on
2026-07-26 and is recorded in [`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md).

## 1. LTC minor-ailment claim handling

**Status:** open — production blocker

**Owner:** ODB Pharmacy Help Desk, **1-800-668-6641**, with the pilot pharmacist

**Code:** `src/lib/claims/derive-claim-draft.ts`, reason `LTC_PENDING_MINISTRY_CLARIFICATION`

The Notice appears ambiguous:

- The exclusions on p.14 say an LTC resident's minor-ailment service must be provided by the contracted primary pharmacy, with a secondary provider eligible for the fee only in an emergency.
- Footnote 5 on p.7 and the exclusions language say a pharmacy ineligible for a service fee must submit a zero-dollar claim.

**Current safe behaviour:** the pharmacist records the LTC resident, provider-role, and emergency facts, but derivation refuses every LTC scenario and emits no claim draft. This applies to primary providers and secondary providers, whether emergency or non-emergency. The assessment record is retained. The UI directs the pharmacist to speak with Royian before taking billing action.

**Decision required:** confirm the required submission and fee treatment for primary-provider, secondary-emergency, and secondary-non-emergency services, including whether footnote 5 requires a zero-dollar claim when no service fee is payable and whether/when `LT` applies. Record the help-desk response, date, caller, and approved code change before altering the refusal.

## 2. Orientation admin override

**Status:** open — policy and compliance blocker

**Owner:** product lead with pilot pharmacist/compliance review

**Code:** `src/app/(dashboard)/pharmacist/actions.ts` and `AssessmentWorkspace.tsx`

The intended eligibility rule is a hard block when the prescribing pharmacist or supervisor has no recorded orientation completion. The current implementation permits a pharmacy admin to enter an audited break-glass reason and continue.

**Decision required:** remove the override, or document authoritative approval and tightly defined circumstances. Auditability alone does not establish billing eligibility.

## 3. AgentOMA / AgentRx product naming

**Status:** open — documentation and implementation-coordination blocker

**Owner:** product lead

The implemented repository, production-facing documentation, database role,
and existing environment conventions use **AgentOMA**. The refreshed
autonomous-pharmacy task briefs use **AgentRx** as their system name. No product
rename decision or migration plan is recorded.

**Current safe interpretation:** AgentRx is the autonomous-pharmacy program
label only. Agents must not rename the production app, packages, routes,
database roles, environment variables, deployed services, or user-facing copy.

**Decision required:** either confirm that AgentRx is only a program codename,
or approve a separately scoped rename plan that inventories every technical,
operational, and user-facing identifier before any change.

## 4. Referenced deep-research report

**Status:** open — input artifact missing from the repository

**Owner:** product lead and the relevant task reviewer

Several autonomous-pharmacy briefs refer to an attached or sibling
`deep-research-report.md`. No reviewed report with that name is currently
checked into the repository.

**Current safe interpretation:** the task brief is the execution contract. The
missing report cannot be treated as authority, reconstructed from memory, or
silently replaced with web research.

**Decision required:** add the reviewed artifact with its provenance and scope
when a task materially relies on it, or amend that task to remove the
dependency. Until then, stop at any decision that requires facts available only
from the missing report.
