# Open questions

**Reviewed:** 2026-08-10

These issues require a pharmacist, the ODB Pharmacy Help Desk, or the product lead. Code and documentation must not infer an answer. Until resolved, use the conservative path that cannot create an improper claim or unsafe outcome.

P0-A triage approval, including the tick-bite section, was resolved on
2026-07-26 and is recorded in [`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md).
The orientation override was resolved on 2026-08-02 as a hard gate with no
admin bypass; see
[`p0/task-02/orientation-decision-note.md`](p0/task-02/orientation-decision-note.md).

## 1. LTC minor-ailment claim handling

**Status:** open — production blocker

**Owner:** ODB Pharmacy Help Desk, **1-800-668-6641**, with the pilot pharmacist

**Code:** `src/lib/claims/derive-claim-draft.ts`, reason `LTC_PENDING_MINISTRY_CLARIFICATION`

The Notice appears ambiguous:

- The exclusions on p.14 say an LTC resident's minor-ailment service must be provided by the contracted primary pharmacy, with a secondary provider eligible for the fee only in an emergency.
- Footnote 5 on p.7 and the exclusions language say a pharmacy ineligible for a service fee must submit a zero-dollar claim.

**Current safe behaviour:** the pharmacist records the LTC resident, provider-role, and emergency facts, but derivation refuses every LTC scenario and emits no claim draft. This applies to primary providers and secondary providers, whether emergency or non-emergency. The assessment record is retained. The UI directs the pharmacist to speak with Royian before taking billing action.

**Decision required:** confirm the required submission and fee treatment for primary-provider, secondary-emergency, and secondary-non-emergency services, including whether footnote 5 requires a zero-dollar claim when no service fee is payable and whether/when `LT` applies. Record the help-desk response, date, caller, and approved code change before altering the refusal.

## 2. AgentOMA / AgentRx product naming

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

## 3. Referenced deep-research report

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

## 4. Task 04 synthetic-scope renewal

**Status:** open — implementation blocker

**Owner:** product lead, with independent Security/Privacy, Operations/SRE,
Quality/Test, and Task 11 reviewers

The prior Task 04 synthetic implementation approval expired on 2026-08-05.
Partial booking runtime exists, and the waitlist/promotion policy has a separate
synthetic-policy approval, but that sub-decision does not renew implementation
authority.

**Current safe behaviour:** documentation and renewal-package preparation only.
No new Task 04 code, migration, Docker execution, evidence promotion, merge,
hosted preview, production import, external delivery, or production connection.

**Decision required:** record a superseding, versioned approval bound to the
exact candidate, sandbox migration and Compose hashes, capability scope,
lineage/bootstrap/cancellation/rescheduling/catalog decisions, accountable
owner and backup, future expiry/review dates, and independent reviewer
signatures. Task 11 Checkpoint 1 must be explicit.

## 5. Task 14 regulatory-change governance ownership

**Status:** open — design and implementation-governance blocker

**Owner:** product lead, pharmacist/regulatory lead, and Task 11 reviewers

Task 14 now defines a design-only contract for authoritative-source provenance,
human interpretation, impact mapping, effective-date transitions, protected-
surface approvals, historical reconstruction, and rollback. The repository does
not yet record the accountable regulatory owner, backup, independent reviewer
matrix, recurring review triggers, or authority for any runnable source-checking
tool.

**Current safe behaviour:** maintain existing approved sources and fail closed
on any missing, changed, contradictory, or uncertain authority. No crawler,
agent, model, CI job, or scheduled process may interpret a source, edit a
protected rule, or activate a change.

**Decision required:** name the accountable and backup owners, approve the
source classes and reviewer matrix, define review/change triggers, and record an
exact Task 14 implementation approval plus Task 11 Checkpoint 1 before runnable
tooling or synthetic activation drills begin.
