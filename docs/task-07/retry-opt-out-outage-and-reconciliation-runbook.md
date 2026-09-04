# Task 07 — Retry, Opt-Out, Outage, and Reconciliation Runbook

**Workstream:** L (part 1 of 2) — deterministic operational procedures

**Prepared:** 2026-08-27

**Repository design baseline:** `89f7611`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md)
(suppression reasons, the wrong-recipient contract) ·
[`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md)
(`UNCERTAIN`, `RECONCILED_UNRESOLVED`, WE-14 outage soak test) ·
[`webhook-and-reconciliation-design.md`](webhook-and-reconciliation-design.md)
(`ReconciliationCase` states) ·
[`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md)
(the events every procedure below must emit) ·
[`reply-and-review-queue-design.md`](reply-and-review-queue-design.md) (the
wrong-recipient report path)

## Decision summary

This document is the step-by-step procedure for six operational scenarios
the brief names: opt-out, wrong number/wrong recipient, bounce/complaint/
delivery failure, provider timeout or uncertain send, provider outage, and
secure-message response delay. Every step below is an application of a state
transition, suppression reason, or reconciliation rule Workstreams D, E, G,
and H already defined — this document sequences those rules into a runbook a
human operator (or, once approved, an automated worker) can follow, and adds
no new authority, state, or transition of its own. Where the brief requires a
duration, threshold, or named role this document does not invent one; it
names the existing `T07-Dxx` decision that owns it.

# Part 1 — Opt-out

| Step | Action | Mechanism |
|---|---|---|
| 1 | Authenticate the portal opt-out request, or validate an approved provider-originated opt-out event (e.g. carrier `STOP`) against the exact approved signal list. | `T07-D14` (existing) governs which signals are accepted; an unlisted signal is not treated as an opt-out. |
| 2 | Record an immutable consent withdrawal (`CommunicationConsentEvent`, `event_type = WITHDRAWN`) or a suppression entry (`SuppressionEntry`, `reason_code = OPT_OUT`) as approved policy specifies for the exact scope reported. | Contracts 6, 18 |
| 3 | Cancel every affected unsent `MessageIntent` in the same or an immediately following transaction (`E-I06`). | Outbox state machine §2.2 |
| 4 | Prevent new messages for the same scope going forward — the suppression entry, once `ACTIVE`, is re-checked by the DAQ at every future claim and dispatch. | DAQ definition, state machine Part 0 |
| 5 | Attempt provider cancellation of any already-`SENT`/`DISPATCHING` message only where the adapter capability declaration supports it (Workstream G); record explicitly that this may not prevent an already-accepted delivery. | `E-I06` guard: "record that it may not prevent an accepted delivery" |
| 6 | Audit the withdrawal/suppression event without storing the contact value or any message body. | `consent.withdrawn`/`suppression.created` (audit catalogue §3–4) |
| 7 | Require new, affirmative evidence before any future re-enrollment for the same scope — no automatic unsuppression. | Contract 18, constraint #13; `suppression.lift_denied` if attempted automatically |

**Never:** infer opt-out from silence, infer opt-out from a different signal
than the approved list, or treat unsuppression as a side effect of a later
successful delivery to the same destination (Contract 18's own rule:
"Provider delivery events cannot create an unsuppression transition").

# Part 2 — Wrong number or wrong recipient

This procedure is deliberately the most conservative in the runbook, because
a wrong-recipient report is itself potential evidence of a privacy incident,
and the report's *confirmation* would disclose exactly the fact the
procedure exists to protect.

| Step | Action | Mechanism |
|---|---|---|
| 1 | **Do not confirm a patient relationship to the reporter**, under any circumstance, regardless of how the report arrives (portal, external reply, phone). | Mandatory stop condition; `reply-and-review-queue-design.md` §3.5's exact reasoning: "confirmation adds nothing operationally and discloses the exact fact the design exists to protect." |
| 2 | Suppress the destination immediately (`SuppressionEntry`, `reason_code = WRONG_RECIPIENT`). | Contract 18; suppression policy's `WRONG_RECIPIENT` row |
| 3 | Cancel every affected unsent logical message to that destination (`E-I06`). | Outbox state machine |
| 4 | Lock ordinary resend to that destination — a suppression entry overrides staff resend per Contract 18, constraint #13. | Contract 18 |
| 5 | Create a body-free protected staff work item (`CommunicationWorkItem`) referencing the safe report, never the report's free text. | Contract 20; suppression policy: "Safe report reference; no report free text in the entry." |
| 6 | Assess whether any other message was sent to the same destination while it may have been misrouted — this is a scope-of-exposure question the work item routes to a human, not a query this document answers with a number. | `T07-D28` |
| 7 | Escalate to the approved privacy/security runbook (Part 2 of the companion incident-response document) under `T07-D28`. **The software does not decide reportability, does not draft a notification, and does not close the incident** — this is the suppression policy's own wording, restated here because this runbook is where an operator would otherwise be tempted to treat "suppressed" as "handled." | `T07-D28`; `suppression-and-contact-change-policy.md` §3.4 |
| 8 | Preserve necessary evidence (the safe report reference, the suppression event, the affected message list) without preserving anything the forbidden-data list excludes. | `logging-and-leakage-control.md` §2 |
| 9 | Require authenticated contact correction and fresh verification before the subject's *legitimate* contact can be used again — the wrong-recipient destination itself is never simply "fixed" in place; a new contact-point version is required. | Contract 3, `ContactPoint` versioning; `T07-D28` for the correction workflow's approval |

# Part 3 — Bounce, complaint, and delivery failure

| Step | Action | Mechanism |
|---|---|---|
| 1 | Classify the provider-reported outcome as retryable or final using the adapter's capability declaration and the approved outcome mapping — never guessed per-incident. | Provider adapter contract, outcome table |
| 2 | Limit retries and apply backoff per the approved bounded policy. | `T07-D15` (existing, cadence/attempts) |
| 3 | Do **not** change channels automatically on any failure. | Mandatory stop condition; brief's "no silent channel fallback" rule |
| 4 | Suppress on hard bounce or complaint exactly as policy requires (`SuppressionEntry`, `reason_code = HARD_BOUNCE`/`COMPLAINT`). | Contract 18 |
| 5 | Create a safe work item when human action is required (e.g. repeated soft failures approaching a suppression threshold). | Contract 20; `dispatch.failed_retryable` audit event on repeated failure (per its approved threshold, `T07-D15`) |
| 6 | Keep clinical content and patient identity out of any provider support ticket opened about the failure. | `logging-and-leakage-control.md` §4 |
| 7 | **Never equate a failed reminder with clinical deterioration.** A failed delivery is a communications fact, not a signal to escalate as a clinical event — that inference is exactly the kind of AI-adjacent judgment call this task is scoped to avoid making automatically. | Mandatory stop condition; brief's "communications must never treat provider acceptance... as proof" principle, extended here to the failure direction |

# Part 4 — Provider timeout or uncertain send

| Step | Action | Mechanism |
|---|---|---|
| 1 | On timeout, ambiguous response, or a crash found in `DISPATCHING` with an expired lease, transition the attempt to `UNCERTAIN` (`E-D09`). | State machine §2.3 |
| 2 | Block ordinary retry — no code path exists to "retry blind after timeout" (§3.5 of the state machine, proven by test, not by comment). | I-04 |
| 3 | Open a reconciliation case automatically (`E-R01`); preserve the provider reference if known. | Contract 19; `reconciliation.opened` |
| 4 | Reconcile through the approved status/webhook path (`E-D11`/`E-D12`); require an assigned, authorized operator for any manual resolution (`E-R02`–`E-R04`). | Webhook/reconciliation design |
| 5 | If unresolved, close as `RECONCILED_UNRESOLVED` under the approved ageing rule (`T07-D36`/`T07-D37`) — this is a legitimate terminal answer, not a state to be "cleared" by relabelling. | `E-R04`; state machine §1.5 |
| 6 | Preserve idempotency throughout: a resolved-`RECONCILED_NOT_SENT` case gets a new attempt with a new `attempt_number` and provider idempotency key, never a blind resend of the uncertain one (`E-D12`). | §3.5 of the state machine |
| 7 | **Never claim delivery** for an `UNCERTAIN` or `RECONCILED_UNRESOLVED` case, on any surface, including an operator-facing one. | §1.7 presentation mapping |

# Part 5 — Provider outage

| Step | Action | Mechanism |
|---|---|---|
| 1 | Stop new dispatch safely — the worker denies at the DAQ's adapter/configuration term rather than attempting calls into a known-down provider. | DAQ definition |
| 2 | Keep messages `SCHEDULED`/`HELD` only while still useful; do not extend `expires_at` to "wait out" the outage. | Part 4 of the state machine, "Usefulness expiry" |
| 3 | Expire obsolete reminders on their own schedule during the outage — an outage is not a reason to suspend expiry. | Same |
| 4 | Expose a safe, non-PHI operational state to staff (queue depth, denial counts, safe reason-code aggregates) — never a per-patient list. | `logging-and-leakage-control.md` §3 (safe aggregates) |
| 5 | On recovery, **do not flush the backlog** — this is the outage soak test's central point (`WE-14`): a queue of expired reminders released at once, at the wrong local time, some to withdrawn consents, is the classic mass-incident this design exists to prevent. | State machine Part 4, "Recovery is not permission" |
| 6 | Recheck consent, contact, source state, quiet hours, and expiry for every item before resumed dispatch — full DAQ, not a fast-path resume. | DAQ |
| 7 | Do not infer clinical urgency from the outage or auto-select another channel because the primary one is down. | Mandatory stop condition |
| 8 | Named operations ownership handles the outage response; the specific on-call/escalation path is `T07-D38` (existing, unresolved). | `T07-D38` |

# Part 6 — Secure-message response delay

| Step | Action | Mechanism |
|---|---|---|
| 1 | Use the approved response-expectation policy (`T07-D20`, existing) to define what "delayed" means for a given thread purpose — never an invented default. | `T07-D20` |
| 2 | Create a safe, body-free queue alert (`CommunicationWorkItem`/`SecureMessageQueueItem` escalation) when the service window is breached. | Contracts 20, 25 |
| 3 | Require human review of the breach — an authorized staff member decides next action, never an automated escalation that infers urgency from the message. | Mandatory stop condition |
| 4 | **Do not have AI inspect content for urgency**, at this or any other decision point in the runbook. | Mandatory stop condition; enforced architecturally per `logging-and-leakage-control.md` §5's forbidden-import test |
| 5 | Do not promise an emergency response in any patient-facing copy about the delay. | Brief's channel/content boundary; `secure-portal-messaging-contract.md` Part 3 |
| 6 | Do not automatically complete or close the thread because of the delay — a response-time breach is an operational fact about staffing, not a reason to end the professional relationship the thread represents. | `SecureMessageThread` state contract |

# Part 7 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D14 | Suppression scope/opt-out signal acceptance list (existing, reused) | Part 1, step 1 |
| T07-D15 | Cadence, retry bounds, backoff (existing, reused) | Part 3, steps 2 and 5 |
| T07-D20 | Response-expectation policy (existing, reused) | Part 6, step 1 |
| T07-D28 | Wrong-recipient/privacy-breach runbook (existing, reused) | Part 2, steps 6–7, 9 |
| T07-D36 | Outage/duplicate/delayed-event runbooks (existing, reused) | Part 4 step 5, Part 5 generally |
| T07-D37 | SLI/SLO and queue-age targets (existing, reused) | Part 4 step 5, Part 5 step 4 |
| T07-D38 | Named operations ownership and escalation (existing, reused) | Part 5 step 8 |

## Workstream L (part 1) acceptance check

- All six scenarios the brief's runbook section names (opt-out, wrong
  number/recipient, bounce/complaint/failure, provider timeout/uncertain
  send, provider outage, secure-message response delay) have a numbered,
  sequenced procedure.
- Every step cites the existing contract, state transition, or decision it
  applies, rather than inventing new behaviour under the guise of "runbook
  detail."
- The wrong-recipient procedure explicitly repeats the "software does not
  decide reportability" rule at the exact step an operator might otherwise
  treat suppression as case-closed.
- The outage procedure explicitly names the backlog-flush anti-pattern the
  brief and the state machine both call out, rather than leaving "don't
  flood on recovery" as an implicit assumption.
- No cadence, threshold, retry bound, or ageing window is invented; each is
  attributed to its existing `T07-Dxx` owner.
- This document adds no TypeScript, SQL, worker, or runtime effect.

## Current disposition

**Workstream L, part 1 — retry, opt-out, outage, and reconciliation runbook:
complete as design documentation.**

- **Suppression and opt-out procedure:** PASS as documentation; BLOCKED on
  T07-D14.
- **Wrong-recipient procedure:** PASS as documentation; BLOCKED on T07-D28.
- **Outage/reconciliation procedure:** PASS as documentation; BLOCKED on
  T07-D36, T07-D37, T07-D38.
- **Real PHI, contact data, or runtime effect:** NO.
- **Production schema, authentication, or vendor changed:** NO.

Continue to
[`communications-incident-response.md`](communications-incident-response.md)
for the broader incident-response model this runbook's wrong-recipient and
outage procedures escalate into.
