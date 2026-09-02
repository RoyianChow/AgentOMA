# Task 07 — Accessibility, Language, and Responsive Design

**Workstream:** K — patient/staff control surfaces, accessibility requirements,
and the language/translation model as applied to those surfaces

**Prepared:** 2026-08-27

**Repository design baseline:** `89f7611`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
(`CommunicationPreferenceProfile`/`QuietHoursPolicy`, `language`, `accommodation_codes`,
`alternative_format_code`) · [`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md)
(Part 3 patient experience, thread lifecycle) · [`reply-and-review-queue-design.md`](reply-and-review-queue-design.md)
(staff queue routing) · [`minimal-payload-template-catalogue.md`](minimal-payload-template-catalogue.md)
(`TemplateTranslationVersion`, human-review-only translation) · [`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md)
§1.7 (truthful status wording, reused rather than re-derived here)

## Decision summary

This document specifies the patient- and staff-facing interface surfaces
Task 07 requires, and the accessibility, language, and responsive rules that
apply to them. It invents no visual design, no component library choice, and
no wording — every string it names is a placeholder for the same
human-reviewed template/translation process Workstream F already
established, not approved copy. It adds no route, component, or runtime
code; every "screen" described below is a contract for what must exist and
what it must prove, in the same way Workstream C describes fields rather
than tables.

It selects no accessibility conformance target number beyond citing the
existing platform commitment (WCAG, per the brief's zoom/reflow/keyboard/
screen-reader requirements) and invents no new language beyond what the
brief already names (English as source; Bangla-script rendering exercised in
synthetic tests without that implying Bangla is an approved production
language for every workflow — the brief states this distinction explicitly
and this document does not soften it).

# Part 1 — Patient control surfaces

Each row is a required capability, not a page — a future implementer may
combine several into one screen. Every row inherits full DAQ/authorization
rechecking from the Workstream C/D/H contracts it touches; this document
adds no new authorization rule, only the interface obligation to expose the
outcome of the existing one accessibly.

| # | Capability | Backing contract | Accessibility-specific obligation |
|---|---|---|---|
| K-P01 | View verified contact points without exposing full raw values unnecessarily | `ContactPoint.encrypted_value` (masked `A/B` view only) | Masking pattern (e.g. partial reveal) must have a screen-reader-equivalent label, not rely on visual truncation alone. |
| K-P02 | Add and verify a synthetic contact | `ContactVerificationChallenge`/`ContactVerificationEvent` | Challenge-code entry must be keyboard-operable with no time-based auto-submit that a screen-reader or switch-access user cannot keep pace with; expiry countdown (if shown) must not rely on colour alone (§3.9). |
| K-P03 | Grant channel- and purpose-specific consent | `CommunicationConsentEvent` | Each channel/purpose combination must be an independently labelled control, not a single ambiguous toggle — a screen-reader user must be able to tell *which* consent they are granting from the control's accessible name alone. |
| K-P04 | Review active consent and expiry | `CommunicationConsentGrant` | Expiry must be shown as an absolute date/time with timezone (§3.13), never a bare relative phrase like "soon." |
| K-P05 | Revoke consent | `CommunicationConsentEvent` (`WITHDRAWN`) | Must be reachable in as few steps as granting it was — the brief's "revocation is easy" validation question (§K-acceptance) is directly testable as a step-count comparison. |
| K-P06 | Select language, timezone, quiet hours, and accessibility preferences | `CommunicationPreferenceProfile`, `QuietHoursPolicy` | Timezone selection must not offer "detect automatically from IP" (`Contract 8` already forbids IP-derived timezone); quiet-hours start/end must be operable via keyboard-only time input, not a drag-only control. |
| K-P07 | Understand that preferences do not create consent | Contract 8 (`no_assumed_fallback`, preference/consent separation) | This is a comprehension requirement, not a control — the interface copy (once approved) must state the distinction plainly next to the preference controls, not only in a separate help page. |
| K-P08 | See delivery limitations | Outbox state machine §1.7 | Must use the exact truthful presentation mapping already defined (scheduled ≠ promise, delivered ≠ read) — this surface is where §1.7's rules become user-visible, so a wording review here **is** a re-check of §1.7, not a separate copy exercise. |
| K-P09 | Open the authenticated secure-message inbox | `SecureMessageThread` eligibility (Workstream H) | Every denied/unavailable eligibility outcome (H's thirteen checks) needs a distinct, plain-language, accessible explanation — not a single generic "access denied" that leaves the patient unable to tell whether the problem is fixable. |
| K-P10 | Read response expectations | `SecureMessageThread.response_wording_version` | Must be presented before the patient can send a first message (Workstream H's `PENDING_FIRST_MESSAGE_GATES` state), not buried below the composer. |
| K-P11 | Send a secure message | `SecureMessage` | Character/length limit must be visibly communicated before submission, and a submission near the limit must not silently truncate. |
| K-P12 | Withdraw from a thread | `SecureThreadParticipant` (`WITHDRAWN`) | Same reachability standard as K-P05. |
| K-P13 | Access an alternative format or channel without automatically granting new channel consent | `alternative_format_code`, Contract 8 | The alternative-format request action must be structurally separate from any consent-granting control, so a screen-reader user tabbing through the page cannot activate one while intending the other. |
| K-P14 | Handle expired, denied, unavailable, and unknown states | Every contract's terminal/`UNKNOWN` states | Each state needs its own accessible, non-alarming, plain-language message — `UNKNOWN` must not be presented as an error the patient caused, since I-11 already establishes it as a system-side fail-closed condition. |

## 1.1 The "preferences do not create consent" interaction risk

K-P06 and K-P07 sit next to each other by design. The brief's own
non-negotiable rule ("Preferences do not create consent... a preferred
channel without active consent remains unusable") is easy to violate in an
interface even when the backend is correct: if a patient selects "email" as
a preferred channel and the UI does not immediately show that email consent
is separately required, the interface *implies* a capability the account
does not have. K-P06's requirement that these be presented together, and
K-P07's requirement that the distinction be stated in-context rather than
in a help article, are the accessibility-and-comprehension enforcement of a
rule Workstream D already wrote at the data layer.

# Part 2 — Staff control surfaces

| # | Capability | Backing contract | Accessibility-specific obligation |
|---|---|---|---|
| K-S01 | View safe message-state summaries | `MessageIntent` projection (client-safe fields only) | Status must never be colour-only (§3.9); an `UNKNOWN`/`UNCERTAIN` state needs a distinct icon-plus-text treatment, not a colour variant of "pending." |
| K-S02 | View reconciliation and failure work items without body/contact leakage | `ReconciliationCase`, `CommunicationWorkItem` | List views must be operable by keyboard with visible focus on each row/action, and screen-reader row labels must convey the safe reason code, not just a generic "item 3 of 12." |
| K-S03 | Review wrong-recipient and vendor-failure events | `SuppressionEntry`, `CommunicationWorkItem` | Same as K-S02; additionally, this queue is the one the brief's "wrong number or wrong recipient" runbook depends on being usable under time pressure, so its keyboard path must not require more steps than the mouse path. |
| K-S04 | Manage authorized thread queues | `SecureMessageQueueItem` | Must expose live-region announcements when new items arrive, so a screen-reader user monitoring the queue is not required to poll it manually. |
| K-S05 | Assign a pharmacist | `SecureMessageThread.assigned_pharmacist_ref` | Assignment action must be a concurrency-safe claim (Workstream H); the interface must surface a clear, accessible conflict message if a claim loses the race, not a silent no-op. |
| K-S06 | Record administrative vs. pharmacist-review disposition | `CommunicationWorkItem.work_type_code` / `SecureMessageQueueItem.route_code` | The control must display the *trusted structural signal* the route was derived from (per §9 of the audit catalogue) so staff can verify routing was structural, never let staff type free-text that could be mistaken for a keyword-routing input. |
| K-S07 | Mark secure messaging unsuitable | `SecureMessageThread` (`MARKED_UNSUITABLE`) | Restricted to the pharmacist role per the authorization matrix; the control must be visually and semantically distinguishable from routine administrative actions so it isn't triggered accidentally. |
| K-S08 | Close a thread with an approved reason | `SecureMessageThread` (`CLOSED`) | Reason selection from a closed `SafeCode<...>` list, not free text — consistent with Contract 26's no-free-text-reason rule extending to the UI layer that produces those codes. |
| K-S09 | Inspect safe audit metadata | `CommunicationAuditEvent` (Contract 26) | Read-only, minimum-necessary display; must not attempt to reconstruct message content from metadata, and the interface itself must not offer an export path beyond what §7 ("export.allowed") of the audit catalogue already governs. |

Administrative staff see only the minimum information required for their
approved role (per the brief and the authorization matrix); technical
support does not receive message-body access by default. This document adds
no new authorization decision here — K-S01–K-S09 are staff-facing renderings
of decisions Workstream H and the audit catalogue already made.

# Part 3 — Accessibility requirements

## 3.1 Viewports

- **375px** operation without horizontal scrolling, for every patient
  surface in Part 1 and every staff surface in Part 2 that a pharmacist or
  administrator might reasonably use on a phone (queues, thread view).
- **Desktop** operation for all surfaces, with layouts that use — not merely
  tolerate — the additional width for queue/list views.

## 3.2 Keyboard

- Every control in Part 1 and Part 2 must be reachable and operable by
  keyboard alone, including consent toggles, quiet-hours time inputs,
  thread-claim actions, and the message composer.
- No essential action may depend on hover-only affordance (e.g., a
  hover-revealed "withdraw" action with no keyboard-focus equivalent).
- No keyboard trap: a user tabbing into the message composer, a modal
  confirmation (e.g. "mark unsuitable"), or a time-input widget must be able
  to tab back out.

## 3.3 Visible focus

Every interactive element in Part 1/Part 2 must show a visible focus
indicator meeting the platform's existing contrast standard. This applies
with equal force to staff queue rows and patient preference controls — the
brief does not scope this requirement to patient surfaces only.

## 3.4 Semantics

- Logical heading structure and landmarks on every surface (inbox, thread,
  preference pages, staff queues).
- Every form control has a programmatic label; every error is associated
  with its control via the platform's standard error-association mechanism
  (not colour or proximity alone).
- Screen-reader accessible names must distinguish otherwise-similar controls
  — e.g., "Grant email consent for appointment reminders" and "Grant SMS
  consent for appointment reminders" must not both announce as "Grant
  consent."

## 3.5 Live announcements

- Consent grant/revocation confirmation.
- New message arrival in an open thread.
- New item in a staff queue (K-S04).
- State changes that occur without a full page reload (e.g. a claim
  succeeding or losing a race, K-S05).

## 3.6 No essential hover-only behaviour

Restated from §3.2 because the brief lists it as its own accessibility
requirement, not only a keyboard requirement: any information revealed only
on hover (a tooltip explaining a safe reason code, for instance) must have a
non-hover equivalent (focus-triggered, or always-visible).

## 3.7 Status independent of colour

Every state surface in Parts 1–2 — delivery status, consent status, thread
state, work-item state, reconciliation state — pairs colour with text and/or
an icon with a distinct shape, not colour alone. This directly serves the
outbox state machine's own §1.7 rule that a surface must show truthful
uncertainty rather than "guess more," since a colour-only "yellow means
maybe" affordance is exactly the kind of overstatement §1.7 forbids in
words.

## 3.8 Reduced motion

Any transition or loading animation (queue refresh, message-send
confirmation, live-region update) respects the platform's reduced-motion
preference and has a static equivalent.

## 3.9 Zoom and reflow

**200% and 400% zoom** must reflow every surface in Parts 1–2 without loss
of content or function and without introducing two-dimensional scrolling,
per the same standard the brief's evidence requirements name explicitly.

## 3.10 Long translated labels and Bangla-script rendering

- Every label, button, and status string must tolerate translated text
  significantly longer than the English source without truncation,
  overlap, or breaking the 375px layout.
- Bangla-script rendering (correct shaping, line-height, and reading order)
  must be exercised in synthetic accessibility tests specifically, because
  it is the one script in this project's synthetic-fixture set (per the
  brief) that most readily exposes Latin-only font-stack or line-height
  assumptions.
- Exercising Bangla-script rendering in tests is **not** an approval of
  Bangla as a production language for any Ontario workflow — that remains a
  separate, unresolved policy and jurisdiction question (see
  `communications-standards-and-policy-mapping.md`'s jurisdiction-separation
  rule and the brief's own instruction not to conflate Bangladesh
  data-location questions with Ontario consent questions).

## 3.11 56px frequent-action targets

Frequent mobile actions — claiming a queue item, sending a message,
confirming consent — use a minimum 56px touch target, larger than a generic
minimum-target guideline, because these are the specific actions the brief
calls out as needing one-handed, high-frequency operability (e.g. a
pharmacist working a queue between other tasks).

## 3.12 Plain-language errors

Every error state in Parts 1–2 (K-P14, and staff-side denial/failure states)
uses plain language, not a raw safe-code or exception identifier. The safe
code remains the audit/log-visible identifier (per the logging document);
the human-visible text is a separately reviewed, approved string mapped from
it — never the code itself rendered as if it were copy.

## 3.13 Clear absolute times with timezone

Every timestamp shown to a patient or staff member (consent expiry, quiet
hours, message received time, work-item due time) is rendered as an
absolute date/time with an explicit timezone label, never a bare relative
phrase ("in 2 days") without also stating the absolute value, and never a
timezone-naive value — consistent with the state machine's own "store
absolute UTC instants plus decision timezone" rule extended here to what the
user actually sees.

## 3.14 Accessible non-digital or alternate-channel support path

An accessible non-digital or alternate-channel support path must exist for
a patient who cannot use a given digital channel at all — not merely an
accessible *digital* alternative. This path is defined by approved
operations policy (`T07-D21`, existing), and this document does not invent
what that path is; it requires that Part 1's interfaces (K-P13 specifically)
surface *that such a path exists and how to reach it*, without assuming the
path itself is another screen in this same system.

# Part 4 — Language and translation, as applied to these surfaces

- Every string in Parts 1–2 is rendered only from an approved,
  human-reviewed template or translation version (`CommunicationTemplateVersion`,
  `TemplateTranslationVersion`) — machine translation of any clinical or
  consent-bearing string is out of scope, matching Workstream F.
- Where an approved translation is unavailable for a patient's selected
  language, the interface falls back to the approved default-language
  template, never to a machine translation, and the fallback itself must be
  disclosed to the patient in an accessible way (not a silent substitution).
- `CommunicationPreferenceProfile.translation_policy_version` is the exact
  version governing which languages are currently approved for a given
  surface; the interface reads this rather than hardcoding a language list.

# Part 5 — Evidence plan (planned, not executed)

Mirroring Workstream E's "planned red/green pair" discipline, every item
below is planned evidence, not a completed test. None may run before
`T07-D02` and Task 11 Checkpoint 1, since none of the interfaces in Parts 1–2
exist yet.

| ID | Evidence | Proves |
|---|---|---|
| WK-01 | 375px screenshot walkthrough, patient consent/preference flow | K-P01–K-P07 render and operate at 375px |
| WK-02 | 375px screenshot walkthrough, secure-message flow | K-P09–K-P12 render and operate at 375px |
| WK-03 | 375px screenshot walkthrough, pharmacist queue | K-S01–K-S08 render and operate at 375px |
| WK-04 | Desktop walkthrough, patient and pharmacist flows | Parts 1–2 at desktop width |
| WK-05 | Full keyboard-only traversal, every surface | §3.2, no keyboard trap, all controls reachable |
| WK-06 | Screen-reader semantic inspection | §3.4, distinct accessible names, live-region announcements (§3.5) |
| WK-07 | 200%/400% zoom and reflow capture | §3.9 |
| WK-08 | Reduced-motion capture | §3.8 |
| WK-09 | Long-label and Bangla-script rendering capture | §3.10 |
| WK-10 | Quiet-hours/timezone state capture, including a DST boundary case | §3.13, consistent with the state machine's DST determinism rule |
| WK-11 | Consent withdrawal walkthrough, step-count comparison against grant | K-P05 reachability standard |
| WK-12 | Wrong-recipient work-item walkthrough | K-S03 |
| WK-13 | Provider-outage and reconciliation staff-view walkthrough | K-S02 |
| WK-14 | Secure-message unsuitable/expired/denied state walkthrough | K-P14, K-S07 |
| WK-15 | 56px frequent-action target measurement | §3.11 |
| WK-16 | Colour-independent status audit (grayscale/colour-blind simulation pass) | §3.7 |
| WK-17 | Plain-language error copy review against the safe-reason-code list | §3.12, and cross-checked against `communication-audit-event-catalogue.md`'s reason codes so no code is exposed verbatim as copy |

All evidence must use only synthetic, unmistakably labelled data with
generic filenames, per the brief's fixture requirements — the same
constraint every prior workstream's planned evidence already carries.

# Part 6 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 (existing, reused) | All planned evidence (WK-01–WK-17), since no interface exists to capture it from |
| T07-D18 | Status wording and template/copy review (existing, reused) | K-P08's exact copy, and every plain-language error string in §3.12 |
| T07-D20 | Response expectations, non-monitoring, and urgent-path wording (existing, reused) | K-P10 |
| T07-D21 | Alternative accessible channel and accommodation catalogue (existing, reused) | §3.14 |
| T07-D50 | Whether a WCAG conformance level beyond the brief's explicit list (keyboard, focus, zoom/reflow, screen-reader, reduced motion, colour independence, 56px targets) is separately targeted for formal audit | §3 generally |
| T07-D51 | Component/design-system choice for the controls in Parts 1–2 (this document specifies behaviour, not a library) | Implementation only, not this document |

## Workstream K acceptance check

- Every patient control the brief's "Patient controls" list names has a
  corresponding row in Part 1, with its backing contract and its
  accessibility-specific obligation stated — not merely restated as a
  bullet with no added requirement.
- Every staff control the brief's "Staff controls" list names has a
  corresponding row in Part 2, on the same basis.
- Every accessibility requirement the brief's "Accessibility requirements"
  list names has its own numbered subsection in Part 3 — none folded
  silently into another to save space.
- The interaction between preferences and consent (§1.1) is called out as a
  UI-level enforcement of an existing data-layer rule, not a new rule.
- Bangla-script testing is explicitly separated from Bangla production
  approval, matching the brief's own caution against conflating the two.
- No visual design, component library, or copy was approved; every string
  referenced remains subject to the same human-review process Workstream F
  already established.
- This document adds no TypeScript, CSS, component, route, or runtime
  effect.

## Current disposition

**Workstream K — accessibility, language, and responsive design: complete as
design documentation.**

- **Accessibility evidence:** PASS as documentation; BLOCKED on T07-D02 for
  any capture, since no interface exists yet.
- **Language evidence:** PASS as documentation; BLOCKED on T07-D02 and on
  which languages are approved for which surface (a policy question this
  document does not resolve).
- **375px and desktop evidence:** PASS as documentation; BLOCKED on T07-D02.
- **Keyboard and screen-reader evidence:** PASS as documentation; BLOCKED on
  T07-D02.
- **200% and 400% zoom/reflow:** PASS as documentation; BLOCKED on T07-D02.
- **56px frequent-action targets:** PASS as documentation; BLOCKED on
  T07-D02.
- **Real PHI, contact data, or runtime effect:** NO.
- **Production schema, authentication, or vendor changed:** NO.

The next safe repository slice is **Workstream L — operational runbook and
incident handling** — as documentation, following the identical pattern.
Runnable synthetic implementation for any workstream remains **BLOCKED**
pending T07-D02 (Task 07 scope approval and Task 11 Checkpoint 1). Pilot and
production remain separately blocked by all applicable G1–G6 decisions named
across the full Workstream A–K document set.
