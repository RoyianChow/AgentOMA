# Task 07 — Communications Incident Response

**Workstream:** L (part 2 of 2) — incident-response model

**Prepared:** 2026-08-27

**Repository design baseline:** `89f7611`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`retry-opt-out-outage-and-reconciliation-runbook.md`](retry-opt-out-outage-and-reconciliation-runbook.md)
(Part 2 wrong-recipient procedure escalates here) ·
[`communications-threat-model.md`](communications-threat-model.md) (the
threats this model responds to) ·
[`privacy-security-and-retention-plan.md`](privacy-security-and-retention-plan.md)
(retention/hold interaction) ·
[`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md)
(evidence source for every phase below)

## Decision summary

This document models the incident-response lifecycle the brief requires:
detection through post-incident review. It names the phases and what each
phase requires as **input** and produces as **output**, and it repeats — at
the one point in the whole Task 07 document set where the temptation to
violate it is highest — the brief's central incident-response rule: **the
application does not decide that an event is a legally reportable privacy
breach.** That decision belongs to named human authorities under an approved
runbook this document does not write.

This document is a response *model*, not the runbook itself. It does not
name a privacy officer, a notification threshold, or a regulator contact —
those are `T07-D28`'s content once approved, and inventing them here would
be exactly the kind of unauthorized policy invention every prior workstream
has refused to do.

# Part 1 — Phases

## 1.1 Detection

**Input:** any of — a wrong-recipient report (Part 2 of the runbook), a
suppression spike, an anomalous denial-rate pattern in safe aggregate
metrics, a webhook signature-verification failure spike, a reconciliation
case backlog, an `access.denied_cross_scope` audit-event spike, a vendor
notification, or a direct report from a patient, pharmacist, or staff
member.

**Output:** an incident record opened, referencing the triggering evidence
by opaque reference (audit event ID, work item ID, reconciliation case ID) —
never by re-copying its content into a new, less-controlled record.

**Rule:** detection is a trigger, not a conclusion. Opening an incident
record does not itself assert that a reportable breach occurred.

## 1.2 Immediate containment or suppression

**Input:** the detection record; the scope it implies (one contact point?
one purpose? one provider account? every message this purpose has ever
sent?).

**Output:** the narrowest suppression, worker disablement, or credential
rotation that actually contains the exposure — per Contract 18's
`scope_code` enum (`GLOBAL`, `SUBJECT`, `CONTACT`, `CHANNEL`, `PURPOSE`,
`SOURCE`, `PROVIDER`, `SECURITY`), chosen deliberately rather than
defaulted to the broadest option "to be safe," since an over-broad
suppression is itself an availability incident for patients who did nothing
wrong.

**Rule:** containment is reversible where the underlying cause is fixed
(e.g. a rotated credential can be re-enabled); a `SuppressionEntry` is never
silently or automatically lifted as part of containment ending — the same
authorized-lift rule from the runbook applies here too.

## 1.3 Worker, credential, webhook, or provider disablement

**Input:** containment decision from 1.2.

**Output:** the kill switch (`T07-D39`, existing) engaged for the affected
scope; `lifecycle.kill_switch_engaged` audited. Where the incident is
provider-side, the specific adapter/account is disabled, not the whole
communications system, unless the incident's scope requires that.

**Rule:** disablement is audited with the same rigor as any other state
transition — an incident is not an exception to the append-only audit
requirement, it is the situation that requirement exists for.

## 1.4 Session and authorization review

**Input:** the incident's actor/access trail, where relevant (e.g. an
insider-access or cross-scope-access incident).

**Output:** affected sessions/grants reviewed against Task 05's revocation
mechanism; any revocation is itself an authorized, audited action, not an
ad hoc database edit.

**Rule:** this phase exists specifically for the threat model's "insider
with excessive access" and "compromised patient device" actors — it is not
limited to external-attacker scenarios.

## 1.5 Evidence preservation

**Input:** every record in scope — audit events, reconciliation cases, work
items, suppression entries, the (normally absent) raw webhook payload if a
separately approved retention exception applies.

**Output:** a preserved, access-controlled snapshot or legal hold applied to
the exact records in scope — never a broader hold than the incident
requires, and never a narrower one that could let ordinary retention delete
evidence mid-investigation.

**Rule:** evidence preservation never means copying PHI-bearing content into
a new, differently-controlled location (a spreadsheet, a chat message, a
ticket) to "make it easier to review" — the forbidden-data list in
`logging-and-leakage-control.md` applies to incident-response tooling with
the same force it applies to ordinary operations.

## 1.6 Scope assessment

**Input:** the preserved evidence.

**Output:** a factual answer to "what happened, to what data, affecting
whom, for how long" — this is a factual/technical assessment, not a legal
conclusion.

**Rule:** this is the phase where the brief's central rule is easiest to
violate by omission: a scope assessment that concludes "affected 40
patients" is a fact; a scope assessment that concludes "this is/is not
reportable" has silently made the decision this document forbids the
application (and, by extension, an under-scoped process) from making.

## 1.7 Privacy and security escalation

**Input:** the scope assessment.

**Output:** escalation to the named privacy authority and security team
under the approved runbook (`T07-D28`). This document does not name who
that is — that is exactly the unresolved decision.

**Rule:** escalation happens regardless of the assessor's own view on
whether the incident is "serious enough" — the threshold for escalating is
lower than the threshold for reporting, deliberately, because the decision
to *not* escalate is itself a decision this document does not authorize
anyone below the named privacy authority to make unilaterally.

## 1.8 Vendor escalation

**Input:** the scope assessment, where a vendor/provider is implicated.

**Output:** vendor notified per the (not yet existing) approved contract
terms — incident-notification obligations are one of the named production
gates (`T07-D30`) a vendor contract must cover before go-live.

**Rule:** pre-vendor, this phase is inapplicable by construction — there is
no vendor to escalate to, which is itself a reason the current synthetic
design carries no vendor-originated incident risk yet.

## 1.9 Patient-notification decision by authorized humans

**Input:** the scope assessment and the privacy authority's determination.

**Output:** a decision, made by named authorized humans, on whether and how
to notify affected patients — this document does not draft that
notification and does not decide its trigger.

**Rule:** restated once more, because it is the rule the whole document
protects: **the application does not decide that an event is a legally
reportable privacy breach**, and by direct extension, it does not decide
whether or how to notify anyone about one.

## 1.10 Recovery

**Input:** the closed containment/disablement actions.

**Output:** kill switch released (`lifecycle.kill_switch_released`) only
after the underlying cause is confirmed fixed; dispatch resumption follows
the same outage-recovery discipline as Part 5 of the companion runbook — no
backlog flush, full DAQ recheck per item.

## 1.11 Reconciliation

**Input:** any messages whose state was uncertain when the incident began.

**Output:** those cases resolved through the ordinary reconciliation
workflow (`ReconciliationCase`), not through an incident-specific shortcut —
an incident does not create a new way to resolve `UNCERTAIN` state, it uses
the existing one, possibly with different staffing urgency.

## 1.12 Post-incident review

**Input:** the full incident record, including every phase's evidence.

**Output:** a review identifying what detection signal worked or should
have existed, whether containment scope was correct, and whether any
`T07-Dxx` decision needs revisiting as a result. This is also where a
finding that a detection signal was *missing* becomes a new, explicitly
named gap — not a silent process improvement nobody wrote down.

# Part 2 — Cross-reference to the threat model

Every phase above answers a category of threat already named in
`communications-threat-model.md`: wrong-recipient/misrouting threats feed
1.1–1.2 via the runbook; insider/cross-scope-access threats feed 1.4;
provider/subprocessor compromise feeds 1.3 and 1.8; webhook
replay/spoofing/tampering feeds 1.1 detection signals. This document does
not re-enumerate the threat model; it is the response side of the same
threats that document already assessed likelihood, impact, and residual
risk for.

# Part 3 — What this document explicitly does not do

- It does not name a privacy officer, incident commander, or any specific
  human role by name — role *categories* only, per the same
  `SafeCode<OperationsRole>` discipline the reconciliation contract already
  uses.
- It does not set a notification deadline, a regulator, or a breach
  threshold.
- It does not authorize any code to auto-classify an incident's severity
  using content inspection — severity classification, like queue routing,
  must come from structural signals (scope, record count, record class),
  never from reading message bodies.
- It does not treat a `RECONCILED_UNRESOLVED` case as an incident by
  default — that is a normal, planned-for outcome of the delivery
  guarantee's honest residual window (state machine Part 0), not itself
  evidence of a problem, unless its rate or pattern crosses a threshold
  `T07-D37` will eventually define.

# Part 4 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D28 | Wrong-recipient/privacy-breach runbook, including named privacy authority and notification policy (existing, reused) | Phases 1.7, 1.9 |
| T07-D30 | Vendor contract incident-notification terms (existing, reused) | Phase 1.8 |
| T07-D37 | SLI/SLO and incident-worthy thresholds for reconciliation patterns (existing, reused) | Part 3's `RECONCILED_UNRESOLVED` non-incident default |
| T07-D38 | Named operations/security ownership for incident response (existing, reused) | Phases 1.2–1.4, 1.10 |
| T07-D52 | Whether incident severity tiers need their own approved taxonomy beyond Contract 18's `scope_code`, or reuse it directly | Phase 1.2 |

## Workstream L (part 2) acceptance check

- Every phase the brief's "Incident response" list names (detection,
  containment, disablement, session/authorization review, evidence
  preservation, scope assessment, privacy/security escalation, vendor
  escalation, patient-notification decision, recovery, reconciliation,
  post-incident review) has its own numbered subsection with input, output,
  and rule.
- The brief's central rule — the application never decides reportability —
  is stated at the phase where violating it by omission is easiest (1.6),
  not only in the introduction.
- The document is explicit about what it deliberately leaves unnamed
  (specific roles, thresholds, deadlines), consistent with every prior
  workstream's refusal to invent policy.
- Cross-references to the threat model and the companion runbook are named
  rather than re-deriving their content.
- This document adds no TypeScript, SQL, alerting configuration, or runtime
  effect.

## Current disposition

**Workstream L, part 2 — communications incident response: complete as
design documentation.**

- **Incident-response model:** PASS as documentation; BLOCKED on T07-D28
  (named authority and notification policy) and T07-D38 (named operations
  ownership) for any actual execution.
- **Real PHI, contact data, or runtime effect:** NO.
- **Production schema, authentication, or vendor changed:** NO.

## Workstream L — overall disposition

With this document, Workstream L is **complete as design documentation**,
matching every prior workstream. Both Workstream L deliverables —
[`retry-opt-out-outage-and-reconciliation-runbook.md`](retry-opt-out-outage-and-reconciliation-runbook.md)
and this document — add no schema, endpoint, worker, provider, credential,
recipient, PHI, or network effect.

The next safe repository slice is the **clinical, privacy, accessibility,
and operational validation plan** the brief requires as its final Task 07
deliverable, followed by the **Task 11 Checkpoint 1 submission** this
document set's `T07-D02` decision has been waiting on since Workstream A.
Runnable synthetic implementation for any workstream remains **BLOCKED**
pending that scope approval and Checkpoint 1 review. Pilot and production
remain separately blocked by all applicable G1–G6 decisions named across the
full Workstream A–L document set.
