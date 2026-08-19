# Task 07 — Secure Message Authorization Matrix

**Workstream:** H — the actor × action authorization matrix and its denial
semantics

**Prepared:** 2026-08-06

**Repository design baseline:** `73e397105a91f0f3e6f32695746767131d4adc27`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companions:** [`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md) ·
[`reply-and-review-queue-design.md`](reply-and-review-queue-design.md)

## Decision summary

This is the reference table a reviewer or implementer checks when asking "may
this actor do this thing right now?" It exists as a separate document because an
authorization rule buried in prose gets missed, and the failure mode is one
patient reading another patient's message.

It adds no TypeScript, SQL, schema, route, or runtime effect. Every rule below is
a contract to satisfy; none is implemented, and the patient-side actors do not
exist on `main` at all.

# Part 1 — Actors

Distinct security principals. None inherits another's authority, and none is
derivable from another.

| Actor | Domain | Notes |
|---|---|---|
| `PATIENT` | Task 05 patient identity | The subject of the record acting for themselves. |
| `DELEGATE` | Task 05 patient identity | Acts for a subject under a versioned, scoped, expiring grant. |
| `PHARMACIST` | Existing staff auth | May hold professional authority where assigned. |
| `INTERN_STUDENT` | Existing staff auth | Linked to a supervising pharmacist; never holds independent professional authority. |
| `TECHNICIAN` | Existing staff auth | Administrative scope only. |
| `PHARMACY_ADMIN` | Existing staff auth | Administrative and governance scope; **not** professional authority. |
| `TECHNICAL_SUPPORT` | Operational | No content access by default; exceptions are just-in-time, approved, bounded, audited. |
| `SYSTEM` | Trusted server component | Timers, schedulers, reconcilers. Never acts as a person. |
| `EXTERNAL_UNAUTHENTICATED` | None | Webhooks, link scanners, anonymous requests. Never an actor for any action here. |

**A pharmacy admin is not a pharmacist.** Administrative seniority does not
confer professional authority, and no configuration may grant it. Likewise an
intern or student never holds the professional decisions in Part 2 — those route
to the supervising pharmacist.

# Part 2 — The matrix

Legend: **Y** permitted subject to all listed guards · **N** denied ·
**Y\*** permitted with the stated narrowing.

Every **Y** additionally requires, without exception: an active authenticated
session of the correct audience; custodian/pharmacy scope match; current thread
state permitting the action; a valid concurrency token; and the Task 11 feature
gate. These are omitted from each row only to keep the table readable — they are
never omitted from the check.

| Action | PATIENT | DELEGATE | PHARMACIST | INTERN / STUDENT | TECHNICIAN | PHARMACY ADMIN | TECH SUPPORT | SYSTEM | Additional guards |
|---|---|---|---|---|---|---|---|---|---|
| List own threads | Y | Y\* | Y\* | Y\* | N | N | N | N | Delegate: within grant scope. Staff: assigned threads only. |
| Read thread metadata | Y | Y\* | Y\* | Y\* | N | N | N | N | Actor-subject relationship or assignment. |
| Read message content | Y | Y\* | Y\* | Y\* | **N** | **N** | **N** | N | Assignment required for staff; intern/student under supervision. Admin and technician never read content. |
| Send message | Y | Y\* | Y\* | Y\* | N | N | N | N | Consent active; thread `OPEN`/`WAITING_*`; content rules pass; per-author idempotency. |
| Acknowledge | Y | Y\* | N | N | N | N | N | N | Acknowledgement is a patient-side action and is never proof of comprehension. |
| Claim / assign a queue item | N | N | Y | Y\* | Y\* | N | N | N | Concurrency-safe claim. Technician: administrative items only. Intern/student: no professional items. |
| Reclassify a queue item | N | N | Y | N | Y\* | N | N | N | Technician: administrative categories only. |
| Change participants | N | N | Y | N | N | Y\* | N | N | Admin: only where an approved governance workflow defines it. |
| Change assignment | N | N | Y | N | N | Y\* | N | N | Audited; versions the item. |
| **Mark messaging unsuitable** | N | N | **Y** | **N** | N | **N** | N | **N** | Professional decision. Pharmacist only, ever. |
| Close thread | N | N | Y | N | N | Y\* | N | N | Approved reason code. Admin only under an approved governance path. |
| Withdraw from messaging | Y | Y\* | N | N | N | N | N | N | Patient-side decision; delegate only within grant scope. |
| Reopen thread | N | N | Y | N | N | N | N | N | All eligibility checks re-run as if new. |
| Expire thread | N | N | N | N | N | N | N | Y | Approved expiry policy only. |
| **Export / transfer to clinical record** | N | N | **Y** | **N** | N | **N** | N | **N** | Professional decision through the approved workflow. |
| Read audit evidence | N | N | Y\* | N | N | Y\* | N | N | Governance/audit scope; content-free events only. |
| Read message content for support | N | N | N | N | N | N | **N by default** | N | Any exception: just-in-time, approved, time-bounded, audited (TB-13). |
| Any action | N | N | N | N | N | N | N | N | For `EXTERNAL_UNAUTHENTICATED` — a webhook, scanner, or anonymous request is never an actor here. |

Four cells carry the most weight, and each is a deliberate **N** that a future
convenience request will push against:

- **Technician and admin cannot read message content.** Operating a queue does
  not require reading PHI, and "just to help triage" is the request that
  dissolves this boundary.
- **Intern/student cannot mark messaging unsuitable.** It is a professional
  judgment belonging to the supervising pharmacist.
- **Pharmacy admin cannot mark unsuitable or export to the record.** Governance
  authority is not clinical authority.
- **System cannot do either.** No timer, model, or automation makes a
  professional decision.

# Part 3 — Recheck points

Authorization is evaluated server-side at the moment of the action — never
inherited from page load, a prior request, a cached session claim, or a rendered
UI state. Every one of these is a full re-evaluation:

thread-list request · thread read · message read · message send ·
acknowledgement · queue action · participant change · assignment change ·
close / withdraw / expire / reopen · export or transfer to the clinical record.

`proxy.ts` performs **no authorization**. It is an optimistic UX gate only, and
every server action independently re-verifies session, audience, role,
relationship, scope, and state.

# Part 4 — Denial semantics

| Rule | Requirement |
|---|---|
| Generic denial | The same response shape for "does not exist," "exists but you have no relationship," "exists but you are not assigned," and "exists but the state forbids this." A distinguishable 404 versus 403 is an enumeration oracle. |
| No existence leakage | No differing status code, redirect, field-level message, timing signature, or work-item side effect may reveal that an object exists. |
| Safe reason codes | Denials record an allowlisted internal reason. The actor sees a generic message with no destination, content, subject, or internal reference. |
| Audited | Every denial is an append-only, content-free audit event: actor, action, object reference, reason code, time. |
| No partial results | A list request that would include one unauthorized item does not return the rest silently filtered plus a hint; it returns the authorized set only, with no count that reveals what was withheld. |
| Sensitive state cleared | On denial, session expiry, sign-out, or audience mismatch, any transient content in the client is cleared, and responses carry `private, no-store` with no-referrer and same-origin CSP. |

# Part 5 — Change and revocation propagation

An authorization change must take effect on the **next action**, not on the next
login.

| Change | Effect |
|---|---|
| Session revoked or expired | Next action denies; the thread pauses if it was mid-interaction. |
| Delegate grant expired, narrowed, or revoked | Next read and write deny, mid-session, including on an already-open page. |
| Assignment changed | The previous assignee loses content access at the next action. |
| Role changed or removed | Next action re-evaluates against the new role. |
| Secure-messaging consent withdrawn | Thread moves to `PAUSED_CONSENT_WITHDRAWN`; no new content may be added by anyone. |
| Task 06 suitability changed | Professional actions re-evaluate; `MARKED_UNSUITABLE` routes to the approved alternative. |
| Pharmacy scope changed | Out-of-scope objects become unreachable immediately. |
| Kill switch or feature gate withdrawn | All actions deny; queued and pending work fails its next recheck. |

The realistic exploit is a long-lived open tab: a delegate whose grant was revoked
an hour ago, clicking a button rendered when it was still valid. Per-action
re-evaluation is what closes it.

# Part 6 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WH-C01 | Every **N** cell in Part 2 is denied for every actor, on every route and server action. | Every **Y** cell succeeds under its full guard set, exactly once. |
| WH-C02 | A patient token at a staff boundary and a staff token at a patient boundary both deny generically. | Each audience reaches only its own surfaces. |
| WH-C03 | Technician, pharmacy admin, and technical support cannot read message content by any route, including exports, PDFs, and error paths. | Assigned pharmacist access succeeds and is audited as content access. |
| WH-C04 | Intern/student, admin, and system cannot mark messaging unsuitable or export to the clinical record. | An authorized pharmacist can, with full evidence. |
| WH-C05 | Cross-subject, cross-thread, cross-pharmacy, and guessed-identifier access denies identically to non-existence, with no timing oracle. | Exact-scope access succeeds. |
| WH-C06 | A grant revoked between page load and action denies the action, on an already-open page. | A current grant within scope succeeds. |
| WH-C07 | Session revocation, role change, assignment change, consent withdrawal, suitability change, and kill switch each take effect on the next action. | Re-establishment restores only what the new state permits. |
| WH-C08 | A list request never reveals withheld items through counts, pagination totals, gaps, or hints. | The authorized set returns cleanly. |
| WH-C09 | Every denial writes a content-free audit event with actor, action, object reference, and reason code. | Audit completeness verified across the whole matrix. |
| WH-C10 | `proxy.ts` alone never authorizes any action; server actions deny independently when it is bypassed. | Server-side checks hold under direct action invocation. |
| WH-C11 | `EXTERNAL_UNAUTHENTICATED` — including a webhook or link scanner — cannot perform any matrix action. | Only authenticated in-scope actors act. |
| WH-C12 | Transient content is cleared on denial, sign-out, session expiry, and audience mismatch; no-store and no-referrer headers present on every content response. | Verified across patient and staff views. |

# Part 7 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D05 | Task 05 identity, audience, actor-subject, delegate scope, revocation | Every patient-side row |
| T07-D06 | Task 06 modality, suitability, participant authority | Professional rows |
| T07-D10 | Secure-messaging consent policy | Consent-dependent rows |
| T07-D11 | Authorized-agent/delegate communication policy | Every `Y*` delegate cell |
| — | Whether pharmacy admin holds any governance path over threads | The `Y*` admin cells; safety floor is deny |
| — | `AGENTS.md` zero-PHI scope question for authenticated patient surfaces | The whole workstream; lead decision |

## Workstream H acceptance check — authorization matrix

- Nine distinct actors are defined, with no authority inherited or derived.
- Patient, subject, delegate, pharmacist, intern/student, technician,
  administrator, support, system, and unauthenticated remain distinct.
- Every action is specified per actor, with additional guards, and the universal
  guards stated once and never optional.
- Technician, pharmacy admin, and technical support cannot read message content.
- Marking messaging unsuitable and exporting to the clinical record are
  pharmacist-only, denied to admin, intern/student, and system.
- Authorization is rechecked at every one of the ten action points; `proxy.ts`
  authorizes nothing.
- Denials are generic, non-enumerating, oracle-free, audited, and clear transient
  state.
- Revocation and change propagate on the next action, including on an already-open
  page.
- No role, scope, or professional authority was invented; unresolved rows carry a
  deny safety floor.
- No schema, migration, runtime code, route, recipient, PHI, or network effect
  was added.

## Current disposition

**Secure message authorization matrix: complete as design documentation.**

- **Authorization model:** PASS as documentation; BLOCKED on T07-D05, T07-D06,
  T07-D11.
- **Patient-side actors:** do not exist on `main`.
- **Synthetic evidence (WH-C01–WH-C12):** NOT RUN.
- **Real PHI, recipients, providers, or external delivery:** NO.

With the two companion documents, Workstream H is complete as design
documentation. The prototype the brief also names is **NOT BUILT** and cannot be
until Task 05 and Task 06 publish their contracts and T07-D02 and Task 11
Checkpoint 1 are recorded.
