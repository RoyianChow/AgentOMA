# Task 06 — Secure Messaging Contract

Secure messaging is a professional virtual-care modality here, not a chat feature. This
document defines the **producer** side — the thread and message capability Task 06 owns
outright. Task 07 has already published its own document defining itself as the strict,
read-only *consumer* of this contract
(`docs/task-07/appointment-follow-up-and-task-06-integration.md`, Part 3) — this document is
written to be exactly what that consumer relationship needs, and no more.

**The single-line summary of the boundary:** Task 06 owns the thread, the message content, the
suitability decision, and every authorization check. Task 07 owns *only* the generic external
"you have a new message, sign in" notice — and even that stays a stub until production
approval, carrying no thread/participant/visit reference of any kind.

---

## 1. Patient enrollment and authentication

Synthetic-only, same caveat as every other patient-facing contract in this task: reuses Task
05's shape (server-verified session, actor ≠ subject, no client-trusted values) but Task 05
itself doesn't exist yet. A patient must have passed the same identity gate used for a video/
telephone visit (Workstream E) before a thread can open for them — secure messaging is not a
lower-assurance side door into the same PHI.

## 2. Pharmacist assignment

`SecureMessageThread.assignedPharmacistActorRef` (Workstream D). Assignment is a
concurrency-safe claim (an explicit assignment action, not "whoever opens it first wins
silently") — mirrors the pharmacist-queue-claim pattern already used elsewhere in this
repo's assessment workflow (one pharmacist actively working an item at a time).

## 3. Actor-to-subject relationship

Same distinction as every other Task 06 contract: `patientActorRef` may differ from
`patientSubjectRef` when a delegate is messaging on the patient's behalf (synthetic-only,
Task 05-shaped). The thread always displays which is which — never blurred for UI convenience.

## 4. Thread-to-visit relationship

`SecureMessageThread.visitRef` is **nullable** — a thread does not require an active or prior
video/telephone visit to exist. This matters: secure messaging is its own valid modality per
the task's objective list ("telephone visits, video visits, secure asynchronous messaging" are
three peers, not messaging-as-an-appendage-to-video).

## 5. Custodian and participant scope

Same pharmacy-scoping pattern as everything else in this repo — `pharmacyId` server-derived,
never client-selected (`AGENTS.md`'s single-tenant invariant, unchanged by this task). Cross-
pharmacy thread access is denied the same way cross-pharmacy patient access already is.

## 6. Thread opening and the first-message gate

A thread may exist in `DRAFT` before any message is exchanged, but **no substantive clinical
message is released or reviewed as part of care until the same gates as a video/telephone visit
are complete**: identity, consent (to the *messaging* modality specifically —
`VirtualCareConsentEvent.modality = secure_messaging`), privacy confirmation, and a pharmacist
suitability decision for messaging specifically (`ModalitySuitabilityDecision` scoped to this
thread — suitability is per-modality, not visit-wide, per Workstream E). This is the literal
"first-message gate" the task requires: `PENDING_FIRST_MESSAGE_GATES` is a real, checked thread
state, not a formality.

## 7. Expected availability / response-time communication

The patient sees an explicit, plain-language statement that **the channel is not continuously
monitored**, plus an approved alternative for anything urgent — without the system attempting
to classify what "urgent" means (no AI, no keyword scoring, matching both this task's own
authority boundary and Task 07's independently-stated "no AI urgency" rule for reminders — the
two tasks arrived at the identical rule for the identical reason).

## 8. Message delivery, failed delivery, and acknowledgement

- **Delivery** here means the message reached the authenticated thread store — nothing more.
- **Failed delivery** (a write failure, not a "the patient didn't read it yet") is a distinct,
  auditable outcome from an unread message.
- **Acknowledgement** is an explicit, authenticated action by an authorized participant. It is
  never inferred from delivery, and it never counts as clinical review, comprehension, or
  completion of anything (see §12).

## 9. Pharmacist closure / patient withdrawal / expiry / reopening

| Action | Rule |
|---|---|
| Pharmacist closure | Explicit action, approved reason, `SecureMessageThread.state = CLOSED` |
| Patient withdrawal | Patient may withdraw from messaging at any time; blocks further messages same as consent withdrawal blocks a video visit (Workstream H's `CONSENT_WITHDRAWN` has a direct analogue here) |
| Thread expiry | Absolute expiry, same philosophy as visit expiry (Workstream H) — an expired thread does not silently reopen |
| Reopening | Requires a new, explicit authorization decision — not a client action, not automatic on a new inbound message to a closed thread |

## 10. Assessment documentation and export/transfer to the clinical record

A pharmacist may transfer relevant content from a thread into the **existing** Task 02 clinical
record through an approved workflow — this is a deliberate, reviewed action, never an automatic
sync. `VisitAssessmentLink` (Workstream D) is the only path into Task 02's tables, same as for
video/telephone.

## 11. Retention and audit

Same shape as every other Task 06 entity: `VirtualVisitAuditEvent`-pattern (opaque references,
safe reason codes, no body) for message *metadata* (sent/read/denied/closed), while message
*content* lives only in the thread's own encrypted store — never duplicated into logs or audit
metadata. Retention period is explicitly **not invented here** (matches the task's own
prohibition on inventing retention policy) — flagged as an open decision alongside the rest of
Workstream K's retention proposal (upcoming).

## 12. The workflow-must rules — checked one by one

| Requirement | How it's met |
|---|---|
| Authenticate the patient before message access | §1 — same identity gate as video/telephone |
| Recheck authorization for every message | Not just thread-open — every read *and* every write independently re-verifies session, actor-subject binding, custodian scope, and current thread/participant state. This is the exact behavior Task 07 explicitly said it depends on ("Recheck participant authorization before every message... not at thread open") |
| Keep message content out of audit and application logs | §11 |
| Bounded and sanitized message input | Length-bounded, escaped/sanitized on render, no raw HTML execution |
| Prevent cross-patient and cross-pharmacy thread access | §5, plus the same server-scoped-query pattern used throughout this task (never a client-supplied thread ID trusted without an ownership check) |
| Avoid PHI in external notification previews | Not Task 06's problem to solve twice — Task 07 has already committed to this structurally (no thread/participant/visit reference in its generic notice at all, per its own Part 3) |
| Clearly state the channel is not continuously monitored | §7 |
| Provide an approved alternative for urgent needs without automatically diagnosing urgency | §7 |
| Prevent a patient message from automatically completing an assessment | No message action anywhere in this contract writes to `assessment` or `VisitAssessmentLink` — that requires the separate, explicit pharmacist transfer action (§10), exactly mirroring Workstream H's "only `PHARMACIST_COMPLETED` reaches Task 02" rule |
| Prevent a delivery receipt from becoming clinical completion | §8 — delivery/acknowledgement are structurally distinct from, and have no write path toward, clinical completion. This is also exactly what Task 07's document independently guarantees from its side ("an external receipt is not Task 06 message delivery, acknowledgement, documentation, or completion") |
| Allow the pharmacist to determine that messaging is unsuitable | `ModalitySuitabilityDecision` scoped to the messaging modality, same pharmacist-only write guard as every other modality (§6) |
| Preserve relevant clinical communications per an approved record-retention workflow | §10/§11 — deferred to Workstream K, not invented here |

## 13. Attachments

**Remain blocked.** This repo has no approved, authorized, malware-scanned, retention-controlled
upload boundary today (confirmed absent in the current-state analysis) — so per the task's own
rule, attachments stay disabled rather than this task inventing one. `SecureMessage.attachment`
is not a field in this contract at all; there is nothing to toggle on.

## 14. External notification — explicitly not this task's problem to re-solve

Per Task 07's own Part 3 (already merged, already authoritative on its side): an external
"new message" notice is a generic, thread-blind, participant-blind, purpose-blind "sign in to
the secure portal" stub, gated behind the same consent/suppression machinery as every other
Task 07 notice, and it stays a stub until separate production approval. Task 06 does not build,
duplicate, or second-guess that — it only needs to expose the read-only facts (thread exists,
has unread content, belongs to this subject) that a future real Task 07 integration would read.

---

## Cross-references

Backing contracts: `SecureMessageThread`, `SecureMessage` (Workstream D). Consumer contract:
`docs/task-07/appointment-follow-up-and-task-06-integration.md` Part 3 (Task 07, already
merged). Suitability mechanism: Workstream E §5. State-machine analogues (withdrawal, expiry):
Workstream H.
