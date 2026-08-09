# Task 07 — Minimal-Payload Template Catalogue

**Workstream:** F — versioned, allowlist-driven template registry and the
generic-payload boundary

**Prepared:** 2026-08-06

**Repository design baseline:** `77b1959922c02f3b367879525bd0d08d00b48604`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`communication-contracts-and-schema-proposal.md`](communication-contracts-and-schema-proposal.md)
(Contracts 10–12) · [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
(language and fallback) · [`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md)
(the `content_term` of the dispatch-authority query)

## Decision summary

This document defines the template registry: how a communication's rendered
output is constrained so that an external channel can carry an administrative
notice without disclosing that a person has a health relationship with a
pharmacy, let alone what it concerns.

It adds no TypeScript, SQL, Drizzle schema, endpoint, worker, provider,
credential, recipient, or network effect. **It approves no template and writes no
production copy.** Wording, sender identity, brand, supported languages, and CASL
classification belong to their named approvers; this document defines the
structure those approvals will populate and the tests that will hold them.

Two constraints shape everything below:

1. **The external envelope is closed.** Generic external templates carry only
   approved static C0 copy plus a closed allowlist of C0/C1 placeholders. There
   is no dynamic clinical field, no patient identifier, no free text, and no
   staff-authored string anywhere in an external payload.
2. **A template cannot be edited.** Versions are immutable. Change means a new
   version and a new approval; removal means withdrawal, which makes pending work
   stale rather than rewriting what was already sent.

## A conflict this document will not resolve

The brief's own illustrative strings say **AgentRx**. The program index says
AgentRx is the autonomous-program label only, and that the live product, routes,
packages, and environment variables are **AgentOMA** with no rename authorized.
Sender identity and brand are separately unresolved as `T07-D17`/`T07-P04`.

This document therefore treats brand as an **unresolved slot**, never a literal.
It does not adopt AgentRx, does not substitute AgentOMA, and does not quietly
pick the one that reads better. Per the program's known-doc-conflict rule, this
is surfaced to the product lead rather than settled here.

The same caution applies to the sender display name, the legal sender identity,
the sending domain, and the telephone number or short code — none exists, and
none may be invented to make a fixture look realistic.

## Scope and limits

In scope: registry identity and versioning; the nine required template classes;
placeholder allowlists and types; the verification-challenge exception; the URL
contract; the rendering contract; the review boundary; the forbidden-data list
and its leakage tests.

Out of scope, by explicit deferral: provider adapter and webhook mechanics
(Workstream G); secure-thread composition and reply queues (Workstream H);
producer contracts for appointments and follow-ups (Workstream I); and the audit
event catalogue and retention mapping (Workstream J).

## Conventions

`PERMIT`, `DENY(<code>)`, `UNRESOLVED(T07-Dxx)`, and safety floor carry the
meanings defined in the Workstream D companions. Data classes C0–C5 and exposure
codes are those of Workstream C.

# Part 1 — Registry model

## 1.1 Identity and versioning

Three levels, per Contracts 10, 11, and 12:

| Level | Immutable? | Carries |
|---|---|---|
| `CommunicationTemplate` (family) | Identity is immutable | Purpose family, channel, content class, owning governance role, family state. |
| `CommunicationTemplateVersion` | Fully immutable once published | Reviewed source-language subject and body, placeholder allowlist, renderer version, content hash, approvals, effective and withdrawal times. |
| `TemplateTranslationVersion` | Fully immutable once published | Human-reviewed translation bound to one source version, placeholder parity hash, reviewer evidence. |

A family never changes channel, purpose, or content class. Broadening any of
those means a **new family**, because each carries a different review
requirement — and a family that silently changed content class from
`GENERIC_EXTERNAL` to `SECURE_PORTAL` would be a PHI leak with an approval
record attached to it.

## 1.2 Lifecycle and separation of duties

```text
DRAFT → APPROVED → PUBLISHED → WITHDRAWN
  ↑        │
  └────────┘  (revision creates a NEW version; it never edits an existing one)
```

| Rule | Requirement |
|---|---|
| Author ≠ reviewer ≠ publisher | Enforced server-side. A single actor cannot author, approve, and publish the same version. |
| Approval is per version | An approval never carries forward to the next version, however small the change. |
| Publication requires every approval its content class and channel demand | Product, privacy, professional, accessibility, and legal as applicable — see §1.4. |
| Withdrawal is not deletion | `WITHDRAWN` stops new rendering; the version and its history remain for audit and for interpreting what was already sent. |
| No silent republish | A withdrawn version cannot return to `PUBLISHED`. A replacement is a new version with new approvals. |
| Kill switch | An authorized operator may withdraw a version or a whole family immediately; pending intents then fail their next `content_term` check (Workstream E). |

## 1.3 Effective and retirement dates

Each version carries an effective instant and an optional retirement instant.
Rendering is permitted only inside that window **and** while the version is
`PUBLISHED`. A future-dated or retired version is not a fallback — an intent that
resolves to one denies with `TEMPLATE_UNAVAILABLE`.

Retirement of a version does not retire its translations implicitly; each
translation is bound to a source version and becomes unusable with it.

## 1.4 Required approvals before activation

| Content class | Channels | Required approvals |
|---|---|---|
| `GENERIC_EXTERNAL` | Email, SMS, Push | Product, privacy, accessibility, legal (CASL classification per `T07-D22`), and professional where the notice touches care workflow. |
| `SECURE_PORTAL` | Portal only | The above plus professional/records review, since content may enter the patient record (`T07-D27`). |
| `IN_PORTAL_INSTRUCTION` | Portal only, never dispatched | Product, privacy, accessibility. |

Named approvals are recorded as `approval_refs`; no approver approves their own
authored version. A green test suite is not an approval, and neither is this
document.

# Part 2 — The nine template classes

All nine are **DRAFT structures only**. None is approved, and several are
blocked on a producer that does not exist.

| # | Class code | Purpose family | Channels | Content class | Producer | Status |
|---|---|---|---|---|---|---|
| F-01 | `APPOINTMENT_REMINDER` | Appointment reminder | Email, SMS, Push | `GENERIC_EXTERNAL` | Task 04 appointment service | **BLOCKED** — `T07-D03`, no appointment runtime on `main` |
| F-02 | `APPOINTMENT_CHANGED` | Appointment change notice | Email, SMS, Push | `GENERIC_EXTERNAL` | Task 04 | **BLOCKED** — `T07-D03` |
| F-03 | `APPOINTMENT_CANCELLED` | Appointment cancellation notice | Email, SMS, Push | `GENERIC_EXTERNAL` | Task 04 | **BLOCKED** — `T07-D03` |
| F-04 | `FOLLOWUP_ITEM_AVAILABLE` | Follow-up notice | Email, SMS, Push | `GENERIC_EXTERNAL` | Existing follow-up service | **BLOCKED** for delivery — `T07-D04`; the follow-up workflow stays authoritative and this notice never closes it |
| F-05 | `SECURE_MESSAGE_AVAILABLE` | Secure-item notice | Email, SMS, Push | `GENERIC_EXTERNAL` | Task 06 / secure thread service | **BLOCKED** — `T07-D06`; carries no excerpt, no participant, no thread reference |
| F-06 | `CONTACT_VERIFICATION_CHALLENGE` | Contact verification | Email, SMS | `GENERIC_EXTERNAL` **with the §4 exception** | Task 07 verification service | **BLOCKED** — `T07-D12`; the only class carrying a secret |
| F-07 | `CONSENT_PREFERENCE_CONFIRMATION` | Account/consent action | Email | `GENERIC_EXTERNAL` | Task 07 consent service | **CONDITIONAL** — exists only if `T07-D10`/`T07-D14` approve sending it at all |
| F-08 | `DELIVERY_PROBLEM_INSTRUCTION` | In-portal instruction | Portal only | `IN_PORTAL_INSTRUCTION` | Task 07 | Never dispatched externally; shown to a signed-in patient whose external channel is failing |
| F-09 | `OPT_OUT_ACKNOWLEDGEMENT` | Opt-out acknowledgement | Email, SMS | `GENERIC_EXTERNAL` | Task 07 suppression service | **CONDITIONAL** — `T07-D14`, `T07-D22`, plus provider policy. See the warning below |

**F-09 warning.** An opt-out acknowledgement is a message sent to someone who
just asked not to be messaged. Whether it is required, permitted, or prohibited
depends on the legal classification of the original message and on provider
behaviour; it also cannot be sent if the resulting suppression bars the channel.
The safety floor is **do not send** — record the opt-out, show confirmation in
the authenticated portal, and let legal decide whether an external
acknowledgement is owed.

**F-05 boundary.** The notice may say only that a secure item is available. Not
who sent it, not what it concerns, not an excerpt, not a thread identifier, not
whether it is clinical. A patient with a lock-screen preview must learn nothing
beyond "sign in."

# Part 3 — Synthetic wording fixtures

## 3.1 What the brief supplies

The task brief supplies illustrative strings and labels them explicitly as
placeholders for testing that are **not approved production wording**. They are
reproduced here unchanged, as the brief's own fixtures, so that this catalogue
does not silently substitute a different sample:

> "You have an upcoming AgentRx appointment. Sign in to the secure portal for
> details." · "An AgentRx appointment was updated…" · "An AgentRx appointment was
> cancelled…" · "A follow-up item is available in AgentRx…" · "A new message is
> available in AgentRx. Sign in to view it securely." · "Your AgentRx
> verification code is {code}. It expires soon. Do not share it."

## 3.2 How they may be used

| Rule | Requirement |
|---|---|
| Fixtures only | These strings live in the Task 01 synthetic fixture set. They never populate a production template row and never reach a real recipient. |
| Brand is a slot | Every occurrence of the product name is the unresolved `{brand}` slot of §0. A fixture renders it as an obvious synthetic marker, not as either real product name. |
| Not a starting draft | These are not a head start on approved copy. Real copy is authored by the approved owner against `T07-D18`, reviewed, and versioned — not derived from a design document. |
| Marked | Rendered synthetic artifacts carry the sandbox banner and the `SYNTHETIC-NOT-FOR-CARE-` filename prefix required by the program rules. |
| No new samples | This document adds no additional illustrative copy of its own. Sample copy in a design document has a habit of becoming product copy. |

## 3.3 What even the fixtures already reveal

Worth stating plainly, because it shapes the approval question: an SMS that names
a pharmacy brand and says "you have an upcoming appointment" already discloses a
care relationship to anyone holding the phone. The generic-payload rule reduces
that disclosure; it does not eliminate it. The minimum-necessary analysis under
`T07-P01` must decide whether even the brand may appear on an unsecured channel —
that is a real question, not a formality, and this document does not answer it.

# Part 4 — Placeholder contract

## 4.1 The allowlist

Each template version declares a closed `placeholder_allowlist`. Rendering
accepts exactly that set — no more, no fewer.

| Rule | Requirement |
|---|---|
| Closed at publication | A version whose body references a placeholder outside its allowlist cannot be published. |
| Closed at render | A render call supplying an unknown key, or omitting a required one, fails closed with `DENY(TEMPLATE_RENDER_REJECTED)`. It does not render a blank, a literal `{key}`, or a partial message. |
| Typed | Every placeholder is a `SafeCode`, an approved enumerated label, or an approved static value. There is no free-text placeholder type. |
| Class-bounded | A `GENERIC_EXTERNAL` version may declare only C0/C1 placeholders. Declaring a C2+ placeholder is a publication error, not a runtime concern. |
| Parity across translations | Every translation's placeholder set must match its source version, proven by `placeholder_parity_hash`. |
| No nesting, no expressions | Placeholders are substitutions, not a template language. No conditionals, loops, includes, partials, or interpolation of one placeholder into another. |
| No HTML from data | A placeholder value is never treated as markup. Escaping is applied after substitution, per channel (§6.2). |

## 4.2 Candidate placeholder set

Structural candidates only; each still requires `T07-D18` approval, and the set
for any given version may be smaller.

| Candidate | Class | Notes |
|---|---|---|
| `{brand}` | C0 | Unresolved per §0. Whether it appears externally at all is a `T07-P01` question. |
| `{portal_url}` | C1 | The generic entry URL of §5. Constant per environment, not per patient. |
| `{sender_identification}` | C0 | Legal sender identity where CASL or policy requires it. `UNRESOLVED(T07-D17/T07-D22)`. |
| `{opt_out_instruction}` | C0 | Approved static instruction. Never a per-recipient link with an identifier in it. |
| `{code}` | **C5** | Verification challenge only. See §4 — governed by its own rules, not the ordinary allowlist. |

Everything a template might "usefully" interpolate — a name, a date, a time, a
service, a clinician, a location — is on the forbidden list in §7. The
usefulness is exactly the disclosure.

# Part 5 — The verification-challenge exception

`F-06` is the one external template that deliberately carries a secret. It gets
rules the other eight do not, because the ordinary generic-payload reasoning does
not apply to a value whose whole purpose is to be readable at the destination.

| Rule | Requirement |
|---|---|
| Generated per dispatch | The code is generated for this dispatch by the verification service. It is never read from a patient record, never reused across challenges, and never derived from anything about the person. |
| Digest-only persistence | Only a keyed digest is stored (Workstream D §2.3). The raw code exists in memory for issuance and comparison. |
| Never logged or audited | The raw code never enters logs, audit events, metrics, traces, error paths, evidence artifacts, provider metadata, or a staff view. Leakage tests plant a canary and must fail deterministically. |
| Never re-rendered | A "resend" does not re-render the same code. It is a new challenge with a new code, subject to its own rate limits. Re-rendering would require retaining the plaintext, which §2 forbids. |
| Independent expiry | The code expires on the challenge's own clock. A verification message deferred past that window **expires** rather than sending a code that will not work. |
| No link | This message carries no portal URL, no action link, and no deep link — nothing a link scanner or preview bot could fetch, and nothing that could pair a live code with a one-click action. |
| Lock-screen exposure is explicit | On SMS and push, the code is visible to anyone holding the device. That is inherent to the mechanism and must be an **accepted, recorded** risk under `T07-D12` — not an unexamined default. The "do not share it" instruction mitigates social engineering, not shoulder-surfing. |
| Never proof of identity | Successful entry proves destination control only (Workstream D §2.1). No template, copy, or UI may imply that entering the code identified the patient. |

# Part 6 — URL and rendering contract

## 6.1 The URL

One generic portal entry URL per environment. It is a constant, not a
per-recipient value.

| Prohibited in the URL | Why |
|---|---|
| Patient, appointment, follow-up, assessment, visit, pharmacy, clinician, or thread identifier | Object disclosure and enumeration. |
| Email address or telephone number | Contact disclosure through referrer, history, and scanner logs. |
| Bearer token, magic link, reusable session, or verification answer | A link would grant authority; links grant none (T07-29). |
| Ailment, medication, allergy, symptom, red-flag, referral, or claim data | PHI. |
| Any query parameter or fragment | The categories above tend to arrive as parameters, so the whole surface is closed. |

Also prohibited: tracking pixels, third-party images, link shorteners, and
redirectors. A scanner or preview bot issuing a `GET` must be unable to consume
an action, confirm an address, or advance any state. The landing page applies
no-store and no-referrer protections and requires ordinary authentication.

## 6.2 Rendering

| Rule | Requirement |
|---|---|
| Server-side only | Rendering happens on the server, from the exact published version. No client-side templating, no provider-side templating, no vendor merge-field feature. |
| Per-channel escaping | Email HTML and text parts, SMS plain text, and push title/body each have their own escaping and sanitization rules. A value safe in one is not assumed safe in another. |
| Length limits | Enforced per channel and per field. **SMS segmentation is a leakage surface**: a message that splits carries its content across messages with independent delivery, so limits are enforced before dispatch and a version that cannot fit is a publication error, not a runtime truncation. |
| No meaning-destroying truncation | Truncation must never produce a message that misleads, and must never be the mechanism by which a forbidden field is "shortened" into an external payload. |
| Deterministic | The same version plus the same allowlisted parameters produces byte-identical output, verified against `content_hash`. |
| No PHI reachable | The render surface has no read access to clinical, assessment, claim, or contact stores. This is a capability boundary, not a coding convention. |
| Fail closed | Missing version, unpublished version, retired version, missing translation with no approved default, unknown placeholder, or exceeded length all deny. Nothing renders partially. |

## 6.3 The review boundary

Every externally visible string is inside the same review boundary as the body:
email subject, preheader, sender display name, reply-to behaviour, push title,
push body, and any provider-side tag, label, or campaign name.

Provider metadata is separately allowlisted to safe channel, template, and
environment codes. A provider dashboard, support ticket, or vendor log must never
be able to show a patient identifier, an appointment purpose, or an internal
reference (T07-24).

# Part 7 — Forbidden data and leakage tests

Automated tests must reject each of the following anywhere in an external
payload — body, subject, preheader, sender name, push title, push body, URL, or
provider metadata.

| Forbidden | Test approach |
|---|---|
| Patient name or initials | Planted synthetic canary name in every candidate source field; scan all rendered output and provider payload. |
| Date of birth, age, sex, address, exact location | Canary values in fixtures; scan rendered output and metadata. |
| Health-card, prescription, claim, appointment, assessment, or record number | Pattern and canary scan. Fixtures contain no contiguous 10-digit tokens and no PIN-shaped `985…` values, per program rules. |
| Pharmacy or clinician name where it reveals a care relationship | Human privacy review plus a forbidden-term snapshot test; see §3.3 — this one is a policy question, not only a test. |
| Appointment purpose, service type, ailment, symptom, diagnosis, medication, allergy, lab, red flag, referral, clinical outcome | Forbidden-term list and placeholder-class check at publication; snapshot test at render. |
| Secure-message excerpt or participant name | Structural: the renderer has no access to secure content. Proven by capability test, then by canary scan. |
| Staff-authored free text | No free-text placeholder type exists (§4.1). Proven by publication-time type check. |
| Raw vendor metadata | Outbound field allowlist; anything unlisted is dropped, not passed through. |
| URL query parameters or fragments | URL constructor test rejects any parameter or fragment. |

Leakage tests must fail **deterministically** when a canary is planted — a test
that passes because the canary happened not to render is not evidence.

**Appointment date and time are not in the default prototype.** Any proposal to
include them in an unsecured notification requires explicit privacy and
professional approval, a documented minimum-necessary analysis, and updated
leakage tests. Until then, "when is it" lives behind sign-in.

# Part 8 — Interface to other workstreams

| Consumer | What this catalogue supplies |
|---|---|
| Workstream D | The approved-default template used when a preferred translation is unavailable; the `TEMPLATE_UNAVAILABLE` denial when none exists. |
| Workstream E | The `content_term` of the dispatch-authority query: template and translation versions current and published. Withdrawal makes pending intents stale, which the recheck then denies. |
| Workstream G | The outbound payload allowlist an adapter may transmit, and the provider-metadata allowlist. |
| Workstream H | The boundary that secure-portal content sits on the other side of; no external template ever carries thread content. |
| Workstream J | Template and translation version identifiers as audit evidence; no rendered body enters audit. |

# Part 9 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WF-01 | A version referencing an undeclared placeholder cannot be published. | A parity-complete version publishes after all required approvals. |
| WF-02 | A render call with an unknown, missing, or extra key denies; no partial, blank, or literal-brace output is produced. | An exact allowlisted parameter set renders byte-identically to `content_hash`. |
| WF-03 | A single actor cannot author, approve, and publish the same version. | Segregated actors complete the workflow. |
| WF-04 | A withdrawn, retired, future-dated, or draft version cannot render; pending intents referencing one deny. | A published, in-window version renders once. |
| WF-05 | Every forbidden-data canary — name, DOB, address, health number, ailment, medication, excerpt — is absent from body, subject, preheader, sender name, push title/body, URL, and provider metadata. | Scans pass with canaries planted and failure paths exercised. |
| WF-06 | A URL containing an identifier, contact value, token, query, or fragment fails construction. | The generic entry URL is constant per environment. |
| WF-07 | A scanner-style `GET` on the portal link consumes no action, confirms no address, and changes no state. | Ordinary authenticated navigation works unchanged. |
| WF-08 | An SMS version exceeding the single-segment limit cannot be published. | In-limit versions render without truncation. |
| WF-09 | A placeholder value containing HTML, script, or a URL is escaped per channel and never treated as markup. | Escaped output matches the snapshot for each channel. |
| WF-10 | The verification code never appears in logs, audit, metrics, traces, errors, artifacts, or provider metadata. | The digest-only path verifies exactly one challenge. |
| WF-11 | A verification "resend" never re-renders the previous code; a deferred verification message past its window expires instead of sending. | A new challenge produces a new code under its own rate limits. |
| WF-12 | The renderer cannot read clinical, assessment, claim, or secure-content stores — proven by attempted access failing on capability. | Rendering succeeds using only allowlisted parameters. |
| WF-13 | A missing translation never machine-translates and never renders a hybrid; with no approved default it denies. | An approved translation renders with placeholder parity. |
| WF-14 | Provider metadata carrying an unlisted field is dropped, not transmitted. | Only safe channel/template/environment codes appear. |
| WF-15 | No fixture, artifact, or snapshot contains a real product brand asserted as approved sender identity; `{brand}` renders as a synthetic marker. | Artifacts carry the sandbox banner and `SYNTHETIC-NOT-FOR-CARE-` prefix. |

# Part 10 — Unresolved decisions blocking implementation

| ID | Decision | Blocks in this document |
|---|---|---|
| T07-D02 | Task 07 scope, owners, risk/autonomy tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D03/D04/D06 | Task 04 appointment contract; follow-up handoff; Task 06 secure-messaging contract | F-01 through F-05 |
| T07-D09 | Purpose taxonomy | Family/purpose binding for every class |
| T07-D10/D14 | Consent policy; opt-out granularity and acknowledgement | F-07, F-09 |
| T07-D12 | Verification method, expiry, rate limits, lock-screen risk acceptance | F-06 and §5 |
| T07-D17 | Sender identity, brand, sending domain/number | §0, `{brand}`, `{sender_identification}` |
| T07-D18 | Template allowlists, copy, and review/version workflow | Every version's actual content |
| T07-D19 | Supported languages, translation and fallback policy | §1.3, WF-13 |
| T07-D21 | Alternative accessible channel and accommodation | F-08 routing |
| T07-D22 | CASL classification per purpose/template | §1.4, F-09, `{opt_out_instruction}` |
| T07-P01 | Minimum-necessary analysis, including whether brand may appear externally | §3.3 |
| T07-D27 | Record classification for secure-portal template content | §1.4 secure class |

## Workstream F acceptance check

- The registry is versioned at family, version, and translation level, with
  immutable published versions and no in-place edit.
- Author, reviewer, and publisher are separated; approval is per version; a
  withdrawn version cannot silently republish.
- Effective and retirement dates bound rendering; out-of-window versions deny
  rather than falling back.
- All nine required template classes are defined, each with its channel, content
  class, producer, and blocking dependency stated honestly.
- Channel and purpose allowlists exist, and a family never changes channel,
  purpose, or content class.
- Placeholders are a closed, typed allowlist, rejected at both publication and
  render, with translation parity and no template language.
- Rendering is server-side, per-channel escaped, length-limited before dispatch,
  deterministic against a content hash, and structurally unable to read PHI.
- Missing language or version fails closed.
- Subjects, preheaders, sender display names, push titles and bodies, and
  provider tags share one review boundary; provider metadata is allowlisted.
- The URL is generic, identifier-free, parameter-free, and scanner-safe, with no
  tracking pixel, third-party image, shortener, or redirector.
- Every forbidden-data category has a named test approach, and leakage tests must
  fail deterministically on a planted canary.
- Appointment date and time are excluded from the default prototype and require
  named approval plus a minimum-necessary analysis.
- The verification-challenge class carries explicit, distinct rules for a secret
  in an external payload, including its lock-screen exposure as a recorded risk.
- The AgentRx/AgentOMA brand conflict is surfaced, not resolved; brand is an
  unresolved slot.
- No production wording, sender identity, brand, language, or CASL conclusion was
  invented, and no additional illustrative copy was added.
- No schema, migration, runtime code, provider, credential, recipient, PHI, or
  network effect was added.

## Current disposition

**Workstream F minimal-payload template catalogue: complete as design
documentation.**

- **Template registry structure:** PASS as documentation.
- **Template content:** BLOCKED — no template is approved; `T07-D18` and
  `T07-D17` are unresolved and `T07-D22` is unassessed.
- **Template classes F-01 to F-06:** BLOCKED on their producer contracts
  (`T07-D03`, `T07-D04`, `T07-D06`, `T07-D12`).
- **Template classes F-07 and F-09:** CONDITIONAL — they exist only if policy
  approves sending them; the safety floor for F-09 is do not send.
- **Synthetic evidence (WF-01–WF-15):** NOT RUN.
- **Brand/sender identity:** UNRESOLVED and surfaced to the product lead.
- **Real PHI, contact data, recipients, providers, or external delivery:** NO.
- **Production schema, authentication, or vendor changed:** NO.

Workstream G consumes this catalogue's rendered output as the only body an
adapter may transmit — see
[`provider-adapter-contract.md`](provider-adapter-contract.md) §5. The next safe
repository slice is Workstream J — privacy, security, audit, and retention — as
documentation. Runnable synthetic implementation
remains **BLOCKED** pending T07-D02 and Task 11 Checkpoint 1. Pilot and production remain separately blocked by all applicable
G1–G6 decisions.
