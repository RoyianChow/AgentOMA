# Task 07 — Transactional Outbox and Delivery State Machine

**Workstream:** E — orthogonal state axes, transition catalogue, idempotency and
concurrency, scheduling, and the critical invariants

**Prepared:** 2026-08-06

**Repository design baseline:** `3d1b9e59abc6655cecff298f27922ee65ebb48f6`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`communication-contracts-and-schema-proposal.md`](communication-contracts-and-schema-proposal.md)
(field contracts) · [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
and [`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md)
(authority terms)

## Decision summary

This document defines the state machine that moves a communication from an
authoritative source event to a recorded outcome, and the concurrency contract
that keeps that movement safe across retries, crashes, delayed webhooks, and
races. Workstream C says what a field is; Workstream D says what the server must
decide; this document says what may transition to what, under whose authority,
and what happens when the world interferes mid-flight.

It adds no TypeScript, SQL, Drizzle schema, endpoint, worker, provider,
credential, recipient, or network effect, and it selects no unresolved policy
value. Cadence, retry bounds, lease durations, backoff, and reconciliation
windows remain the property of their named approvers.

**The honest guarantee comes first, because everything else is built on it.**

## The guarantee this system can actually make

Exactly-once external delivery is not achievable across an unreliable network. A
provider can accept a message and fail to acknowledge it; a worker can crash
between the provider's acceptance and the local commit. Any design claiming
exactly-once is either wrong or is quietly redefining "once."

What this design commits to instead:

| Guarantee | Strength |
|---|---|
| One logical message per authoritative source event and approved purpose | **Enforced** by a database uniqueness constraint on a server-derived idempotency scope. |
| At most one *in-flight* attempt per logical message | **Enforced** by an atomic lease plus a state-version predicate. |
| No new attempt after an unknown provider outcome until reconciliation resolves it | **Enforced** by `UNCERTAIN` blocking the retry path. |
| No dispatch without every authority term true at that instant | **Enforced** by the final recheck inside the last internal boundary (TB-07). |
| No duplicate *effect* from webhook replay, reordering, or duplicate source events | **Enforced** by receipt-level uniqueness and monotonic projection. |
| Exactly one external delivery | **Not guaranteed. Not claimed anywhere — code, UI, metric, or evidence.** |

The residual risk is a duplicate send in one specific window: the provider
accepted and the acknowledgement was lost. The design's answer is to make that
window narrow, detectable, and reconciled by a human-owned process — not to
pretend it does not exist. Where a provider supports an idempotency key, that
window narrows further; where it does not, automatic retry after an unknown
outcome is **denied** rather than attempted (T07-16).

## Scope and limits

In scope: the four state axes and their legal combinations; the transition
catalogue; idempotency, leasing, and concurrency; race determinism; scheduling
and staleness; and the invariants the brief requires proving.

Out of scope, by explicit deferral: template payloads (Workstream F); provider
adapter implementation, webhook authentication mechanics, and vendor
reconciliation semantics (Workstream G); secure-thread and reply-queue state
(Workstream H); and producer contracts for appointments and follow-ups
(Workstream I).

## Conventions

`PERMIT`, `DENY(<code>)`, `DEFER(<code>)`, `UNRESOLVED(T07-Dxx)`, and safety
floor carry the meanings defined in the Workstream D companion documents.

**DAQ** abbreviates the dispatch-authority query — the conjunction defined in
Workstream C and expanded by Workstream D:

```text
DAQ = lifecycle/kill-switch current
  AND ticket instance and lifecycle revision current
  AND source event current, uncancelled, unsuperseded, still useful
  AND custodian/subject/actor/grant current
  AND consent grant ACTIVE for the exact tuple
  AND contact version VERIFIED and ACTIVE
  AND suppression set provably empty
  AND purpose/channel/template/translation current and published
  AND quiet-hours/timezone/cadence policy permits now
  AND intent/lease/attempt/idempotency state permits exactly one effect
  AND adapter and configuration explicitly approved
```

Every term is re-read from current state. No term may be satisfied from a value
cached on the outbox row, from a preference, from a prior successful delivery, or
from an operator flag. Any false, missing, malformed, contradictory, or unknown
term yields `DENY` with an allowlisted payload-free reason code.

# Part 1 — Orthogonal state

## 1.1 The axes

No generic `status` column exists. These axes are separate columns with separate
vocabularies, and no value in one may be inferred from a value in another.

| Axis | Owner | Answers |
|---|---|---|
| Intent state | Orchestrator | What is the business intention of this logical message? |
| Dispatch state | Worker | Where is this message in the queue-and-effect pipeline? |
| Delivery state | Reconciler, from provider evidence | What did the provider tell us, conservatively interpreted? |
| Reconciliation state | Reconciler | Does uncertainty require human or systematic resolution? |

Workstream C additionally reserves acknowledgement state, source workflow state,
consent/contact/suppression authority state, and clinical/professional state. The
last of these is outside communications entirely — this state machine has no
write path to it (T07-40).

## 1.2 Intent state

| Value | Meaning | Terminal |
|---|---|---|
| `SCHEDULED` | A logical message exists and is intended to be attempted at or after `not_before`. | No |
| `HELD` | Intended, but currently blocked by a policy condition expected to clear — quiet hours, rate/backpressure, or a scheduling recalculation in progress. | No |
| `SUPPRESSED` | Blocked by an active suppression entry. Distinct from `CANCELLED`: the intention stood, the destination is barred. | No (may become terminal on expiry) |
| `CANCELLED` | The source, an authority, or an authorized operator ended the intention. | Yes |
| `EXPIRED` | The useful window passed before dispatch was permitted. | Yes |
| `COMPLETED` | Communications-side orchestration reached its terminal state. **Not** clinical completion, not proof of readership. | Yes |
| `UNKNOWN` | The intent projection cannot be computed. | No — denies until resolved |

`HELD` and `SUPPRESSED` are deliberately separate. Collapsing them would let a
transient quiet-hours hold and a privacy-driven suppression share a label, and a
shared label eventually becomes a shared clearing routine.

## 1.3 Dispatch state

| Value | Meaning | Terminal |
|---|---|---|
| `PENDING` | Queued and unclaimed. | No |
| `CLAIMED` | A worker holds a bounded lease; no adapter call has begun. | No |
| `DISPATCHING` | The final recheck passed and the adapter call is in flight. The dangerous state. | No |
| `SENT` | The adapter returned a known local success and the provider accepted. | Yes for this attempt |
| `FAILED_RETRYABLE` | A known local failure that an approved bounded retry policy permits re-attempting. | No |
| `FAILED_FINAL` | A known failure that must not be retried — denial, permanent provider rejection, or exhausted bounds. | Yes |
| `UNCERTAIN` | The outcome is unknown: timeout, ambiguous response, or a crash during `DISPATCHING`. | No — blocks retry, requires reconciliation |

`FAILED_RETRYABLE` is a statement about the *failure*, never about authority. A
retryable failure still re-runs the full DAQ; authority denial is never
retryable.

## 1.4 Delivery state

Provider-derived and conservative. This axis describes transport only.

| Value | Meaning |
|---|---|
| `NOT_APPLICABLE` | No external channel is involved (secure-portal-only intent). |
| `UNKNOWN` | No trustworthy provider evidence yet, or evidence that cannot be interpreted. The default. |
| `PROVIDER_ACCEPTED` | The provider acknowledged receipt of the request. Not delivery. |
| `DELIVERED` | The provider asserts handoff to the destination. **Not** readership, not comprehension, not identity. |
| `BOUNCED` | Provider-reported delivery failure. |
| `UNDELIVERABLE` | The destination cannot receive on this channel. |
| `COMPLAINT` | The recipient marked the message as unwanted. |

Open and click tracking is **disabled by default**, is never treated as identity
evidence, and never advances this axis. Enabling it would be a separate approved
decision with its own privacy analysis.

## 1.5 Reconciliation state

| Value | Meaning |
|---|---|
| `NOT_REQUIRED` | No uncertainty exists. |
| `REQUIRED` | Uncertainty exists and no resolution has begun. |
| `IN_PROGRESS` | A reconciliation case is open. |
| `RECONCILED_SENT` | Evidence establishes that the provider accepted the message. |
| `RECONCILED_NOT_SENT` | Evidence establishes that no external effect occurred. |
| `RECONCILED_UNRESOLVED` | Reconciliation closed without establishing which. **A legitimate final answer**, never converted to either certainty. |

`RECONCILED_UNRESOLVED` is the Task 07 equivalent of `BLOCKED` in the program
status vocabulary. Closing a case as "probably sent" or "probably not" to clear a
queue is falsification of evidence.

## 1.6 Legal combinations

The axes are orthogonal but not unconstrained. These invariants must be enforced
by database constraint or reviewed transition function, not by convention:

| # | Invariant |
|---|---|
| C1 | `dispatch_state = DISPATCHING` requires an open lease and a `DeliveryAttempt` row with `started_at` set. |
| C2 | `dispatch_state = UNCERTAIN` requires `reconciliation_state ∈ {REQUIRED, IN_PROGRESS, RECONCILED_*}` — uncertainty always has an owner. |
| C3 | `delivery_state ≠ NOT_APPLICABLE` requires at least one attempt whose `provider_acceptance_state ≠ NOT_ATTEMPTED`. |
| C4 | `intent_state = CANCELLED` never implies `delivery_state = NOT_APPLICABLE`; a cancelled intent may still carry provider evidence from an earlier attempt. |
| C5 | `intent_state = COMPLETED` requires a terminal dispatch state and either a resolved reconciliation state or `NOT_REQUIRED`. |
| C6 | No axis value may be derived from another at read time. Each is stored, transitioned explicitly, and audited. |
| C7 | `UNKNOWN` on any axis denies dispatch, regardless of the other three. |
| C8 | No axis value, in any combination, sets billability, selects a PIN/code/fee, or transitions clinical state. |

## 1.7 Presentation without collapsing

Operational and patient-facing surfaces must expose scheduled, sent, delivered,
failed, cancelled, and reconciled concepts truthfully. Wording is
`UNRESOLVED(T07-D18/T07-P08)`; the structural rules are not:

| Concept shown | Derived from | Must never be worded as |
|---|---|---|
| Scheduled | `intent_state ∈ {SCHEDULED, HELD}` | "Will be sent" — a schedule is not a promise. |
| Sent | `dispatch_state = SENT` | "Received", "delivered", or "read". |
| Delivered | `delivery_state = DELIVERED` | "Read", "seen", "opened", or "understood" (T07-37). |
| Failed | `dispatch_state ∈ {FAILED_FINAL}` or `delivery_state ∈ {BOUNCED, UNDELIVERABLE}` | A clinical or account consequence. |
| Cancelled | `intent_state = CANCELLED` | "Not delivered" — cancellation cannot retract an accepted message. |
| Reconciled | `reconciliation_state ∈ {RECONCILED_*}` | Certainty when the value is `RECONCILED_UNRESOLVED`. |
| Blocked | `intent_state = SUPPRESSED` | The suppression reason, to a patient-facing surface, without approved copy. |

A surface that cannot express uncertainty honestly must show less, not guess more.

# Part 2 — Transition catalogue

## 2.1 How to read this catalogue

The brief requires thirteen attributes per transition. They appear as follows:

| Required attribute | Where it appears |
|---|---|
| Source state, destination state | The `From → To` column |
| Permitted server actor | `Actor` column |
| Required authorization and policy guards | `Guards` column |
| Current consent and contact checks | Inside `DAQ`, named in `Guards` |
| Quiet-hours and expiry checks | Inside `DAQ`, and called out where a transition turns on them |
| Source-event validity check | Inside `DAQ`, and called out for cancellation transitions |
| Idempotency behavior | `Idempotency / lease` column |
| Lease and concurrency behavior | `Idempotency / lease` column |
| Provider behavior | `Provider` column |
| Audit event | `Audit` column — every row commits its audit event atomically with the transition |
| Staff work-item effect | `Work item` column |
| Invalid-transition behavior | §2.6, which applies uniformly |

No transition is permitted by a client. Every actor below is a server component.

## 2.2 Intent-state transitions

| ID | From → To | Actor | Guards | Idempotency / lease | Provider | Audit | Work item |
|---|---|---|---|---|---|---|---|
| E-I01 | ∅ → `SCHEDULED` | Orchestrator | Full DAQ at creation; approved producer; approved purpose/channel. | Unique idempotency scope; duplicate source event returns the existing logical result deterministically. | None. | `intent.created` | None. |
| E-I02 | `SCHEDULED` → `HELD` | Scheduler/worker | Quiet-hours `DEFER`, rate/backpressure limit, or recalculation in progress. | State-version predicate; no lease required. | None. | `intent.held` | None. |
| E-I03 | `HELD` → `SCHEDULED` | Scheduler | Hold condition cleared; intent not expired; source still useful. | Recalculation is idempotent under repeated runs. | None. | `intent.released` | None. |
| E-I04 | `SCHEDULED`/`HELD` → `SUPPRESSED` | Suppression service | Any applicable active suppression entry. | Applies in the same transaction as the suppression insert where the entry originates locally. | None. Provider cancellation is attempt-only and separate. | `intent.suppressed` | Review item where the reason requires one (D06). |
| E-I05 | `SUPPRESSED` → `SCHEDULED` | Suppression service | An authorized, evidenced lift **and** full DAQ passing again **and** the intent still useful. | New state version; never a bulk clear. | None. | `intent.unsuppressed` | Closes the review item with a safe outcome. |
| E-I06 | any non-terminal → `CANCELLED` | Source workflow, authority service, or authorized operator | Source cancellation/supersession, consent withdrawal, contact supersession, kill switch, or approved operator action. | Cancels the outbox row in the same transaction; leased work fails its next recheck. | Attempt provider cancellation only where approved and supported; record that it may not prevent an accepted delivery. | `intent.cancelled` | Item created only if an operator must be informed. |
| E-I07 | any non-terminal → `EXPIRED` | Scheduler/worker | `expires_at` or `source_useful_until` passed. | Idempotent; repeated evaluation does not create a second terminal event. | None. | `intent.expired` | None by default. |
| E-I08 | any → `UNKNOWN` | Any reader | The projection cannot be computed. | N/A — this is a read-time safety result, recorded when persisted. | None. | `intent.unknown` | Review item; `UNKNOWN` never sits silent. |
| E-I09 | `SCHEDULED` → `COMPLETED` | Orchestrator/reconciler | Terminal dispatch state and resolved-or-not-required reconciliation (C5). | Set once; second attempt is an idempotent no-op. | None. | `intent.completed` | None. |
| E-I10 | `SCHEDULED`/`HELD` → superseded by a new intent | Orchestrator | The authoritative source event or approved purpose **materially** changed. | New intent has its own idempotency scope; `superseded_by_intent_ref` links one-way. | None. No automatic resend of the old message. | `intent.superseded` | None. |

A cancelled, expired, or completed intent is never edited into a different
purpose, channel, recipient, or schedule. Change means a new logical message
under E-I10, never mutation.

## 2.3 Dispatch-state transitions

| ID | From → To | Actor | Guards | Idempotency / lease | Provider | Audit | Work item |
|---|---|---|---|---|---|---|---|
| E-D01 | ∅ → `PENDING` | Orchestrator | Same transaction as E-I01. | One outbox row per intent. | None. | `outbox.created` | None. |
| E-D02 | `PENDING` → `CLAIMED` | Worker | `available_at ≤ now`, not expired, intent `SCHEDULED`, lifecycle revision current. | **Atomic claim**: conditional update on state + `state_version` + lease fields in one statement. Two workers cannot both succeed. Lease duration `UNRESOLVED(T07-D39)`. | None. | `outbox.claimed` | None. |
| E-D03 | `CLAIMED` → `PENDING` | Worker or lease reaper | Voluntary release, or lease expiry with a **state recheck** — never a blind reclaim. | Reclaim requires that no attempt is in `DISPATCHING`/`UNCERTAIN` for this intent. | None. | `outbox.released` | None. |
| E-D04 | `CLAIMED` → `DISPATCHING` | Worker | **Full DAQ, immediately before the adapter call**, inside TB-07. | Insert the immutable `DeliveryAttempt` with `attempt_number` unique per intent and the provider idempotency digest, **before** the call. | Adapter invoked only after this row commits. | `dispatch.attempt_started` | None. |
| E-D05 | `CLAIMED` → `FAILED_FINAL` | Worker | Any DAQ term false. | No attempt row is created; nothing was sent. | None. Adapter is never called. | `dispatch.denied` with the safe reason | Only where the reason needs operational attention. |
| E-D06 | `DISPATCHING` → `SENT` | Worker | Adapter returned a known success and the provider accepted. | Attempt row updated by state-version predicate; provider reference persisted before any further transition. | `provider_acceptance_state = ACCEPTED`; provider reference stored in the protected mapping (Contract 16). | `dispatch.sent` | None. |
| E-D07 | `DISPATCHING` → `FAILED_RETRYABLE` | Worker | Known local failure classified retryable by approved policy. | `attempt_count` increments; `next_attempt_at` from approved bounded policy `UNRESOLVED(T07-D15)`. | `provider_acceptance_state = REJECTED` or `NOT_ATTEMPTED`, as evidenced. | `dispatch.failed_retryable` | On repeated failures, per approved threshold. |
| E-D08 | `DISPATCHING` → `FAILED_FINAL` | Worker | Known permanent failure, or retry bounds exhausted. | No further attempts permitted for this intent. | Evidenced rejection. | `dispatch.failed_final` | Review item. |
| E-D09 | `DISPATCHING` → `UNCERTAIN` | Worker, lease reaper, or startup recovery | Timeout, ambiguous response, or an attempt found in `DISPATCHING` with an expired lease after a crash. | **Blocks retry.** `uncertain_at` set; the intent cannot produce another attempt while any attempt is `UNCERTAIN`. | Provider reference preserved if known; never discarded to "clean up". | `dispatch.uncertain` | Reconciliation case opened (C2). |
| E-D10 | `FAILED_RETRYABLE` → `PENDING` | Scheduler | `next_attempt_at` reached; intent still `SCHEDULED`; DAQ will re-run at claim and dispatch. | Bounded by approved attempt maximum; never unbounded. | None. | `outbox.requeued` | None. |
| E-D11 | `UNCERTAIN` → `SENT` | Reconciler | `reconciliation_state = RECONCILED_SENT` with provider evidence. | No new attempt; this records what already happened. | Evidence from provider status or webhook, bound to the protected reference. | `dispatch.reconciled_sent` | Closes the case. |
| E-D12 | `UNCERTAIN` → `PENDING` | Reconciler | `reconciliation_state = RECONCILED_NOT_SENT` **and** the intent is still useful **and** DAQ still permits. | A new attempt gets a new `attempt_number` and a new provider idempotency key. | None yet. | `dispatch.reconciled_not_sent` | Closes the case. |
| E-D13 | `UNCERTAIN` → `FAILED_FINAL` | Reconciler | `reconciliation_state = RECONCILED_UNRESOLVED`, or the useful window passed during reconciliation. | No retry. The uncertainty is recorded permanently, not erased. | None. | `dispatch.unresolved` | Case closed as unresolved with named ownership. |

## 2.4 Delivery-state transitions

Delivery is a **monotonic projection** over immutable provider events. Events are
never edited; the projection advances only where the approved semantics permit.

| ID | From → To | Actor | Guards | Idempotency | Audit |
|---|---|---|---|---|---|
| E-V01 | `UNKNOWN` → `PROVIDER_ACCEPTED` | Reconciler | An authenticated receipt bound to this attempt's protected provider reference. | Receipt-level uniqueness; duplicates are recorded as `DUPLICATE` and change nothing. | `delivery.accepted` |
| E-V02 | `PROVIDER_ACCEPTED` → `DELIVERED` | Reconciler | Authenticated delivery event, in order. | Idempotent; a repeat is a no-op. | `delivery.delivered` |
| E-V03 | `UNKNOWN`/`PROVIDER_ACCEPTED` → `BOUNCED`/`UNDELIVERABLE` | Reconciler | Authenticated failure event. | Idempotent. | `delivery.failed` |
| E-V04 | any → `COMPLAINT` | Reconciler | Authenticated complaint event. | Idempotent. | `delivery.complaint` |
| E-V05 | any → unchanged | Reconciler | A late, out-of-order, or regressive event arrives. | **The projection does not move backward.** The event is stored; `ordering_outcome = OUT_OF_ORDER`; the projection is unchanged. | `delivery.event_ignored_stale` |
| E-V06 | any → unchanged | Webhook service | Signature `INVALID`/`MISSING`/`UNKNOWN`, unparseable body, unknown event type, or unmatched provider account. | Receipt stays `QUARANTINED`; nothing is normalized. | `webhook.quarantined` |

`BOUNCED`, `UNDELIVERABLE`, and `COMPLAINT` additionally create suppression per
the companion document's §3.1. That is a suppression transition, not a delivery
transition, and it is recorded separately.

## 2.5 Reconciliation-state transitions

| ID | From → To | Actor | Guards | Notes |
|---|---|---|---|---|
| E-R01 | `NOT_REQUIRED` → `REQUIRED` | Worker/reconciler | Any `UNCERTAIN` attempt, unmatched authenticated event, status conflict, or provider outage affecting known attempts. | Opening is automatic; resolving is not. |
| E-R02 | `REQUIRED` → `IN_PROGRESS` | Authorized operator | Case assigned to a named role/actor. | Assignment is audited; reassignment versions the case. |
| E-R03 | `IN_PROGRESS` → `RECONCILED_SENT` / `RECONCILED_NOT_SENT` | Authorized operator | Evidence bound to the protected provider mapping. Operator judgement without evidence is not a resolution. | Drives E-D11/E-D12. |
| E-R04 | `IN_PROGRESS` → `RECONCILED_UNRESOLVED` | Authorized operator | Evidence is unavailable or contradictory. | Legitimate terminal answer. Never re-labelled to clear a dashboard. |
| E-R05 | any `RECONCILED_*` → corrected value | Authorized operator | New evidence. | Correction **supersedes**; the prior decision is retained. |

## 2.6 Invalid transitions — uniform behaviour

Any transition not enumerated above is invalid. On an attempted invalid
transition the system must, in one transaction:

1. make no state change;
2. append a safe `state.invalid_transition` audit event recording the axis, the
   observed source state, the attempted destination, and an allowlisted reason
   code — with no payload, destination, or content;
3. return a generic denial to the caller; and
4. create a review work item where the attempt indicates a defect rather than an
   ordinary race.

An invalid transition is never "repaired" by writing the destination state
directly, by a maintenance script, or by a migration. Repair is a new,
authorized, audited transition or nothing.

# Part 3 — Idempotency and concurrency

## 3.1 The logical idempotency key

- Generated **server-side** from stable, non-PHI references: custodian, source
  type, source event reference, source event version, purpose, channel, and the
  approved equivalence policy version.
- Stored as a keyed digest (`idempotency_digest` + `idempotency_key_version`) —
  never as a reconstructable concatenation, never containing a raw contact,
  patient identifier, or clinical value.
- Enforced by a **database uniqueness constraint** over the intended scope. This
  is the primary duplicate defence; application-level checking is not sufficient
  under concurrency.
- Canonicalization and key versions are retained so a key-rotation does not
  create a second logical message for the same event.

## 3.2 Equivalent versus materially changed source events

| Case | Result |
|---|---|
| The same source event delivered twice (producer retry, at-least-once bus, double-click) | Same logical message. The second insert deterministically returns the existing result. |
| Source event unchanged, worker restarted | Same logical message. |
| Source event materially changed per the approved equivalence policy | The old intent is cancelled or superseded (E-I10) and a **new** logical message is created with its own key. |
| Purpose materially changed | New logical message. Purpose is never rewritten in place. |

What counts as material is `UNRESOLVED(T07-D15)`. Safety floor: any change to
the source event's scheduled instant, purpose, subject, or cancellation state is
material.

## 3.3 Transactional insertion

Where the intent, outbox, and audit rows live in the same database, they are
inserted in **one transaction** with the source-domain change where the
architecture permits (Workstream C, "Intent creation"). A failure to write the
audit event rolls back the intent — an unaudited intent must not exist.

Where a source lives in a different transactional domain, a cross-service
two-phase commit is **not** introduced. The outbox pattern applies on the source
side, and Task 07 consumes a committed, versioned source event. Communications
never writes to the producing workflow.

## 3.4 Lease and claim

- Claiming is a single conditional statement predicated on state, `state_version`,
  `available_at`, and lifecycle revision. Read-then-write claiming is prohibited.
- A lease is bounded. The duration, and the relationship between lease expiry and
  provider timeout, are `UNRESOLVED(T07-D39)`; the design requirement is that the
  lease outlives the maximum adapter timeout, so a reaper cannot reclaim work
  while an adapter call is genuinely in flight.
- Lease expiry alone never authorizes a re-dispatch. The reaper must inspect
  attempt state: an attempt in `DISPATCHING` with an expired lease becomes
  `UNCERTAIN` (E-D09), not `PENDING`.
- Worker instance codes in `lease_owner` are ephemeral and non-secret, and never
  identify a person.

## 3.5 Provider idempotency and the retry rule

1. Where the provider supports an idempotency key, one is passed, derived
   server-side per attempt and stored as a protected digest.
2. The provider reference is **persisted before** any subsequent retry decision.
   Losing the reference and retrying is how duplicates become undetectable.
3. On an unknown outcome the attempt enters `UNCERTAIN` and the intent cannot
   produce another attempt until reconciliation resolves it.
4. Where the adapter's capability declaration lacks approved idempotency **and**
   approved uncertainty handling, automatic retry is **denied** entirely
   (T07-16). A capability test enforces this rather than a code review habit.
5. "Retry blind after timeout" has no code path. Its absence is proven by test,
   not asserted in a comment.

## 3.6 Race determinism

Each row states what must happen when the authority change lands in that window.
These are the races that produce improper sends, so each has a named test.

| Window | Cancellation / withdrawal / suppression / contact change lands | Required outcome |
|---|---|---|
| Before claim | Intent transitions to `CANCELLED`/`SUPPRESSED`; outbox cancelled. | Worker never claims it. Zero adapter calls. |
| After claim, before final recheck | Authority row committed. | The final recheck observes it; E-D05 denies; zero adapter calls. |
| After final recheck, before the adapter call begins | Committed microseconds later. | Send may occur. This window is irreducible; it is bounded by placing the recheck as late as possible (TB-07) and is **never** described as cancelled. |
| During the adapter call | Committed. | The in-flight call is not retracted. Outcome is recorded honestly; provider cancellation is attempt-only. |
| After provider acceptance, before local commit, then crash | Committed. | Attempt recovers as `UNCERTAIN`, not as retryable. Reconciliation determines what happened. |
| After a known terminal outcome | Committed. | Authority state updates; the past attempt is unchanged; no compensating message is generated. |

The third and fourth rows are the honest residual. The UI, the audit trail, and
any operator-facing surface must reflect them rather than claim a clean
cancellation.

## 3.7 Optimistic concurrency

Every state transition is a compare-and-set on `state_version` (or an equivalent
row lock inside a transaction). A transition whose predicate fails is not
retried into success — it re-reads and re-evaluates, and may legitimately become
a denial. Version numbers increase monotonically and are never reset.

## 3.8 Webhook idempotency and ordering

- Receipts are unique at the authenticated event level (`event_keyed_digest`);
  a duplicate is recorded `DUPLICATE` and mutates nothing.
- Replay outside the approved window is `REPLAY_DENIED`.
- Ordering uses conservative comparison; `provider_event_at` is never trusted
  alone. Where order cannot be established, `ordering_outcome = NOT_COMPARABLE`
  and the projection does not move.
- A webhook can never **create** a logical message, revive a cancelled intent,
  lift a suppression, or restore consent. It updates delivery evidence and may
  create suppression and review items.
- Unknown, unmatched, or unauthenticated events remain quarantined and never
  reach the projection.

# Part 4 — Scheduling

| Rule | Requirement |
|---|---|
| Authoritative origin | The schedule is computed from an authoritative source event plus approved cadence. Cadence is `UNRESOLVED(T07-D15)` and is never invented by the scheduler or the worker. |
| Absolute storage | Store absolute UTC instants **plus** the decision timezone, the quiet-hours policy version, and the pinned tz-data version. A local time alone is not a schedule. |
| Recalculation | A preference, timezone, policy, consent, or contact change recalculates pending items (Workstream D §3.6). Recalculation may defer, cancel, or expire; it never advances an item earlier than policy permits. |
| Stale cancellation | Appointment cancellation or reschedule, follow-up closure, consent withdrawal, contact supersession, template withdrawal, purpose retirement, and lifecycle/kill-switch change each cancel or supersede dependent pending messages. |
| Supersession over mutation | When an authoritative event changes, the historical logical message is superseded, never edited. |
| Usefulness expiry | Every intent carries `expires_at`, bounded by `source_useful_until`. Expiry denies rather than sending late. |
| Recovery is not permission | A worker that recovers after an outage does **not** flush overdue reminders. Each item re-runs the DAQ, and items whose useful window passed expire. |
| Unverifiable source | If the source event cannot be re-read and verified at dispatch, the message is not sent — `DENY(AUTHORITY_UNAVAILABLE)`. |

Backlog drain after an outage is the classic mass-incident: a queue of expired
reminders released at once, at the wrong local time, some to withdrawn consents.
Expiry-on-recovery plus the per-item DAQ is the structural answer, and the outage
soak test (WE-14) is where it is proven.

# Part 5 — Critical invariants

Each invariant names the mechanism that enforces it and the evidence that would
prove it. All evidence is **planned**; none has been executed.

| # | Invariant | Mechanism | Evidence |
|---|---|---|---|
| I-01 | Revoked, expired, superseded, or missing consent blocks dispatch. | DAQ consent term at all four recheck points. | WE-01 |
| I-02 | Unverified, disputed, superseded, or suppressed contact blocks dispatch. | DAQ contact and suppression terms. | WE-02 |
| I-03 | A worker crash cannot create two logical messages. | Unique idempotency scope at the database level; crash recovery never inserts a second intent. | WE-05 |
| I-04 | A provider timeout cannot trigger an unsafe duplicate. | `UNCERTAIN` blocks the retry path; retry denied where adapter idempotency is unproven. | WE-07, WE-08 |
| I-05 | A duplicate or replayed webhook cannot create a message. | Receipts are evidence-only; no creation path exists from the webhook role. | WE-10 |
| I-06 | A late `DELIVERED` event cannot revive a cancelled message. | Terminal intent states are terminal; delivery projection is separate and monotonic. | WE-11 |
| I-07 | A cancellation never claims to retract a delivered message. | E-I06 wording rules and §1.7 presentation mapping. | WE-12 |
| I-08 | Provider delivery does not mark a message read. | Delivery and acknowledgement are separate axes; no derivation. | WE-13 |
| I-09 | Open and link tracking are disabled by default and never treated as identity. | Adapter configuration default; architecture test denies the code path. | WE-13 |
| I-10 | No delivery event changes an appointment, follow-up, secure thread, assessment, virtual visit, or claim to completed. | Communications holds no write capability to those domains; database role grants exclude them. | WE-15 |
| I-11 | `UNKNOWN` fails closed and creates a safe reconciliation work item. | C2 and C7; E-I08 and E-R01. | WE-09 |

Invariant I-10 is the one that reaches outside Task 07: it is enforced by
capability, not by discipline. The worker, webhook, and reconciliation database
roles have no grants on assessment, follow-up, booking, or claim tables, so the
write is impossible rather than merely unwritten.

# Part 6 — Planned synthetic evidence — NOT RUN

Every item is a planned red/green pair against real PostgreSQL with synthetic
fixtures. None has been executed; none may be executed before T07-D02 and Task 11
Checkpoint 1.

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WE-01 | Consent valid at creation, then withdrawn/expired/superseded before each of claim, final recheck, and resend: adapter call count stays zero at every point. | Unchanged authority produces exactly one attempt. |
| WE-02 | Contact unverified, disputed, superseded, or suppressed at each recheck point denies. | Verified, active, unsuppressed contact permits one attempt. |
| WE-03 | Two workers race for one outbox row; concurrent inserts race for one idempotency scope. | Exactly one claim and exactly one intent survive; the loser's result is deterministic. |
| WE-04 | Lease expiry during an in-flight adapter call does not permit a second dispatch. | Reaper inspects attempt state and produces `UNCERTAIN`, not `PENDING`. |
| WE-05 | Crash injected before send, during send, after provider acceptance, and after acceptance but before commit — none produces two logical messages. | Recovery classifies each case correctly and idempotently. |
| WE-06 | An authority-denied attempt is never classified `FAILED_RETRYABLE`. | Retryable classification applies only to evidenced transport failures. |
| WE-07 | Timeout-after-acceptance fixture never auto-retries. | The attempt enters `UNCERTAIN` and opens a reconciliation case. |
| WE-08 | An adapter declaring no idempotency and no uncertainty handling cannot retry at all. | A capability-complete adapter retries only within approved bounds. |
| WE-09 | Every `UNKNOWN` axis value denies dispatch and produces a work item; none sits silent. | Resolution clears the item with a safe outcome. |
| WE-10 | Duplicate, replayed, reordered, malformed, oversized, unsigned, and wrong-account webhooks create no message and mutate no projection. | A first-seen authenticated in-order event advances the projection once. |
| WE-11 | A `DELIVERED` event arriving after cancellation, expiry, or suppression revives nothing and schedules nothing. | Delivery evidence is recorded against the historical attempt only. |
| WE-12 | No surface, metric, or export renders a cancelled-but-accepted message as "not delivered". | Wording matches the §1.7 mapping under snapshot test. |
| WE-13 | No code path derives readership from a delivery event; open/click tracking is off and its enablement is denied by architecture test. | Delivery status renders with approved non-promissory wording. |
| WE-14 | Provider outage soak: backlog does not flush on recovery; expired items expire; no retry storm; kill switch halts and recovery is operator-controlled. | Queue-age, retry, and dead-letter metrics carry safe labels only. |
| WE-15 | Communications database roles cannot write assessment, follow-up, booking, visit, or claim state — proven by attempted writes failing on grants. | Clinical and billing state is unchanged across the entire suite. |
| WE-16 | An invalid transition on any axis changes nothing and is audited as invalid. | Every legal transition commits its audit event atomically; a forced audit failure rolls back the business row. |
| WE-17 | Recalculation after preference/timezone change never advances an item earlier than policy permits and never resurrects a terminal item. | Repeated recalculation is idempotent. |
| WE-18 | Reconciliation cannot be closed as `RECONCILED_SENT`/`NOT_SENT` without bound evidence. | `RECONCILED_UNRESOLVED` is recordable as a terminal answer and survives correction attempts as superseded history. |

# Part 7 — Unresolved decisions blocking implementation

| ID | Decision | Blocks in this document |
|---|---|---|
| T07-D02 | Task 07 scope, owners, risk/autonomy tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D03/D04 | Task 04 appointment event contract; follow-up event handoff | Part 4 scheduling origin, E-I01 producer allowlist |
| T07-D15 | Cadence, maximum attempts, useful-until, backoff, source-event materiality | E-D07, E-D10, §3.2, Part 4 |
| T07-D16 | Quiet hours, timezone, DST, overdue handling | E-I02, E-I03, Part 4 |
| T07-D18 | Status wording and template/copy review | §1.7 presentation mapping |
| T07-D34 | Webhook signature, replay, ordering semantics | §3.8, E-V05, E-V06 |
| T07-D35 | Provider outcome semantics, idempotency support, cancellation API | §3.5, E-D06–E-D13 |
| T07-D36 | Outage, duplicate, and delayed-event runbooks | Part 4 recovery, WE-14 |
| T07-D37 | SLI/SLO and queue-age targets | Metrics in WE-14 |
| T07-D38 | Named operations ownership for reconciliation | E-R02–E-R04 |
| T07-D39 | Kill switch, lease duration, delayed-work invalidation | E-D02, §3.4 |
| T07-D27 | Record classification and retention for intents, attempts, receipts, cases | Retention of every table above |

## Workstream E acceptance check

- The real guarantee is stated: duplicate resistance with a named residual
  window, not exactly-once delivery. No document, surface, or metric claims
  otherwise.
- Four orthogonal axes are modelled with the exact values the brief requires;
  no generic status column combines them, and cross-axis derivation is forbidden.
- Legal-combination invariants C1–C8 constrain the axes without collapsing them.
- Required user-facing concepts map to axis values with explicit prohibitions on
  overstated wording.
- Every transition documents source, destination, actor, guards, consent/contact
  checks, quiet-hours/expiry checks, source validity, idempotency, lease and
  concurrency, provider behaviour, audit event, work-item effect, and invalid
  transition behaviour.
- Idempotency keys are server-derived from non-PHI references, enforced by
  database uniqueness, and versioned.
- Repeated source events resolve deterministically; material change supersedes
  rather than mutates.
- Claiming is atomic; lease expiry never authorizes blind re-dispatch; an
  in-flight attempt recovers as `UNCERTAIN`.
- Provider references are preserved before retry decisions; unknown outcomes
  reconcile before any retry; blind retry after timeout has no code path.
- Race determinism is specified for every window, including the two irreducible
  ones, which are documented rather than hidden.
- Webhook processing is idempotent and cannot move state backward, create a
  message, or restore authority.
- Scheduling uses absolute UTC plus decision timezone and policy version,
  cancels stale work, enforces usefulness expiry, and does not flush a backlog on
  recovery.
- All eleven brief invariants have a named mechanism and a named planned test;
  the clinical/billing invariant is enforced by database grants rather than
  discipline.
- No cadence, retry bound, lease duration, backoff, window, or status wording was
  invented.
- No schema, migration, runtime code, provider, credential, recipient, PHI, or
  network effect was added.

## Current disposition

**Workstream E outbox and delivery state machine: complete as design
documentation.**

- **Outbox idempotency model:** PASS as documentation; BLOCKED on T07-D15,
  T07-D35, T07-D39.
- **Dispatch race handling:** PASS as documentation; the two irreducible windows
  are documented, not eliminated.
- **Provider uncertainty and reconciliation model:** PASS as documentation;
  BLOCKED on T07-D34, T07-D35, T07-D36, T07-D38.
- **Synthetic evidence (WE-01–WE-18):** NOT RUN.
- **Real PHI, contact data, recipients, providers, or external delivery:** NO.
- **Production schema, authentication, or vendor changed:** NO.

The next safe repository slice is Workstream F — the minimal-payload template
catalogue — as documentation. Runnable synthetic implementation remains
**BLOCKED** pending T07-D02 and Task 11 Checkpoint 1. Pilot and production remain
separately blocked by all applicable G1–G6 decisions.
