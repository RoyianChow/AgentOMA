# Task 07 — Appointment, Follow-up, and Task 06 Integration

**Workstream:** I — producer boundaries for appointments, follow-ups, and
Task 06 secure messaging

**Prepared:** 2026-08-06

**Repository design baseline:** `97ae914649d41cc98859f1eaa9cfc988f5cb123a`

**Migration/runtime effect:** none

**Production approval:** not granted

## Decision summary

This document defines how Task 07 consumes work from three authoritative
producers — the Task 04 appointment service, the existing production follow-up
service, and Task 06 virtual care — without ever becoming one.

The single rule underneath everything below: **communications is a consumer.**
It reads a committed, versioned source event, decides whether a notification is
authorized, and records what happened. It never creates, confirms, cancels,
reschedules, completes, or closes anything in the producing domain, and no
delivery, read, reply, or timeout event may do so on its behalf.

This document adds no TypeScript, SQL, schema, endpoint, worker, or runtime
effect, and it enables no notification. It selects no cadence, timing, or
professional value.

## Verified current state

Checked at the baseline commit rather than repeated from other documents:

| Claim | Evidence |
|---|---|
| The production follow-up feature sends no notification | `src/lib/follow-ups.ts` exports only `listFollowUps`, `recordFollowUpAttempt`, and `supersedeFollowUp`. There is no dispatch, queue, or provider path. |
| No provider SDK exists in the application | No email, SMS, push, or messaging vendor reference appears anywhere in `src/`. |
| No outbound network call exists in the application | The only `fetch` in `src/` is a same-origin `/logo.png` read in `src/lib/self-check/pdf.ts` for PDF rendering. |
| No appointment runtime exists | There is no appointment module in `src/`; Task 04 remains specification and a synthetic approval record. |

So "keep the follow-up notification feature disabled" is, today, a matter of not
building one. That is the cheapest moment to write the boundary down.

## Authoritative ownership

| Fact or transition | Owner | Task 07 may | Task 07 must never |
|---|---|---|---|
| Appointment state, capacity, waitlist | Task 04 | Consume a versioned event; cancel its own stale intents | Create, confirm, cancel, reschedule, promote, or complete a booking |
| Follow-up plan, attempt, completion | Existing follow-up service | Create an approved reminder intent from a due source fact | Mark attempted, reached, or resolved; close a follow-up |
| Virtual-care suitability, participants, professional judgement | Task 06 | Enforce the current decision | Automate, infer, or re-derive it |
| Assessment and clinical documentation | Assessment service | Nothing | Any write |
| Claim eligibility, code selection, submission | Existing billing service | Nothing | Any write, any derivation |

# Part 1 — Appointment reminders

**Status: BLOCKED.** No appointment runtime is integrated on `main`, and the
Task 04 synthetic scope carried a recorded review/expiry date of 2026-08-05 that
has now passed (`T07-D03`). Nothing in this section may be built until Task 04
renews its authority and publishes a versioned event contract.

## 1.1 Required event contract

Task 07 consumes only authoritative appointment events. The minimum shape it
needs from Task 04 — to be agreed with that owner, not assumed:

| Field | Purpose |
|---|---|
| Opaque appointment reference | Identity, with no scheduling detail encoded in it |
| Source version | Detects change between scheduling and dispatch |
| State | Booked, rescheduled, cancelled, completed |
| Useful-until instant | Latest moment a reminder still helps; supplied by the producer, never invented by the worker |
| Cancellation or supersession marker | Drives stale-intent cancellation |
| Subject and custodian references | Authorization linkage |

Notably absent by design: appointment purpose, service type, clinician, location,
and time. Task 07 does not need them to send an approved generic notice, so it
does not receive them.

## 1.2 Rules

| Rule | Implementation |
|---|---|
| Only authoritative events | Intents are created from a committed Task 04 event, never from a client request, a patient action, or an inference. |
| Verify the current version before dispatch | The source term of the dispatch-authority query re-reads appointment state and version at dispatch. A version change makes the pending intent stale. |
| Never infer cadence or timing | Cadence, lead time, and maximum attempts come from approved policy (`T07-D15`). A worker that "reasonably" picks 24 hours has invented clinical-adjacent policy. |
| Cancel and supersede on reschedule or cancellation | See §1.3. |
| No appointment purpose externally | Enforced structurally: purpose is not in the event contract, and the external template has no placeholder that could carry it (Workstream F). |
| No unsecured reply may confirm, cancel, or alter an appointment | There is **no inbound action path**. An SMS reply of "YES" changes nothing. This is not a parsing decision; the capability does not exist. |
| Direct to the authenticated portal | The generic notice carries only the portal entry URL and an instruction to sign in. |
| No pre-authentication disclosure | Nothing about another participant, pharmacist, pharmacy, assessment, or clinical service appears before the patient authenticates. |

The "no unsecured reply" rule deserves emphasis because the convenience pressure
is real and constant. Confirm-by-SMS is a normal product feature elsewhere. Here
it would mean an unauthenticated party in possession of a phone could alter a
health appointment, and the reply itself would arrive on a channel that cannot
hold PHI.

## 1.3 Source change → reminder effect

| Source change | Effect on pending reminders |
|---|---|
| Rescheduled | Existing intents cancelled; a new logical message may be created from the new event version, subject to the full authority query. Never edited in place. |
| Cancelled | Intents cancelled with a safe reason; no "your appointment was cancelled" notice unless an approved template and policy exist for it (Workstream F, class F-03, itself blocked). |
| Completed | Reminders expire; no post-hoc notice. |
| Useful-until passed | Intent expires rather than sending late. |
| Event unverifiable at dispatch | `DENY(AUTHORITY_UNAVAILABLE)`. Silence is the correct outcome. |

# Part 2 — Follow-up reminders

**Status: BLOCKED for delivery** (`T07-D04`). The follow-up workflow itself is
live and authoritative through migration 0017; what stays disabled is any
notification derived from it.

## 2.1 Keep disabled means keep unbuilt

"Disabled" here is the absence of a code path, not a flag set to false. There is
no dispatcher, no queue, no provider, and no template wired to follow-ups, and
none is added by this task. A feature flag guarding a built notification path
would be a weaker guarantee — flags get flipped in incidents, by configuration
drift, or by someone testing in the wrong environment.

Until consent, template, provider, privacy, professional, and release gates all
pass, only **synthetic** follow-up events may drive any prototype, inside the
Task 01 boundary.

## 2.2 Content boundary

Never in an external notification: the ailment, medication, treatment, red flag,
assessment result, or the reason for follow-up.

This is the same structural defence as appointments — the external template
declares no placeholder capable of carrying any of them, so it is a publication
error rather than a runtime risk. The follow-up event handed to communications
carries an opaque reference and a due fact, not a clinical narrative.

## 2.3 Dispatch-time rechecks

Beyond the standard authority query, a follow-up reminder additionally re-reads:

- that the follow-up is **still open** — a resolved follow-up produces no
  reminder;
- that it belongs to the **same subject**; and
- that it belongs to the **same custodian**.

Obsolete reminders expire or are cancelled with a safe reason.

## 2.4 Delivery is not follow-up

The most consequential rule in this workstream:

> Reminder delivery is never evidence that follow-up occurred.

The EO Notice places a follow-up duty on the pharmacist, and that duty is
discharged by professional contact and documentation — not by a message leaving
a queue. A `DELIVERED` webhook says a carrier accepted a generic notice. It does
not say the patient read it, understood it, was reached, or was followed up with.

Consequences that must hold in code and UI:

| Prohibited | Because |
|---|---|
| A delivery event marking a follow-up attempted or reached | `recordFollowUpAttempt` is a pharmacist action about a professional contact. |
| A delivery event resolving or closing a follow-up | Communications has no write path to follow-up state. |
| A dashboard implying "reminded" satisfies "followed up" | It converts a transport fact into a professional one. |
| Counting reminders as follow-up compliance evidence | It would produce a defensible-looking record of care that did not happen. |

## 2.5 No AI urgency, and what replaces it

A missed, undelivered, or unanswered reminder must never be classified as
clinically urgent by AI, NLP, keyword rules, or scoring. Non-response is not a
clinical signal — a patient may have read it, be fine, have changed numbers, or
never have received it, and the system cannot distinguish those.

Where approved policy requires human follow-up, the system creates a **safe staff
work item**: opaque references, a safe reason code, an operational due time, and
no clinical content or inferred priority. A human decides what it means.

# Part 3 — Task 06 secure messaging

**Status: BLOCKED** (`T07-D06`). No Task 06 runtime or contract is integrated on
`main`, and another developer owns that workstream.

| Rule | Implementation |
|---|---|
| Reuse Task 06's decision | Professional-modality consent and suitability are **read** from Task 06 at every relevant action. Task 07 never re-derives, caches as authoritative, or infers them. |
| Preserve every distinction | Patient, subject, delegate, participant, pharmacist, custodian, visit, and assessment remain separate concepts. None is collapsed into another for convenience of a query or a UI. |
| Recheck participant authorization before every message | Not at thread open — before **every** message, per the Workstream H matrix. |
| External notices stay generic stubs | Until production approval, a Task 06-related external notice is the same generic "sign in" notice as everything else, and carries no thread, participant, visit, or purpose reference. |
| A delivery receipt satisfies nothing in Task 06 | An external receipt is not Task 06 message delivery, acknowledgement, documentation, or completion. Those are Task 06 facts with their own evidence. |
| No bypass | No Task 07 event may bypass Task 06 identity, location, consent, participant, privacy, suitability, expiry, or release gates. Task 07 is downstream of every one of them. |
| Assessment and claim services stay authoritative | Unchanged, and unreachable from here. |

# Part 4 — The no-write-path guarantee

Every prohibition above is enforced by **capability**, not by convention. The
communications database roles — orchestration, worker, webhook, reconciliation,
secure-content — hold no grants on appointment, follow-up, visit, assessment, or
claim tables. The writes are impossible, not merely unwritten.

This matters because the prohibitions are individually reasonable-sounding to
violate. "Just mark the follow-up as attempted when the SMS delivers" is a
one-line change that would produce a false professional record. A grant that does
not exist cannot be talked into existing during a busy sprint.

# Part 5 — Cross-producer staleness matrix

One table, because these are the races that produce a wrong send.

| Change | Appointment reminders | Follow-up reminders | Task 06 notices |
|---|---|---|---|
| Source version changed | Stale → cancel or supersede | Stale → recheck open state | Stale → recheck participant/suitability |
| Source cancelled or closed | Cancel pending | Cancel pending | Cancel pending |
| Useful-until passed | Expire | Expire | Expire |
| Consent withdrawn | Cancel; no send | Cancel; no send | Cancel; thread pauses (Workstream H) |
| Contact superseded | Cancel; old destination suppressed | Same | Same |
| Suppression created | Deny at every recheck | Same | Same |
| Template or translation withdrawn | Deny | Deny | Deny |
| Task 06 suitability withdrawn | n/a | n/a | Deny; route to approved alternative |
| Kill switch or lifecycle revision change | Deny | Deny | Deny |
| Producer unreachable at dispatch | `DENY(AUTHORITY_UNAVAILABLE)` | Same | Same |

In every row the failure direction is the same: **do not send.** There is no row
whose safe answer is to proceed on cached state.

# Part 6 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WI-01 | An appointment reminder created from a non-authoritative source — client request, patient action, inference — is impossible. | Only a committed, versioned producer event creates an intent. |
| WI-02 | A reschedule, cancellation, or completion between scheduling and dispatch cancels or expires the pending reminder; zero adapter calls. | A still-current appointment dispatches once. |
| WI-03 | No worker or scheduler supplies cadence, lead time, or attempt maximum absent an approved policy. | Approved policy values drive scheduling deterministically. |
| WI-04 | Appointment purpose, service type, clinician, location, and time cannot reach an external payload — no event field and no template placeholder carries them. | Generic notice renders with the portal URL only. |
| WI-05 | No inbound path exists by which a reply can confirm, cancel, or alter an appointment. | Inbound handling is limited to approved deterministic opt-out. |
| WI-06 | Nothing about another participant, pharmacist, pharmacy, assessment, or service is disclosed before authentication. | Details appear only after portal sign-in. |
| WI-07 | No production follow-up notification path exists; a synthetic prototype cannot reach a real recipient. | Synthetic follow-up events drive synthetic dispatch inside Task 01 only. |
| WI-08 | Ailment, medication, treatment, red flag, assessment result, and follow-up reason never reach an external payload. | Canary scan passes with all six planted. |
| WI-09 | A resolved follow-up, a subject mismatch, or a custodian mismatch each deny at dispatch. | An open, matching follow-up dispatches once. |
| WI-10 | No delivery, read, or webhook event marks a follow-up attempted, reached, resolved, or closed — proven by absent grants. | Follow-up state changes only through the pharmacist workflow. |
| WI-11 | No UI, export, metric, or report presents reminder delivery as follow-up completion or compliance. | Wording snapshots keep the two facts visibly separate. |
| WI-12 | A missed or unanswered reminder is never classified urgent; model and keyword imports are denied by architecture test. | Approved policy creates a body-free staff work item instead. |
| WI-13 | A Task 07 event cannot bypass Task 06 identity, location, consent, participant, privacy, suitability, expiry, or release gates. | Task 06 decisions are read and enforced, never re-derived. |
| WI-14 | An external delivery receipt never satisfies Task 06 delivery, acknowledgement, documentation, or completion. | Task 06 facts carry their own evidence. |
| WI-15 | Communications roles cannot write appointment, follow-up, visit, assessment, or claim tables — proven by attempted writes failing on grants. | Producer state is unchanged across the whole suite. |

# Part 7 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D03 | Task 04 appointment event contract, and renewal of its lapsed review/expiry date | All of Part 1 |
| T07-D04 | Follow-up event handoff contract | All of Part 2 |
| T07-D06 | Task 06 modality, suitability, participant, professional contract | All of Part 3 |
| T07-D15 | Cadence, lead time, maximum attempts, useful-until | §1.2, §2.3 |
| T07-D18 | Template copy for appointment and follow-up classes | §1.2, §2.2 |
| T07-D20 | Response expectations and staff work-item targets | §2.5 |
| T07-D27 | Record classification for reminder and attempt evidence | Retention of all three producers' communication records |

## Workstream I acceptance check

- Task 07 is defined strictly as a consumer, with authoritative ownership stated
  per fact and per transition.
- Appointment reminders consume only authoritative events, verify the current
  version at dispatch, take cadence from approved policy, and cancel or supersede
  on reschedule and cancellation.
- Appointment purpose is excluded structurally — absent from the event contract
  and from every template placeholder.
- No inbound path can confirm, cancel, or alter an appointment; the capability
  does not exist rather than being parsed and rejected.
- Patients are directed to the authenticated portal, with no pre-authentication
  disclosure of participants, pharmacists, pharmacy, assessment, or service.
- The production follow-up notification feature stays disabled by remaining
  unbuilt, verified against the repository rather than asserted.
- Only synthetic follow-up events may drive a prototype, inside Task 01.
- Clinical content is excluded from external follow-up notices structurally.
- Follow-up dispatch rechecks open state, subject, and custodian; obsolete
  reminders expire or cancel.
- Reminder delivery is never evidence that follow-up occurred, with the
  consequences enumerated for code and UI.
- No AI decides that a missed or unanswered reminder is urgent; approved policy
  produces a body-free staff work item instead.
- Task 06 consent and suitability are reused, never re-derived; every distinction
  is preserved; participant authorization is rechecked before every message.
- External receipts satisfy nothing in Task 06, and no Task 07 event bypasses a
  Task 06 gate.
- Assessment and claim services remain authoritative and unreachable.
- Every prohibition is enforced by database grants rather than convention.
- No cadence, timing, wording, or professional value was invented.
- No schema, migration, runtime code, notification path, recipient, PHI, or
  network effect was added.

## Current disposition

**Appointment, follow-up, and Task 06 integration: complete as design
documentation.**

- **Task 04 appointment integration:** BLOCKED — no runtime on `main`, and the
  recorded Task 04 review/expiry date of 2026-08-05 has passed.
- **Follow-up integration:** BLOCKED for delivery; the production feature remains
  unbuilt as a notification path, verified at this baseline.
- **Task 06 secure-messaging integration:** BLOCKED — no contract on `main`.
- **Synthetic evidence (WI-01–WI-15):** NOT RUN.
- **Production follow-up notification enabled:** NO.
- **Real PHI, recipients, providers, or external delivery:** NO.
- **Assessments completed by communications:** NO. **Claims created or
  submitted:** NO.

The next safe repository slice is Workstream J — privacy, security, audit, and
retention — as documentation. Runnable synthetic implementation remains
**BLOCKED** pending T07-D02 and Task 11 Checkpoint 1. Pilot and production remain
separately blocked by all applicable G1–G6 decisions.
