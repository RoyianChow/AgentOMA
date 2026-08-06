# Task 07 — Current-State and Gap Analysis

**Workstream:** A — current-state and standards assessment

**Assessment date:** 2026-08-06

**Repository baseline:** `12801c7211cb6ce3286d209762d61c11b6830193` (`origin/main`)

**Assessment branch:** `codex/task-07-communications-design`

**Runtime changes in this slice:** none

**Real recipients, PHI, provider credentials, or external effects used:** no

## Decision summary

The repository has no patient-communications subsystem to extend. It has a
server-owned pharmacist follow-up workflow, staff authentication, append-only
audit and retention foundations, and a separate synthetic sandbox. It does not
have a patient identity/session domain on `main`, verified patient contact
points, communication consent or preferences, appointments, a transactional
communications outbox, dispatch workers, provider integrations, webhooks,
secure patient threads, or delivery reconciliation.

Workstream A is therefore safe to complete as documentation. Runnable Task 07
implementation is **blocked pending a task-specific synthetic approval and
Task 11 Checkpoint 1**. Task 01's approved G1 record explicitly excludes any
later autonomous-pharmacy capability; the Task 07 brief is a specification,
not an approval record. Production and pilot delivery remain separately
blocked by the dependencies in
[`production-dependency-register.md`](production-dependency-register.md).

## Scope and method

This assessment used the maintained project documents first, then inspected
only the relevant implementation boundaries:

- authentication, authorization, sessions, invitations, rate limits, and
  protected-route headers;
- patient, assessment, follow-up, audit, retention, hold, export, and pharmacy
  schemas and server actions;
- package dependencies, environment validation, Next.js routes, workflows, and
  tests;
- the Task 01 sandbox's adapters, egress denial, lifecycle, safe logger, and
  evidence manifest; and
- the Task 04–06 and Task 11 specifications and recorded decisions.

No schema, migration, endpoint, queue, SDK, credential, template, or feature
flag was added.

## 1. Producing workflows and ownership

| Area | Current implementation | Authority/ownership | Task 07 consequence |
|---|---|---|---|
| Appointments and waitlist | No production appointment, slot, booking, cancellation, rescheduling, capacity, or waitlist model exists on `main`. | Task 04 is the future authority. Its synthetic implementation is being developed elsewhere and is not an integrated dependency here. | Appointment reminders cannot be scheduled or cancelled from authoritative source events yet. |
| Follow-up plans | `follow_up` rows support a due date, `phone` or `in_person` intended method, monitoring parameters, attempts, reached/not-reached outcomes, next steps, and immutable supersession. | `src/lib/follow-ups.ts`, `src/lib/follow-up-schema.ts`, and `src/app/(dashboard)/pharmacist/follow-ups/` remain authoritative. | A due item is a source fact, not permission to contact a patient. `phone` is an intended method, not a verified destination. |
| Follow-up transitions | Plans and attempts use server authorization, pharmacy scope, database transactions, advisory locking, immutable correction, and atomic audit writes. | Pharmacist workflow; communications must never close or complete it. | Future notices may reference opaque work-item IDs internally, but delivery/read receipts cannot change clinical state. |
| Assessments and claims | Assessment completion and claim derivation are existing regulated boundaries. | Task 02 and protected billing code. | Messaging cannot complete an assessment, create a referral, derive a claim, or imply adjudication. |
| PCP notification | The assessment records method and timestamp for a notification already performed by the pharmacist. | Clinical record snapshot, not a sender. | Do not reinterpret `pcp_notification_method` as provider configuration or an outbound job. |
| Staff invitations | Admin creates a single-use expiring invitation; the UI displays a URL for manual sharing. | Staff authentication only. | This is not a patient communications provider and must not be generalized into one. |
| Password reset | Better Auth routes are rate-limited, but no delivery callback/provider is configured. | Staff authentication. | Reset-delivery design remains an explicit production dependency; Task 07 must not invent a provider. |

Cancellation or supersession of a producing record must eventually cancel any
pending communication intent. Because appointment events do not exist on
`main`, that contract can be designed but not integrated in this slice.

## 2. Communications and delivery infrastructure

| Capability | Current state | Evidence |
|---|---|---|
| Email, SMS, push, or voice provider | Absent | No provider SDK in `package.json`; no sender credentials in `src/env.ts`. |
| Transactional outbox | Absent | No production outbox table or dispatcher. Task 04 may emit synthetic domain events, but nothing is integrated on `main`. |
| Queue, worker, scheduler, or cron | Absent | No BullMQ, Inngest, Trigger.dev, Redis, worker process, cron route, or scheduled job. |
| Dead-letter queue | Absent | No failure classification or operator reconciliation queue for delivery. |
| Provider webhooks | Absent | No delivery, bounce, complaint, opt-out, or inbound-message webhook route. |
| WebSocket/SSE/realtime | Absent | No WebSocket, EventSource, Supabase Realtime, or equivalent dependency/runtime. |
| Secure portal thread | Absent | No patient portal identity or thread/message schema on `main`. |
| External analytics/error monitoring | Absent | No PostHog, Segment, Sentry, session-replay, or equivalent package/configuration. |
| Vendor inventory/subprocessors | Absent | No selected communications vendor, contract, subprocessor list, support-access model, residency evidence, or data-flow approval. |

The optional `@upstash/redis` mention in the lockfile is a transitive optional
peer only; it is not installed and is not communications infrastructure.

## 3. Retry, idempotency, scheduling, and concurrency

Reusable patterns exist, but no generic delivery engine exists:

- follow-up mutations use database transactions and per-plan advisory locks;
- claim and governance code contain idempotency/concurrency patterns and
  immutable supersession;
- Better Auth uses database-backed rate limits; and
- Task 01 has server-owned lifecycle epochs and stale-action denial.

Missing for Task 07:

- one immutable communication intent per source event, purpose, destination
  version, and policy version;
- database-enforced deduplication and idempotency keys;
- schedule/expiry using trusted server/database time;
- dispatch-time rechecks for lifecycle, source state, identity, destination,
  consent, preference, suppression, and template approval;
- retry categories that distinguish safe retry, permanent denial, unknown
  provider outcome, and manual reconciliation;
- atomic claim/lease behavior for concurrent workers;
- bounded backoff, stale-work cancellation, dead-letter handling, and outage
  controls; and
- provider-event deduplication, signature verification, ordering tolerance,
  and reconciliation.

No future retry may silently change channel. Email failure does not authorize
SMS, phone, push, or portal fallback.

## 4. Identity, actors, subjects, and tenancy

### What exists

- Better Auth protects the pharmacist portal with staff roles
  `pharmacy_admin`, `pharmacist`, `intern`, `student`, and `technician`.
- TOTP is mandatory, sessions roll with a 30-minute policy, and server actions
  recheck the session and role.
- `src/proxy.ts` is an optimistic navigation gate only.
- The app is deliberately single-pharmacy: server-only `PHARMACY_ID` defines
  scope; the browser, session, QR code, and request payload do not select it.
- The clinical `patient` record is a record subject, not an authenticated
  principal.

### What is missing

- no patient or delegate account/session/audience on `main`;
- no actor-to-subject authorization relation;
- no verified caregiver, authorized agent, or substitute-decision-maker grant
  for communications;
- no patient session revocation, recovery, device history, or step-up policy;
- no support-agent role or restricted support workflow; and
- no secure-thread participant authorization.

The Task 05 design branch is not a runtime dependency and must not be copied or
reimplemented by Task 07. Patient-facing secure communication stays blocked
until Task 05 publishes an approved, integrated identity contract.

## 5. Contact points, consent, and preferences

| Concern | Current state | Gap |
|---|---|---|
| Patient email/phone/push destination | The `patient` table has no contact columns. | No normalized, verified, versioned, purpose-scoped destination exists. |
| Staff email | Stored for Better Auth users. | Staff login identity is not patient communication consent. |
| Pharmacy phone/address | Stored for prescription snapshots and display. | It is sender/business information, not a patient destination. |
| Clinical informed consent | Assessment records verbal/written method, giver, timestamp, and SDM details. | Consent to assessment/treatment is not consent to email, SMS, push, reminders, or asynchronous secure messaging. |
| Intake consent timestamp | Zero-PHI public intake may record a timestamp and requires pharmacist reconfirmation. | It cannot authorize later external communication. |
| Communication purpose/version | Absent. | Need approved purpose taxonomy, notice version, scope, captured-by actor, evidence, effective time, and withdrawal/supersession. |
| Contact verification | Absent. | Need server-owned verification, expiry/reverification, change workflow, recycled/shared destination handling, and wrong-recipient response. |
| Preferences/suppression | Absent. | Need channel/purpose preferences and a global/purpose suppression rule that overrides queued work. |
| Language/timezone/quiet hours | Absent. | Need approved supported languages, plain-language templates, Toronto/local-time policy, quiet hours, DST behavior, and an alternative channel. |
| Marketing consent | Out of scope. | Marketing remains prohibited; transactional/admin design cannot become promotional messaging. |

Consent and destination validity must be rechecked immediately before dispatch.
A valid state when work is queued is not durable authority to send.

## 6. Portal messages and clinical boundaries

There is no thread, participant, message, receipt, attachment, moderation, or
response-time model. Task 06 owns secure messaging when it is a professional
virtual-care modality; Task 07 owns consented delivery and administrative queue
mechanics. Those contracts are not integrated on `main`.

Required future separation:

- external email/SMS/push contains only a generic notice and sign-in prompt;
- PHI-bearing content is visible only after Task 05 authorization in a secure
  portal;
- urgent or clinical content is not automatically classified, routed, or
  prioritized by AI or keywords;
- the UI states that the channel is not continuously monitored and provides an
  approved emergency/alternative path; and
- only an authorized pharmacist action in the producing workflow can complete
  clinical work.

## 7. Logs, browser, cache, and telemetry

### Existing protections

- pharmacist routes use `Cache-Control: private, no-store`, no-referrer,
  no-index, a same-origin CSP, and restrictive Permissions Policy through
  `src/lib/phi-route-security.ts` and `next.config.ts`;
- tests prohibit PHI in browser persistence and common analytics APIs on the
  pharmacist workspace;
- the public intake remains zero-PHI; and
- Task 01 rejects browser persistence, analytics, external URLs, and external
  network transport in the sandbox.

### Gaps and risks

- several existing server catch blocks log raw error objects. They predate Task
  07, but a communications path must use an allowlisted payload-free logger and
  never pass a message body, destination, token, provider payload, or raw error
  object to logs;
- there is no communications telemetry schema restricted to safe reason codes
  and aggregate counters;
- there is no policy for provider metadata, bounce bodies, webhook payloads,
  or vendor dashboard access;
- no secure-message cache/hydration review exists because the feature does not
  exist; and
- no wrong-recipient or provider-breach runbook exists.

The future implementation must test URLs, logs, analytics, caches, browser
storage, rendered HTML, RSC payloads, artifacts, CI output, screenshots, and
provider metadata for leakage.

## 8. Security and abuse controls

Existing staff controls include server-side authorization, TOTP, rolling
sessions, database-backed Better Auth rate limits, Zod boundaries, pharmacy
pinning, and protected-route headers. Task 01 adds fail-closed lifecycle state,
egress denial, a safe logger, synthetic fixtures, and an empty production-import
allowlist.

Missing Task 07 controls include:

- patient/delegate audience and participant authorization;
- CSRF/origin protection for patient communication mutations;
- per-purpose and per-destination rate limits;
- anti-enumeration responses for contact verification and portal access;
- signed webhook verification, replay protection, timestamp tolerance, and
  provider-IP assumptions explicitly avoided;
- recipient-change cooling/reverification policy;
- abuse handling for inbound replies and staff queues;
- template injection/Unicode/bidirectional-text testing;
- attachment denial; and
- a global and capability kill switch that invalidates already queued work.

## 9. Audit, retention, holds, export, and recovery

The production app has useful foundations:

- `audit_log` is append-only at the database layer;
- follow-up state and its audit event are written atomically;
- patient record retention, immutable corrections, holds, export manifests,
  destruction, and restore-drill models exist in `src/lib/db/schema/governance.ts`;
- patient export and audit views exist; and
- records use the pharmacy retention rule documented elsewhere in the project.

Task 07 still needs an approved classification for each future record type:

- consent/contact verification and withdrawal evidence;
- communication intent/outbox state;
- rendered template/version evidence;
- provider attempt and reconciliation metadata;
- suppression and wrong-recipient events;
- secure portal message content; and
- operational dead-letter/incident records.

No retention period should be inferred. PHI-bearing professional communication
may become part of the patient record, while transient provider telemetry may
need a different minimum-necessary schedule. Legal hold, export, correction,
secure disposal, backup deletion, and vendor deletion all require explicit
mapping before production.

## 10. Mobile, accessibility, language, and time

The repository has responsive public/intake and pharmacist views, reduced-motion
styles, server-rendered pharmacist lists, and a 56px tap-target standard in the
project rules. There is no Task 07-specific evidence for:

- 375px and desktop layouts;
- keyboard, screen-reader, focus, and status-announcement behavior;
- 200%/400% zoom and reflow;
- long labels or approved non-English language fixtures;
- accessible alternatives to email/SMS/push;
- timezone, DST, quiet-hours, and expiry presentation; or
- plain-language template review.

These are design and evidence requirements, not assumptions that the existing
site-wide CSS automatically satisfies Task 07.

## 11. Synthetic sandbox and evidence

Task 01's evidence manifest records PASS for SBX-01–13 and SBX-15–18, with
SBX-14 not applicable because G2 was not requested. The sandbox provides:

- a separate npm workspace and build;
- deterministic synthetic actors/fixtures;
- server-owned lifecycle and stale-action cancellation;
- deny-only `email`, `sms`, and `push` adapter names that never transmit;
- server/browser egress denial;
- payload-safe logging;
- private/no-store response headers;
- no production imports; and
- red/green evidence tooling.

Two governance points must not be blurred:

1. `docs/task-01/evidence/evidence-manifest.json` is the current PASS record;
   `docs/task-01/README.md` still contains stale blocked wording and should be
   corrected by the Task 01 owner.
2. Task 01 G1 explicitly excludes any later autonomous-pharmacy capability.
   It is a capable containment environment, but it is not standing authority
   to implement Task 07. A versioned Task 07 synthetic scope, owner, expiry,
   kill switch, risk tier, autonomy level, and Task 11 checkpoint are required.

No Task 07 tests or evidence exist yet.

## 12. Architectural conflicts and resolved interpretations

| Conflict | Safe interpretation |
|---|---|
| Task 07 says synthetic implementation may proceed, but no Task 07 approval record exists. | The brief defines desired work, not authority. Documentation proceeds; runnable code waits for a task-specific approval and Task 11 checkpoint. |
| Task 01 sandbox is approved, but its G1 excludes later capabilities. | Reuse its controls only after a versioned scope addendum; do not weaken or bypass them. |
| Task 04 is a future source of appointment events, but no production model is on `main`. | Define a versioned consumer contract later; do not create a shadow appointment model in Task 07. |
| Task 05 designs patient identity, but only staff auth exists on `main`. | Do not reuse pharmacist cookies/roles or invent patient identity. Secure portal work waits for Task 05 integration. |
| Task 06 owns professional secure messaging while Task 07 owns delivery mechanics. | Keep modality/suitability/clinical consent in Task 06 and channel consent/contact/outbox in Task 07; require both where applicable. |
| Existing assessment consent contains an SDM. | It is clinical consent only and cannot be repurposed as communication authorization. |
| Follow-up method can be `phone`. | It expresses intended follow-up method, not a verified phone number or permission for automated contact. |
| PHIPA and the project's Canadian-region policy are sometimes conflated. | PHIPA does not universally require Canadian storage. The project's PHI residency rule remains binding internally; legal, contract, access, and cross-border review are still required. |
| Product docs use AgentRx while the live product is AgentOMA. | Do not change product naming in runtime or external templates until product approval records the sender identity and legal entity. |

## 13. Prioritized gaps

| ID | Priority | Gap | Blocks |
|---|---|---|---|
| T07-G01 | P0 | No task-specific synthetic authority or Task 11 registration/checkpoint | Any runnable Task 07 prototype |
| T07-G02 | P0 | No integrated Task 05 patient/delegate identity and authorization contract | Secure portal, preferences, real recipients |
| T07-G03 | P0 | No verified/versioned patient contact model | Any external delivery |
| T07-G04 | P0 | No approved communication-purpose, consent, withdrawal, and suppression policy | Any scheduling or dispatch |
| T07-G05 | P0 | No authoritative Task 04 appointment event contract on `main` | Appointment reminders |
| T07-G06 | P0 | No outbox, dispatcher, idempotency, reconciliation, or stale-work controls | Synthetic and production delivery-state implementation |
| T07-G07 | P0 | No secure-thread participant model; Task 06 contract not integrated | Secure portal messaging |
| T07-G08 | P0 | No selected/approved vendor, contract, PIA/TRA, residency/cross-border, subprocessor, or support-access evidence | Pilot/production provider |
| T07-G09 | P1 | No communications audit/retention/export/hold classification | Pilot/production recordkeeping |
| T07-G10 | P1 | No wrong-recipient, breach, vendor-outage, or reply-response runbook | Pilot/production operations |
| T07-G11 | P1 | No approved cadence, quiet-hours, timezone, template, language, sender-ID, opt-out, or alternative-channel policy | Pilot/production UX and compliance |
| T07-G12 | P1 | No Task 07 accessibility or privacy-leakage evidence | Synthetic PASS and later promotion |
| T07-G13 | P1 | Existing raw-error logging patterns are unsafe to copy into communications code | Implementation review |
| T07-G14 | P2 | The referenced `deep-research-report.md` is absent | Background research traceability; do not reconstruct it |

## 14. Reusable foundations

The following may be reused as patterns after approval, without importing
production modules into the Task 01 sandbox:

- server-action reauthorization and single-pharmacy derivation;
- Zod validation and safe generic error responses;
- transaction + advisory-lock patterns;
- immutable supersession and append-only audit concepts;
- retention/hold/export manifest concepts;
- protected-route no-store/referrer/CSP headers;
- Task 01 lifecycle, kill-switch, egress denial, safe logger, deterministic
  fixtures, and evidence tooling; and
- the existing follow-up workflow as an authoritative source, never as a
  destination/consent model.

## Workstream A status

- **Repository assessment:** PASS — the current implementation and gaps are
  inventoried at baseline `12801c7211cb6ce3286d209762d61c11b6830193`.
- **Runtime implementation:** NOT STARTED.
- **Real PHI/contact data used:** NO.
- **External messages sent:** NO.
- **Production schema/auth/vendor changed:** NO.
- **Workstream B:** COMPLETE as design documentation; no runtime effect was
  added.
- **Workstream C:** COMPLETE as conceptual documentation; all requested
  contracts and field-level schema metadata are defined without a migration.
- **Workstream D:** COMPLETE as design documentation; consent, contact
  verification, quiet hours/timezone, language/accessibility, suppression, and
  contact-change behaviour are specified fail-closed with no policy value
  selected.
- **Workstream E:** COMPLETE as design documentation; the orthogonal state axes,
  transition catalogue, idempotency/concurrency contract, race determinism, and
  scheduling rules are specified against the gaps recorded in section 3 above.
- **Workstream F:** COMPLETE as design documentation; the template registry,
  placeholder allowlists, rendering contract, URL boundary, and forbidden-data
  leakage tests are specified. No template is approved and no production copy
  was written.
- **Workstream G:** COMPLETE as design documentation; the adapter contract,
  deterministic synthetic outcome catalogue, webhook pipeline, reconciliation
  workflow, and vendor scorecard are specified. No vendor is selected and no
  adapter, endpoint, or credential exists.
- **Workstream H:** COMPLETE as design documentation; the secure-thread
  contract, queue design, and authorization matrix are specified against the
  gaps in sections 4 and 6 above. Nine of thirteen thread-eligibility checks
  depend on contracts absent from `main`, so the prototype is NOT BUILT.
- **Next safe action:** document Workstream I's appointment, follow-up, and Task
  06 integration boundaries. Separately, approve/register a bounded Task 07
  synthetic scope before any runnable code.
