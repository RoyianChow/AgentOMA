# Task 07 — Communications Threat Model

**Workstream:** B — threat model, trust boundaries, and data flows

**Prepared:** 2026-08-06

**Repository design baseline:** `df33afd9c01f2659bde743734fd5fee729947f49`

**Runtime implementation:** none

**Review state:** design complete; privacy, security, professional, accessibility,
operations, legal, and Task 11 approvals remain required at the stages identified
below

## Decision summary

Task 07 must be a fail-closed communications control plane, not a generic sender.
The current repository has no patient communications runtime, so every control in
this document is either an existing boundary that must be preserved or a proposed
control that must be proven before a runnable prototype or production integration.

The following rules are non-negotiable:

1. Consent, contact validity, actor-to-subject authority, source state, suppression,
   template approval, and sandbox lifecycle are rechecked immediately before any
   dispatch effect. Missing, contradictory, stale, or unknown state denies dispatch.
2. There is no silent channel fallback. Failure on one channel grants no authority
   to use another.
3. Email, SMS, and push contain generic administrative copy only. They contain no
   PHI, patient name, ailment, medication, appointment purpose, health number,
   message excerpt, or identifying URL.
4. PHI-bearing communication is available only in an authenticated secure portal
   after Task 05 participant authorization and the applicable Task 06 professional
   controls are integrated.
5. AI and keyword models never route, prioritize, classify urgency, determine
   suitability, or complete work.
6. Delivery, read, acknowledgement, reply, timeout, and provider events never
   complete an assessment, follow-up, visit, referral, prescription, or claim.
7. Suppression and revocation override queued work, retry policy, preferences, and
   convenience.
8. Experimental execution remains separate, synthetic-only, fail-closed, and
   incapable of network delivery. Production never imports the sandbox.

## Scope

The model covers message creation, scheduling, rendering, dispatch, provider
handling, webhook receipt, reconciliation, portal access, staff queues, audit,
retention, cancellation, and destruction. It considers administrative reminders
and secure portal notices; it does not authorize marketing, live recipients, live
providers, real contact data, PHI processing, production migration, or production
delivery.

Likelihood and impact are design-stage estimates:

- **Low / Medium / High** likelihood describes plausibility before the proposed
  controls are proven.
- **Moderate / High / Critical** impact describes the worst credible privacy,
  safety, operational, or integrity consequence.
- Residual risk is never marked accepted here. Acceptance belongs to the named
  human approval owner at the applicable gate.

## Actors and current role mapping

| Actor | Current repository mapping | Boundary decision |
|---|---|---|
| Patient actor | No production patient account or session exists on `main`. | Task 05 must supply the authenticated actor; a clinical patient row is not an identity. |
| Patient subject | Existing clinical `patient` record, pharmacy-scoped. | A subject may differ from the actor; never infer actor authority from contact possession. |
| Verified caregiver, delegate, or authorized agent | No integrated production grant. | Task 05 owns a versioned, expiring, revocable actor-to-subject relation. |
| Pharmacist | Existing Better Auth staff role. | May perform authorized professional work after server-side role/orientation checks. |
| Pharmacy administrator | Existing `pharmacy_admin` role. | Administrative authority does not grant clinical thread access by default. |
| Authorized administrative staff member | No dedicated production communications role. | Must be explicitly designed and approved; do not silently map `technician` or another role. |
| Technical support staff | No production support role or break-glass workflow. | No content access unless a future minimum-necessary, audited workflow is approved. |
| AgentRx patient application | Not implemented on `main`. | Must consume Task 05 identity and never trust client-supplied subject, tenant, or recipient. |
| AgentRx pharmacist application | Existing authenticated pharmacist portal. | Server actions remain the authority; `proxy.ts` is optimistic UX only. |
| Task 05 identity service | Design/dependency, not integrated. | Owns patient/delegate audience, sessions, grants, revocation, and recovery. |
| Appointment and follow-up services | Follow-up exists; appointment service is a Task 04 dependency. | They own source state. Communications can observe an event but cannot mutate or complete it. |
| Communication orchestration service | Proposed. | Creates immutable intents from approved source events and current authority. |
| Scheduler and outbox worker | Proposed. | Claims work atomically and performs a final server-owned recheck before any effect. |
| Template registry | Proposed. | Holds approved, versioned, purpose/channel/language-specific templates and placeholder allowlists. |
| Synthetic provider adapter | Task 01 pattern only; Task 07 adapter not implemented. | Must deny external transport and emit deterministic synthetic outcomes. |
| Proposed production email/SMS/push provider | None selected. | Vendor, contract, residency, support, retention, idempotency, and reconciliation require approval. |
| Provider employee/support operator | External privileged actor. | Must be contractually and technically restricted to minimum necessary data with auditable access. |
| Webhook receiver | Proposed. | Accepts authenticated provider events into quarantine; never trusts an event as a clinical command. |
| Secure-message service | Proposed Task 05/06/07 boundary. | Stores PHI-bearing content separately from external delivery metadata. |
| Staff work-item queue | Proposed. | Contains minimum-necessary references and safe reason codes, not message bodies or destinations. |
| Audit service | Existing append-only foundation. | Records allowlisted metadata, never content, credentials, tokens, or contact values. |
| Error monitoring/telemetry | No external service configured. | Future telemetry must be allowlisted, aggregate/minimized, and payload-free. |
| Compromised patient device | Threat actor/environment. | Generic lock-screen notices and short authenticated sessions limit exposure. |
| Malicious unauthenticated user | Threat actor. | Enumeration, spam, token replay, and endpoint abuse must fail closed. |
| Cross-tenant authenticated user | Threat actor; app is currently single-pharmacy. | Every read/write remains server-scoped to `PHARMACY_ID`; future tenancy cannot be client-selected. |
| Insider with excessive access | Threat actor. | Least privilege, immutable audit, access review, and break-glass controls are required. |
| Compromised provider/subprocessor | Threat actor. | Minimize data disclosed externally and retain a channel/provider kill switch. |

## Assets and classification

| Asset | Classification | Storage/handling rule |
|---|---|---|
| Actor-to-subject/delegate relation | Restricted authorization data | Server-only, versioned, revocable, pharmacy-scoped; Task 05 authority. |
| Contact value and normalized match value | Direct identifier / sensitive | Encrypted at rest, masked for display, absent from URLs/logs/audit/evidence/provider metadata. |
| Contact-verification challenge/status | Secret plus restricted metadata | One-way challenge material, bounded attempts/expiry, single purpose; verification is not identity. |
| Push subscription/device token | Secret-like identifier | Encrypted, versioned, revocable, never logged or included in evidence. |
| Consent event and notice version | Authorization evidence | Immutable event history with purpose/channel/scope/effective/withdrawal state. |
| Preferences and quiet hours | Restricted preference data | Server-owned version; cannot override suppression or missing consent. |
| Message intent | Restricted operational record | Immutable, source-bound, version-bound, no rendered PHI payload. |
| Template/translation version | Approved configuration | Immutable published version and placeholder allowlist; changes create a new version. |
| Safe rendering data | Minimum-necessary derived data | Generic external fields only; secure content stays in the portal domain. |
| Logical-message ID/idempotency key | Restricted metadata | Opaque, non-enumerable, not a bearer credential, unique at the database boundary. |
| Delivery attempt/provider reference | Restricted provider metadata | Protected from logs/URLs; immutable attempt/reconciliation history. |
| Provider credential/webhook secret | Secret | Approved secret store only; scoped, rotated, never persisted with business data. |
| Webhook receipt/reconciliation evidence | Untrusted external input then restricted evidence | Authenticate, size-limit, deduplicate, quarantine, normalize, and minimize before use. |
| Suppression record | Safety/privacy control | Immutable precedence evidence; dispatch always rechecks it. |
| Appointment/follow-up reference | Restricted source reference | Opaque reference and version only; producing workflow remains authoritative. |
| Secure-message content | PHI | Authenticated portal only; encrypted, no external preview, log, audit body, or general queue copy. |
| Thread participant/assignment | Restricted authorization data | Revalidated every request and when grants, suitability, or assignment change. |
| Queue work item | Restricted operational metadata | Opaque references and safe reason/status only; no destination or content. |
| Audit record | Restricted compliance evidence | Append-only, allowlisted event metadata, no message body/contact/token. |
| Retention/deletion/legal-hold state | Restricted governance data | Server-owned, transactionally enforced; legal hold wins over automated deletion. |

## Control catalogue

Threat rows refer to these proposed control families. A reference is not proof
that a control exists.

| ID | Preventive control |
|---|---|
| P01 | Server derives actor, subject, pharmacy, source, purpose, channel, recipient, and template from authoritative records; request payloads cannot substitute them. |
| P02 | Versioned consent, contact verification, relationship, source, suppression, template, and lifecycle state are rechecked at dispatch; unknown denies. |
| P03 | Approved template registry with channel/purpose/language allowlists, exact placeholders, generic external envelope, and immutable versions. |
| P04 | Immutable intent/outbox, database uniqueness, atomic worker lease, attempt idempotency, bounded retry, and supersession rather than mutation. |
| P05 | Server-owned expiry/lifecycle revision and cancellation state; stale tickets deny immediately before callback/effect. |
| P06 | Provider adapters deny by default; synthetic adapters cannot use network; production adapters require approved idempotency and uncertainty handling. |
| P07 | Webhook raw-body authentication, timestamp/replay limits, size/schema validation, deduplication, quarantine, monotonic normalization, and reconciliation. |
| P08 | Audience-specific authentication, object authorization, pharmacy scope, delegate expiry/revocation, least privilege, and server-side action checks. |
| P09 | Secure portal isolation, no-store/no-referrer/CSP headers, participant checks per request, neutral external notice, and no sensitive URL. |
| P10 | Allowlisted payload-free logging, redaction-by-construction, safe reason codes, no raw errors, and automated leakage scans. |
| P11 | Plain-text/strictly sanitized secure content, length limits, link policy, attachments disabled until separately approved and scanned. |
| P12 | Rate limits, anti-enumeration responses, per-recipient/purpose caps, quiet-hour/timezone policy, backpressure, and bounded queue age. |
| P13 | Record classification, computed retention, legal-hold guards, deletion transactions, backup/vendor deletion evidence, and export/correction rules. |
| P14 | Vendor due diligence, DPA/use restrictions, subprocessor/support controls, approved regions, credential separation, incident SLA, and exit plan. |
| P15 | No AI/keyword urgency routing and no communication event as a clinical/billing transition; pharmacist workflow remains authoritative. |
| P16 | Approved translation, accessibility review, locale/timezone/DST tests, visible non-colour status, and accessible alternatives. |
| P17 | Secrets in an approved secret store with least privilege, rotation, environment separation, and no client exposure. |
| P18 | Minimum-necessary queue/audit/provider metadata and role-specific staff views; message body remains in the secure content domain only. |

| ID | Detective control |
|---|---|
| D01 | Immutable allowlisted audit events for authority checks, denials, state transitions, access, and operator actions. |
| D02 | Static/runtime scans for PHI, contacts, secrets, tokens, URLs, storage, logs, analytics, bundles, artifacts, and provider metadata. |
| D03 | Provider attempt/event reconciliation, unknown-outcome queue, duplicate/status-regression detection, and stale-event metrics. |
| D04 | Authorization, audience, cross-object, delegate, support-access, and enumeration anomaly tests/alerts. |
| D05 | Queue age, lease, retry, rate, cancellation, response-time, backlog, dead-letter, and abandonment metrics using safe labels. |
| D06 | Bounce, complaint, wrong-recipient, opt-out, contact-change, and suppression review queues. |
| D07 | Retention, legal-hold, deletion, backup, vendor deletion, and export reconciliation. |
| D08 | Template diff/approval, placeholder scan, translation review, accessibility testing, and rendered-output snapshots. |

| ID | Response control |
|---|---|
| R01 | Global/capability/provider/channel/recipient kill switch and immediate suppression; invalidate delayed work. |
| R02 | Quarantine event/attempt, stop retries, reconcile manually, and record a safe incident reference. |
| R03 | Revoke sessions, delegate grants, contact versions, challenges, provider keys, and affected thread access. |
| R04 | Contain, assess, preserve evidence, notify/escalate under the approved privacy/security incident runbook; software does not decide reportability. |
| R05 | Dead-letter or human review queue with named ownership and no automated clinical prioritization. |
| R06 | Withdraw template/translation, cancel pending intents, issue approved corrective communication, and roll back configuration. |
| R07 | Pause deletion, apply legal hold, restore/reconcile approved backups, and document disposition. |
| R08 | Rate-block abusive sources, preserve safe evidence, and restore gradually under operator control. |

## Threat register

All evidence named below is **planned**, not executed. Runnable red/green evidence
requires a Task 07 scope approval, Task 11 Checkpoint 1, and the Task 01 sandbox.

| ID | Scenario; entry point; asset; precondition | Likelihood / impact | Prevent / detect / respond | Planned test evidence | Residual risk / approval owner |
|---|---|---|---|---|---|
| T07-01 | Send without purpose/channel consent; intent creation or dispatch; consent evidence/contact; source event exists but authority is absent or unknown. | High / Critical | P01,P02; D01; R01,R04 | Red: absent/unknown consent cannot create or dispatch. Green: exact current consent permits synthetic transition only. | Medium after proof; Privacy + Product. |
| T07-02 | Send after consent expiry, withdrawal, or supersession; delayed worker; consent history; work was valid when queued. | High / Critical | P02,P05; D01,D05; R01,R04 | Queue active consent, then expire/revoke/supersede; callback count remains zero. | Medium; Privacy + Security. |
| T07-03 | Revocation races worker claim/provider acceptance; dispatcher/provider boundary; consent and attempt state; concurrent transactions. | Medium / Critical | P02,P04,P05; D01,D03; R01,R02,R04 | Real-Postgres race tests at pre-claim, post-claim/pre-effect, and unknown-provider boundaries. | High until provider semantics proven; Security + Operations + Privacy. |
| T07-04 | Contact changes after scheduling; contact management/worker; contact version; queued intent references an old version. | High / Critical | P02,P04; D01,D06; R01,R04 | Supersede contact after queue; old destination never renders or dispatches. | Medium; Privacy + Product. |
| T07-05 | Recycled, shared, mistyped, or reassigned phone/email exposes a health relationship; verification/send/reply; destination; possession or old verification exists. | High / Critical | P02,P03,P09,P12; D06; R01,R04 | Wrong-recipient and re-verification fixtures; external output remains neutral and suppression wins. | High; Privacy + Product + Operations. |
| T07-06 | Contact verification is treated as patient identity; verification exchange/portal access; actor-subject grant; valid code exists. | Medium / Critical | P01,P08,P09; D04; R03,R04 | Verified contact without Task 05 grant cannot access subject/thread. | Medium; Identity owner + Security. |
| T07-07 | Wrong patient, subject, pharmacy, appointment, follow-up, or thread; API/server action/worker; all linked records; guessed or mismatched opaque IDs. | Medium / Critical | P01,P08; D01,D04; R03,R04 | Cross-object and cross-pharmacy matrix denies every mismatch without existence leakage. | Low/Medium; Security + Privacy. |
| T07-08 | Client substitutes recipient, channel, purpose, template, actor, subject, or tenant; form/API payload; authority fields; client can edit request. | High / Critical | P01,P03,P08; D01,D04; R03 | Tamper each field; server ignores/denies and derives from authoritative records. | Low; Security. |
| T07-09 | BOLA/IDOR reads or mutates message, thread, preference, or queue item; routes/actions; content and settings; authenticated user has another object ID. | Medium / Critical | P08,P09; D01,D04; R03,R04 | Actor/subject/role/pharmacy authorization matrix on every object action. | Low/Medium; Security + Identity owner. |
| T07-10 | Patient token reaches pharmacist boundary or staff token reaches patient boundary; route/session audience; protected content; valid wrong-audience session. | Medium / Critical | P08,P09; D04; R03 | Audience-confusion tests across every route/action return generic denial. | Low; Security + Task 05 owner. |
| T07-11 | Expired/revoked delegate continues thread access or consents; portal/action; relationship grant; long-lived session or open page. | Medium / Critical | P02,P08; D01,D04; R03,R04 | Revoke/expire grant between page load and action; every subsequent read/write denies. | Low/Medium; Task 05 owner + Privacy. |
| T07-12 | Unauthorized staff/support reads content or changes queues/preferences; staff UI/actions; PHI and operational state; excessive role or support access. | Medium / Critical | P08,P18; D01,D04; R03,R04 | Role/field matrix and break-glass-negative tests; support sees no content by default. | Medium; Security + Privacy + Operations. |
| T07-13 | Duplicate logical message creation; producer retries/concurrent events; intent; same source/purpose/version processed twice. | High / High | P04; D01,D03; R02 | Real-Postgres concurrent inserts prove one logical intent and deterministic duplicate result. | Low; Backend owner + Operations. |
| T07-14 | Worker crashes before send, during send, after provider acceptance, or before commit; worker/provider; attempt state; non-atomic effect. | High / High | P04,P06; D03,D05; R02,R05 | Fault injection at each boundary; never double-send; unknown goes to reconciliation. | Medium/High; Backend + Operations. |
| T07-15 | Provider timeout leaves unknown send outcome; adapter; attempt/provider reference; request may have been accepted. | High / High | P04,P06; D03; R02 | Timeout-after-accept fixture remains `unknown`, does not retry blindly, reconciles deterministically. | High pending vendor proof; Operations + Vendor owner. |
| T07-16 | Retry against provider without idempotency creates duplicate; adapter/retry; recipient and content; provider cannot deduplicate. | Medium / Critical | P06; D03; R01,R02 | Adapter capability test denies automatic retry when idempotency/reconciliation is unsupported. | High; Security + Operations + Procurement. |
| T07-17 | Delayed delivery occurs after cancellation, consent withdrawal, appointment change, source supersession, or expiry; queue/provider; source/authority; stale ticket. | High / Critical | P02,P05; D01,D05; R01,R02 | Queue then mutate each authority/source version; final callback spy remains zero. | Medium; Security + Source owner. |
| T07-18 | Webhook is duplicate, malformed, oversized, spoofed, replayed, or out of order; public webhook; event/secret; attacker or delayed provider. | High / High | P07,P17; D01,D03; R02,R08 | Signature, timestamp, replay, size, schema, duplicate, and ordering red/green suite. | Medium; Security + Provider owner. |
| T07-19 | Valid-looking provider event targets wrong pharmacy/logical message; webhook normalization; attempt; reference collision or substitution. | Medium / Critical | P01,P07,P08; D03,D04; R02,R04 | Mismatched tenant/message/provider-account fixtures quarantine without mutation. | Low/Medium; Security. |
| T07-20 | Provider status regresses or terminal state is overwritten; webhook/reconciliation; delivery history; stale event arrives later. | High / Moderate | P04,P07; D03; R02 | Permutation/property tests prove immutable events and allowed monotonic projection only. | Low; Backend + Operations. |
| T07-21 | Provider outage, rate limit, partial outage, or stale status API causes backlog or unsafe retry storm; worker/provider; queue; degraded provider. | High / High | P05,P06,P12; D03,D05; R01,R05,R08 | Synthetic outage/rate/stale-status soak with bounded retry, queue age, kill switch, and recovery. | Medium; Operations + Provider owner. |
| T07-22 | Hard/soft bounce, complaint, wrong-number reply, or carrier filtering is ignored; webhook/inbound; contact/suppression; provider outcome arrives. | High / Critical | P02,P07; D03,D06; R01,R04,R05 | Each outcome creates correct suppression/review state; no channel fallback or body logging. | Medium; Privacy + Operations. |
| T07-23 | Failed channel silently falls back to an unconsented channel; orchestration/retry; consent/preferences; another destination exists. | Medium / Critical | P02,P06; D01,D03; R01 | Email failure with SMS available still produces no SMS intent without separate authority. | Low; Privacy + Product. |
| T07-24 | PHI leaks into subject, SMS, push preview, excerpts, links, URLs, calendars, tags, metadata, provider dashboards/support tickets, or reports; renderer/adapter/ops; PHI; rich source data exists. | High / Critical | P03,P09,P10,P18; D02,D08; R01,R04,R06 | Canary scans across rendered output, RSC, URLs, logs, provider payload/metadata, artifacts, screenshots. | Medium; Privacy + Security. |
| T07-25 | Generic notice still reveals patient-health relationship through pharmacy, clinician, ailment, medication, or appointment-purpose wording; template/sender; relationship; recognizable context. | High / Critical | P03,P09; D08; R01,R04,R06 | Human privacy review and snapshot tests reject all forbidden terms/placeholders in external channels. | Medium/High; Privacy + Product + Professional. |
| T07-26 | Template injection or unapproved placeholder introduces sensitive/arbitrary data; template admin/renderer; template and render data; compromised config or unsafe interpolation. | Medium / Critical | P03,P11; D02,D08; R01,R06 | Unknown placeholder, HTML/script, URL, and sensitive-field fixture fails publication/rendering. | Low/Medium; Security + Privacy + Product. |
| T07-27 | Translation changes meaning or introduces clinical content; template localization; approved copy; unreviewed translation. | Medium / High | P03,P16; D08; R06 | Back-review by approved bilingual reviewer; snapshots and placeholder parity by locale. | Medium; Product + Accessibility + Professional + Privacy. |
| T07-28 | Reusable credential, verification code, provider token, or secret appears in logs; auth/adapter/error path; secrets; failure or debugging. | Medium / Critical | P10,P17; D02; R03,R04 | Trigger failures with synthetic canaries; logs contain safe reason only, never canary/value. | Low/Medium; Security. |
| T07-29 | Link scanner, preview bot, referrer, browser history, or analytics consumes a sensitive URL; external notice/portal link; token/session; bearer data in URL. | High / Critical | P09,P10; D02; R03,R04 | Links contain no bearer/subject/contact data; scanner GET cannot consume an action; no-referrer/no-store tests. | Low/Medium; Security + Privacy. |
| T07-30 | External reply contains PHI and enters provider/log/general queue; inbound channel; reply body; patient replies to generic notice. | High / Critical | P07,P10,P18; D02,D06; R01,R04,R05 | Synthetic PHI canary reply is quarantined from logs/audit/queue metadata and routed only to approved human containment. | High pending inbound-channel policy; Privacy + Operations. |
| T07-31 | Opt-out text is ignored or misclassified; inbound/provider event; suppression; free-text variants or provider mismatch. | High / Critical | P02,P07; D06; R01,R04,R05 | Approved deterministic opt-out contract tests; ambiguous text goes to human review, never AI classification. | Medium; Privacy + Legal + Operations. |
| T07-32 | AI/keyword model routes or prioritizes free-text urgency; inbound/queue; reply and work order; automation introduced for convenience. | Medium / Critical | P15; D01,D02; R01,R05 | Architecture test denies model/keyword routing imports and proves neutral human queue ordering. | Low; Professional + Safety + Security. |
| T07-33 | Secure message is posted to wrong thread; compose/action; content and participants; client supplies thread or stale selection. | Medium / Critical | P01,P08,P09; D01,D04; R03,R04 | Server-derived thread/subject tests, stale-selection race, and cross-thread denial. | Low/Medium; Security + Privacy. |
| T07-34 | Message body appears in logs, audit, traces, analytics, exception reports, indexes, or session replay; all runtime/error paths; PHI; instrumentation captures payload. | High / Critical | P10,P18; D02; R01,R04 | Canary body through success/failure paths; scan every output sink and generated artifact. | Low/Medium; Privacy + Security. |
| T07-35 | Unsafe HTML/script, malicious link, or oversized secure message harms reader/system; composer/renderer; content/session; untrusted input. | High / High | P11; D02,D08; R01,R06,R08 | XSS/link/size/property tests and browser CSP verification; unsafe input rejected safely. | Low/Medium; Security. |
| T07-36 | Attachment contains malware or evades retention/access controls; upload/download; file/content; attachment feature enabled. | Medium / Critical | P11; D02,D07; R01,R04 | Attachments remain disabled. Any future brief requires malware, type/size, authorization, storage, retention, and scan evidence. | Not acceptable while absent; Security + Privacy. |
| T07-37 | UI claims “read,” “seen,” “delivered,” or a response time without evidence; status UI/template; patient expectation; ambiguous provider/client event. | High / High | P03,P07,P16; D03,D08; R06 | Status contract tests map only proven events; copy review rejects unsupported promises. | Medium; Product + Professional + Operations. |
| T07-38 | Patient uses messaging for urgent concern while channel is unmonitored; portal composer/copy; patient safety; asynchronous channel exists. | High / Critical | P03,P15,P16; D05,D08; R05 | Approved non-monitoring/urgent-path copy, acknowledgement tests, and pharmacist validation; no automated triage. | High; Professional + Operations + Product. |
| T07-39 | Staff queue is abandoned or response target breached; queue/operations; unresolved message; staffing gap or outage. | Medium / Critical | P12,P18; D05; R01,R05 | Synthetic aging/escalation drills with named ownership, coverage, and safe dashboard metrics. | High until staffing/SLO approved; Operations + Professional. |
| T07-40 | Delivery/read/reply/timeout/thread event completes assessment, follow-up, visit, or claim; integration event; clinical/billing state; coupled state machine. | Medium / Critical | P15; D01,D02; R01,R04 | Architecture and DB tests prove communications has no write path to clinical completion/claim transitions. | Low; Professional + Billing lead + Security. |
| T07-41 | Consent, authorization, suitability, or assignment changes while thread remains open; portal/action; participants/content; stale session/page. | High / Critical | P02,P08,P09; D01,D04; R03,R05 | Change each state after page load; next read/write denies and pending assignment is reconciled. | Medium; Task 05/06 owners + Privacy. |
| T07-42 | DoS, spam, recipient enumeration, or notification flooding; public/auth endpoints and worker; availability/recipient privacy; automated abuse. | High / High | P08,P12; D04,D05; R01,R08 | Rate/volume/concurrency tests, generic responses, recipient cap, and kill-switch recovery. | Medium; Security + Operations. |
| T07-43 | Quiet hours, DST, timezone, language, accessibility, or alternative-channel failure causes harm or exclusion; scheduler/UI/template; preferences/access; missing policy or edge time. | High / High | P02,P12,P16; D05,D08; R05,R06 | Toronto/DST boundary, locale, 200/400% zoom, screen reader, reduced motion, and no-fallback tests. | Medium; Accessibility + Product + Operations. |
| T07-44 | Retention deletion races legal hold or unresolved incident; cleanup/governance; records/evidence; automated expiry and concurrent hold. | Medium / Critical | P13; D01,D07; R07 | Real-Postgres concurrency tests prove hold/incident state blocks deletion and restart preserves it. | Low/Medium; Privacy + Records owner + Security. |
| T07-45 | Vendor uses data for advertising, unrelated analytics, profiling, or model training; provider/subprocessor; content/metadata; permissive contract/product defaults. | Medium / Critical | P14,P18; D02,D07; R01,R04 | Contract/config review plus outbound field allowlist; no production adapter until use restrictions are evidenced. | High until vendor approval; Privacy + Legal + Procurement + Security. |

## Abuse-case chains

The following compound cases must be tested because individually correct controls
can still fail when events race:

1. **Wrong destination after scheduling:** valid consent and contact create an
   intent; the patient changes or disputes the contact; a worker has already
   claimed the row. Expected: final recheck denies, no callback executes, the old
   version is suppressed, and safe review evidence is created.
2. **Unknown provider outcome plus withdrawal:** a provider accepts a request but
   times out; consent is then withdrawn. Expected: no blind retry or fallback,
   the attempt remains unknown/quarantined, and reconciliation cannot create a
   new effect.
3. **Replayed webhook plus stale status:** a signed terminal event is followed by
   duplicates and an older accepted event. Expected: one immutable receipt per
   provider event, no status regression, and no clinical transition.
4. **Compromised delegate session:** a delegate loads a thread, then the grant is
   revoked before posting. Expected: the server rechecks the grant and rejects
   the write without disclosing whether another thread exists.
5. **External PHI reply:** a patient replies with clinical details to a generic
   SMS/email. Expected: no body in logs/audit/general queues, no AI routing, and
   an approved human containment workflow or channel shutdown.
6. **Outage recovery storm:** queued work ages during provider failure while
   appointments, contacts, and consent change. Expected: bounded recovery,
   per-item final recheck, stale denial, no duplicate, and operator kill switch.
7. **Retention versus incident:** a record reaches expiry while a legal hold or
   incident is created. Expected: hold wins at the commit boundary and deletion
   cannot partially succeed.

## Required evidence gates

### Before a runnable synthetic prototype

- versioned Task 07 synthetic scope and exclusions;
- named capability owner, backup, privacy/security/operations reviewers,
  kill-switch operator, expiry, and review date;
- Task 11 Checkpoint 1 with risk/autonomy classification;
- Task 01 scope record confirming synthetic-only fixtures, denied egress, empty
  production import allowlist, and no production credentials/data;
- red/green tests for T07-01 through T07-45 that are applicable to the proposed
  slice, with unavailable provider-specific tests explicitly blocked rather than
  marked passing; and
- proof that synthetic outputs contain no real contact data or externally usable
  recipient.

### Before any pilot or production use

- integrated and versioned Task 04/05/06 producer, identity, and professional
  contracts;
- approved consent, contact, suppression, cadence, template, language,
  accessibility, record-classification, and incident policies;
- PIA, TRA, legal/CASL, professional, privacy, security, accessibility,
  operations, procurement, and vendor reviews;
- vendor contract, data-flow, residency, subprocessor, support-access,
  retention/deletion, idempotency, reconciliation, incident, and exit evidence;
- real-recipient testing only in a separately approved non-PHI environment;
- recovery, wrong-recipient, outage, duplicate, delayed-event, privacy-incident,
  and kill-switch drills; and
- exact-candidate Task 11 evidence and final promotion approval.

## Current disposition

**Workstream B threat modelling: complete as design documentation.** Workstream C
maps the controls into conceptual server-only contracts and field metadata, and
Workstream D specifies the fail-closed consent, contact, quiet-hours,
preference, suppression, and contact-change behaviour that P01–P05, P12, P16,
D06, R01, and R03 depend on — see
[`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
and
[`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md).
Workstream E specifies the outbox and state machine that P04, P05, P06, P07,
D03, D05, R02, and R05 depend on — see
[`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md) —
including the duplicate, crash, timeout, replay, ordering, and race threats
T07-13 through T07-23. No threat is accepted by any of these documents, and every
control reference remains planned rather than proven. Runnable synthetic work remains blocked
by the missing Task 07 scope and Task 11 Checkpoint 1. Real recipients,
providers, PHI, credentials, network effects, production imports, production
migrations, and production delivery remain unauthorized.
