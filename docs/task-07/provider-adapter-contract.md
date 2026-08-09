# Task 07 — Provider Adapter Contract

**Workstream:** G — synthetic adapter interface, capability declaration,
deterministic outcome catalogue, and vendor payload minimization

**Prepared:** 2026-08-06

**Repository design baseline:** `fe384fdba70477b7ea0b06fd6f83321a152210dd`

**Migration/runtime effect:** none

**Production approval:** not granted

**Companions:** [`webhook-and-reconciliation-design.md`](webhook-and-reconciliation-design.md) ·
[`vendor-review-scorecard.md`](vendor-review-scorecard.md)

## Decision summary

This document defines the interface between the communications control plane and
any message provider — the last internal boundary before an external effect
(TB-07). It specifies six operations, a capability declaration that makes an
adapter's limits enforceable rather than documented, a deterministic synthetic
outcome catalogue covering the eighteen scenarios the brief requires, and the
exact four things an adapter may transmit.

It adds no TypeScript, SQL, endpoint, worker, SDK, credential, sending domain,
telephone number, push certificate, webhook secret, or network effect. **No
vendor is selected and no live adapter is implemented or activated.** The
production requirements below are a gate list for a future decision, not a
description of anything that exists.

**Adapters deny by default.** An adapter that cannot prove it is the approved
one, in the approved environment, with the approved configuration, refuses to
act. A synthetic adapter that finds itself outside the synthetic environment
fails hard rather than degrading into something that might reach a person.

## Scope and limits

In scope: the adapter operation contract; capability declaration and enforcement;
the synthetic outcome catalogue and its mapping onto Workstream E state; synthetic
fixture rules; vendor payload minimization and default-off provider features;
credential and configuration handling; and the production gate list.

Out of scope, by explicit deferral: webhook receiver mechanics and the
reconciliation workflow (companion document); vendor evaluation itself (the
scorecard); template content (Workstream F); and secure-thread messaging
(Workstream H), which never uses an external adapter at all.

## Conventions

`PERMIT`, `DENY(<code>)`, `UNRESOLVED(T07-Dxx)`, and safety floor carry the
meanings defined in the Workstream D companions. Dispatch, delivery, and
reconciliation state values are those of
[`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md).

# Part 1 — The adapter boundary

| Property | Requirement |
|---|---|
| Position | The adapter is invoked only after the full dispatch-authority query passes, inside TB-07. It performs no authority evaluation of its own and cannot be used to bypass one. |
| Statelessness about authority | The adapter never reads consent, contact, suppression, or patient records. It receives what it is given and nothing more. |
| Deny by default | An adapter refuses unless its exact code, configuration version, environment, and lifecycle revision are on the approved allowlist for this dispatch. |
| No fallback | An adapter never selects a different channel, provider, account, or destination. Channel selection is an authority decision made upstream. |
| No clinical or billing effect | The adapter has no write path to assessment, follow-up, booking, visit, or claim state, enforced by database role grants rather than by convention. |
| Synthetic adapters fail hard | Outside the Task 01 synthetic environment, a synthetic adapter raises rather than returning a success, a stub, or a silent no-op. It never reports a delivery as successful. |

# Part 2 — Operations

Six operations. Each has a closed input, a safe-code output, and an explicit
failure semantic. No operation returns a raw provider payload, a raw error, or a
destination value to its caller.

## 2.1 `send`

| Aspect | Contract |
|---|---|
| Purpose | Transmit one rendered generic message to one destination for one attempt. |
| Input | Protected destination handle; the rendered output of one approved template version; a provider idempotency value; the minimum provider routing configuration. Nothing else — see Part 5. |
| Output | `outcome_code`, `provider_acceptance_state`, and, when known, a protected provider reference. Never a raw response body. |
| Preconditions | DAQ passed; an immutable `DeliveryAttempt` row committed with its attempt number and idempotency digest **before** the call. |
| Timeout | Bounded, shorter than the worker lease (Workstream E §3.4). `UNRESOLVED(T07-D39)`. |
| Unknown outcome | Returns `UNKNOWN` acceptance. The caller enters `UNCERTAIN`; the adapter never retries internally and never decides to retry. |
| Prohibited | Internal retry loops, channel substitution, destination normalization, template mutation, partial sends, batching across subjects. |

## 2.2 `cancel`

| Aspect | Contract |
|---|---|
| Purpose | Attempt to stop a message the provider has already accepted. |
| Availability | Only where the vendor contract and capability declaration both support it. Otherwise the operation is unavailable, not simulated. |
| Output | `CANCEL_ACCEPTED`, `CANCEL_REJECTED`, `CANCEL_UNSUPPORTED`, or `UNKNOWN`. |
| Honesty rule | A successful `cancel` is **not** proof of non-delivery. The record and every surface must say that cancellation may not prevent an already-accepted delivery. |
| Prohibited | Presenting cancellation as retraction; using cancellation to satisfy a consent-withdrawal obligation on its own. |

## 2.3 `fetch_status`

| Aspect | Contract |
|---|---|
| Purpose | Resolve uncertainty for one attempt during reconciliation. |
| Caller | The reconciler only. Never the dispatch path, and never as a polling substitute for webhooks. |
| Input | The protected provider reference. Never a destination, patient reference, or internal identifier. |
| Output | A normalized allowlisted status plus evidence reference, or `UNKNOWN`. |
| Rate | Bounded backoff and rate limits, `UNRESOLVED(T07-D35)`. A status lookup storm during an outage is itself an incident. |
| Prohibited | Treating a status lookup as delivery proof beyond what the vendor's documented semantics support; using it to advance state backward. |

## 2.4 `verify_webhook`

| Aspect | Contract |
|---|---|
| Purpose | Authenticate an inbound provider event over its exact raw bytes. |
| Input | Raw bytes, transport headers, and the server-selected provider-account verifier — never an account identifier taken from the payload. |
| Output | `VALID`, `INVALID`, `MISSING`, or `UNKNOWN`. Only `VALID` permits normalization. |
| Prohibited | Parsing before verifying; logging the raw body; trusting a payload-declared tenant, account, or timestamp. |

## 2.5 `normalize_webhook`

| Aspect | Contract |
|---|---|
| Purpose | Map an authenticated provider event onto an allowlisted internal event type. |
| Output | An allowlisted `event_type_code`, or a quarantine result for anything unknown, malformed, or unmapped. |
| Prohibited | Inventing an event type; inferring one from free text; passing unmapped vendor fields through; enriching from any other source. |

## 2.6 `health`

| Aspect | Contract |
|---|---|
| Purpose | Report adapter and configuration readiness. |
| Output | Safe readiness codes only. |
| Prohibited | Sending a probe message, contacting a real endpoint from a synthetic adapter, or reporting healthy while the lifecycle or configuration is stale. Health is never an authority term — a healthy adapter grants nothing. |

# Part 3 — Capability declaration

Each adapter declares, as data, what it can actually do. The dispatcher and
reconciler enforce those limits; they are not left to reviewer memory.

| Capability | If absent |
|---|---|
| `idempotency_key_supported` | Automatic retry after an unknown outcome is **denied entirely** (T07-16). The message resolves through reconciliation or fails final. |
| `cancellation_supported` | `cancel` is unavailable; withdrawal cascades record that no cancellation was attempted. |
| `status_lookup_supported` | Reconciliation relies on inbound events and manual evidence only; unresolved cases are expected to be more common and must not be closed by guesswork. |
| `signed_webhooks_supported` | Inbound events are unusable without a separately approved alternative authentication scheme. Unsigned events are quarantined permanently, never trusted. |
| `duplicate_event_semantics_documented` | Ordering and duplicate handling default to the most conservative interpretation: no projection movement without unambiguous evidence. |

An adapter whose declaration cannot be validated against its approved
configuration version is not usable. A declaration is a claim requiring vendor
evidence (see the scorecard) — declaring a capability does not create it.

# Part 4 — Deterministic synthetic outcome catalogue

The synthetic adapter must produce each outcome below deterministically, on a
fixed clock, with no network access. The mapping columns are the contract: this
is where an adapter outcome becomes Workstream E state.

| # | Synthetic scenario | Acceptance | Dispatch state | Delivery state | Reconciliation | Retry permitted |
|---|---|---|---|---|---|---|
| G-01 | Success | `ACCEPTED` | `SENT` | `PROVIDER_ACCEPTED` | `NOT_REQUIRED` | n/a |
| G-02 | Accepted but unknown | `UNKNOWN` | `UNCERTAIN` | `UNKNOWN` | `REQUIRED` | **No** |
| G-03 | Timeout before acceptance | `UNKNOWN` | `UNCERTAIN` | `UNKNOWN` | `REQUIRED` | **No** — "before" is the adapter's belief, not proof |
| G-04 | Timeout after acceptance | `UNKNOWN` | `UNCERTAIN` | `UNKNOWN` | `REQUIRED` | **No** |
| G-05 | Rate limit | `NOT_ATTEMPTED` | `FAILED_RETRYABLE` | `UNKNOWN` | `NOT_REQUIRED` | Yes, within approved bounds and backoff |
| G-06 | Temporary failure | `REJECTED` | `FAILED_RETRYABLE` | `UNKNOWN` | `NOT_REQUIRED` | Yes, within bounds |
| G-07 | Permanent failure | `REJECTED` | `FAILED_FINAL` | `UNDELIVERABLE` | `NOT_REQUIRED` | **No** |
| G-08 | Hard bounce (async event) | prior `ACCEPTED` | unchanged | `BOUNCED` | `NOT_REQUIRED` | **No** + suppression `HARD_BOUNCE` |
| G-09 | Wrong number reported | prior `ACCEPTED` | unchanged | unchanged | `NOT_REQUIRED` | **No** + suppression `WRONG_RECIPIENT` + incident path |
| G-10 | Complaint | prior `ACCEPTED` | unchanged | `COMPLAINT` | `NOT_REQUIRED` | **No** + suppression `SPAM_COMPLAINT` |
| G-11 | Delayed delivery event | prior `ACCEPTED` | unchanged | `DELIVERED` if in order | `NOT_REQUIRED` | n/a — arrival after cancellation revives nothing |
| G-12 | Duplicate webhook | unchanged | unchanged | unchanged | unchanged | n/a — `replay_outcome = DUPLICATE` |
| G-13 | Reordered webhook | unchanged | unchanged | **unchanged** | unchanged | n/a — `ordering_outcome = OUT_OF_ORDER`; projection never regresses |
| G-14 | Malformed webhook | unchanged | unchanged | unchanged | unchanged | n/a — receipt stays `QUARANTINED` |
| G-15 | Invalid signature | unchanged | unchanged | unchanged | unchanged | n/a — never parsed |
| G-16 | Replay | unchanged | unchanged | unchanged | unchanged | n/a — `REPLAY_DENIED` |
| G-17 | Outage | `NOT_ATTEMPTED` | `FAILED_RETRYABLE` or denied by kill switch | `UNKNOWN` | `NOT_REQUIRED` | Bounded; backlog does not flush on recovery |
| G-18 | Adapter/configuration not approved | `NOT_ATTEMPTED` | `FAILED_FINAL` | `NOT_APPLICABLE` | `NOT_REQUIRED` | **No** |

G-02 through G-04 collapse to the same handling on purpose. An adapter cannot
reliably distinguish "the provider never saw it" from "the provider saw it and
the acknowledgement was lost," so the design refuses to act on that distinction.
Treating G-03 as safely retryable is precisely the bug that sends a message
twice.

# Part 5 — Vendor payload minimization

The adapter may transmit **only** these four things:

1. the protected destination required for delivery;
2. the approved generic rendered template output;
3. a provider idempotency value; and
4. the minimum provider configuration required to route the message.

Prohibited in provider tags, metadata, custom fields, URLs, filenames, subjects,
headers, or any other vendor-visible surface: patient, subject, tenant, pharmacy,
appointment, follow-up, assessment, visit, thread, or clinician identifiers. The
internal-to-provider reference mapping stays inside the application, in the
protected mapping of Contract 16.

Disabled by default, with enablement requiring a separate approved decision:

| Feature | Default |
|---|---|
| Provider SDK debug logging | OFF |
| Body/content logging | OFF |
| Link tracking and click redirects | OFF |
| Open tracking pixels | OFF |
| Contact enrichment or append services | OFF |
| Advertising, profiling, audience building | OFF and out of scope entirely |
| Unrelated analytics | OFF |
| AI/model training on content or metadata | OFF and contractually prohibited |

The outbound path enforces this as an **allowlist**: a field not on the list is
dropped, not passed through. A denylist would silently forward whatever the next
SDK version adds.

# Part 6 — Synthetic fixture rules

| Rule | Requirement |
|---|---|
| Non-deliverable destinations | Synthetic destinations are opaque, obviously synthetic, non-deliverable values. A real-format address or phone number is **not** added for realism — realism is exactly the risk. |
| Program markers | Fixtures carry `SYNTH-`/`SYNTHETIC-` markers, `example.com`/`.test` domains, and the reserved 555-0100–0199 range where a phone shape is unavoidable. |
| No PIN-shaped or contiguous 10-digit tokens | Per program rules, and enforced by fixture scan. |
| Fixed clock, explicit timezone | Deterministic replay; no wall-clock dependence. |
| No network | Egress is denied at the environment level; the adapter has no HTTP client path. A synthetic adapter that could reach the network is a control failure, not a convenience. |
| Fail closed outside the sandbox | Absent the synthetic environment, the adapter raises. It never returns a fabricated success. |
| Artifacts | Rendered artifacts are watermarked and prefixed `SYNTHETIC-NOT-FOR-CARE-`. |

# Part 7 — Credentials and configuration

- No live credential, sending domain, telephone number, short code, push
  certificate, or webhook secret is added by this task.
- Production credentials live in an approved secret store with environment
  separation, least privilege, rotation, and no client exposure — never in
  Postgres, never in the repository, never in a log or evidence artifact.
- Each attempt records a non-secret `provider_configuration_version`. A
  configuration change makes queued tickets stale, which the dispatch recheck
  then evaluates.
- The provider account code is server-selected and never taken from an inbound
  payload.

# Part 8 — Production adapter gate list

A live adapter requires **all** of the following, evidenced and approved. Each
maps to a scorecard section.

| # | Requirement | Status |
|---|---|---|
| 1 | Approved vendor, product/SKU, service region, and account configuration | NOT SELECTED |
| 2 | Contract and privacy terms | NOT VERIFIED |
| 3 | Data-flow and subprocessor evidence | NOT VERIFIED |
| 4 | Residency and support-access evidence | NOT VERIFIED |
| 5 | Incident-notification obligations | NOT VERIFIED |
| 6 | Retention and deletion behaviour, including backups | NOT VERIFIED |
| 7 | Advertising, analytics, and AI-training prohibitions | NOT VERIFIED |
| 8 | Encryption and credential-management evidence | NOT VERIFIED |
| 9 | Sender registration and applicable telecommunications compliance | NOT VERIFIED |
| 10 | Provider idempotency and reconciliation capabilities | NOT VERIFIED |
| 11 | Signed webhook support or an approved alternative | NOT VERIFIED |
| 12 | Rate-limit, outage, and disaster-recovery behaviour | NOT VERIFIED |
| 13 | Export and data-return terms | NOT VERIFIED |
| 14 | Accessibility implications for opt-out and support surfaces | NOT VERIFIED |
| 15 | PIA and TRA covering the provider data flow | NOT PERFORMED |

# Part 9 — Planned synthetic evidence — NOT RUN

| ID | Red run (must fail closed) | Green run |
|---|---|---|
| WG-A01 | The synthetic adapter cannot open a socket; egress denial is proven, not assumed. | All eighteen outcomes are produced locally and deterministically. |
| WG-A02 | Outside the synthetic environment the adapter raises and never returns success. | Inside it, outcomes replay byte-identically on a fixed clock. |
| WG-A03 | An adapter without `idempotency_key_supported` cannot retry after any unknown outcome. | A capability-complete adapter retries only within approved bounds. |
| WG-A04 | G-02, G-03, and G-04 all block retry; none is treated as safely re-sendable. | Each opens a reconciliation case exactly once. |
| WG-A05 | An unlisted outbound field is dropped, not transmitted; provider metadata carries no internal identifier. | Only the four permitted payload items leave the boundary. |
| WG-A06 | Debug/body logging, link tracking, open pixels, enrichment, advertising, profiling, and training flags are off, and enabling one requires an approved configuration change. | Configuration snapshot matches the approved default set. |
| WG-A07 | Fixtures contain no real-format destination, no contiguous 10-digit token, and no PIN-shaped `985…` value. | Fixture scan passes with markers present. |
| WG-A08 | `cancel` success never renders as "not delivered" in any surface, metric, or export. | Cancellation records state honestly, including `CANCEL_UNSUPPORTED`. |
| WG-A09 | `fetch_status` is unreachable from the dispatch path and bounded by backoff during a simulated outage. | The reconciler resolves a case within approved limits. |
| WG-A10 | `health` reporting healthy never satisfies an authority term. | A stale lifecycle or configuration reports unhealthy and denies dispatch. |
| WG-A11 | No adapter code path can write assessment, follow-up, booking, visit, or claim state — proven by attempted writes failing on grants. | Clinical and billing state is unchanged across the suite. |

# Part 10 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, tier, expiry, kill-switch operator, Task 11 Checkpoint 1 | All runnable code |
| T07-D31 | Provider/product selection | Every production row in Part 8 |
| T07-D32 | Contract, DPA, subprocessor terms | Parts 5, 7, 8 |
| T07-D33 | Secrets and sender configuration | Part 7 |
| T07-D34 | Webhook security semantics | §2.4, §2.5 |
| T07-D35 | Provider outcome, idempotency, cancellation, and status semantics | Parts 3, 4, and §2.3 |
| T07-D36 | Outage, duplicate, delayed-event runbooks | G-17 |
| T07-D39 | Kill switch, lease and timeout relationship | §2.1 |

## Workstream G acceptance check — adapter contract

- Six operations are specified with closed inputs, safe-code outputs, and
  explicit failure semantics; none returns a raw payload, raw error, or
  destination.
- Adapters deny by default; synthetic adapters fail hard outside the synthetic
  environment and never report a delivery as successful.
- Capability declaration is enforced: absent idempotency support, retry after an
  unknown outcome is denied entirely.
- All eighteen required synthetic outcomes are catalogued and mapped onto
  dispatch, delivery, and reconciliation state, with retry permission stated per
  row.
- Timeout-before-acceptance and timeout-after-acceptance are handled identically,
  because the distinction is not knowable.
- Vendor payload is limited to exactly four items, enforced by allowlist, with
  tracking, enrichment, advertising, profiling, analytics, and model training off
  by default.
- Synthetic fixtures use non-deliverable opaque destinations and carry program
  markers; no real-format recipient is added for realism.
- Credentials, sending identities, and webhook secrets are absent, and the
  production gate list is recorded as NOT SELECTED / NOT VERIFIED.
- No vendor was selected, no live adapter implemented or activated, and no
  provider semantics were invented.
- No schema, migration, runtime code, credential, recipient, PHI, or network
  effect was added.

## Current disposition

**Provider adapter contract: complete as design documentation.**

- **Synthetic adapter contract:** PASS as documentation; implementation BLOCKED
  on T07-D02.
- **Production adapter:** BLOCKED — vendor NOT SELECTED, all fifteen gate items
  NOT VERIFIED.
- **Synthetic evidence (WG-A01–WG-A11):** NOT RUN.
- **Real PHI, contact data, recipients, providers, credentials, or external
  delivery:** NO.

See the companion documents for webhook processing, reconciliation, and the
vendor review scorecard.
