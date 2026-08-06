# Task 07 — Suppression and Contact-Change Policy

**Workstream:** D — suppression precedence, unsuppression authority, and the
contact-change, wrong-recipient, and inbound-signal contract

**Prepared:** 2026-08-06

**Repository design baseline:** `023af56b35afba29cc2cf7081b7ee29eda3d6a73`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companion document:** [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)

## Decision summary

This document defines suppression — the fail-closed prohibition on sending to a
destination — and the contact-change and wrong-recipient behaviour that feeds it.
Together with the companion document it completes Workstream D.

It adds no TypeScript, SQL, Drizzle schema, endpoint, worker, provider,
credential, recipient, or network effect, and it selects no unresolved policy
value. Suppression scope hierarchy, unsuppression authority, opt-out keyword
lists, and wrong-recipient runbooks remain the property of their named
approvers.

The single most important rule in Task 07 is here: **suppression wins.** It
outranks preference, schedule, retry, staff action, provider state, and
convenience. It is never cleared as a side effect of anything.

## Scope and limits

In scope: suppression semantics, the reason catalogue, scope precedence, the
override matrix, unsuppression authority, contact-change and supersession
behaviour, shared and recycled destinations, wrong-recipient handling, and the
mapping from inbound and provider-derived signals to suppression.

Out of scope, by explicit deferral: consent capture and quiet hours (companion
document); outbox and retry mechanics (Workstream E); template payloads
(Workstream F); provider adapter, webhook authentication, and reconciliation
mechanics (Workstream G); secure-thread and reply-queue design (Workstream H);
and the approved privacy-breach runbook itself, which is a human artifact
(T07-D28) that this document consumes rather than writes.

## Conventions

This document uses the conventions defined in the companion document:
`PERMIT`, `DENY(<code>)`, `DEFER(<code>)`, `UNRESOLVED(T07-Dxx)`, and safety
floor. Reason codes are allowlisted `SafeCode` values and never carry a
destination value, message body, provider payload, clinical term, or patient
identifier.

# Part 1 — Suppression

## 1.1 What suppression is

Suppression is a standing prohibition on sending to a scope. It is:

- **evidence, not preference** — an immutable `SuppressionEntry`, appended, never
  edited or deleted;
- **evaluated, not cached** — read from current state at every evaluation point;
- **conservative** — where entries conflict, the most restrictive active entry
  wins; and
- **independent of consent** — a destination can be suppressed while consent is
  `ACTIVE`, and a withdrawn consent does not by itself constitute the
  suppression record.

Suppression is **not** a statement that consent was withdrawn, that the patient
did something wrong, that the record should be deleted, or that care should stop.
It blocks a communication channel. It never blocks the portal, in-person service,
professional follow-up by other means, or the patient's own access to their
record.

## 1.2 Reason catalogue

At minimum the following reasons exist. Each is a distinct allowlisted code —
they must not be collapsed into a shared "blocked" label in code, UI, metrics, or
audit, because they carry different authority, different lift conditions, and
different privacy meaning.

| Code | Trigger | Who may create | Default scope | Required evidence | Liftable |
|---|---|---|---|---|---|
| `PATIENT_OPT_OUT` | Patient or valid agent opts out through an authenticated, accessible control, or through an approved deterministic inbound opt-out. | Patient/valid delegate; approved inbound normalizer. | Per purpose and channel at minimum; broader per T07-D14. | Actor, time, channel/purpose scope, policy version. | Only by the patient or valid agent through an authenticated opt-in action. |
| `CONSENT_REVOKED` | Consent withdrawal or authorized revocation. | Consent service (system), on the withdrawal transaction. | Contact version + channel + purpose of the revoked grant. | Link to the consent event. | Only by a new, validly captured consent grant — never by lifting the suppression alone. |
| `CONSENT_EXPIRED` | Approved expiry reached, or required consent policy absent. | Consent projection service. | As above. | Consent event/policy version. | By new consent capture. |
| `WRONG_RECIPIENT` | A report that the destination reaches someone other than the intended patient. | Staff intake, patient report, or approved inbound signal. | Contact version, and subject-wide pending review. | Safe report reference; no report free text in the entry. | Only through the approved wrong-recipient/privacy process (T07-D28) with new destination evidence. |
| `HARD_BOUNCE` | Provider-reported permanent delivery failure. | Provider event normalizer. | Contact version + channel. | Provider event reference; no raw payload. | Only by a fresh successful verification of a **new** contact version. |
| `SPAM_COMPLAINT` | Provider-reported complaint. | Provider event normalizer. | Contact version + channel, and per T07-D14 broader. | Provider event reference. | Only through an authorized review with new consent evidence. |
| `CONTACT_DISPUTED` | Destination ownership or accuracy is disputed. | Staff, patient, or valid agent. | Contact version. | Safe dispute reference. | Only by an authorized resolution creating a new version. |
| `CONTACT_SUPERSEDED` | A newer contact version replaced this one. | Contact service, on the supersession transaction. | The superseded contact version. | Supersession link. | Never lifted — the version is historical. Sending resumes only through the new, separately verified and consented version. |
| `SECURITY_PRIVACY_INCIDENT` | Suspected or confirmed incident affecting this subject, destination, provider, or capability. | Security/privacy authority; kill-switch operator. | As broad as the incident requires, up to `GLOBAL`. | Safe incident reference. | Only by the named incident authority after documented closure. |
| `ADMINISTRATIVE_HOLD` | Custodian, legal, or records hold on communication. | Authorized governance role. | Per hold scope. | Safe hold reference. | Only by the authority that placed it. |
| `PROVIDER_POLICY_BLOCK` | Provider, carrier, regulator, or internal policy prohibits sending on this channel/account. | Operations/security. | Channel, provider account, or `GLOBAL`. | Safe policy/provider reference. | Only by operations after the underlying block is evidenced as resolved. |

Additional reasons may be added by approved policy. None may be added by an
implementer to make a test pass, and no reason may be defined such that a
provider event alone satisfies its lift condition.

## 1.3 Scope and precedence

`SuppressionEntry.scope_code` takes one of `GLOBAL`, `SUBJECT`, `CONTACT`,
`CHANNEL`, `PURPOSE`, `SOURCE`, `PROVIDER`, `SECURITY`. The exact hierarchy — and
whether, for example, a purpose-scoped opt-out implies a channel-scoped one — is
`UNRESOLVED(T07-D14)`.

The evaluation contract, which does not depend on that unresolved hierarchy:

```text
applicable = all ACTIVE entries whose scope matches any of
             { custodian, subject, contact version, channel, purpose,
               source, provider account, security }
             for the message under evaluation

decision   = DENY(SUPPRESSED) if applicable is non-empty
           = DENY(SUPPRESSION_UNRESOLVED) if the set cannot be computed
           = PERMIT-term satisfied only if applicable is provably empty
```

Properties the implementation must prove rather than assume:

1. **Deterministic.** The same state produces the same decision on every worker,
   in every order, at every replay.
2. **Most restrictive wins.** No narrowing entry cancels a broader one. A
   channel-scoped lift never overrides an active `GLOBAL` or `SECURITY` entry.
3. **Empty must be proven.** An unreadable, partially loaded, or timed-out
   suppression query is `DENY`, never "no rows, therefore permitted."
4. **Order-independent.** Concurrent entry creation cannot produce a window in
   which a message evaluates as unsuppressed; the check participates in the same
   transactional boundary as the dispatch decision.

## 1.4 Override matrix

| Competing input | Result |
|---|---|
| Channel preference names this channel | Suppressed. Preference selects among permitted options; it never creates permission. |
| Another channel is available and unsuppressed | No send on the other channel. There is no silent fallback (T07-23). A different channel requires its own consent, its own verified contact, and its own absence of suppression — decided as a fresh message, never as a rescue of this one. |
| Message is already scheduled or deferred | Suppressed at the next evaluation point; the item is cancelled with a safe reason. |
| Retry policy permits another attempt | No attempt. Retry never re-evaluates as permitted what authority denied. |
| Staff initiate a manual resend | Refused. Staff see a generic denial without the destination value. There is no staff override control, and adding one would be a scope change requiring approval. |
| Operator or admin flag | No such flag exists. Break-glass over suppression is not in scope for this task. |
| Provider reports the destination as valid/deliverable | Irrelevant. Provider state is evidence about transport, not authority. |
| Prior successful delivery to the same destination | Irrelevant. |
| Source workflow marks the item urgent | Irrelevant. No urgency override exists (companion document, §3.5). |
| Kill switch active | Also denies, independently. Two denials are not a conflict. |

## 1.5 Evaluation points

Suppression is evaluated at the same four points as consent: message creation,
worker claim, immediately before adapter dispatch, and before any manual resend.
A suppression created at any moment between those points must take effect at the
next one. An entry created *during* an in-flight adapter call cannot retract a
call already made — which is precisely why §1.7 forbids treating a subsequent
delivery event as evidence that suppression did not apply.

## 1.6 What suppression does not do

- It does not delete the contact point, the consent history, the message
  history, or the patient record.
- It does not satisfy a retention, hold, or destruction rule. Records governance
  is separate (T07-D27, P13, D07).
- It does not revoke consent. If consent should also end, a consent event is
  recorded separately, by the authority entitled to record it.
- It does not close, complete, cancel, or alter an appointment, follow-up,
  assessment, visit, referral, prescription, or claim. Communications has no
  write path to clinical or billing state (T07-40).
- It does not remove the patient's portal access or their ability to contact the
  pharmacy by other means.

## 1.7 Unsuppression

Unsuppression is a deliberate, authorized, audited act. It never happens as a
side effect.

| Rule | Requirement |
|---|---|
| Authority | Named per reason in §1.2. No self-approval where the reason's authority requires independence. Operations may not lift a privacy incident; staff may not lift a patient opt-out. |
| New evidence | A lift requires new evidence — a fresh consent capture, a fresh verification of a new contact version, a documented incident closure, or a released hold. "The bounce was probably transient" is not evidence. |
| Mechanism | A superseding `SuppressionEntry` links the lifted entry via `superseded_by_entry_ref`. The original row is never edited or deleted. |
| Audit | Append-only, payload-free: actor, authority, reason, evidence reference, policy version, time. |
| Never automatic | No provider delivery event, no successful send elsewhere, no time-based decay, no data cleanup, no schema migration, and no cache rebuild may clear an entry. |
| Never inferred | A patient replying, opening a link, signing in, booking an appointment, or answering a phone call is not an opt-in. |

The prohibition on delivery-event-driven unsuppression is absolute: a `delivered`
event for a destination under `HARD_BOUNCE`, or an `opened` event for a
destination under `WRONG_RECIPIENT`, is a reconciliation signal (Workstream G),
never a lift.

## 1.8 Kill switch and incident interaction

- A capability, channel, provider, or global kill switch denies independently of
  suppression; queued work must recheck the lifecycle revision and fail closed
  (R01, T07-D39).
- A security or privacy incident may create suppression at any scope up to
  `GLOBAL`, and simultaneously revoke sessions, delegate grants, contact
  versions, challenges, and provider keys (R03).
- Restoring service after an incident is an operator-controlled, gradual,
  evidenced action — not a bulk automatic clear.

## 1.9 Audit and retention of suppression evidence

Suppression events are append-only and payload-free. The entry records safe
references, never the destination value, the report text, the reply body, the
provider payload, or a clinical reason. Record classification, retention, hold
behaviour, export, and destruction ordering for suppression evidence are
`UNRESOLVED(T07-D27)`; a suppression record must not be deleted on a guessed
schedule, and legal hold wins over any automated deletion (P13, T07-44).

# Part 2 — Contact change

## 2.1 Change taxonomy

| Change | Effect |
|---|---|
| Add | Creates a new `ContactPoint` version at `PENDING`; not eligible until verified. |
| Verify | Moves an existing version to `VERIFIED` through a consumed challenge. |
| Correct | Treated as a material change if the normalized value or delivery target changes; otherwise a non-material annotation. Materiality is `UNRESOLVED(T07-D12)`; safety floor per companion §2.6. |
| Replace | New version supersedes the prior version. |
| Dispute | Marks the version `DISPUTED` and suppresses it; does not delete it. |
| Remove | Lifecycle transition to `INVALIDATED` plus suppression; never a hard delete of history. |

Every change requires current Task 05 authorization for the exact actor-subject
relationship (T07-D05, **BLOCKED** today).

## 2.2 Supersession transaction

A material change is one transaction. Partial application is a defect, not a
degraded mode.

1. Insert the new `ContactPoint` version at `verification_state = PENDING`,
   `state = ACTIVE`, linked by `supersedes_contact_point_ref`.
2. Transition the prior version to `SUPERSEDED`.
3. Revoke every `PENDING` challenge bound to the prior version.
4. Mark every consent grant bound to the prior version `SUPERSEDED`. Consent
   does not migrate to a new destination — a new destination requires a new
   consent capture.
5. Create a `CONTACT_SUPERSEDED` suppression entry scoped to the prior version.
6. Leave pending messages referencing the prior version to fail their next
   recheck, cancelled with a safe reason. They are never rewritten to point at
   the new version.
7. Append audit evidence for each of the above, payload-free.

Nothing in this transaction sends anything.

## 2.3 Old-destination notification

Whether the superseded destination may be notified of the change is
`UNRESOLVED(T07-D13)`.

**Safety floor: no message is sent to the superseded destination.** The scenario
that makes change-notification attractive — an attacker changed the contact — is
the same scenario in which the old destination may be hostile, and the scenario
where it is benign is the one where a recycled number now belongs to a stranger.
Any approved notification must be justified against both, with approved generic
copy, and must not disclose that a health relationship exists.

## 2.4 Recovery

If a patient loses access to a destination, recovery runs through the approved
Task 05 identity path plus a fresh verification of a new contact version. It
never runs by lifting a suppression, by re-pointing an old version, by staff
attestation alone, or by answering questions about the record. The recovery
policy is `UNRESOLVED(T07-D12)`.

## 2.5 Shared destinations

A destination may be reachable by more than one person — a household email, a
family phone, a shared device with lock-screen previews. This is a normal
condition, not an exception.

- An approved shared-contact warning must be shown at capture. Wording and the
  detection rule are `UNRESOLVED(T07-D13/T07-P03)`; no illustrative copy is
  offered here because copy in a design document tends to become copy in a
  product.
- Whether a shared destination may be used at all, and for which purposes, is
  part of the same decision.
- Independently of that decision, external content stays generic (Workstream F).
  The shared-destination risk is a reason the generic-payload rule exists, not a
  reason to add a warning and then relax it.

## 2.6 Recycled and reassigned destinations

No reviewed Ontario source supplies a technical algorithm for recycled phone
numbers or reassigned addresses. That absence is not permission to guess.

Required behaviour independent of the unresolved policy:

- A destination's verification is bound to a version and a moment; it is not a
  permanent fact about a person.
- Any signal that the destination now reaches someone else — wrong-recipient
  report, complaint, carrier signal, dispute — suppresses immediately under the
  appropriate reason and does not wait for confirmation.
- Reverification cadence, recycled-number data sources, and dormancy handling are
  `UNRESOLVED(T07-D12/T07-D13)`.

# Part 3 — Inbound and provider-derived signals

## 3.1 Signal mapping

| Signal | Suppression | Additional action |
|---|---|---|
| Hard bounce | `HARD_BOUNCE` on the contact version and channel. | Body-free work item for review (D06). |
| Soft failure / transient | None. | Bounded retry per Workstream E only if the authority terms still hold; repeated soft failures escalate to review, not to a different channel. |
| Spam complaint | `SPAM_COMPLAINT`. | Review work item; complaint volume is an operations metric with safe labels only. |
| Deterministic opt-out signal | `PATIENT_OPT_OUT`. | Confirmation of opt-out, if any, is itself a message and requires its own authority; whether one is sent is `UNRESOLVED(T07-D14)`. |
| Ambiguous inbound text | None automatically. | Human review queue (R05). Never classified by a model or keyword heuristic. |
| Wrong-number / wrong-person reply | `WRONG_RECIPIENT`. | Privacy incident path, §3.4. |
| Carrier filtering / rate block | `PROVIDER_POLICY_BLOCK` where the block is destination- or account-specific. | Operations escalation; no channel fallback. |
| Unknown or unparseable provider event | None. Suppression is not created from an event that cannot be understood. | Quarantine and reconciliation (R02); the message stays denied by the ordinary authority terms. |

## 3.2 Opt-out classification

The opt-out contract must be deterministic and approved: an explicit, documented
set of accepted signals, evaluated by exact rules, with everything else routed to
human review.

- No AI, NLP, sentiment, embedding, or learned keyword model may classify an
  inbound message, decide urgency, or route to a clinical queue (P15, T07-31,
  T07-32). An architecture test must deny such imports rather than relying on
  reviewer vigilance.
- Ambiguity resolves toward suppression only where an approved rule says so;
  otherwise it resolves to human review. It never resolves to "keep sending."
- The accepted-signal list itself is `UNRESOLVED(T07-D14/T07-D22)` and requires
  legal input where CASL classification is in play.

## 3.3 One-way rule

Provider and inbound events may **create** suppression. They may never lift it,
weaken its scope, shorten its duration, restore consent, revive a cancelled
intent, or schedule a replacement message. This is the same rule as companion
§1.6(4), stated from the provider side because that is where it will be tested.

## 3.4 Wrong-recipient handling

1. **Contain.** Suppress the destination immediately; cancel dependent unsent
   work; revoke challenges bound to the version.
2. **Preserve.** Record safe evidence references. The reply body, the raw
   provider payload, and the destination value do not enter logs, audit,
   metrics, or queue metadata; content requiring human handling is quarantined
   through the approved containment path (T07-30).
3. **Escalate.** Route to the named privacy authority under the approved runbook
   (T07-D28). The software does not decide reportability, does not draft a
   notification, and does not close the incident.
4. **Remediate.** A new destination requires a new version, a new verification,
   and a new consent capture. Nothing is restored in place.
5. **Prevent replay.** Queued and deferred work must fail its next recheck; the
   incident must not be survivable by a message that was already leased.

# Part 4 — Interface to dispatch

This document supplies the `suppression_term` of the Workstream C
dispatch-authority query, re-derived at every evaluation point:

```text
suppression_term = the applicable ACTIVE suppression set is provably empty
                   for { custodian, subject, contact version, channel,
                         purpose, source, provider account, security }
```

Denial families, all payload-free:

| Family | Emitted when |
|---|---|
| `SUPPRESSED` | One or more applicable active entries exist. A reason subcode may be recorded internally; external-facing surfaces receive a generic denial. |
| `SUPPRESSION_UNRESOLVED` | The applicable set could not be computed. |
| `CONTACT_SUPERSEDED` | The referenced contact version is no longer current. |
| `KILL_SWITCH` | Lifecycle revision or capability state denies independently. |

## Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run (must permit only the exact case) |
|---|---|---|
| WD-16 | Each of the eleven reasons, created at each scope, denies at creation, claim, pre-dispatch, and pre-resend. | An unsuppressed exact case permits one synthetic transition. |
| WD-17 | A narrower lift never overrides a broader active entry; `GLOBAL` and `SECURITY` always win. | Precedence decisions are identical across workers, orders, and replays. |
| WD-18 | An unreadable or timed-out suppression query denies rather than treating zero rows as permitted. | A proven-empty set satisfies the term exactly once. |
| WD-19 | Preference, schedule, retry, staff resend, provider "deliverable," and prior success each fail to override suppression. | None of these paths produces an adapter call. |
| WD-20 | Email failure with an SMS destination available produces no SMS intent. | A separately consented, verified, unsuppressed SMS message is a new message with its own authority. |
| WD-21 | `delivered`, `opened`, and `clicked` events against a suppressed destination never lift, weaken, or expire the entry. | Reconciliation records evidence only. |
| WD-22 | Unsuppression without the named authority, without new evidence, or by editing the original row is refused. | An authorized lift creates a superseding entry with full audit and leaves history intact. |
| WD-23 | Contact supersession applies all seven transaction steps atomically; a partial failure rolls back entirely. | Post-transaction state shows a `PENDING` new version, superseded consent, revoked challenges, and a `CONTACT_SUPERSEDED` entry. |
| WD-24 | No message is generated to the superseded destination under any code path. | Callback and adapter counts for the old version are zero. |
| WD-25 | Ambiguous inbound text is never auto-classified; model/keyword routing imports are denied by an architecture test. | Deterministic approved signals map to exactly one suppression reason. |
| WD-26 | Reply-body canary never appears in logs, audit, metrics, traces, queue metadata, or evidence artifacts. | Quarantine path retains the content only where approved containment allows. |
| WD-27 | A wrong-recipient report cancels leased and deferred work and cannot be survived by an in-flight replay. | Incident evidence is payload-free and complete. |
| WD-28 | Retention cleanup cannot delete suppression or incident evidence under hold. | Hold state survives restart and concurrent cleanup. |

## Unresolved decisions blocking implementation

| ID | Decision | Blocks in this document |
|---|---|---|
| T07-D02 | Task 07 scope, owners, risk/autonomy tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D05 | Task 05 identity/actor/subject/delegate contract | §2.1 authorization for every contact change |
| T07-D12 | Materiality, reverification, recovery, rate limits | §2.1, §2.4, §2.6 |
| T07-D13 | Shared/recycled destination, wrong-person policy, old-destination notification | §2.3, §2.5, §2.6 |
| T07-D14 | Suppression scope hierarchy, opt-out granularity, unsuppression authority, opt-out confirmation | §1.2, §1.3, §1.7, §3.1, §3.2 |
| T07-D22 | CASL classification per purpose/template | §3.2 accepted opt-out signals |
| T07-D27 | Communication record classification and retention | §1.9 |
| T07-D28 | Wrong-recipient and privacy-breach runbook | §3.4 |
| T07-D34/D35 | Webhook and provider outcome semantics | §3.1 signal mapping fidelity |
| T07-D39 | Kill switch and delayed-work invalidation | §1.8 |

## Workstream D acceptance check — part 2 of 2

- Suppression reasons exist for patient opt-out, consent revoked, consent
  expired, wrong number/recipient, hard bounce, spam complaint, contact
  disputed, contact superseded, security or privacy incident, administrative
  hold, and provider or policy block — as distinct, non-collapsible codes.
- Suppression overrides channel preference, schedule, retry, and staff resend,
  and is never satisfied by a fallback channel.
- Precedence is deterministic, most-restrictive-wins, and an unprovable empty
  set denies.
- Unsuppression requires named authority, new evidence, and an audited
  superseding entry; it never occurs automatically, and never from a provider
  delivery event.
- Suppression neither deletes records, satisfies retention rules, revokes
  consent by itself, nor touches clinical or billing state.
- Contact change is an atomic supersession that re-evaluates consent, revokes
  challenges, suppresses the old destination, and invalidates pending work.
- No message is sent to a superseded destination under the safety floor.
- Shared and recycled destinations are handled conservatively, with approved
  warning language still outstanding.
- Inbound and provider signals map deterministically to suppression, ambiguity
  goes to humans, and no AI or keyword model classifies, routes, or prioritizes.
- Wrong-recipient handling contains, preserves payload-free evidence, escalates
  to the named authority, and never decides reportability in software.
- No policy value, hierarchy, keyword list, duration, or runbook was invented.
- No schema, migration, runtime code, provider, credential, recipient, PHI, or
  network effect was added.

## Current disposition

**Workstream D suppression and contact-change policy: complete as design
documentation.** With
[`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md),
Workstream D is complete.

- **Suppression and opt-out model:** PASS as documentation; BLOCKED on T07-D14,
  T07-D22, T07-D28.
- **Contact-change model:** PASS as documentation; BLOCKED on T07-D05,
  T07-D12, T07-D13.
- **Synthetic evidence:** NOT RUN.
- **AI urgency classification:** DISABLED by design and by required
  architecture test.
- **Real PHI, contact data, recipients, providers, or external delivery:** NO.
- **Production schema, authentication, or vendor changed:** NO.

Workstream E consumes the `suppression_term` above as part of its `DAQ`
conjunction in
[`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md).
The next safe repository slice is Workstream F — the minimal-payload template
catalogue — as documentation. Runnable synthetic implementation
remains **BLOCKED** pending T07-D02 and Task 11 Checkpoint 1. Pilot and
production remain separately blocked by all applicable G1–G6 decisions.
