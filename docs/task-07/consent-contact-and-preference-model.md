# Task 07 — Consent, Contact Verification, and Preference Model

**Workstream:** D — fail-closed consent, contact-verification, quiet-hours,
timezone, language, and accessibility behaviour

**Prepared:** 2026-08-06

**Repository design baseline:** `023af56b35afba29cc2cf7081b7ee29eda3d6a73`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companion document:** [`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md)

## Decision summary

This document defines the behavioural rules that govern communication consent,
contact-point verification, quiet hours, timezone handling, and language and
accessibility preferences for Task 07. It is the behavioural layer over the
Workstream C contracts: Workstream C says what a field is, this document says
what the server must decide.

It adds no TypeScript, SQL, Drizzle schema, endpoint, worker, provider,
credential, recipient, or network effect, and it selects no unresolved policy
value. Consent wording, expiry periods, verification methods, rate-limit
thresholds, quiet-hour windows, supported languages, cadence, and accommodation
catalogues remain the property of their named approvers. Where a value is
unresolved, this document states the shape the decision must take and the
fail-closed behaviour that applies until it lands — it does not choose one.

Two rules govern every section below:

1. **Unknown denies.** A missing, malformed, contradictory, expired, stale, or
   unresolvable term produces a safe denial with an allowlisted reason code, not
   a best-effort send.
2. **Nothing here is authority.** A rule appearing in this document does not
   make a capability approved, implemented, or safe to run. Runnable synthetic
   code remains blocked pending T07-D02 (Task 07 scope, owners, risk/autonomy
   tier, expiry, kill-switch operator) and Task 11 Checkpoint 1.

## Scope and limits

In scope for this document:

- the consent tuple, state machine, recheck points, withdrawal cascade, and
  consent-separation rules;
- contact-point verification lifecycle, challenge handling, anti-enumeration,
  and the contact-version boundary;
- quiet-hours and timezone evaluation, including DST determinism, deferral, and
  expiry; and
- language, translation, and accessibility-preference behaviour.

Out of scope for this document, by explicit deferral:

- suppression precedence, unsuppression authority, and the contact-change and
  wrong-recipient policy — these are the companion document;
- outbox/state-machine mechanics, retry, and reconciliation (Workstream E);
- template copy and the payload catalogue (Workstream F);
- provider adapters, webhooks, and cancellation APIs (Workstream G); and
- secure-thread participation and reply queues (Workstream H).

This document does not implement or change a verification provider, an
authentication flow, a session model, or any Task 05 identity behaviour.

## Modelling conventions

| Convention | Meaning |
|---|---|
| `PERMIT` | Every required term resolved to an explicit affirmative at server time. |
| `DENY(<code>)` | Denial with an allowlisted `SafeCode` reason; no free text, no destination, no challenge value, no provider payload. |
| `DEFER(<code>)` | The evaluation is not a denial of authority but the effect may not occur now; the item remains subject to expiry. |
| `UNRESOLVED(T07-Dxx)` | The rule's value is a named human decision. The safety floor applies until it is recorded. |
| Safety floor | The conservative behaviour that applies while a decision is unresolved. It is a fail-closed placeholder, **not** an approved policy and never a default to ship. |

Reason codes are structural, not clinical. No reason code may encode an ailment,
symptom, medication, appointment purpose, message excerpt, destination value, or
patient identifier.

# Part 1 — Consent

## 1.1 The consent tuple

A consent grant is exact to the following terms. A grant that matches on some
terms and not others is not a partial permission — it is `DENY`.

| Term | Source of truth | Notes |
|---|---|---|
| Custodian | Server-derived `PHARMACY_ID` | Never client-selected. One pharmacy today; the field exists so a tenant escape is structurally impossible, not to enable multi-tenancy. |
| Patient subject | Task 05 subject reference | The subject of the record, not the login identity. |
| Acting actor and grant | Task 05 actor/delegate grant version | Present whenever the actor is not the subject. |
| Contact-point version | `ContactPoint.contact_version` | The exact immutable version, never the lineage identity. |
| Channel | `CommunicationChannel` | `EMAIL`, `SMS`, `PUSH`, or `SECURE_PORTAL` where policy requires portal-modality consent. |
| Purpose | `CommunicationPurpose` registry version | Approved purpose taxonomy is `UNRESOLVED(T07-D09)`. |
| Notice version | Approved consent notice/wording version | `UNRESOLVED(T07-D10)`. |
| Policy version | Consent validity policy version | Governs capture method, expiry, agent handling, jurisdiction. |
| Time | Server/database clock | Evaluated at each recheck point, never cached from scheduling. |

Consent to one term set is never consent to another. Broadening — a new channel,
a new purpose, a new destination version, a new notice — requires a new capture.

## 1.2 Consent state machine

Events are append-only (`CommunicationConsentEvent`). The effective state
(`CommunicationConsentGrant.state`) is a projection over events plus policy time.
History is never rewritten; corrections supersede.

| Event | Precondition | Resulting effective state |
|---|---|---|
| `GRANTED` | Authenticated exact actor or valid agent grant; exact notice/policy version presented; positive opt-in action. | `ACTIVE` from `effective_at`, or `PENDING` where the approved policy requires a further confirmation step. |
| `WITHDRAWN` | Patient or valid authorized agent, through the authenticated withdrawal workflow. | `REVOKED` from `withdrawal_at`; terminal for that grant. |
| `REVOKED` | Authorized privacy/security action with a reason code. | `REVOKED`; terminal. |
| `EXPIRED` | Approved expiry reached, or the approved no-expiry policy reference is absent. | `EXPIRED`; terminal. |
| `DISPUTED` | Wrong-recipient report, contact dispute, or privacy report. | `DISPUTED`; terminal until an authorized, evidenced resolution creates a new grant. |
| `SUPERSEDED` | A newer grant covering the same tuple, or the underlying contact-point version was superseded. | `SUPERSEDED`; terminal for the old snapshot. |

Eligible for dispatch: **`ACTIVE` only.**

Every other value — `PENDING`, `EXPIRED`, `REVOKED`, `SUPERSEDED`, `DISPUTED`,
`UNKNOWN` — and any malformed, contradictory, or unreadable state is ineligible
and produces `DENY(CONSENT_NOT_ACTIVE)` with a state-specific subcode. There is
no "probably still valid" path and no operator flag that treats an ineligible
state as eligible.

`UNKNOWN` is a first-class stored value, not an error state to be cleaned up. A
projection that cannot be computed — missing event chain, unreadable policy
version, contradictory ordering — must resolve to `UNKNOWN` and deny, never to
absent-therefore-permitted.

## 1.3 The four recheck points

Consent is re-read from current server state at each of the following points.
Fields cached on the intent or outbox row record **what was evaluated**, never
**what is permitted now**.

| # | Point | What is re-read | Failure behaviour |
|---|---|---|---|
| 1 | Message creation | Full tuple; grant `ACTIVE`; purpose/channel current; contact version current and verified. | No `MessageIntent` is created. Producer state is not modified. |
| 2 | Worker claim | Grant `ACTIVE` and `authority_revision` unchanged; contact version unchanged; suppression absent; lifecycle revision current. | Lease is released or the item transitions to a terminal safe state; no adapter call. |
| 3 | Immediately before adapter dispatch | The full dispatch-authority query, inside the last internal boundary (TB-07). | `DENY` with a safe code; zero adapter calls; zero callbacks. |
| 4 | Before any manual resend | Same as (3), plus resend-specific staff authorization. | Resend refused; staff sees a generic denial reason with no destination value. |

A recheck that cannot complete — datastore unavailable, policy version
unreadable, Task 05 unreachable — is a denial, not a retry-until-permitted loop.
Retry semantics belong to Workstream E and never soften an authority denial.

## 1.4 Notice binding and provenance

Every consent event binds the exact reviewed notice the person actually saw:
`notice_version`, `language`, `policy_version`, `capture_method`,
`provenance_ref`, and where the approved method requires it, `staff_witness_ref`.

- A notice change creates a new notice version. It never edits the text a prior
  grant was captured against.
- Whether a notice change invalidates existing grants, requires re-consent, or
  applies prospectively is `UNRESOLVED(T07-D10)`. Safety floor: a grant remains
  bound to its captured notice version and a materially changed notice does not
  silently extend to it.
- Provenance is a server-owned reference to the capture transaction. Free-text
  provenance is not permitted in the consent record.
- Pre-checked boxes, silence, bundled acceptance, continued use, and "by booking
  you agree" patterns are not consent capture and must be structurally
  impossible in the capture surface, not merely discouraged in copy.

## 1.5 Withdrawal

Withdrawal is available to the patient or a valid authorized agent through an
authenticated, accessible workflow — not through a bare unauthenticated link and
not only through staff.

| Requirement | Rule |
|---|---|
| Who | Exact subject actor, or an agent with a current, unexpired, unrevoked Task 05 grant covering communication decisions. Agent scope is `UNRESOLVED(T07-D11)`; safety floor is deny where the grant does not explicitly cover it. |
| Authentication | Task 05 patient-domain session. Never a pharmacist session acting silently as the patient, and never a bearer link in an external notice. |
| Accessibility | The withdrawal path must satisfy the same accessibility requirements as the consent capture path (keyboard, screen reader, 200%/400% zoom and reflow, 375px, visible non-colour status, 56px frequent-action targets). An inaccessible opt-out is a stop condition, not a defect to schedule. |
| Granularity | At minimum per purpose and per channel. Whether an all-communications withdrawal control is offered, and its exact scope, is `UNRESOLVED(T07-D14)`. |
| Effect time | Immediate in-application effect from server receipt. An external legal processing window, if any, never delays the application-side effect. |
| Evidence | Append-only `WITHDRAWN` event with actor, grant, time, notice/policy version, and safe reason code. |

Staff-recorded withdrawal on the patient's behalf is permitted only through an
approved capture method with recorded witness evidence. That method is
`UNRESOLVED(T07-D10)`; until approved, staff-recorded withdrawal may be recorded
as a **suppression** (companion document) — which denies sending — but must not
be represented as the patient's own consent decision.

## 1.6 Withdrawal cascade

Withdrawal is not only a state change on a grant. It must invalidate work.

1. Every unsent message that depends on the withdrawn grant is cancelled or
   suppressed in the same transaction as the withdrawal event. "Unsent" includes
   scheduled, deferred, queued, leased, and retry-pending items.
2. Cancellation is recorded as a safe cancellation reason on the affected
   intents; it does not delete them and does not mutate the producing workflow.
3. Provider cancellation may be **attempted** only where an approved provider
   contract supports it (`UNRESOLVED(T07-D31/T07-D35)`). The record must state
   plainly that an attempted cancellation may not prevent a message the provider
   already accepted. Communications must never display "cancelled" as if it were
   "not delivered."
4. A late provider event arriving after withdrawal — accepted, delivered,
   bounced, opened — updates delivery evidence only. It can never restore
   consent, revive a cancelled intent, schedule a replacement, or clear a
   suppression.
5. Withdrawal never deletes consent history. The immutable event chain is the
   evidence that the person was asked, answered, and later withdrew.

## 1.7 Consent separation

These are distinct authorities. None substitutes for another, and none is
derived from another.

| Authority | Owner | Never implies |
|---|---|---|
| Treatment/assessment consent | Existing assessment workflow | Any communication consent. |
| Communication consent, external channel | Task 07 (this model) | Consent to another purpose, another channel, another destination version, or secure-portal modality. |
| Secure-messaging modality consent | Task 06 where applicable | External notification consent. |
| Portal enrollment / account creation | Task 05 | Consent to be notified externally. |
| Appointment creation | Task 04 | Consent to be reminded. |
| Contact verification success | This model, §2 | Consent, and never patient identity. |
| Prior successful delivery | Provider evidence | Continuing consent. |
| Absence of opt-out | Nothing | Consent. Silence is not consent. |

Marketing, promotional, engagement, and audience-building consent is entirely
out of scope for Task 07 and must not be capturable through any surface this
task defines.

## 1.8 History versus current state

- The event log is the record of what happened; the grant projection is the
  answer to "may we send right now."
- The projection is a convenience for querying and for the staff view. It is
  never the dispatch authority on its own — dispatch re-derives per §1.3.
- The patient-facing view must make the *current* effective state unambiguous
  in plain language while the underlying history stays intact.
- A correction creates a superseding event with a link to the corrected one. No
  destructive edit, no deletion, no backdating.

# Part 2 — Contact verification

## 2.1 What verification proves

Verification of a contact point proves exactly one thing: at the moment of
proof, the actor performing the exchange could receive a one-time challenge at
that destination.

It does **not** prove: that the destination belongs to the patient; that the
patient is who they claim; that the destination is not shared, recycled, or
monitored by someone else; that the patient consented to anything; or that the
destination is still controlled by the same person tomorrow.

Consequently a verified contact point can never authorize access to a subject,
a record, a thread, or a portal session. Task 05 remains the sole identity
authority (T07-06, TB-03).

## 2.2 Contact-point version lifecycle

A contact point is an immutable version. Its verification state is separate from
its lifecycle state, and both are separate from consent and suppression.

```text
verification_state:  PENDING → VERIFIED
                     PENDING → EXPIRED | REVOKED | DISPUTED
                     VERIFIED → REVOKED | DISPUTED | EXPIRED (per approved reverification policy)
                     any unreadable/contradictory projection → UNKNOWN

state (lifecycle):   ACTIVE → SUPERSEDED | DISPUTED | SUPPRESSED | INVALIDATED
```

Eligible as an external destination: `verification_state = VERIFIED` **and**
`state = ACTIVE` **and** no applicable active suppression. Every other
combination denies. A terminal state never reopens; recovery creates a new
version through the approved flow, never a resurrection of the old row.

Whether verification expires, and after how long, is `UNRESOLVED(T07-D12)`.
Safety floor: verification does not expire silently into a permissive state —
absent an approved reverification rule, the recorded `verified_at` and method
stand, and any policy that later introduces expiry applies prospectively through
new versions rather than by mutating history.

## 2.3 Challenge handling

| Rule | Requirement |
|---|---|
| One-time | A challenge is consumed atomically. A second consumption of the same challenge is an idempotent denial, never a second success. |
| Short-lived | `expires_at` is derived from the approved policy version stored on the challenge. The number is `UNRESOLVED(T07-D12)`; the challenge must carry the exact policy version it was issued under. |
| Digest only | Only a versioned keyed digest of the code is stored (`challenge_digest` + `digest_key_version`). The raw code exists in memory for the duration of issuance and comparison and is never persisted. |
| Never logged | The raw challenge never enters logs, audit events, metrics, traces, error messages, exception reports, evidence artifacts, provider metadata, or a staff view. Leakage tests use planted synthetic canaries and must fail deterministically (D02, P10). |
| Never returned | Issuance responses never echo the code, the destination, or a masked form precise enough to reconstruct it. |
| Attempt bounded | `attempt_count` is server-counted against a versioned policy reference. Thresholds are `UNRESOLVED(T07-D12)`. Reaching the bound moves the challenge to `LOCKED` with a safe terminal reason. |
| Revocable | A challenge is revoked immediately on contact change, subject/grant revocation, suppression, security incident, or kill switch (R01, R03). |
| Bound to a version | A challenge references an exact `ContactPointVersion`. If that version is superseded, the challenge is stale immediately and cannot verify the new version. |

Challenge issuance and challenge consumption are separately rate-limited. Both
limits are `UNRESOLVED(T07-D12)`; the design requirement is that they exist,
are enforced server-side, and are keyed on values that do not themselves leak a
destination.

## 2.4 Anti-enumeration

The verification surfaces must not reveal whether a destination, subject,
account, or relationship exists.

- Responses are generic and uniform across "unknown destination," "known but
  not eligible," "rate limited," and "already verified."
- Response timing must not distinguish those cases in a way that is usable as an
  oracle.
- Error copy never echoes the submitted destination.
- Bulk or scripted probing is bounded by the rate limits above and by
  per-recipient caps (P12), with abuse evidence recorded payload-free.
- Existence is never revealed indirectly through a differing redirect, status
  code, field-level validation message, or work-item side effect.

## 2.5 Task 05 prerequisite

Adding, changing, re-verifying, or removing a contact point requires current
Task 05 authorization for the exact actor-to-subject relationship. A client
assertion of "I am the caregiver" is not authorization. Because no Task 05
identity contract is integrated on `main` (T07-D05), every flow in this section
is **BLOCKED** for implementation and is documented here as a contract to
satisfy, not a capability to build now.

## 2.6 Material change

A material change to a destination creates a new `ContactPoint` version and
supersedes the old one. What counts as material — case, formatting, subdomain,
carrier port, push-subscription re-registration, normalization revision — is
`UNRESOLVED(T07-D12)`. Safety floor: any change that alters the normalized value
or the delivery target is material.

On supersession:

1. the new version starts at `verification_state = PENDING` and is not eligible;
2. consent tied to the superseded version is re-evaluated and becomes
   ineligible (`SUPERSEDED`) — consent does not migrate to a new destination;
3. pending challenges against the old version are revoked;
4. queued and deferred work referencing the old version fails its next recheck
   and is cancelled with a safe reason; and
5. the old destination is suppressed under the companion document's
   `CONTACT_SUPERSEDED` reason until an approved policy says otherwise.

Whether the old destination may be notified about the change is
`UNRESOLVED(T07-D13)`. Safety floor: **no message is sent to the old
destination.** A change-notification to a destination that may already be in the
wrong hands is exactly the disclosure this task exists to prevent.

## 2.7 Shared and recycled destinations

A shared-contact warning must be presented when a person supplies a destination
that policy treats as potentially shared. The exact wording, the detection rule,
and whether shared destinations are permitted at all are
`UNRESOLVED(T07-D13/T07-P03)`. Approved language is required before any copy is
presented; illustrative copy in this document would itself be a policy
invention, so none is given.

The wrong-recipient, recycled-number, and dispute flows are specified in the
companion document.

## 2.8 Explicit non-goals

This task does not implement a production verification provider, does not change
authentication, MFA, or password reset, and does not create a second identity
system. Any of those is a separate brief under Task 05.

# Part 3 — Quiet hours and timezone

## 3.1 Timezone source

| Rule | Requirement |
|---|---|
| Explicit source only | The evaluation timezone is an explicitly selected or account-approved IANA zone recorded with `timezone_provenance`. |
| Never inferred | IP geolocation, request headers, carrier prefix, browser locale, and phone-number country code are **not** timezone sources. |
| Recorded per version | A timezone change creates a new `CommunicationPreferenceProfile` (and `QuietHoursPolicy`) version and triggers recalculation of pending work. |
| Unknown denies | Absent an explicit or account-approved zone, quiet-hours evaluation cannot be performed, so scheduling of a quiet-hours-governed message is `DENY(TIMEZONE_UNRESOLVED)` rather than a fallback to a server or pharmacy default. |
| Pinned tz data | The IANA tz database version used for evaluation is recorded with the decision, so a rule evaluated today is reproducible tomorrow and a tz-data update cannot silently change a stored verdict. |

## 3.2 Evaluation at dispatch

Quiet hours are applied **at dispatch**, not only at scheduling. A message
scheduled inside an allowed window and dispatched late must be re-evaluated
against the current policy version, the current profile version, and the current
local time. Passing at schedule time authorizes nothing.

## 3.3 DST determinism

Local-time windows are evaluated against instants. Two cases have no single
local answer and must be resolved by an explicit, recorded rule
(`UNRESOLVED(T07-D16)`):

| Case | Example shape | Required property |
|---|---|---|
| Skipped local time (spring forward) | A window boundary that does not exist on that date. | The rule must map the boundary to a defined instant deterministically. |
| Ambiguous local time (fall back) | A window boundary that occurs twice. | The rule must choose one occurrence deterministically and record which. |

Safety floor until T07-D16 is approved: if either interpretation of an ambiguous
or skipped boundary would place the current instant inside a quiet window, the
instant is treated as quiet — `DEFER(QUIET_HOURS)`. Ambiguity resolves toward
not sending, never toward sending.

Boundary inclusivity (whether a window's start and end instants are themselves
quiet) is part of the same unresolved decision and must be stated explicitly
rather than inherited from an implementation detail.

## 3.4 Deferral versus expiry

A quiet-hours block is a `DEFER`, not a `DENY` of authority — but a deferral
never becomes an entitlement to send later.

1. A deferred message moves to the next allowed instant **only if** it is still
   useful: the source event is current, `source_useful_until` has not passed,
   and the intent has not expired.
2. If the useful window passes while deferred, the message **expires**. It is
   not sent late, not converted to another channel, and not converted to another
   purpose.
3. Expiry is recorded with a safe reason code and produces no external effect.
4. Cadence, maximum attempts, and useful-until values are `UNRESOLVED(T07-D15)`
   and are supplied by the producing workflow and approved policy — never
   invented by the worker.

## 3.5 No override

There is no emergency, urgent, clinical, or operator override of quiet hours or
consent in this task. An override would require an approved, human-controlled
workflow that does not exist. Its absence is deliberate: an "urgent" bypass is
the exact path by which a generic notice becomes an unconsented health
disclosure at 3am.

Patients needing urgent care are directed to approved urgent alternatives in the
portal and in approved copy (T07-P07/T07-D20, Task 06) — not to a louder
notification.

## 3.6 Recalculation

A preference, timezone, quiet-hours-policy, consent, or contact change
recalculates pending messages. Recalculation:

- re-derives `not_before` and re-evaluates eligibility for every affected
  pending item;
- may defer, cancel, or expire an item; it may **never** advance an item to send
  sooner than the new policy permits, resurrect a cancelled item, or change an
  item's purpose or channel;
- is recorded as scheduling-state evidence, not as a mutation of the logical
  message's purpose, channel, or authority; and
- is idempotent — repeated recalculation with unchanged inputs produces an
  unchanged result.

# Part 4 — Language and accessibility preferences

## 4.1 Human-reviewed content only

Every external template and every translation must be human-reviewed and
published as an immutable version. There is no runtime translation, no
model-generated copy, and no vendor auto-localization in Task 07.

- Supported languages are `UNRESOLVED(T07-D19)`. English UI is the current
  repository state; that is a fact, not an approved communication language
  policy.
- Translation review requires an approved bilingual reviewer and placeholder
  parity with the source version (`placeholder_parity_hash`).

## 4.2 Fallback

If a preferred language has no published, approved translation for the exact
template version, the fallback is the **approved default template** — never
machine translation and never a partially translated hybrid. If no approved
default exists for that purpose and channel, the result is
`DENY(TEMPLATE_UNAVAILABLE)`; no message is sent in a language nobody approved.

## 4.3 Secure clinical content

Secure portal content is never machine-translated under this task, with or
without consent, and regardless of the patient's stated preference. Where a
professional communication needs another language, that is a Task 06 and
professional-workflow decision, not a rendering feature.

## 4.4 Version preservation

The exact `template_version_ref` and `translation_version_ref` used are recorded
on the intent and preserved in evidence. A later withdrawal or republication of
a template does not rewrite what was sent; it makes pending work stale, which
the dispatch recheck then denies.

## 4.5 Accessibility

| Requirement | Rule |
|---|---|
| Accommodation storage | Accommodation and alternative-format preferences are stored as approved `SafeCode` values only. No diagnosis, disability description, or free text enters the preference record — minimum necessary applies to accessibility data too. |
| Long labels | Synthetic accessibility tests must exercise long labels and long translated strings without truncation that removes meaning, overlap, or loss of focus order. |
| Bangla script | Synthetic tests must include Bangla-script rendering (font fallback, line breaking, input, and reflow). This proves rendering only. It does **not** imply Bangla is approved for any Ontario workflow, and it must not be presented as an available patient language until T07-D19 approves it. |
| Alternative path | An accessible portal path must exist whenever a patient cannot use a given external channel. The portal must never be the only route, and an external channel must never be the only route. Alternative-channel policy is `UNRESOLVED(T07-D21)`. |
| Evidence bar | 375px and desktop, keyboard, screen reader, 200% and 400% zoom/reflow, reduced motion, contrast, visible focus, non-colour status, and 56px frequent-action targets. All currently **NOT RUN**. |

Preferences select among already-permitted choices. A language, format, or
channel preference never creates consent, never overrides suppression, and never
authorizes a channel the patient has not consented to.

# Part 5 — Interface to dispatch

This model contributes the following terms to the Workstream C dispatch-authority
query. Each is re-derived at dispatch; none may be satisfied from a value cached
on the outbox row.

```text
consent_term      = exact grant ACTIVE for custodian, subject, actor/grant,
                    contact version, channel, purpose, notice, policy, at now
contact_term      = exact contact version VERIFIED and ACTIVE
suppression_term  = no applicable active suppression   (companion document)
schedule_term     = quiet-hours/timezone policy permits now, using the recorded
                    IANA zone and pinned tz-data version
content_term      = approved template version, and approved translation version
                    or approved default, currently published
```

Denial families, all payload-free:

| Family | Emitted when |
|---|---|
| `CONSENT_NOT_ACTIVE` | Any non-`ACTIVE` or unresolvable grant state. |
| `CONSENT_SCOPE_MISMATCH` | Grant exists but does not match one or more tuple terms. |
| `CONTACT_NOT_ELIGIBLE` | Not verified, not active, superseded, disputed, or unknown. |
| `TIMEZONE_UNRESOLVED` | No explicit or account-approved IANA zone. |
| `QUIET_HOURS` | Deferral inside a quiet window, including the ambiguity safety floor. |
| `WINDOW_EXPIRED` | Useful-until or intent expiry passed. |
| `TEMPLATE_UNAVAILABLE` | No published approved template/translation and no approved default. |
| `AUTHORITY_UNAVAILABLE` | A required authority source could not be read. |
| `POLICY_UNRESOLVED` | A required policy version is absent — the "we have not decided yet" denial. |

No denial family may be satisfied by a fallback, a preference, a prior
successful delivery, or an operator flag.

## Planned synthetic evidence — NOT RUN

Every item below is a planned red/green pair. None has been executed; none may
be executed before T07-D02 and Task 11 Checkpoint 1.

| ID | Red run (must fail closed) | Green run (must permit only the exact case) |
|---|---|---|
| WD-01 | Absent, `PENDING`, `EXPIRED`, `REVOKED`, `SUPERSEDED`, `DISPUTED`, `UNKNOWN`, and malformed consent each deny at creation and at dispatch. | An exact `ACTIVE` grant permits one synthetic transition. |
| WD-02 | Grant valid at queue time, then withdrawn/expired/superseded before dispatch: adapter call count stays zero. | Unchanged authority permits exactly one adapter call. |
| WD-03 | Consent for purpose A, channel A never satisfies purpose B or channel B. | Each exact pair permits only itself. |
| WD-04 | Withdrawal cancels every unsent dependent item in one transaction, including leased and retry-pending. | Post-withdrawal state shows zero pending dependents and intact history. |
| WD-05 | A late provider event after withdrawal cannot restore consent, revive an intent, or schedule a replacement. | Delivery evidence updates; authority state is unchanged. |
| WD-06 | Duplicate challenge consumption, expired challenge, over-limit attempts, and revoked challenge all deny. | One valid consumption verifies exactly one contact version. |
| WD-07 | Raw challenge canary never appears in logs, audit, metrics, traces, errors, artifacts, or provider metadata. | Scans pass with the canary planted and the failure path exercised. |
| WD-08 | Unknown/known/rate-limited/already-verified verification responses are indistinguishable in body and status. | Timing distribution shows no usable oracle. |
| WD-09 | Verified contact without a Task 05 grant cannot reach a subject, record, thread, or session. | Grant-backed access succeeds only for the exact actor-subject pair. |
| WD-10 | Contact supersession revokes challenges, invalidates consent, and denies queued work referencing the old version. | The new version begins `PENDING` and is ineligible until verified. |
| WD-11 | No explicit timezone denies scheduling; IP/locale/number-prefix inputs are never consulted. | An explicit IANA zone with recorded provenance evaluates deterministically. |
| WD-12 | America/Toronto spring-forward and fall-back boundaries resolve identically across repeated runs and worker restarts; ambiguity resolves to quiet. | Documented boundary instants match the recorded rule and pinned tz-data version. |
| WD-13 | A deferred message whose useful window passes expires with zero external effect. | A still-useful deferred message dispatches at the next allowed instant, once. |
| WD-14 | Missing translation never machine-translates and never renders a hybrid; absent an approved default it denies. | Approved translation renders with placeholder parity. |
| WD-15 | Preference change never advances a message earlier than policy permits and never resurrects a cancelled item. | Recalculation is idempotent under repeated runs. |

## Unresolved decisions blocking implementation

| ID | Decision | Blocks in this document |
|---|---|---|
| T07-D02 | Task 07 scope, owners, risk/autonomy tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D05 | Task 05 identity/actor/subject/delegate contract | §1.1, §1.5, §2.5, all patient-facing surfaces |
| T07-D09 | Communication purpose taxonomy | §1.1 purpose term, §1.7 separation |
| T07-D10 | Consent notice wording, capture methods, expiry/no-expiry, witness, jurisdiction | §1.1, §1.4, §1.5 |
| T07-D11 | Authorized-agent communication policy | §1.5 agent withdrawal |
| T07-D12 | Verification method, expiry/reverification, rate limits, materiality | §2.2, §2.3, §2.6 |
| T07-D13 | Shared/recycled destination and old-destination notification | §2.6, §2.7 |
| T07-D14 | Withdrawal/suppression granularity and hierarchy | §1.5, companion document |
| T07-D15 | Cadence, maximum attempts, useful-until | §3.4 |
| T07-D16 | Quiet hours, timezone, DST, boundary inclusivity, overdue handling | §3.1–§3.4 |
| T07-D19 | Supported languages, translation and fallback policy | §4.1, §4.2, §4.5 |
| T07-D20 | Response-time/non-monitoring/urgent-path wording | §3.5 |
| T07-D21 | Alternative accessible channel and accommodation catalogue | §4.5 |
| T07-D27 | Communication record classification and retention | Consent/verification evidence retention |

## Workstream D acceptance check — part 1 of 2

- Consent is modelled as exact to contact-point version, channel, purpose,
  custodian, actor/grant, notice, policy, and time.
- `PENDING`, `EXPIRED`, `REVOKED`, `SUPERSEDED`, `DISPUTED`, `UNKNOWN`, and
  malformed states are all ineligible; only `ACTIVE` can permit.
- All four recheck points — creation, claim, immediately before adapter
  dispatch, and before manual resend — are specified with fail-closed behaviour.
- Consent is tied to a versioned notice with server-owned provenance.
- Withdrawal is available to the patient or a valid agent through an
  authenticated, accessible workflow, cancels every unsent dependent item, and
  cannot be reversed by a provider event.
- Provider cancellation is attempt-only and is never presented as proof of
  non-delivery.
- Purpose, channel, modality, treatment, and marketing consents are kept
  separate; marketing is out of scope entirely.
- Immutable consent history and unambiguous current state coexist.
- Contact verification proves destination control only, uses short-lived
  one-time challenges, stores only a keyed digest, is rate-limited and
  anti-enumerating, is revocable, and is never logged or audited raw.
- Verification is never treated as patient identity, and contact changes require
  Task 05 authorization.
- Material change creates a new version, re-evaluates consent, and suppresses
  the old destination; the shared-contact warning awaits approved language.
- Quiet hours use an explicit or account-approved IANA zone, are never inferred
  from IP, are applied at dispatch, handle DST deterministically with a
  documented ambiguity floor, defer only while still useful, expire otherwise,
  invent no override, and recalculate on change.
- Language and accessibility use only human-reviewed templates and translations,
  fall back to an approved default rather than machine translation, never
  machine-translate secure content, preserve versions, support long labels and
  Bangla-script rendering in synthetic tests without implying approval, and
  require an accessible portal alternative.
- No policy value, wording, duration, threshold, or language list was invented.
- No schema, migration, runtime code, provider, credential, recipient, PHI, or
  network effect was added.

## Current disposition

**Workstream D consent/contact/preference model: complete as design
documentation.** The suppression and contact-change half of Workstream D is in
[`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md).

- **Consent model:** PASS as documentation; policy values BLOCKED on T07-D09,
  T07-D10, T07-D11, T07-D14.
- **Contact verification model:** PASS as documentation; BLOCKED on T07-D05 and
  T07-D12.
- **Preference and quiet-hours model:** PASS as documentation; BLOCKED on
  T07-D16, T07-D19, T07-D21.
- **Synthetic evidence:** NOT RUN.
- **Real PHI, contact data, recipients, providers, or external delivery:** NO.
- **Production schema, authentication, or vendor changed:** NO.

Workstream E consumes these terms as the `DAQ` conjunction in
[`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md).
Workstream F supplies the approved-default template and the
`TEMPLATE_UNAVAILABLE` denial that §4.2's language fallback depends on. The next
safe repository slice is Workstream G — the provider adapter, webhook security,
and reconciliation design — as documentation. Runnable synthetic implementation
remains **BLOCKED** pending T07-D02 and Task 11 Checkpoint 1. Pilot and
production remain separately blocked by all applicable G1–G6 decisions.
