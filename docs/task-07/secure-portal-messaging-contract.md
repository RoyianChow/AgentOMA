# Task 07 — Secure Portal Messaging Contract

**Workstream:** H — thread eligibility, lifecycle, participant experience,
message integrity, and the clinical boundary

**Prepared:** 2026-08-06

**Repository design baseline:** `73e397105a91f0f3e6f32695746767131d4adc27`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companions:** [`reply-and-review-queue-design.md`](reply-and-review-queue-design.md) ·
[`secure-message-authorization-matrix.md`](secure-message-authorization-matrix.md)

## Decision summary

Secure portal messaging is the only PHI-capable surface in Task 07. Everything
else in this workstream family exists to keep clinical content *out* of external
channels; this document specifies the one place such content may live.

It is a **professional communication modality, not consumer chat.** That framing
is not decoration — it decides the design. Consumer chat implies continuous
attention, immediate response, typing indicators, and read receipts that mean
someone read it. A professional asynchronous channel implies none of those, and
implying them to a patient with a health concern is a safety problem, not a UX
shortfall.

This document adds no TypeScript, SQL, schema, route, endpoint, or runtime
effect. **No prototype is built here.** Task 05 patient identity (`T07-D05`) and
the Task 06 professional contract (`T07-D06`) are both absent from `main`, so
every flow below is a contract to satisfy, not a capability to implement now.

## A scope conflict this document surfaces

`AGENTS.md` invariant 2 states that the patient intake collects **zero PHI**, and
its transient-PHI clause contemplates PHI only inside an authenticated pharmacist
form. This workstream introduces an authenticated **patient-side** surface that
holds PHI by design.

Per the program's known-conflict rule, this is surfaced rather than resolved. The
reading this document works under, and which the lead must confirm:

- the zero-PHI invariant governs the **public** minor-ailment intake and
  self-check, which remain unchanged and out of scope here;
- authenticated patient surfaces introduced by Tasks 04–08 are new territory that
  the invariant's wording predates; and
- the rescoping decision belongs to the product lead, not to this document.

Nothing here weakens the public intake. If the lead decides the invariant extends
to authenticated patient surfaces as written, this entire workstream stops.

# Part 1 — Thread eligibility

Before a thread is opened, and before its first message is released, the server
verifies **all** of the following. Any missing, stale, unknown, or contradictory
term denies.

| # | Check | Authority | Absent today |
|---|---|---|---|
| 1 | Valid authenticated session | Task 05 patient domain / staff auth | Patient domain absent |
| 2 | Correct audience and actor type | Task 05 | Absent |
| 3 | Active, non-revoked account and session | Task 05 | Absent |
| 4 | Actor-to-subject relationship | Task 05 | Absent |
| 5 | Delegate grant — current scope, expiry, revocation | Task 05 | Absent |
| 6 | Custodian, pharmacy, and tenant scope | Server-derived `PHARMACY_ID` | Present |
| 7 | Thread assignment and participant authorization | This contract | Not implemented |
| 8 | Appointment, follow-up, visit, or assessment relationship where applicable | Task 04 / follow-up service / assessment service | Follow-up present; appointments absent |
| 9 | Current secure-messaging consent and policy version | Task 07 consent model | Policy unresolved (`T07-D10`) |
| 10 | Current Task 06 modality and suitability state where applicable | Task 06 | Absent |
| 11 | Current thread state and expiry | This contract | Not implemented |
| 12 | Current response-expectation wording version | Product/professional (`T07-D20`) | Unresolved |
| 13 | Task 11 feature and release gate | Task 11 | Not registered |

Nine of thirteen depend on something that does not exist. That is the honest
status of secure messaging: the contract can be written now, and almost none of
it can be built now.

**Recheck on every one of these actions** — not once at thread open:

thread-list request · thread read · message read · message send ·
acknowledgement · queue action · participant change · assignment change ·
close/withdraw/expire/reopen · export or transfer to the clinical record.

A page loaded five minutes ago proves nothing. Authorization is evaluated at the
moment of the action, server-side, on every request. UI hiding is never an
authorization control.

# Part 2 — Thread lifecycle

## 2.1 States

| State | Meaning | Terminal |
|---|---|---|
| `DRAFT` | Being composed; no participant has been granted access. | No |
| `PENDING_FIRST_MESSAGE_GATES` | Created, but the Part 1 checks have not all passed. No content is readable. | No |
| `OPEN` | Active and authorized. | No |
| `WAITING_FOR_PHARMACIST_REVIEW` | A patient contribution awaits authorized human review. **Operational state, not clinical urgency.** | No |
| `WAITING_FOR_PATIENT` | The pharmacy side has responded and awaits the patient. | No |
| `PAUSED_AUTHORIZATION_CHANGED` | Identity, grant, assignment, or scope changed; access is suspended pending re-evaluation. | No |
| `PAUSED_CONSENT_WITHDRAWN` | Secure-messaging consent withdrawn; no new content may be added. | No |
| `MARKED_UNSUITABLE` | An authorized pharmacist determined messaging is not a suitable modality here. | No |
| `CLOSED` | Closed with an approved reason. | Yes |
| `WITHDRAWN` | The patient or a valid agent withdrew from messaging. | Yes |
| `EXPIRED` | Thread expiry reached under approved policy. | Yes |
| `ACCESS_DENIED` | Authorization failed at evaluation; recorded without revealing existence to the requester. | Yes for that actor |
| `UNKNOWN` | The state cannot be computed. | No — denies |

`PAUSED_AUTHORIZATION_CHANGED` and `PAUSED_CONSENT_WITHDRAWN` are separate on
purpose: one is a technical access change that may resolve, the other is a
privacy decision that requires new consent. A shared "paused" label would let the
first quietly clear the second.

## 2.2 Transitions

Every transition documents actor, guards, evidence, idempotency, concurrency,
audit, queue effect, response-expectation effect, assessment effect, and
invalid-transition behaviour. Two apply uniformly and are stated once:

- **Assessment effect: NONE, for every transition in this table.** No thread
  transition completes, alters, or infers assessment, visit, follow-up, or claim
  state (Part 6).
- **Invalid transition:** no state change; a safe `thread.invalid_transition`
  audit event recording axis, observed state, attempted destination, and an
  allowlisted reason code; a generic denial to the caller; a review item where it
  indicates a defect rather than an ordinary race.

| ID | From → To | Actor | Guards | Evidence | Idempotency / concurrency | Audit | Queue effect | Response-expectation effect |
|---|---|---|---|---|---|---|---|---|
| H-01 | ∅ → `DRAFT` | Authorized staff or patient actor | Session, audience, subject relationship, custodian scope | Actor and subject references | Per-author draft key | `thread.drafted` | None | None |
| H-02 | `DRAFT` → `PENDING_FIRST_MESSAGE_GATES` | Same | All Part 1 checks attempted | Check outcome codes | State-version predicate | `thread.gates_pending` | None | Wording version pinned |
| H-03 | `PENDING_FIRST_MESSAGE_GATES` → `OPEN` | Server | **All thirteen** Part 1 checks pass | Consent, suitability, assignment references | CAS on state version | `thread.opened` | Item created for the owning role | Approved wording shown and recorded as shown |
| H-04 | `PENDING_FIRST_MESSAGE_GATES` → `ACCESS_DENIED` | Server | Any check fails | Safe denial code | Idempotent | `thread.access_denied` | None | None |
| H-05 | `OPEN` → `WAITING_FOR_PHARMACIST_REVIEW` | Patient/delegate message send | Full recheck; content rules pass | Message reference | Per-author, per-thread idempotency key | `message.posted` | Body-free item enters the review queue | Patient sees the recorded expectation, unchanged |
| H-06 | `WAITING_FOR_PHARMACIST_REVIEW` → `WAITING_FOR_PATIENT` | Assigned authorized staff | Full recheck; assignment current | Message reference | CAS; assignment lease | `message.posted` | Item closed with a safe outcome | Unchanged |
| H-07 | any active → `PAUSED_AUTHORIZATION_CHANGED` | Server, on an identity/grant/assignment/scope change | Change committed | Change reference | Idempotent | `thread.paused_authorization` | Items suspended, not deleted | Patient sees a generic access-unavailable state |
| H-08 | `PAUSED_AUTHORIZATION_CHANGED` → prior active state | Server | Authorization re-established; full recheck | Re-check outcome | CAS | `thread.resumed` | Items restored | Unchanged |
| H-09 | any active → `PAUSED_CONSENT_WITHDRAWN` | Consent service | Withdrawal committed | Consent event reference | Same transaction as the withdrawal | `thread.paused_consent` | Items suspended | Patient sees an approved withdrawal confirmation |
| H-10 | `PAUSED_CONSENT_WITHDRAWN` → active | Server | **New** consent capture; full recheck | New consent grant | CAS | `thread.consent_restored` | Items restored | Re-shown wording version |
| H-11 | any active → `MARKED_UNSUITABLE` | **Authorized pharmacist only** | Professional decision; Task 06 where applicable | Pharmacist reference and approved reason code | CAS | `thread.marked_unsuitable` | Item routed to the approved alternative workflow | Patient sees approved alternative-path wording |
| H-12 | any active → `CLOSED` | Authorized staff | Approved closure reason | Reason code | CAS | `thread.closed` | Items closed | Patient sees closure wording |
| H-13 | any active → `WITHDRAWN` | Patient or valid agent | Authenticated withdrawal action | Actor reference | Idempotent | `thread.withdrawn` | Items closed | Confirmation shown |
| H-14 | any active → `EXPIRED` | Server | Approved expiry policy reached | Policy version | Idempotent | `thread.expired` | Items closed | Expiry wording shown |
| H-15 | `CLOSED` → `OPEN` (reopen) | Authorized staff | All Part 1 checks pass again, as if new | Fresh check outcomes | CAS; new state version | `thread.reopened` | New item | Current wording version re-shown |
| H-16 | active → export/transfer to clinical record | **Authorized pharmacist only**, through the approved workflow | Professional decision; records classification | Export reference | Idempotent per export | `thread.exported` | Item recorded | None |

H-16 is the boundary where a message may become part of the patient record. It is
a **pharmacist action through an approved workflow** — never automatic, never a
side effect of closing a thread, and never triggered by message volume or age.
Which content belongs in the clinical record is a professional and records
decision (`T07-D27`, Task 06), not a Task 07 default.

# Part 3 — Patient experience

| Requirement | Rule |
|---|---|
| Not continuously monitored | Stated plainly, in approved wording, before the first message is sent — not buried in a footer. |
| Urgent alternative | An approved alternative path is always visible. **The application never diagnoses urgency** to decide whether to show it. |
| Absolute expectation | An absolute response expectation or service window in plain language — not a relative "we usually reply quickly." Wording is `UNRESOLVED(T07-D20)`. |
| Ownership is clear | After authentication, the patient can see which pharmacy or care team owns the thread. |
| Bounded, sanitized composition | Length-bounded, frequency-bounded, sanitized on the server. |
| Withdrawal | The patient can withdraw from messaging through an authenticated, accessible control (H-13). |
| Alternative format or channel | Available without automatically granting new channel consent. Requesting a large-print or alternative-format path is not consent to be texted. |
| Delivery ≠ read | The patient is never told that "delivered" means a pharmacist read the message. |

**Prohibited unless the approved operating model genuinely supports it:** any
emergency promise, live-chat indicator, typing indicator, presence indicator, or
response countdown. Each of these makes an implicit staffing commitment. A
countdown that expires while nobody is on shift is worse than no countdown, and a
typing indicator on an asynchronous channel is a lie about attention.

Accessibility applies to every surface here: 375px and desktop, keyboard, screen
reader, 200%/400% zoom and reflow, reduced motion, contrast, visible focus,
non-colour status, and 56px frequent-action targets. An inaccessible secure
message path is a stop condition, not a backlog item.

# Part 4 — Pharmacist and staff experience

Authorized pharmacists must be able to:

1. view only assigned and authorized threads;
2. review patient replies in a protected queue (companion document);
3. take ownership through a **concurrency-safe** assignment action — two
   pharmacists cannot both hold a thread, and the loser sees a clear result;
4. record an administrative or pharmacist-review classification;
5. mark messaging unsuitable (H-11);
6. close the thread with an approved reason (H-12);
7. transfer relevant information to the authoritative clinical record through
   the approved workflow (H-16); and
8. work without message content ever reaching application logs.

| Role | Access |
|---|---|
| Assigned pharmacist | Thread content within their assignment and pharmacy scope. |
| Other pharmacists | No content without an authorized assignment. |
| Administrative staff | Minimum information for their approved role — safe status, category, and assignment. **No message body.** |
| Technical support | **No message-body access by default.** Any exception is just-in-time, approved, time-bounded, and audited (TB-13). |

# Part 5 — Message integrity

| Rule | Requirement |
|---|---|
| Bounded | Message length and submission frequency are bounded server-side. Limits are `UNRESOLVED(T07-D20)`. |
| Safe normalization | Whitespace and encoding normalization must never alter clinical meaning. Aggressive "cleanup" of a patient's description is content modification. |
| Output escaping | Escape on output; prevent stored XSS across every render path including staff views, exports, and PDFs. |
| Blocked content | Executable content, tracking content, remote images, unsafe links, and attachments are blocked. |
| Idempotency | Per-author, per-thread idempotency key so a double-submit or retry posts once. |
| Immutable originals | Originals are preserved. Corrections and supersession, never silent edits — the record must show what was actually said. |
| Out of logs and audit | Content never enters audit events, application logs, traces, metrics, analytics, exception reports, session replay, or queue metadata. |
| Encrypted | Envelope-encrypted at rest with versioned keys, TLS in transit, `private, no-store`, no-referrer, same-origin CSP on every view. |
| No third-party reach | No indexing, no third-party analytics, no session replay, and **no model training** on secure-message content — ever, regardless of consent. |

# Part 6 — Clinical boundary

A message, delivery event, read event, acknowledgement, thread closure, provider
webhook, or queue action must **never**:

- complete an assessment;
- complete a virtual visit;
- complete a follow-up;
- generate or submit a claim;
- select a medication, treatment, diagnosis, referral, billing code, or PIN; or
- infer that messaging is clinically suitable.

Only an authorized pharmacist may determine that messaging is suitable or
unsuitable where that professional decision is required (H-11).

This is enforced by capability, not by discipline: the secure-content database
role has no grants on assessment, follow-up, booking, visit, or claim tables, so
these writes are impossible rather than merely unwritten. The existing billing
service remains solely authoritative for every claim value.

# Part 7 — Attachments

**Attachments remain BLOCKED.** Nothing in this contract authorizes file upload.

Unblocking requires an approved boundary that *already exists and is proven*, not
one promised alongside the feature:

server authorization · tenant and subject isolation · file-type and size
allowlists · malware scanning · content-disposition safety · encrypted storage ·
short-lived access · no public URLs · retention and legal hold · audit without
filenames or content leakage · safe preview behaviour.

Supabase Storage is planned but not implemented, so none of these controls exists
today. An attachment feature added before them would be the single fastest way to
put unscanned patient files on a public URL.

# Part 8 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WH-A01 | Each of the thirteen eligibility checks, failed individually, prevents thread open and first-message release. | All thirteen passing opens exactly one thread. |
| WH-A02 | Authorization changed after page load denies the next read, send, acknowledgement, queue action, and export. | Unchanged authorization permits each action once. |
| WH-A03 | Cross-patient, cross-subject, cross-pharmacy, and cross-thread access denies without revealing existence. | Exact-scope access succeeds. |
| WH-A04 | A patient session cannot act as staff and a staff session cannot act as patient on any route or action. | Each audience reaches only its own surfaces. |
| WH-A05 | An expired or revoked delegate grant denies every subsequent read and write, mid-session. | A current grant within scope succeeds. |
| WH-A06 | Consent withdrawal pauses the thread in the same transaction and blocks new content. | Restoration requires a new consent capture, not a resume button. |
| WH-A07 | Only an authorized pharmacist can mark messaging unsuitable or export to the clinical record. | Both actions record full evidence. |
| WH-A08 | Two pharmacists racing for assignment: exactly one wins, deterministically. | The loser sees a clear, non-destructive result. |
| WH-A09 | A planted content canary never appears in logs, audit, metrics, traces, analytics, exports, queue metadata, or artifacts. | Scans pass with the canary planted and failure paths exercised. |
| WH-A10 | XSS, unsafe link, remote image, oversized, and high-frequency submissions are rejected safely across every render path. | Safe content renders identically in patient, staff, and export views. |
| WH-A11 | Duplicate submission posts once; an edit attempt creates a superseding record and never mutates the original. | History shows both records with the correction link. |
| WH-A12 | No message, event, acknowledgement, closure, webhook, or queue action writes assessment, visit, follow-up, or claim state — proven by grants. | Clinical and billing state unchanged across the suite. |
| WH-A13 | No UI presents a typing indicator, presence, live-chat affordance, response countdown, or "read by pharmacist" claim. | Approved wording snapshots match the recorded expectation version. |
| WH-A14 | Attachment endpoints do not exist; an upload attempt has nowhere to land. | Attachment controls are absent from every surface. |
| WH-A15 | Accessibility: 375px, keyboard, screen reader, 200%/400% zoom and reflow, reduced motion, non-colour status, 56px targets on every messaging surface. | Evidence captured for patient and staff views. |

# Part 9 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D05 | Task 05 identity, audience, actor-subject, delegate, revocation | Checks 1–5; the entire patient side |
| T07-D06 | Task 06 modality, suitability, participant, professional contract | Check 10, H-11, H-16 |
| T07-D10 | Secure-messaging consent policy and wording | Check 9, H-09, H-10 |
| T07-D20 | Response expectations, non-monitoring and urgent-path wording, length and frequency bounds | Part 3, Part 5 |
| T07-D21 | Alternative accessible channel and accommodation | Part 3 |
| T07-D27 | Records classification — which thread content is the clinical record | H-16, retention |
| — | `AGENTS.md` zero-PHI scope question for authenticated patient surfaces | The whole workstream; lead decision |

## Workstream H acceptance check — messaging contract

- All thirteen eligibility checks are specified, with their authority and their
  honest availability today.
- Authorization is rechecked on all ten action types, server-side, per request.
- All thirteen lifecycle states are defined, with the two pause states kept
  structurally distinct.
- Sixteen transitions document actor, guards, evidence, idempotency, concurrency,
  audit, queue effect, and response-expectation effect; assessment effect and
  invalid-transition behaviour are stated once and apply uniformly.
- Transfer to the clinical record is a pharmacist action through an approved
  workflow, never automatic.
- The patient sees non-monitoring, an approved urgent alternative chosen without
  the application diagnosing urgency, an absolute expectation, thread ownership,
  withdrawal, and alternative formats that grant no new channel consent.
- Typing indicators, presence, live-chat affordances, response countdowns, and
  "read" claims are prohibited absent an operating model that supports them.
- Staff access is assignment-scoped; administrative staff see no body; technical
  support has no body access by default.
- Message integrity covers bounds, safe normalization, escaping, blocked content,
  idempotency, immutable originals, log and audit exclusion, encryption, and a
  prohibition on indexing, analytics, and model training.
- The clinical boundary is enumerated and enforced by database grants.
- Attachments remain BLOCKED with the full control list required to revisit.
- The `AGENTS.md` zero-PHI scope conflict is surfaced, not resolved.
- No policy value, wording, bound, or professional decision was invented.
- No schema, migration, runtime code, route, recipient, PHI, or network effect
  was added.

## Current disposition

**Secure portal messaging contract: complete as design documentation.**

- **Secure-thread authorization model:** PASS as documentation; BLOCKED on
  T07-D05 and T07-D06.
- **Thread lifecycle:** PASS as documentation.
- **Secure-message content controls:** PASS as documentation; bounds BLOCKED on
  T07-D20.
- **Prototype:** NOT BUILT. Nine of thirteen eligibility checks depend on
  contracts absent from `main`.
- **Attachments:** BLOCKED.
- **AI urgency classification:** DISABLED by design.
- **Synthetic evidence (WH-A01–WH-A15):** NOT RUN.
- **Real PHI, recipients, providers, or external delivery:** NO.
