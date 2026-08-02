# Task 02 orientation-override decision note

**Status:** BLOCKED (G3 not decided; current invariant is false)  
**Decision authority:** product/compliance with pilot-pharmacist review  
**Code owner after decision:** assessment-completion/auth owner under separate
approval

## Required rule and current behavior

The required release rule is a server-side hard gate: the prescribing
pharmacist—or supervising pharmacist for an intern/student—must have a recorded
completion of the OCP Mandatory Orientation for Minor Ailments Module before a
billable assessment can be completed or `deriveClaimDraft` called.

`src/app/(dashboard)/pharmacist/actions.ts:538–566` performs that check, but it
also permits a `pharmacy_admin` without recorded completion to supply free-text
`orientationOverrideReason` and continue. Lines 1083–1103 attempt a separate
best-effort override audit after commit. The database suite explicitly expects
that override to create a billable assessment.

Auditability does not establish billing eligibility. Because no G3 decision
authorizes the bypass, T02-18 and AC15 are currently **FAIL**, not merely
unverified.

## Exact decision required

Must the admin override be removed so missing orientation always blocks
billable completion, or is a break-glass override authorized? If authorized,
the decision must state all of:

- the exact role(s) allowed to invoke it;
- the objective conditions, evidence and reason required;
- whether it applies to the actor, supervisor, or both;
- duration/expiry and effective scope;
- required audit event and whether audit failure must roll back completion;
- revocation and retrospective-review process; and
- the authoritative product/compliance basis for treating the resulting
  service as billable.

No candidate role is approved by this note. `pharmacy_admin` is an observation
from current code, not an approved policy.

## Safety and implementation impact

The current override can create an assessment, immutable evidence, claim draft,
and follow-up for a prescriber who does not meet the recorded orientation gate.
Its audit event can also fail after those records commit. A future approved
change therefore needs server-action, schema/boundary, UI, audit atomicity,
authorization, negative role, expiry/revocation, and real-PostgreSQL tests.

## Task 02 disposition

No override policy was inferred, approved, removed, or expanded. The protected
completion path was not edited. G3 remains BLOCKED and production promotion is
blocked until a separately approved remediation restores the hard gate or
implements an authoritative policy.
