# Task 07 — Reply and Review Queue Design

**Workstream:** H — queue routing, external-reply handling, and queue metadata
boundaries

**Prepared:** 2026-08-06

**Repository design baseline:** `73e397105a91f0f3e6f32695746767131d4adc27`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companions:** [`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md) ·
[`secure-message-authorization-matrix.md`](secure-message-authorization-matrix.md)

## Decision summary

This document defines how a patient contribution reaches an authorized human,
and what that human's queue is permitted to know.

Two rules do most of the work:

1. **Routing comes from trusted structural signals, never from content.** Thread
   type, participant role, assignment, and explicit staff action decide where
   something goes. No AI, NLP, keyword scoring, sentiment analysis, or diagnostic
   rule ever decides urgency or clinical priority.
2. **The queue never carries the body.** A work item is opaque references, a safe
   category, and a state. It is not a preview pane.

The temptation this design refuses is obvious and worth naming: a keyword scan
that surfaces "chest pain" to the top of a queue looks like a safety feature. It
is not. It creates an implicit triage promise the system cannot keep, it fails
silently on phrasing it does not recognize, and it substitutes a model's judgment
for a pharmacist's. The safe answer is a channel that honestly says it is not
monitored continuously, plus a visible urgent alternative the patient chooses.

This document adds no TypeScript, SQL, schema, route, or runtime effect.

# Part 1 — Routing signals

## 1.1 Permitted

| Signal | Use |
|---|---|
| Thread type | Determines which queue family an item belongs to. |
| Participant role | Distinguishes patient, delegate, and staff contributions. |
| Assignment | Routes to the owning pharmacist or role where one exists. |
| Explicit staff action | A human moving, reclassifying, or escalating an item — recorded as their action. |
| Patient-selected administrative category | **May inform** routing. It can never override pharmacist review where policy requires it, and it is never treated as a clinical statement. |
| Thread and item state | `WAITING_FOR_PHARMACIST_REVIEW` versus administrative states. |
| Age and operational due time | Ordering and ageing only — see §1.3. |

## 1.2 Prohibited

| Prohibited | Why |
|---|---|
| AI, NLP, LLM, embedding, or classifier over message content | Substitutes a model's judgment for a professional's (P15, T07-32). |
| Keyword scoring or regex urgency rules | Same failure with worse recall, and it fails silently on unfamiliar phrasing. |
| Sentiment or distress detection | Not a clinical instrument, and wrong in both directions. |
| Diagnostic rules over free text | Clinical inference, which communications never performs. |
| Any ordering derived from content | Content-derived priority is triage under another name. |

An architecture test must deny model, classifier, and keyword-routing imports in
this code path. Relying on reviewers to notice a "small heuristic" later is how
this rule erodes.

## 1.3 Operational state is not clinical state

Queue axes must never collapse:

| Operational fact | Never means |
|---|---|
| Overdue | Urgent. |
| Waiting longest | Most serious. |
| Unclassified | Low priority. |
| Ready for review | Clinically actionable. |
| High volume from one thread | Escalation. |

Ageing and due times are operational service targets (`UNRESOLVED(T07-D37)`),
shown as such. A queue that sorts by age is sorting by age — and the UI must not
imply otherwise through colour, iconography, or wording.

## 1.4 The unclassified queue

Anything that cannot be routed by a trusted signal enters a **protected
unclassified queue** for authorized human review. It is not:

- guessed at by content;
- silently dropped;
- auto-closed by age; or
- left to sit with no owner.

Ambiguity produces human review, never an inference. The unclassified queue needs
a named owner (`UNRESOLVED(T07-D38)`) — an unowned queue is an abandonment
waiting to happen (T07-39).

# Part 2 — Queue metadata boundary

A work item carries:

| Permitted | Prohibited |
|---|---|
| Opaque references (thread, item, subject where needed for server authorization) | Message body or any excerpt |
| Safe work-type and reason codes | Ailment, symptom, medication, allergy, diagnosis |
| Administrative category (patient-selected, marked as such) | Clinical summary or interpretation |
| State, assignment, role | Appointment purpose or service type |
| Created, claimed, due, completed timestamps | Contact values or destinations |
| Concurrency token | Provider payloads, raw errors, free text |

Additional rules:

- The subject reference exists for **server-side authorization**, and is not sent
  as a client prop in a list view unless the view genuinely needs it.
- Metric labels exclude high-cardinality identifiers — patient, thread, message,
  contact, provider.
- Staff open content only by navigating into the secure thread, through the
  authorization boundary, where it is audited as a content access. The queue is
  never a shortcut around that.
- Queue notifications outside the portal remain **generic**: a sign-in prompt and
  nothing else. No count that reveals volume about a person, no category, no
  patient reference.

# Part 3 — External replies

External channels are notification-only. A patient replying to a generic SMS or
email is replying to a channel that was never designed to receive health
information — and some will do it anyway.

## 3.1 Template instruction

Approved external templates instruct recipients not to reply with health
information and to use the secure portal instead. Wording is
`UNRESOLVED(T07-D18)`; the requirement that such an instruction exists is not.

## 3.2 Opt-out

Exact approved opt-out commands are processed **deterministically** — an explicit
documented set, evaluated by exact rules. Everything else goes to human review.
No classifier, no fuzzy matching, no "probably meant stop." The accepted set is
`UNRESOLVED(T07-D14/T07-D22)`.

## 3.3 Inbound free text — two permitted postures

| Posture | Requirement |
|---|---|
| **Disabled** (safety floor, and the current position) | Inbound free-text handling is off. Only provider-managed opt-out events are processed. Anything else is discarded at the boundary without being stored, logged, or forwarded. |
| **Enabled**, only if production policy approves secure inbound storage and review | The reply is isolated as **PHI-capable content** in the secure-content domain, and a **body-free** protected work item is created for authorized human review. |

There is no third posture. Inbound free text is either properly contained as PHI
or not accepted at all. What must never happen is the middle path — free text
sitting in a provider inbox, a shared mailbox, or a log because nobody decided.

## 3.4 Never forward

An external reply is never forwarded into ordinary email, Slack, Teams, ticketing
systems, application logs, analytics, error reporting, or any general-purpose
tool. Each of those is an uncontrolled disclosure with no retention rule, no
access control, and no audit.

## 3.5 Wrong-number reporters

Never confirm a patient relationship to someone reporting a wrong number.

The response acknowledges the report and stops. It does not confirm or deny that
a person is a patient, does not name the pharmacy's relationship to anyone, does
not ask for identifying details about the intended recipient, and does not
explain what the original message was about. The report is enough to suppress
(`WRONG_RECIPIENT`) and to open the privacy path (`T07-D28`) — confirmation adds
nothing operationally and discloses the exact fact the design exists to protect.

# Part 4 — Assignment and ownership

| Rule | Requirement |
|---|---|
| Concurrency-safe claim | Assignment is a conditional update on state and version. Two staff cannot both hold an item; the loser sees a clear, non-destructive result. |
| Reassignment is audited | Every assignment change versions the item and appends audit evidence. |
| Named ownership | Every queue has a named owner and coverage expectation (`UNRESOLVED(T07-D38)`). |
| Ageing is visible, not alarming | Ageing surfaces operationally with safe labels; it never implies clinical deterioration. |
| Abandonment is detectable | Queue age, backlog, and unassigned counts are monitored with content-free labels (D05), because the realistic failure here is a queue nobody watches (T07-39). |

# Part 5 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WH-B01 | Model, classifier, and keyword-routing imports are denied by architecture test in the routing path. | Routing decisions derive only from trusted structural signals. |
| WH-B02 | No ordering, colour, icon, or wording implies clinical priority from content or age. | Queue ordering is provably operational and neutral. |
| WH-B03 | A patient-selected administrative category never overrides required pharmacist review. | It informs routing only, and is labelled as patient-selected. |
| WH-B04 | An unroutable item never guesses, drops, or auto-closes; it enters the protected unclassified queue with an owner. | Human review resolves it with a safe outcome. |
| WH-B05 | Body, excerpt, ailment, medication, clinical summary, appointment purpose, and contact values never appear in queue metadata, list props, or metric labels. | Queue views render from safe fields only. |
| WH-B06 | Opening content from a queue always traverses the thread authorization boundary and is audited as content access. | No shortcut path exists. |
| WH-B07 | External queue notifications carry no count, category, or reference about a person. | Generic sign-in notice only. |
| WH-B08 | Ambiguous inbound text is never auto-classified as opt-out; only exact approved commands match. | Approved commands map deterministically to suppression. |
| WH-B09 | With inbound free text disabled, a reply is discarded at the boundary and is not stored, logged, or forwarded. | Provider-managed opt-out events still process. |
| WH-B10 | With inbound free text enabled, a planted PHI canary reaches only the secure-content domain; the work item is body-free. | Authorized human review sees content only through the secure boundary. |
| WH-B11 | No path forwards an external reply to email, Slack, Teams, ticketing, logs, analytics, or error reporting. | Containment holds under failure paths too. |
| WH-B12 | A wrong-number responder receives no confirmation, denial, or detail about any patient relationship. | Suppression and the privacy path still trigger. |
| WH-B13 | Two staff racing for assignment: exactly one wins; reassignment is versioned and audited. | The loser's view updates without data loss. |
| WH-B14 | Queue ageing and backlog metrics carry no high-cardinality identifier. | Abandonment is detectable from safe labels alone. |

# Part 6 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D05 | Task 05 identity and delegate model | Participant-role routing |
| T07-D06 | Task 06 professional contract | Pharmacist-review routing |
| T07-D14 | Opt-out granularity and accepted signals | §3.2 |
| T07-D18 | External template instruction wording | §3.1 |
| T07-D20 | Response expectations and review targets | §1.3, Part 4 |
| T07-D22 | CASL classification | §3.2 |
| T07-D28 | Wrong-recipient and privacy-breach runbook | §3.5 |
| T07-D37 | SLI/SLO, queue-age, and backlog targets | §1.3, Part 4 |
| T07-D38 | Named queue ownership, coverage, escalation | §1.4, Part 4 |
| — | Whether inbound free text is permitted at all | §3.3; safety floor is disabled |

## Workstream H acceptance check — reply and review queues

- Routing uses only thread type, participant role, assignment, explicit staff
  action, and a clearly-labelled patient-selected administrative category.
- AI, NLP, keyword scoring, sentiment analysis, and diagnostic rules are
  prohibited and denied by architecture test, not by convention.
- Operational and clinical axes never collapse; overdue never means urgent.
- Ambiguous items enter a protected, owned, unclassified queue for human review.
- Queue metadata excludes body, excerpt, ailment, medication, clinical summary,
  appointment purpose, contact values, and provider payloads.
- Content is reachable only through the thread authorization boundary, audited as
  content access.
- External queue notifications are generic.
- External templates instruct recipients not to reply with health information.
- Opt-out processing is deterministic; ambiguity goes to humans.
- Inbound free text is either properly contained as PHI-capable content with a
  body-free work item, or disabled — with disabled as the safety floor.
- External replies are never forwarded into general-purpose tooling.
- A wrong-number reporter is never told whether a patient relationship exists.
- Assignment is concurrency-safe, audited, and owned; abandonment is detectable
  from content-free metrics.
- No wording, threshold, keyword list, or service target was invented.
- No schema, migration, runtime code, route, recipient, PHI, or network effect
  was added.

## Current disposition

**Reply and review queue design: complete as design documentation.**

- **Administrative queue model:** PASS as documentation.
- **Pharmacist-review queue model:** PASS as documentation; BLOCKED on T07-D06
  and T07-D38.
- **AI urgency classification:** DISABLED by design and by required architecture
  test.
- **Inbound free text:** DISABLED as the safety floor; enabling requires an
  approved secure inbound storage and review decision.
- **Synthetic evidence (WH-B01–WH-B14):** NOT RUN.
- **Real PHI, recipients, providers, or external delivery:** NO.
