# Task 07 — Production Dependency Register

**Prepared:** 2026-08-06

**Repository baseline:** `12801c7211cb6ce3286d209762d61c11b6830193`

**Register state:** production and pilot blocked; Workstream A documentation complete

## Purpose

This register separates four questions that are easy to conflate:

1. Is a dependency described?
2. Is synthetic design/implementation authorized?
3. Is an integrated contract present on the candidate branch?
4. Is real PHI/provider/production use approved?

A `PASS` in an earlier column never implies a later one. Missing authority,
expired approval, absent identity, unknown consent, or unknown destination must
fail closed.

## Status vocabulary

- `READY`: evidence exists and is current for the stated stage only.
- `PARTIAL`: useful work exists but the required contract/evidence is incomplete.
- `BLOCKED`: a named prerequisite is absent, expired, or unresolved.
- `NOT_VERIFIED`: reported elsewhere but not integrated/evidenced at this
  baseline.
- `NOT_APPLICABLE`: only with an explicit reason.

## Gate summary

| Stage | Status | Reason |
|---|---|---|
| Workstream A documentation | `READY` | Current state, official-source mapping, and this dependency register are recorded without runtime changes. |
| Task 07 synthetic design (threat model/contracts/behaviour model) | `READY` | Documentation-only analysis can continue with synthetic examples and no runtime effect. |
| Task 07 runnable synthetic prototype | `BLOCKED` | No versioned Task 07 scope approval, owner/backup, risk/autonomy registration, expiry, kill-switch authority, or Task 11 Checkpoint 1 exists. Task 01 G1 explicitly excludes later capabilities. |
| Integrated pilot with synthetic recipients | `BLOCKED` | Task 04/05/06 contracts are not integrated on `main`; Task 07 tests/evidence do not exist. |
| Pilot with real recipients/PHI | `BLOCKED` | Consent/contact policy, patient identity, vendor, PIA/TRA, privacy/security/professional/accessibility/operations/legal approvals, and Task 11 promotion evidence are absent. |
| Production delivery | `BLOCKED` | All pilot gates plus exact-candidate G4/release approval, production secrets, sender identity, runbooks, monitoring, SLOs, rollback/kill rehearsals, and approved migration/deployment are absent. |

## A. Program and cross-task dependencies

| ID | Dependency | Current evidence at baseline | Status | Required resolution | Owner/approver | Blocks |
|---|---|---|---|---|---|---|
| T07-D01 | Task 01 containment controls | `docs/task-01/evidence/evidence-manifest.json` records PASS for applicable SBX controls; SBX-14 is not applicable because G2 was not requested. Sandbox adapters and egress are deny-only. | `PARTIAL` | Record a superseding/versioned Task 07 scope addendum or separate approval that preserves Task 01 controls. Do not grant G2/G3 or external effects by implication. Correct stale blocked wording in `docs/task-01/README.md` separately. | Product/capability owner, security/privacy, operations, Task 11 reviewer | Runnable synthetic code |
| T07-D02 | Task 07 Task 11 registration | No Task 07 capability registration/checkpoint/evidence profile is present on `main`. | `BLOCKED` | Record risk tier, autonomy level, capability owner, independent backup/operations roles as policy requires, expiry/review date, kill-switch operator, scope, exclusions, and Checkpoint 1 decision. | Task 07 owner + Task 11 reviewers | Runnable synthetic code |
| T07-D03 | Task 04 appointment/event contract | Task 04 specification and a synthetic approval record exist; no appointment runtime is integrated on `main`. The recorded Task 04 experimental expiry/review date was 2026-08-05 and is now past. | `BLOCKED` | Task 04 owner must renew/review its authority, finish exact versioned domain-event contracts, and merge approved synthetic interfaces. Task 07 consumes events; it does not create a shadow booking model. | Task 04 owner/reviewers | Appointment reminders and cancellation of stale reminders |
| T07-D04 | Existing follow-up source | Production follow-up plans/attempts exist through migration 0017, with transactions, locks, supersession, and audit. No notification is sent. | `READY` for source analysis; `BLOCKED` for delivery | Define a versioned, minimum-necessary event/intent handoff. Keep follow-up notification disabled until consent/contact and Task 07 gates pass. Delivery/read events never close follow-up. | Follow-up owner + Task 07 + privacy/professional | Follow-up reminders |
| T07-D05 | Task 05 patient/delegate identity | Task 05 specification exists. A local design branch was created in prior work, but no patient identity/session/authorization contract is integrated on `main`. | `BLOCKED` | Merge an approved Task 05 actor/subject/delegate/audience/assurance/revocation contract. Task 07 must not reuse pharmacist sessions. | Task 05 owner + identity/security/privacy reviewers | Secure portal, preferences, real recipient access |
| T07-D06 | Task 06 secure-messaging contract | Task 06 specification exists; no secure professional messaging runtime/contract is integrated on `main`. Another developer is working on Task 06. | `BLOCKED` | Task 06 must publish approved participant, modality, suitability, consent, response-time, urgent-use, closure, and authoritative-clinical-transition contracts. | Task 06 owner + professional/privacy/security reviewers | PHI-bearing secure threads |
| T07-D07 | Task 11 CI/release control plane | `main` contains a Task 11 gap analysis. The fuller CI branch is not merged at this baseline; only `sandbox-boundary.yml` is on `main`. | `PARTIAL` | Merge/review Task 11 controls without weakening production invariance; register Task 07 and require its evidence/approvals for promotion. | Task 11 owner + independent quality/security/repo admin | Synthetic PASS claim, pilot, production |
| T07-D08 | Task 02 production readiness/migration state | Project docs state live DB is at 0017 while 0018 is checked in but not live; Task 02 release gates remain unresolved. | `BLOCKED` for production changes | Do not add/apply a Task 07 production migration. Task 02 must complete its own exact-candidate/recovery/promotion path first, and any Task 07 migration needs separate approval. | Task 02 owner + DB/release reviewers | Production persistence and integration |

## B. Product and professional policy dependencies

| ID | Decision/artifact | Current state | Required approvers | Blocks |
|---|---|---|---|---|
| T07-D09 | Communication purpose taxonomy | Absent | Product, privacy, legal, professional | Consent model, templates, dispatch |
| T07-D10 | Exact communication consent/notice policy | Clinical consent exists but is not communication consent; no versioned channel/purpose policy | Privacy, legal, professional, accessibility | Consent capture and all sends |
| T07-D11 | Authorized-agent/delegate communication policy | No integrated Task 05 grant model | Identity, privacy, legal, professional | Delegate destinations and secure portal |
| T07-D12 | Contact verification/change/recovery policy | Absent | Security, privacy, product, operations | External destinations |
| T07-D13 | Shared/recycled destination and wrong-person policy | Absent | Privacy, security, legal, operations | External destinations |
| T07-D14 | Suppression/withdrawal hierarchy | Absent | Privacy, legal, product | Queue and dispatch |
| T07-D15 | Reminder cadence/useful-until/maximum attempts | Absent; Task brief forbids invention | Product, operations, privacy, professional where clinical follow-up is involved | Scheduler and retries |
| T07-D16 | Quiet hours/timezone/DST/overdue policy | Absent | Product, accessibility, operations, privacy | Scheduler |
| T07-D17 | Sender identity and product brand | Live product is AgentOMA; task program uses AgentRx; no approved legal sender/domain/number | Product, legal, privacy | Templates/provider onboarding |
| T07-D18 | Template allowlists and review/version workflow | Illustrative brief copy only; no approved template | Product, privacy, professional, legal, accessibility | Rendering/pilot |
| T07-D19 | Supported languages/translation/fallback | English UI only; no approved communication language policy | Product, accessibility, professional, privacy | Templates and patient UX |
| T07-D20 | Secure-message response time/non-monitoring/urgent path | Absent and shared with Task 06 | Professional, operations, product, accessibility | Secure messaging |
| T07-D21 | Alternative accessible channel/accommodation | Absent | Accessibility, product, operations, privacy | Pilot |

## C. Legal, privacy, records, and governance dependencies

| ID | Decision/artifact | Current state | Required resolution | Blocks |
|---|---|---|---|---|
| T07-D22 | CASL classification per purpose/template | Not assessed by counsel; no global conclusion is safe | Legal record for each message class, including sender ID, consent/evidence, unsubscribe/suppression, and exemptions if relied upon | Live email/SMS/push |
| T07-D23 | Telecommunications/DNCL scope | Voice/fax/ADAD not in current implementation | Keep disabled or produce a separate approved legal analysis/brief | Any outbound voice/fax automation |
| T07-D24 | PHIPA custodian/agent/provider-role matrix | Not defined for a communications vendor | Record custodian, operator, agent/service-provider/HINP analysis, support/subprocessor roles, and authority | Vendor contract and PHI |
| T07-D25 | PIA | Not performed | Approved PIA covering identity, contact, consent, provider metadata, portal, incidents, retention, and cross-border flows | Real PHI/pilot/production |
| T07-D26 | TRA/security review | Not performed | Approved threat/risk assessment and remediation evidence | Real PHI/pilot/production |
| T07-D27 | Communication record classification | Existing patient-record retention foundation, no Task 07 mapping | Classify consent/contact/outbox/provider/thread/incident records and map retention, holds, export, correction, disposal, backups, and vendor deletion | Persistence/pilot |
| T07-D28 | Wrong-recipient/privacy-breach procedure | Absent | Approved contain/assess/report/notify/remediate runbook; software must not decide reportability | Pilot/production |
| T07-D29 | Cross-border/data-location review | Project policy requires Canadian PHI regions; no vendor facts | Map message content/metadata/logs/backups/support/subprocessors/transit and section 50 implications. Do not claim universal PHIPA residency requirement. | Vendor/pilot/production |
| T07-D30 | Research report provenance | `deep-research-report.md` referenced by program tasks is absent | Supply the original if it is required; do not reconstruct or invent it | Background traceability, not Workstream A completion |

## D. Vendor and operations dependencies

| ID | Dependency | Current state | Required evidence/decision | Blocks |
|---|---|---|---|---|
| T07-D31 | Provider/product selection | None | Exact vendor, product/SKU, channels, legal entity, region, and integration mode | Live provider |
| T07-D32 | Contract/DPA and subprocessor terms | None | Purpose/use limits, incident SLA, support access, subprocessors, audit rights, deletion, exit/export, availability, and liability review | Live provider |
| T07-D33 | Secrets and sender configuration | No Task 07 env vars | Canadian/approved secret store, rotation, least privilege, separate environments, approved domains/numbers/certificates; never commit or log values | Pilot/production |
| T07-D34 | Webhook security semantics | No webhook | Signature algorithm/key rotation, raw-body handling, replay/timestamp/duplicate/order controls, safe errors, and reconciliation | Delivery-state integration |
| T07-D35 | Provider outcome/reconciliation contract | No provider | Accepted/sent/delivered/bounced/complaint/unknown semantics, polling/reconciliation, stale event handling, manual queue | Reliable delivery |
| T07-D36 | Outage/duplicate/delayed-event runbooks | Absent | Named operators, safe retry boundaries, status page/escalation, suppression, kill switch, and patient alternative route | Pilot/production |
| T07-D37 | SLI/SLO/error budget | Absent | Queue lag, dispatch denial, unknown outcome, duplicate prevention, webhook age, reconciliation, and incident targets without PHI labels | Pilot/production |
| T07-D38 | Operations response ownership | No Task 07 owner/on-call | Primary/backup owner, support hours, escalation, privacy/security contacts, vendor escalation | Runnable worker and pilot |
| T07-D39 | Kill switch and delayed-work invalidation | Task 01 pattern exists, no Task 07 registration | Global/capability/provider/channel controls; queued work must recheck and fail closed | Runnable synthetic dispatcher and production |

## E. Technical contracts required before code

These contracts should be reviewed in Workstreams B–D before any production
schema proposal:

1. `CommunicationPurpose` — finite approved enum; no arbitrary campaign type.
2. `SourceIntent` — opaque source reference, source version/state, useful-until,
   cancellation/supersession event, and authoritative owner.
3. `CommunicationAuthority` — actor, subject, relationship/grant, purpose,
   channel, notice/policy version, consent evidence, and current state.
4. `ContactPointVersion` — normalized encrypted destination, masked display,
   verification method/time/state, supersession, shared/recycled handling, and
   no destination in URLs/logs.
5. `SuppressionDecision` — global/purpose/channel/destination/source/security
   reason hierarchy with immutable evidence.
6. `CommunicationIntent` — immutable source + authority + destination/template
   versions, schedule/expiry, idempotency key, and no rendered PHI payload.
7. `DispatchTicket` — server-owned lifecycle/source/consent/contact/template
   versions and expiry, revalidated immediately before effect.
8. `ProviderAttempt` — safe metadata, attempt/idempotency key, uncertainty,
   provider reference protected from logs, and immutable state transitions.
9. `ProviderEvent` — authenticated/deduplicated raw-event quarantine and
   minimized normalized result.
10. `SecureThreadAuthorization` — Task 05 audience/relationship plus Task 06
    modality/suitability/consent; rechecked on every request.
11. `CommunicationAuditEvent` — allowlisted event/reason identifiers, actor,
    source/entity references, policy/template versions, no message body or
    destination.

## F. Required evidence before each stage

### Before runnable synthetic implementation

- Task 07 exact scope and exclusions;
- capability owner, backup, operations/security/privacy reviewers;
- risk tier, autonomy level, expiry/review date, kill-switch operator;
- Task 11 Checkpoint 1;
- Task 01 scope addendum preserving empty G3 and denied egress;
- threat model/data-flow and negative test plan;
- deterministic synthetic-only fixtures; and
- explicit statement that no external message can be transmitted.

### Before pilot with real recipients

- all Task 04/05/06 contracts integrated and versioned as applicable;
- approved consent/contact/suppression/cadence/template/accessibility policies;
- selected vendor and contract/subprocessor/residency/support evidence;
- PIA, TRA, legal/CASL, privacy, security, professional, accessibility,
  operations, procurement, and incident approvals;
- approved migration/recovery/rollback path;
- real-provider test environment with approved non-PHI test recipients;
- wrong-recipient, outage, duplicate, delayed-event, and breach drills;
- Task 11 exact-candidate evidence and limited-cohort approval; and
- independent review where required.

### Before production

- exact approved sender domains/numbers and secrets in the production secret
  store;
- current vendor, subprocessor, residency, contract, PIA/TRA, and approval
  evidence;
- production SLOs, monitoring, on-call, kill switch, reconciliation, and
  rollback rehearsals;
- safe migration applied through `db:generate` → `db:migrate`, never
  `db:push`, in an approved change window;
- branch protection and every required Task 11 check enforced;
- limited-cohort results reviewed; and
- final G4/production-release decision bound to the exact commit and evidence.

## Next executable sequence

1. Document Workstream J's privacy, security, audit, and retention plan without
   selecting a retention period or classifying a record. Workstreams D through I
   are recorded and selected no policy value, vendor, professional decision, or
   cadence; T07-D09–D22, D27, D28, and D31–D39 remain open, each with a
   fail-closed safety floor or a named blocking effect. T07-D17 carries the
   unresolved AgentRx/AgentOMA brand conflict surfaced by Workstream F; T07-D31
   remains NONE selected — the Workstream G scorecard is an instrument, not an
   assessment; Workstream H surfaced the `AGENTS.md` zero-PHI scope question for
   authenticated patient surfaces, which is a lead decision; and Workstream I
   records that T07-D03's Task 04 review/expiry date of 2026-08-05 has passed
   and needs renewal before any appointment-reminder work.
2. Product lead assigns Task 07 owner/review metadata and approves a bounded,
   expiring, synthetic-only scope; Task 11 records Checkpoint 1 before code.
3. Resolve or formally park policy decisions T07-D09–D21; do not invent them in
   schemas/UI copy.
4. Define versioned producer/consumer contracts with Task 04, 05, and 06 owners.
5. Only then propose a sandbox-only synthetic domain/outbox model and red/green
   evidence plan. No network effect and no production import.

## Current conclusion

**Task 07 Workstreams A–I: PASS as design documentation.** The repository and
official-source gaps, required actors/assets/threats, trust boundaries, data
flows, conceptual contracts, field metadata, relational constraints, the
fail-closed consent/contact/preference/suppression behaviour, the outbox state
machine with its idempotency, concurrency, and scheduling contract, and the
template registry with its placeholder, rendering, URL, and leakage-test
boundary, and the provider adapter, webhook, and reconciliation contracts with
an unapplied vendor scorecard, and the secure-messaging contract, queue design,
and authorization matrix, and the appointment/follow-up/Task 06 producer
boundaries are documented; no risk, schema, policy value, template, vendor, or
professional decision has been accepted, no exactly-once delivery guarantee has
been claimed, no prototype has been built, and no notification path exists. **Task 07 runnable synthetic
implementation: BLOCKED** pending task-specific authority and Task 11
Checkpoint 1. **Pilot/production: BLOCKED** pending identity, consent/contact,
producer contracts, vendor, records, privacy/security/professional/
accessibility/legal/operations approvals, and exact-candidate release evidence.
