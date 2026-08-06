# Task 07 — Communication Contracts and Schema Proposal

**Workstream:** C — server-only domain contracts and conceptual schema

**Prepared:** 2026-08-06

**Repository design baseline:** `f1aec876e9f7a41de1e2126a1af57b21c318b6ad`

**Migration/runtime effect:** none

**Production approval:** not granted

## Decision summary

This document defines the conceptual server-only contracts requested by the
Task 07 brief. It does not add TypeScript, SQL, a Drizzle schema, an endpoint, a
worker, a provider, a credential, a recipient, or a network effect. It must not
be translated into a production migration until schema ownership, Task 07 scope,
Task 11 Checkpoint 1, policy decisions, retention classification, privacy and
security review, and the applicable production gates are recorded.

Unknown policy is represented as unknown or denied. The proposal does not invent
consent wording, consent duration, reminder cadence, quiet hours, response-time
promises, supported languages, vendor semantics, production roles, or retention
periods.

## Non-negotiable contract rules

1. All contracts are server-owned. Clients submit requests, never authoritative
   actor, subject, pharmacy, recipient, channel, purpose, consent, source,
   template, provider, or state fields.
2. The current application serves one pharmacy. `custodian_ref` is derived from
   server-only `PHARMACY_ID`; it is not a client-selectable multi-tenant key.
3. Contact verification proves destination control only. Task 05 remains the
   authority for patient/delegate identity and actor-to-subject grants.
4. Preference does not create consent. Consent is exact to custodian, subject,
   actor/grant where applicable, contact-point version, channel, purpose, notice,
   policy, and time.
5. A scheduled message carries the versions used at creation, but dispatch
   re-reads current lifecycle, source, identity/grant, consent, contact,
   suppression, template, policy, and attempt state. Unknown denies.
6. Raw contact values, secure content, tokens, challenges, provider identifiers,
   and raw provider payloads never enter URLs, logs, audit events, idempotency
   keys, metrics, general queues, or evidence artifacts.
7. External channels carry generic approved content only. Secure-message content
   remains in the authenticated portal domain.
8. Events are append-only. Corrections and policy changes create new versions or
   superseding records; business history is not rewritten.
9. Provider delivery state and portal acknowledgement are separate facts and
   never complete appointment, visit, follow-up, assessment, prescription,
   referral, billing, or claim work.
10. Attachments remain `BLOCKED`. No schema below authorizes file upload.

## Field-catalogue notation

Every field in every contract appears in a table below. The columns have this
normative meaning:

| Column | Meaning |
|---|---|
| Type / null | Conceptual TypeScript/PostgreSQL shape and whether `null` is valid. `—` means non-null. |
| Meaning / source | Field meaning and authoritative source of truth. |
| Writer | Trusted actor or service allowed to establish the value. This does not create a production role. |
| Class / exposure / crypto | Data class, whether a client may receive it, and encryption requirement. |
| Authorization | Read/write authorization required at the server boundary. |
| Retention / staleness | Retention owner plus invalidation, correction, and supersession behavior. No duration is implied. |
| Gate | Approval required before production persistence or effect. Every persisted production field also requires an approved migration. |

### Data classes

- **C0:** approved generic public copy.
- **C1:** safe operational metadata and opaque references.
- **C2:** restricted identity, authorization, policy, or workflow metadata.
- **C3:** direct contact or secret-like identifier.
- **C4:** PHI or secure-message content.
- **C5:** credential or secret.

### Exposure and encryption codes

- **S/B:** server-only; approved database/TLS encryption baseline.
- **S/F:** server-only; application-level field/envelope encryption plus key
  version.
- **S/H:** server-only keyed digest; not reversible and not a raw normalized
  value.
- **A/B:** minimum necessary may reach an authenticated, authorized client;
  approved database/TLS baseline.
- **A/F:** decrypted only for the authenticated, authorized view or bounded
  adapter operation; encrypted otherwise.
- **P/B:** approved public/generic value; no patient-specific interpolation.

### Retention owners

- **R-ID:** Task 05 identity/contact records owner, not yet integrated.
- **R-PRIV:** custodian privacy/records owner.
- **R-COMMS:** communications operations owner.
- **R-PROF:** professional secure-message/clinical-record owner with Task 06
  input where applicable.
- **R-SEC:** security/incident owner.

Actual periods, patient-record inclusion, legal-hold behavior, backups, vendor
deletion, and destruction order remain approval inputs. No row below silently
chooses a period.

### Production gate codes

| Code | Required decision/evidence |
|---|---|
| G0 | Task 07 task-specific scope, owners/reviewers, expiry/kill switch, Task 01 boundary, and Task 11 Checkpoint 1. |
| G1 | Product/privacy/legal policy: purpose, consent, contact, preference, quiet hours, language, suppression, or copy as applicable. |
| G2 | Task 05 identity/delegation contract integrated. |
| G3 | Task 04/06 or existing follow-up producer/professional contract integrated. |
| G4 | Records classification, retention, legal hold, export/correction/destruction, PIA and TRA approved. |
| G5 | Vendor/provider, DPA, residency/data flow, subprocessors/support, credentials, idempotency, webhooks, reconciliation and incident controls approved. |
| G6 | Production schema ownership, generated migration, recovery/rollback, least-privilege grants, exact-candidate Task 11 and promotion approval. |

`G0` is required before runnable synthetic code. `G6` is required for every
production table even where a row lists additional domain gates.

## Shared scalar contracts

These are nominal server types, not interchangeable strings:

```text
OpaqueId<Domain>       = UUID or equivalent non-enumerable identifier
Instant                = timezone-aware server/database timestamp
Version                = positive integer, monotonically increasing per aggregate
SafeCode<Domain>       = finite allowlisted machine code; never free text
Ciphertext             = envelope-encrypted bytes plus separate key version
KeyedDigest            = versioned HMAC/keyed digest; never an unsalted hash
SafeRenderParameters   = closed schema of C0/C1 fields approved by template version
```

Identifiers are opaque references, not bearer credentials. Server timestamps
come from the database or trusted server clock. Free-text reason fields are not
part of operational/outbox/audit contracts; reviewed safe reason codes are used.

## Contract 1 — `CommunicationChannel`

A closed nominal enum. Candidate values from the brief are `EMAIL`, `SMS`,
`PUSH`, and `SECURE_PORTAL`. Voice, fax, marketing, and automatic fallback are
outside this contract. A channel value describes transport, not consent,
preference, identity, content sensitivity, or delivery state.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `code` | `SafeCode<Channel>` / — | Exact approved channel identifier from policy registry. | Policy registry publisher. | C1; P/B for display after approval. | Read all approved clients; publish by named policy role only. | R-COMMS; new value/version rather than reinterpretation. | G0,G1,G5,G6 |

## Contract 2 — `CommunicationPurpose`

A finite, versioned policy registry. The brief names appointment reminders,
follow-up reminders, account actions, contact verification, and secure-item
notices as candidate classes; none becomes an approved production purpose merely
by appearing here.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `purpose_id` | `OpaqueId<Purpose>` / — | Stable registry identity. | Policy registry service. | C1; S/B. | Internal read; policy-publisher write. | R-COMMS; immutable identity. | G0,G1,G6 |
| `code` | `SafeCode<Purpose>` / — | Approved purpose machine code; never arbitrary campaign text. | Policy publisher. | C1; A/B where choices are approved. | Purpose-scoped UI read; publisher write. | R-COMMS; code is not repurposed. | G1,G6 |
| `policy_version` | `string` / — | Exact approved purpose/consent policy version. | Policy publisher. | C2; A/B where notice requires it. | Authorized policy read; publisher write. | R-PRIV; new registry version supersedes. | G1,G4,G6 |
| `state` | `enum(DRAFT, ACTIVE, WITHDRAWN)` / — | Whether new intents may use the purpose. | Policy publisher. | C1; S/B. | Internal read; dual-control publish/withdraw. | R-COMMS; withdrawal invalidates new use and triggers re-evaluation. | G1,G6 |
| `effective_at` | `Instant` / — | Server time the approved version begins. | Policy registry. | C1; S/B. | Internal read; publisher write. | R-COMMS; future/expired versions unusable. | G1,G6 |
| `retired_at` | `Instant` / null | Time new use ends. | Policy registry. | C1; S/B. | Internal read; publisher write. | R-COMMS; null means not retired, not perpetual approval. | G1,G6 |

## Contract 3 — `ContactPoint`

One immutable destination version. A material change creates a new row and
supersedes the old version. `SECURE_PORTAL` is not a contact destination here;
portal access comes from Task 05 identity/session authorization.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `contact_point_id` | `OpaqueId<ContactPoint>` / — | Stable identity for this destination lineage. | Contact service. | C2; S/B. | Task 05-authorized actor or authorized staff via server action. | R-ID/R-PRIV; lineage retained per approved classification. | G0,G2,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian scope; currently `PHARMACY_ID`. | Server context. | C2; S/B. | Never client-selected; pharmacy-scoped service access. | R-PRIV; immutable. | G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Patient record subject, not login identity. | Task 05/contact service after subject authorization. | C2; S/B. | Exact actor-subject/custodian authorization. | R-ID/R-PRIV; immutable; correction through governed linkage. | G2,G4,G6 |
| `patient_actor_ref` | `OpaqueId<Actor>` / null | Actor who controls/registered the destination where applicable. | Task 05 identity service. | C2; S/B. | Exact actor or valid delegate/staff authority. | R-ID; stale when account/grant is revoked. | G2,G4,G6 |
| `channel` | `enum(EMAIL, SMS, PUSH)` / — | Destination transport class. | Contact service from approved request. | C1; A/B as masked label. | Actor may request; server validates approved channel. | R-ID; immutable per version. | G1,G2,G6 |
| `encrypted_value` | `Ciphertext` / — | Email, phone, or push subscription encrypted at field level. | Contact service after Task 05 authorization. | C3; S/F; decrypt only for masked view or bounded adapter. | Minimum-necessary contact managers/adapter only. | R-ID/R-PRIV; old versions remain inaccessible except governed need. | G2,G4,G5,G6 |
| `encryption_key_version` | `string` / — | Key version needed for controlled decryption/rotation. | Encryption service. | C2; S/B. | Encryption service and restricted operators. | R-SEC; rotate by re-encryption without changing business version. | G4,G6 |
| `keyed_match_digest` | `KeyedDigest` / null | Optional normalized match for duplicate/wrong-destination controls where justified. | Contact service. | C3; S/H. | Restricted server query only; never client/log/provider. | R-ID/R-PRIV; rotate digest key/version; delete per classification. | G1,G2,G4,G6 |
| `match_key_version` | `string` / null | HMAC key/normalization version paired with digest. | Contact service. | C2; S/B. | Restricted server only. | R-SEC; stale when normalization/key policy changes. | G4,G6 |
| `contact_version` | `Version` / — | Monotonic material-destination version. | Contact service transaction. | C1; S/B. | Internal; client may see generic “updated” state only. | R-ID; immutable; next version supersedes. | G2,G6 |
| `verification_state` | `enum(PENDING, VERIFIED, EXPIRED, REVOKED, DISPUTED, UNKNOWN)` / — | Current verification projection for this version. | Verification service from immutable events. | C2; A/B as minimum status. | Subject-authorized actor/staff read; service write. | R-ID; unknown/non-verified always ineligible. | G1,G2,G6 |
| `verification_method` | `SafeCode<VerificationMethod>` / null | Approved method used for successful/attempted verification. | Verification service. | C2; S/B. | Restricted identity/contact operations. | R-ID; immutable once verified; null until event. | G1,G2,G5,G6 |
| `verified_at` | `Instant` / null | Server receipt time of valid one-time proof. | Verification service. | C2; A/B as status/time if needed. | Subject-authorized read; service write. | R-ID; stale under expiry/reverification policy. | G1,G2,G6 |
| `verification_challenge_ref` | `OpaqueId<Challenge>` / null | Challenge whose successful event supports verification. | Verification service. | C2; S/B. | Restricted identity/contact services. | R-ID/R-SEC; immutable evidence link. | G1,G2,G4,G6 |
| `verified_by_actor_ref` | `OpaqueId<Actor>` / null | Actor or staff witness that completed/recorded verification. | Verification service. | C2; S/B. | Privacy/security audit roles only. | R-ID/R-PRIV; immutable. | G2,G4,G6 |
| `state` | `enum(ACTIVE, SUPERSEDED, DISPUTED, SUPPRESSED, INVALIDATED)` / — | Destination lifecycle, separate from verification. | Contact/suppression service. | C2; A/B as minimum status. | Authorized subject/staff read; service transition. | R-ID; only `ACTIVE` may be evaluated, never automatically restored. | G1,G2,G6 |
| `source_code` | `SafeCode<ContactSource>` / — | Approved provenance category, not free-text source detail. | Contact service. | C2; S/B. | Restricted operations/privacy read. | R-ID/R-PRIV; immutable. | G1,G2,G4,G6 |
| `last_confirmed_at` | `Instant` / null | Last approved confirmation under contact policy. | Contact service from immutable event. | C2; A/B if shown to actor. | Exact subject/authorized staff. | R-ID; stale per unapproved reverification policy. | G1,G2,G6 |
| `created_at` | `Instant` / — | Database creation time. | Database. | C1; S/B. | Internal/audit read. | R-ID; immutable. | G4,G6 |
| `changed_at` | `Instant` / null | Time this version materially replaced an earlier one. | Contact service. | C1; S/B. | Internal/audit read. | R-ID; immutable; null for first version. | G4,G6 |
| `invalidated_at` | `Instant` / null | Time dispute/revocation/invalidation became effective. | Contact/suppression service. | C2; S/B. | Authorized contact/privacy operations. | R-ID/R-PRIV; immutable event projection. | G1,G4,G6 |
| `supersedes_contact_point_ref` | `OpaqueId<ContactPointVersion>` / null | Prior version replaced by this row. | Contact service transaction. | C2; S/B. | Restricted server/audit read. | R-ID; immutable acyclic lineage. | G2,G4,G6 |
| `retention_classification` | `SafeCode<RecordClass>` / — | Approved records classification. | Records policy service. | C2; S/B. | Governance read/write only. | R-PRIV; versioned policy, never guessed. | G4,G6 |
| `retain_until` | `Instant` / null | Computed horizon once an approved rule exists; null means unresolved/hold-aware, not delete now. | Governance service/database. | C2; S/B. | Governance only. | R-PRIV; recompute by approved rule; legal hold overrides. | G4,G6 |

## Contract 4 — `ContactVerificationChallenge`

Short-lived and one-time. No raw challenge/code is persisted, logged, audited,
or returned after issuance.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `challenge_id` | `OpaqueId<Challenge>` / — | Challenge identity; not the secret. | Verification service. | C2; S/B. | Exact authorized initiation context. | R-ID/R-SEC; immutable. | G0,G2,G6 |
| `contact_point_ref` | `OpaqueId<ContactPointVersion>` / — | Exact destination version being proved. | Verification service. | C2; S/B. | Task 05 actor-subject authorization. | R-ID; stale immediately when contact version changes. | G2,G6 |
| `method` | `SafeCode<VerificationMethod>` / — | Approved delivery/proof method. | Verification service/policy. | C2; S/B. | Authorized initiation; server validates. | R-ID; immutable. | G1,G2,G5,G6 |
| `challenge_digest` | `KeyedDigest` / — | One-way versioned digest of the one-time code. | Verification service. | C5; S/H. | Verification comparison service only. | R-SEC; destroy after approved short evidence window. | G1,G4,G6 |
| `digest_key_version` | `string` / — | Key version for comparison/rotation. | Secret/verification service. | C2; S/B. | Verification service only. | R-SEC; immutable for challenge. | G4,G6 |
| `state` | `enum(PENDING, CONSUMED, EXPIRED, REVOKED, LOCKED)` / — | Challenge lifecycle. | Verification service transaction. | C2; S/B. | Exact actor context; service transition only. | R-ID/R-SEC; terminal states never reopen. | G1,G2,G6 |
| `attempt_count` | `integer >= 0` / — | Server-counted failed/total attempts under approved rule. | Verification service/database. | C2; S/B. | Verification service only. | R-SEC; monotonically increases. | G1,G6 |
| `max_attempts_policy_ref` | `string` / — | Versioned rate/attempt policy, not an invented number. | Policy registry. | C1; S/B. | Internal read; policy publisher write. | R-SEC; challenge keeps original version. | G1,G6 |
| `created_by_actor_ref` | `OpaqueId<Actor>` / — | Authenticated actor requesting verification. | Task 05/verification service. | C2; S/B. | Exact actor-subject grant. | R-ID/R-PRIV; immutable. | G2,G4,G6 |
| `created_at` | `Instant` / — | Server/database issue time. | Database. | C1; S/B. | Internal. | R-SEC; immutable. | G4,G6 |
| `expires_at` | `Instant` / — | Expiry derived from approved policy. | Verification service. | C1; S/B. | Internal; may display remaining generic state. | R-SEC; expired always denies. | G1,G6 |
| `consumed_at` | `Instant` / null | Atomic successful-consumption time. | Verification service/database. | C2; S/B. | Verification service only. | R-SEC; set once; duplicate consume is idempotent denial. | G1,G6 |
| `revoked_at` | `Instant` / null | Server time challenge was invalidated. | Verification/security service. | C2; S/B. | Authorized contact/security action. | R-SEC; terminal. | G1,G2,G6 |
| `safe_terminal_reason` | `SafeCode<ChallengeReason>` / null | Payload-free terminal reason. | Verification service. | C1; S/B. | Restricted operational read. | R-SEC; immutable once terminal. | G1,G6 |

## Contract 5 — `ContactVerificationEvent`

Append-only evidence. It records safe state changes, not the challenge value or
provider payload.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `event_id` | `OpaqueId<VerificationEvent>` / — | Immutable event identity. | Verification service. | C1; S/B. | Internal append/read by authorized reviewers. | R-ID/R-SEC; append-only. | G0,G4,G6 |
| `challenge_ref` | `OpaqueId<Challenge>` / — | Challenge affected. | Verification service. | C2; S/B. | Restricted service/audit read. | R-ID/R-SEC; immutable. | G2,G4,G6 |
| `contact_point_ref` | `OpaqueId<ContactPointVersion>` / — | Exact destination version. | Verification service. | C2; S/B. | Restricted service/audit read. | R-ID; immutable. | G2,G4,G6 |
| `event_type` | `SafeCode<VerificationEventType>` / — | Issued, attempted, verified, expired, revoked, or locked event. | Verification state machine. | C1; S/B. | Internal; actor may receive generic projection. | R-ID/R-SEC; append-only. | G1,G6 |
| `actor_ref` | `OpaqueId<Actor>` / null | Authenticated actor causing event; null for trusted timer. | Identity/verification service. | C2; S/B. | Security/privacy review only. | R-ID/R-PRIV; immutable. | G2,G4,G6 |
| `occurred_at` | `Instant` / — | Trusted server/database event time. | Database. | C1; S/B. | Internal. | R-ID/R-SEC; immutable. | G4,G6 |
| `safe_reason_code` | `SafeCode<VerificationReason>` / null | Allowlisted outcome without destination/challenge/error body. | Verification service. | C1; S/B. | Restricted operations. | R-SEC; immutable. | G1,G6 |
| `policy_version` | `string` / — | Verification/rate policy used. | Verification service from registry. | C2; S/B. | Internal/privacy/security. | R-ID/R-SEC; immutable evidence. | G1,G4,G6 |

## Contract 6 — `CommunicationConsentEvent`

Append-only capture, withdrawal, revocation, expiry, dispute, or supersession
evidence. Treatment/assessment consent is never reused as communication consent.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `consent_event_id` | `OpaqueId<ConsentEvent>` / — | Immutable event identity. | Consent service. | C2; S/B. | Authorized actor/staff mutation; privacy/audit read. | R-PRIV; append-only. | G0,G1,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Subject whose communication authority is affected. | Task 05/consent service. | C2; S/B. | Exact actor-subject grant. | R-PRIV/R-ID; immutable. | G2,G4,G6 |
| `acting_actor_ref` | `OpaqueId<Actor>` / — | Patient actor or authorized agent making decision. | Task 05 identity service. | C2; S/B. | Authenticated exact actor. | R-PRIV/R-ID; immutable. | G2,G4,G6 |
| `agent_relationship_code` | `SafeCode<Relationship>` / null | Approved relationship category when actor differs from subject. | Task 05 grant. | C2; S/B. | Exact active grant only. | R-ID/R-PRIV; event preserves historical value. | G1,G2,G4,G6 |
| `agent_grant_ref` | `OpaqueId<DelegateGrant>` / null | Versioned Task 05 authority used. | Task 05 identity service. | C2; S/B. | Exact active grant at capture/withdrawal. | R-ID/R-PRIV; immutable; later revocation does not erase history. | G2,G4,G6 |
| `contact_point_ref` | `OpaqueId<ContactPointVersion>` / — | Exact destination version consent covers. | Consent service. | C2; S/B. | Contact belongs to exact custodian/subject. | R-PRIV; superseded contact makes grant ineligible. | G1,G2,G4,G6 |
| `channel` | `CommunicationChannel` / — | Exact authorized channel. | Consent service from approved UI/action. | C1; A/B in consent view. | Actor may select only policy-permitted channels. | R-PRIV; immutable event scope. | G1,G2,G6 |
| `purpose_ref` | `OpaqueId<Purpose>` / — | Exact purpose registry version/scope. | Consent service. | C2; A/B with approved label. | Purpose-specific authorization. | R-PRIV; immutable; never broadened. | G1,G6 |
| `notice_version` | `string` / — | Exact approved notice/wording shown. | Consent UI/server registry. | C2; A/B. | Actor sees; publisher controls version. | R-PRIV; immutable evidence. | G1,G4,G6 |
| `capture_method` | `SafeCode<ConsentCapture>` / — | Authenticated self-service, authorized-agent, or approved witnessed method. | Consent service. | C2; S/B. | Method-specific actor/witness checks. | R-PRIV; immutable. | G1,G2,G4,G6 |
| `provenance_ref` | `OpaqueId<ConsentProvenance>` / — | Server-owned reference to approved capture transaction/evidence, not free text. | Consent service. | C2; S/B. | Privacy/audit review only. | R-PRIV; immutable. | G1,G4,G6 |
| `language` | `BCP47 string` / — | Language of the exact reviewed notice presented. | Template/consent service. | C2; A/B. | Actor sees; server validates approved translation. | R-PRIV; immutable. | G1,G4,G6 |
| `event_type` | `enum(GRANTED, WITHDRAWN, REVOKED, EXPIRED, DISPUTED, SUPERSEDED)` / — | Exact immutable consent event. | Consent state machine/authorized actor. | C1; A/B as current/history view. | Type-specific actor/service authorization. | R-PRIV; append-only. | G1,G2,G6 |
| `effective_at` | `Instant` / — | Server time event takes effect. | Consent service/database. | C2; A/B. | Internal write; authorized history read. | R-PRIV; immutable. | G1,G4,G6 |
| `expires_at` | `Instant` / null | Approved fixed expiry; null only with non-null approved no-expiry policy reference. | Consent policy service. | C2; A/B. | Internal derive; actor history read. | R-PRIV; expiry denies dispatch. | G1,G4,G6 |
| `no_fixed_expiry_policy_ref` | `string` / null | Exact approved policy authorizing no fixed expiry. | Policy registry. | C2; S/B. | Privacy/legal policy read. | R-PRIV; event preserves version. | G1,G4,G6 |
| `withdrawal_at` | `Instant` / null | Effective withdrawal time for withdrawal event/projection. | Consent service/database. | C2; A/B. | Patient/valid agent or authorized process. | R-PRIV; terminal for affected grant. | G1,G2,G4,G6 |
| `revocation_reason_code` | `SafeCode<ConsentReason>` / null | Approved payload-free reason; required for revoke/dispute. | Consent service/authorized reviewer. | C2; S/B. | Privacy-authorized action. | R-PRIV; immutable. | G1,G4,G6 |
| `supersedes_event_ref` | `OpaqueId<ConsentEvent>` / null | Earlier event corrected/replaced by this event. | Consent service transaction. | C2; S/B. | Governed correction only. | R-PRIV; immutable acyclic link. | G4,G6 |
| `staff_witness_ref` | `OpaqueId<StaffActor>` / null | Staff witness where approved method requires one. | Staff auth/consent service. | C2; S/B. | Role and method-specific server check. | R-PRIV; immutable. | G1,G4,G6 |
| `policy_version` | `string` / — | Exact consent policy governing capture and validity. | Policy registry. | C2; A/B where notice displays it. | Internal/privacy/legal. | R-PRIV; immutable evidence. | G1,G4,G6 |
| `jurisdiction` | `SafeCode<Jurisdiction>` / — | Approved jurisdiction scope; no IP inference. | Server/policy context. | C2; S/B. | Server-derived only. | R-PRIV; immutable. | G1,G4,G6 |
| `created_at` | `Instant` / — | Database append time. | Database. | C1; S/B. | Internal/audit. | R-PRIV; immutable. | G4,G6 |

## Contract 7 — `CommunicationConsentGrant`

An immutable effective-grant snapshot derived from consent events. It is a
queryable authorization aid, never a substitute for dispatch-time re-evaluation.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `consent_grant_id` | `OpaqueId<ConsentGrant>` / — | Immutable grant snapshot identity. | Consent projection service. | C2; S/B. | Internal; actor may view approved projection. | R-PRIV; append-only snapshot. | G0,G1,G4,G6 |
| `originating_event_ref` | `OpaqueId<ConsentEvent>` / — | Grant event supporting this snapshot. | Consent projection service. | C2; S/B. | Restricted internal/audit read. | R-PRIV; immutable. | G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Exact custodian scope copied from event. | Projection service. | C2; S/B. | Server-scope match. | R-PRIV; immutable. | G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Exact patient subject. | Projection service. | C2; S/B. | Exact actor-subject authorization. | R-PRIV; immutable. | G2,G4,G6 |
| `acting_actor_ref` | `OpaqueId<Actor>` / — | Actor whose authority supported grant. | Projection service. | C2; S/B. | Exact actor/grant checks. | R-PRIV/R-ID; stale if relationship no longer valid at dispatch. | G2,G4,G6 |
| `agent_grant_ref` | `OpaqueId<DelegateGrant>` / null | Task 05 delegation version if applicable. | Projection service. | C2; S/B. | Exact grant scope. | R-ID/R-PRIV; stale/revoked grant denies dispatch. | G2,G4,G6 |
| `contact_point_ref` | `OpaqueId<ContactPointVersion>` / — | Exact verified destination version. | Projection service. | C2; S/B. | Subject/contact scope match. | R-PRIV; supersession/dispute/suppression denies. | G1,G2,G4,G6 |
| `channel` | `CommunicationChannel` / — | Exact permitted channel. | Projection service. | C1; A/B. | Purpose/channel-specific. | R-PRIV; immutable. | G1,G6 |
| `purpose_ref` | `OpaqueId<Purpose>` / — | Exact permitted purpose. | Projection service. | C2; A/B with label. | Purpose-specific. | R-PRIV; immutable. | G1,G6 |
| `notice_version` | `string` / — | Wording acknowledged. | Projection service. | C2; A/B. | Authorized history read. | R-PRIV; immutable. | G1,G4,G6 |
| `policy_version` | `string` / — | Validity policy version. | Projection service. | C2; S/B. | Internal/privacy. | R-PRIV; immutable. | G1,G4,G6 |
| `state` | `enum(ACTIVE, PENDING, EXPIRED, REVOKED, SUPERSEDED, DISPUTED, UNKNOWN)` / — | Conservative effective state. | Consent projection service. | C2; A/B. | Authorized actor/staff read; service write. | R-PRIV; only `ACTIVE` is potentially usable; dispatch still rechecks. | G1,G2,G6 |
| `effective_at` | `Instant` / — | Effective start from events/policy. | Projection service. | C2; A/B. | Internal derive. | R-PRIV; immutable snapshot. | G1,G4,G6 |
| `expires_at` | `Instant` / null | Exact expiry or null paired with approved no-expiry policy. | Projection service. | C2; A/B. | Internal derive. | R-PRIV; expired denies. | G1,G4,G6 |
| `withdrawn_at` | `Instant` / null | Withdrawal/revocation effective time. | Projection service. | C2; A/B. | Internal derive. | R-PRIV; terminal for snapshot. | G1,G4,G6 |
| `superseded_by_grant_ref` | `OpaqueId<ConsentGrant>` / null | New grant snapshot replacing this one. | Projection service transaction. | C2; S/B. | Internal only. | R-PRIV; one-way immutable link. | G4,G6 |
| `authority_revision` | `Version` / — | Revision included in dispatch ticket/recheck. | Consent service/database. | C1; S/B. | Internal. | R-PRIV; any change makes old ticket stale. | G1,G6 |
| `created_at` | `Instant` / — | Database snapshot time. | Database. | C1; S/B. | Internal. | R-PRIV; immutable. | G4,G6 |

## Contract 8 — `CommunicationPreferenceProfile`

Preferences select among already permitted choices. They never create consent or
override suppression.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `profile_id` | `OpaqueId<PreferenceProfile>` / — | Immutable profile version identity. | Preference service. | C2; S/B. | Exact subject-authorized actor/staff. | R-PRIV; versioned/superseded. | G0,G1,G2,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Subject whose preferences apply. | Task 05/preference service. | C2; S/B. | Exact actor-subject grant. | R-PRIV/R-ID; immutable. | G2,G4,G6 |
| `acting_actor_ref` | `OpaqueId<Actor>` / — | Patient/delegate who set preferences. | Task 05 identity. | C2; S/B. | Exact active grant. | R-PRIV; immutable history. | G2,G4,G6 |
| `profile_version` | `Version` / — | Monotonic preference version. | Preference service transaction. | C1; S/B. | Internal. | R-PRIV; next version supersedes. | G1,G6 |
| `preferred_channels` | `CommunicationChannel[]` / — | Ordered/set approved preferences, not consent. | Authorized actor via server action. | C2; A/B. | Actor can select approved channels only. | R-PRIV; dispatch uses current profile and separate consent. | G1,G2,G6 |
| `no_assumed_fallback` | literal `true` / — | Tombstone invariant forbidding implicit channel fallback. | Schema/domain invariant. | C1; A/B. | Cannot be changed by client/operator. | R-PRIV; invariant across versions. | G1,G6 |
| `language` | `BCP47 string` / — | Preferred approved communication language. | Authorized actor/preference service. | C2; A/B. | Actor selection from approved list. | R-PRIV; stale if translation unavailable; no machine translation. | G1,G2,G6 |
| `translation_policy_version` | `string` / — | Human-review/fallback policy governing language use. | Policy registry. | C2; S/B. | Internal/accessibility reviewers. | R-PRIV; profile keeps exact version. | G1,G4,G6 |
| `iana_timezone` | `IANA timezone` / — | Explicitly selected/account-approved timezone; never inferred from IP. | Authorized actor or approved account source. | C2; A/B. | Exact subject actor/staff. | R-PRIV; change creates new profile and re-evaluation. | G1,G2,G6 |
| `timezone_provenance` | `SafeCode<TimezoneSource>` / — | Approved source category for timezone. | Preference service. | C2; S/B. | Restricted audit/privacy read. | R-PRIV; immutable per version. | G1,G4,G6 |
| `quiet_hours_policy_ref` | `OpaqueId<QuietHoursPolicy>` / null | Exact quiet-hours version; null means no approved profile rule, not permission to send anytime. | Preference service. | C2; A/B. | Exact subject actor/policy validation. | R-PRIV; dispatch rechecks current policy. | G1,G2,G6 |
| `accommodation_codes` | `SafeCode<Accommodation>[]` / — | Approved minimum-necessary accessibility/communication preferences; no diagnosis text. | Authorized actor/preference service. | C2; A/B. | Exact subject actor and minimum-necessary staff. | R-PRIV; new version supersedes. | G1,G2,G4,G6 |
| `alternative_format_code` | `SafeCode<AlternativeFormat>` / null | Approved alternative-format preference. | Authorized actor. | C2; A/B. | Exact subject actor/staff. | R-PRIV; re-evaluate on change. | G1,G2,G6 |
| `effective_at` | `Instant` / — | Server time profile becomes current. | Preference service/database. | C1; A/B. | Internal write. | R-PRIV; immutable. | G1,G4,G6 |
| `superseded_at` | `Instant` / null | Time newer version took effect. | Preference service transaction. | C1; A/B. | Internal. | R-PRIV; terminal. | G1,G4,G6 |
| `superseded_by_profile_ref` | `OpaqueId<PreferenceProfile>` / null | New profile version. | Preference service. | C2; S/B. | Internal. | R-PRIV; immutable acyclic link. | G4,G6 |

## Contract 9 — `QuietHoursPolicy`

Stores an approved patient/account preference version. This proposal defines no
default hours, emergency override, cadence, or timezone inference.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `quiet_hours_policy_id` | `OpaqueId<QuietHoursPolicy>` / — | Immutable policy version identity. | Preference/policy service. | C2; S/B. | Exact subject actor or policy publisher. | R-PRIV; versioned. | G0,G1,G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Subject whose preference applies. | Task 05/preference service. | C2; S/B. | Exact actor-subject grant. | R-PRIV; immutable. | G2,G4,G6 |
| `iana_timezone` | `IANA timezone` / — | Explicit selected timezone used for evaluation. | Preference service. | C2; A/B. | Exact subject actor/staff. | R-PRIV; new version on change. | G1,G2,G6 |
| `timezone_provenance` | `SafeCode<TimezoneSource>` / — | Approved source category; never IP-derived. | Preference service. | C2; S/B. | Restricted. | R-PRIV; immutable. | G1,G4,G6 |
| `windows` | `{days: IsoWeekday[], start: LocalTime, end: LocalTime}[]` / — | Explicit quiet intervals under approved semantics. | Authorized actor/policy service. | C2; A/B. | Actor chooses within policy constraints. | R-PRIV; immutable version; DST evaluated at dispatch. | G1,G2,G6 |
| `policy_version` | `string` / — | Exact DST/ambiguous/skipped-time/useful-window policy. | Policy registry. | C2; S/B. | Internal/accessibility/operations. | R-PRIV; immutable. | G1,G4,G6 |
| `effective_at` | `Instant` / — | Start of version validity. | Database/preference service. | C1; A/B. | Internal write. | R-PRIV; immutable. | G1,G4,G6 |
| `superseded_at` | `Instant` / null | End due to replacement. | Preference service. | C1; A/B. | Internal. | R-PRIV; terminal. | G1,G4,G6 |
| `superseded_by_policy_ref` | `OpaqueId<QuietHoursPolicy>` / null | Replacement version. | Preference service. | C2; S/B. | Internal. | R-PRIV; immutable acyclic link. | G4,G6 |

## Contract 10 — `CommunicationTemplate`

Template family identity. It contains no patient content and cannot send.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `template_id` | `OpaqueId<Template>` / — | Stable family identity. | Template registry. | C1; S/B. | Internal read; approved publisher write. | R-COMMS/R-PRIV; immutable identity. | G0,G1,G4,G6 |
| `purpose_ref` | `OpaqueId<Purpose>` / — | Exact approved purpose family. | Template registry. | C2; S/B. | Policy/template reviewer. | R-COMMS; immutable family scope. | G1,G6 |
| `channel` | `CommunicationChannel` / — | Exact channel; no cross-channel reuse. | Template registry. | C1; S/B. | Template reviewer. | R-COMMS; immutable family scope. | G1,G5,G6 |
| `content_class` | `enum(GENERIC_EXTERNAL, SECURE_PORTAL)` / — | Whether body must be C0-only or may be secure C4 content. | Template policy reviewer. | C1; S/B. | Privacy/professional approval. | R-PRIV; cannot be broadened; new family required. | G1,G3,G4,G6 |
| `owner_role_code` | `SafeCode<TemplateOwner>` / — | Named governance role category, not a login role grant. | Policy registry. | C1; S/B. | Governance only. | R-COMMS; change creates new governance version. | G1,G6 |
| `state` | `enum(DRAFT, ACTIVE, WITHDRAWN)` / — | Family availability. | Template registry. | C1; S/B. | Dual-control publish/withdraw. | R-COMMS; withdrawal blocks new rendering. | G1,G6 |
| `created_at` | `Instant` / — | Database creation time. | Database. | C1; S/B. | Internal. | R-COMMS; immutable. | G4,G6 |
| `withdrawn_at` | `Instant` / null | Family withdrawal time. | Template registry. | C1; S/B. | Authorized publisher. | R-COMMS; pending intents re-evaluate. | G1,G6 |

## Contract 11 — `CommunicationTemplateVersion`

Immutable reviewed source-language version. Generic external versions have a
closed C0/C1 placeholder allowlist and no patient-identifying fields.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `template_version_id` | `OpaqueId<TemplateVersion>` / — | Immutable published/draft version identity. | Template registry. | C1; S/B. | Template reviewer/publisher. | R-COMMS/R-PRIV; append-only. | G0,G1,G4,G6 |
| `template_ref` | `OpaqueId<Template>` / — | Parent family. | Template registry. | C1; S/B. | Internal. | R-COMMS; immutable. | G1,G6 |
| `version` | `Version` / — | Monotonic family version. | Template registry transaction. | C1; S/B. | Internal. | R-COMMS; immutable. | G1,G6 |
| `subject_source` | `string` / null | Reviewed generic subject/title; null where channel has none. | Approved template author. | C0 for external; C2/C4 only for secure portal. P/B or S/F by content class. | Author + privacy/professional review. | R-COMMS/R-PRIV; immutable; withdrawal not edit. | G1,G3,G4,G6 |
| `body_source` | `string` / — | Reviewed body source with only allowed placeholders. | Approved template author. | C0 external P/B; secure content template S/F if PHI-capable. | Author + required reviewers. | R-COMMS/R-PROF; immutable version. | G1,G3,G4,G6 |
| `placeholder_allowlist` | `SafeCode<RenderField>[]` / — | Exact closed fields renderer accepts. | Template registry/reviewers. | C1; S/B. | Publisher only. | R-COMMS; immutable. | G1,G4,G6 |
| `renderer_version` | `string` / — | Reviewed renderer/schema version. | Build/template registry. | C1; S/B. | Release-controlled. | R-COMMS/R-SEC; immutable evidence. | G0,G6 |
| `content_hash` | `sha256 digest` / — | Integrity digest of canonical template content/config, not a secret. | Template registry. | C1; S/B. | Internal/reviewer. | R-COMMS; immutable. | G4,G6 |
| `state` | `enum(DRAFT, APPROVED, PUBLISHED, WITHDRAWN)` / — | Review/publication state. | Template workflow. | C1; S/B. | Segregated author/reviewer/publisher actions. | R-COMMS; terminal withdrawal; no silent republish. | G1,G6 |
| `approval_refs` | `OpaqueId<Approval>[]` / — | Product/privacy/professional/accessibility/legal approval evidence required by content/channel. | Approval registry. | C2; S/B. | Reviewers/Task 11 read; named approvers write own decision only. | R-PRIV/R-COMMS; immutable. | G1,G3,G4,G6 |
| `published_at` | `Instant` / null | Server time version became available. | Template registry. | C1; S/B. | Publisher only after approvals. | R-COMMS; null until published. | G1,G6 |
| `withdrawn_at` | `Instant` / null | Time rendering must stop. | Template registry. | C1; S/B. | Authorized publisher/kill switch. | R-COMMS; pending work rechecks. | G1,G6 |

## Contract 12 — `TemplateTranslationVersion`

Human-reviewed translation bound to one source template version. Machine
translation of secure clinical content is out of scope.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `translation_version_id` | `OpaqueId<TranslationVersion>` / — | Immutable translation identity. | Template registry. | C1; S/B. | Translation workflow. | R-COMMS/R-PRIV; append-only. | G0,G1,G4,G6 |
| `template_version_ref` | `OpaqueId<TemplateVersion>` / — | Exact source version translated. | Template registry. | C1; S/B. | Internal. | R-COMMS; stale if source withdrawn, never auto-rebased. | G1,G6 |
| `language` | `BCP47 string` / — | Exact reviewed locale. | Translation workflow. | C1; A/B. | Approved language reviewer. | R-COMMS; immutable. | G1,G6 |
| `subject_source` | `string` / null | Human-reviewed translated subject/title. | Approved translator. | Same class/exposure as source template. | Translator + privacy/professional/accessibility review. | R-COMMS/R-PRIV; immutable. | G1,G3,G4,G6 |
| `body_source` | `string` / — | Human-reviewed translated body. | Approved translator. | Same class/exposure as source template. | Translator + required reviewers. | R-COMMS/R-PROF; immutable. | G1,G3,G4,G6 |
| `placeholder_parity_hash` | `sha256 digest` / — | Proves placeholder set matches source allowlist. | Template registry. | C1; S/B. | Internal/reviewer. | R-COMMS; immutable. | G1,G6 |
| `reviewer_refs` | `OpaqueId<Reviewer>[]` / — | Human language/content/accessibility review evidence. | Approval registry. | C2; S/B. | Named reviewers only. | R-PRIV/R-COMMS; immutable. | G1,G4,G6 |
| `state` | `enum(DRAFT, APPROVED, PUBLISHED, WITHDRAWN)` / — | Translation availability. | Translation workflow. | C1; S/B. | Segregated review/publish. | R-COMMS; withdrawal re-evaluates pending work. | G1,G6 |
| `approved_at` | `Instant` / null | Approval time. | Approval registry. | C1; S/B. | Reviewer workflow. | R-COMMS; immutable. | G1,G4,G6 |
| `withdrawn_at` | `Instant` / null | Withdrawal time. | Template registry. | C1; S/B. | Publisher/kill switch. | R-COMMS; terminal. | G1,G6 |

## Contract 13 — `MessageIntent`

The immutable logical business communication. It records why a communication
may be attempted and the exact versions evaluated at creation; it is not itself
authority to dispatch.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `message_intent_id` | `OpaqueId<MessageIntent>` / — | One logical-message identity. | Orchestration service. | C2; S/B. | Trusted internal producer/orchestrator only. | R-COMMS/R-PRIV; immutable. | G0,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian scope. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `purpose_ref` | `OpaqueId<Purpose>` / — | Exact approved purpose. | Orchestrator from source/policy registry. | C2; S/B. | Internal, purpose allowlist. | R-COMMS/R-PRIV; immutable. | G1,G6 |
| `channel` | `CommunicationChannel` / — | Exact channel independently authorized. | Orchestrator. | C1; S/B. | Derived from current authority/preferences; no fallback. | R-COMMS; immutable. | G1,G5,G6 |
| `source_type` | `SafeCode<SourceType>` / — | Appointment, follow-up, secure-item, or other approved producer class. | Approved producer contract. | C1; S/B. | Internal producer allowlist. | R-COMMS; immutable. | G1,G3,G6 |
| `source_event_ref` | `OpaqueId<SourceEvent>` / — | Authoritative producer event identity. | Producing service. | C2; S/B. | Producer/orchestrator only. | R-COMMS/R-PRIV; immutable; no clinical detail. | G3,G4,G6 |
| `source_event_version` | `Version` / — | Producer state version evaluated at creation. | Producing service. | C1; S/B. | Internal. | R-COMMS; any change makes pending ticket stale. | G3,G6 |
| `source_useful_until` | `Instant` / — | Approved latest useful time from producer/policy; not invented by worker. | Producing service/policy. | C2; S/B. | Internal. | R-COMMS; expiry denies rather than sending late. | G1,G3,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Exact subject for authorization linkage. | Producer/Task 05 resolution. | C2; S/B. | Exact custodian/subject match. | R-PRIV; immutable. | G2,G3,G4,G6 |
| `contact_point_ref` | `OpaqueId<ContactPointVersion>` / null | Exact external destination version; null only for secure-portal-only intent. | Orchestrator. | C2; S/B. | Current subject/contact authority. | R-PRIV; supersession/dispute makes intent stale. | G1,G2,G4,G6 |
| `consent_grant_ref` | `OpaqueId<ConsentGrant>` / — | Exact grant evaluated at scheduling, including secure-portal consent where policy requires it. | Consent/orchestration service. | C2; S/B. | Exact subject/contact/channel/purpose/custodian scope. | R-PRIV; dispatch rechecks current authority. | G1,G2,G4,G6 |
| `template_version_ref` | `OpaqueId<TemplateVersion>` / — | Exact approved template version. | Orchestrator/template registry. | C2; S/B. | Published/current template only. | R-COMMS; withdrawal makes pending intent stale. | G1,G4,G6 |
| `translation_version_ref` | `OpaqueId<TranslationVersion>` / null | Exact approved translation; null only when source language is used. | Orchestrator/template registry. | C2; S/B. | Approved locale/version only. | R-COMMS; withdrawal/unavailability denies or uses separately approved default before creation, never machine translation. | G1,G4,G6 |
| `safe_render_parameters` | `SafeRenderParameters` / — | Closed C0/C1 data validated against template allowlist; never PHI/contact/free text. | Orchestrator from authoritative safe sources. | C1; S/B. | Internal renderer only. | R-COMMS; immutable; scan and discard per record classification. | G1,G4,G6 |
| `idempotency_digest` | `KeyedDigest` / — | Server-generated digest over canonical source/purpose/channel/version identity; contains no raw identifier/contact. | Orchestrator. | C2; S/H. | Internal uniqueness lookup only. | R-COMMS; immutable; key rotation/version retained. | G0,G4,G6 |
| `idempotency_key_version` | `string` / — | Canonicalization/HMAC version. | Orchestrator/security config. | C1; S/B. | Internal. | R-SEC/R-COMMS; immutable for intent. | G4,G6 |
| `scheduled_at` | `Instant` / — | Trusted schedule time from approved producer/policy. | Orchestrator. | C2; A/B as generic schedule state only where needed. | Internal derive. | R-COMMS; immutable. | G1,G3,G6 |
| `not_before` | `Instant` / — | Earliest dispatch time after quiet-hour/policy evaluation. | Orchestrator/scheduler. | C2; S/B. | Internal. | R-COMMS; recalculation creates superseding schedule state, not purpose/channel mutation. | G1,G6 |
| `expires_at` | `Instant` / — | Latest dispatch eligibility; cannot exceed source useful-until. | Orchestrator/policy. | C2; S/B. | Internal. | R-COMMS; expired denies. | G1,G3,G6 |
| `cancelled_at` | `Instant` / null | Effective cancellation time from source/authority/operator. | Orchestrator/cancellation service. | C2; A/B as generic state. | Authorized source/system/operator action. | R-COMMS; terminal for this intent. | G1,G3,G4,G6 |
| `completed_at` | `Instant` / null | Time communication orchestration reached its own terminal state, not clinical completion. | Orchestrator/reconciler. | C1; A/B only with honest wording. | Internal projection. | R-COMMS; immutable terminal evidence. | G1,G4,G6 |
| `intent_state` | `SafeCode<IntentState>` / — | Logical intent state owned by Workstream E state contract. | Orchestrator state machine. | C1; A/B as approved generic status. | Internal transition only. | R-COMMS; unknown/illegal transition denies. | G0,G1,G6 |
| `dispatch_state` | `SafeCode<DispatchState>` / — | Scheduling/claim/dispatch fact, separate from intent/delivery. | Worker/orchestrator. | C1; S/B. | Internal state machine. | R-COMMS; no status overloading. | G0,G6 |
| `delivery_state` | `SafeCode<DeliveryState>` / — | Conservative provider-derived projection, not readership. | Reconciler. | C1; A/B only with approved wording. | Reconciler only. | R-COMMS; monotonic/unknown-safe projection. | G1,G5,G6 |
| `reconciliation_state` | `SafeCode<ReconciliationState>` / — | Whether provider uncertainty requires review. | Reconciler. | C1; S/B. | Reconciliation service/operators. | R-COMMS; separate from delivery and intent. | G5,G6 |
| `state_version` | `Version` / — | Optimistic concurrency token/revision. | Database/state machine. | C1; S/B. | Internal conditional transition. | R-COMMS; monotonically increases. | G0,G6 |
| `safe_failure_reason` | `SafeCode<FailureReason>` / null | Payload-free failure category. | State machine/reconciler. | C1; A/B only if approved generic. | Internal; operations read. | R-COMMS; terminal/versioned evidence. | G1,G5,G6 |
| `safe_cancellation_reason` | `SafeCode<CancellationReason>` / null | Payload-free cancellation category. | Source/orchestrator. | C1; A/B as approved generic. | Source/system/authorized operator. | R-COMMS; immutable terminal fact. | G1,G3,G6 |
| `superseded_by_intent_ref` | `OpaqueId<MessageIntent>` / null | Replacement logical message only when source event/purpose materially changes. | Orchestrator transaction. | C2; S/B. | Internal only. | R-COMMS; one-way immutable link; no automatic resend. | G1,G3,G4,G6 |
| `created_at` | `Instant` / — | Database creation time. | Database. | C1; S/B. | Internal/audit. | R-COMMS/R-PRIV; immutable. | G4,G6 |
| `retention_classification` | `SafeCode<RecordClass>` / — | Approved message-intent record class. | Records policy service. | C2; S/B. | Governance only. | R-PRIV; no default duration. | G4,G6 |
| `retain_until` | `Instant` / null | Computed horizon once policy exists; hold/incident aware. | Governance service/database. | C2; S/B. | Governance only. | R-PRIV; null never authorizes deletion. | G4,G6 |

## Contract 14 — `OutboxMessage`

One queueable effect reference. It contains no recipient, raw contact, rendered
body, PHI, provider payload, or client-controlled callback.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `outbox_message_id` | `OpaqueId<OutboxMessage>` / — | Immutable outbox identity. | Orchestrator transaction. | C1; S/B. | Internal only. | R-COMMS; immutable. | G0,G4,G6 |
| `message_intent_ref` | `OpaqueId<MessageIntent>` / — | Logical intent to re-evaluate. | Orchestrator transaction. | C2; S/B. | Internal worker. | R-COMMS; immutable. | G0,G4,G6 |
| `state` | `SafeCode<OutboxState>` / — | Pending/leased/terminal queue state defined by Workstream E. | Worker state machine/database. | C1; S/B. | Internal conditional transition. | R-COMMS; unknown denies. | G0,G6 |
| `available_at` | `Instant` / — | Earliest claim time. | Orchestrator/scheduler. | C1; S/B. | Internal. | R-COMMS; policy change causes safe reschedule/supersession. | G1,G6 |
| `expires_at` | `Instant` / — | Latest claim/effect time, bounded by intent. | Orchestrator. | C1; S/B. | Internal. | R-COMMS; expired cannot lease. | G1,G3,G6 |
| `attempt_count` | `integer >= 0` / — | Number of started attempts under approved semantics. | Worker/database. | C1; S/B. | Internal. | R-COMMS; monotonically increases. | G0,G5,G6 |
| `next_attempt_at` | `Instant` / null | Approved bounded retry time; null when no retry is authorized. | Worker/retry policy. | C1; S/B. | Internal. | R-COMMS; never implies channel fallback. | G1,G5,G6 |
| `lease_owner` | `SafeCode<WorkerInstance>` / null | Ephemeral non-secret worker instance code. | Worker/database. | C1; S/B. | Internal only. | R-COMMS; stale after lease expiry/lifecycle change. | G0,G6 |
| `lease_expires_at` | `Instant` / null | Database-time lease boundary. | Worker/database. | C1; S/B. | Internal. | R-COMMS; expiry permits safe reclaim only after state recheck. | G0,G6 |
| `lifecycle_instance_ref` | `OpaqueId<LifecycleInstance>` / — | Exact environment/capability instance. | Lifecycle service. | C1; S/B. | Internal. | R-SEC; mismatch denies. | G0,G6 |
| `lifecycle_revision` | `Version` / — | Kill-switch/rebuild revision captured at queue time. | Lifecycle service. | C1; S/B. | Internal. | R-SEC; any change makes ticket stale. | G0,G6 |
| `cancelled_at` | `Instant` / null | Effective queue cancellation. | Orchestrator/worker. | C1; S/B. | Source/authority/system only. | R-COMMS; terminal. | G1,G3,G6 |
| `consumed_at` | `Instant` / null | Time outbox reached its terminal internal processing state. | Worker/database. | C1; S/B. | Internal. | R-COMMS; set once; not delivery/read proof. | G0,G6 |
| `safe_terminal_reason` | `SafeCode<OutboxReason>` / null | Payload-free terminal reason. | Worker/state machine. | C1; S/B. | Operations read. | R-COMMS; immutable once terminal. | G1,G5,G6 |
| `created_at` | `Instant` / — | Database creation time in same transaction as intent/audit. | Database. | C1; S/B. | Internal. | R-COMMS; immutable. | G4,G6 |

## Contract 15 — `DeliveryAttempt`

One provider-adapter interaction. A timeout/unknown outcome is not retry
permission and never becomes a new logical message.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `delivery_attempt_id` | `OpaqueId<DeliveryAttempt>` / — | Immutable attempt identity. | Worker/adapter service. | C2; S/B. | Internal only. | R-COMMS/R-PRIV; append-only. | G0,G4,G6 |
| `message_intent_ref` | `OpaqueId<MessageIntent>` / — | Logical message being attempted. | Worker. | C2; S/B. | Internal. | R-COMMS; immutable. | G0,G4,G6 |
| `outbox_message_ref` | `OpaqueId<OutboxMessage>` / — | Claimed outbox item. | Worker. | C2; S/B. | Internal. | R-COMMS; immutable. | G0,G4,G6 |
| `attempt_number` | `integer > 0` / — | Unique sequence within intent under database constraint. | Worker/database. | C1; S/B. | Internal. | R-COMMS; immutable. | G0,G6 |
| `provider_adapter_code` | `SafeCode<Adapter>` / — | Exact synthetic or approved production adapter. | Worker configuration. | C1; S/B. | Approved adapter allowlist. | R-COMMS; immutable. | G0,G5,G6 |
| `provider_configuration_version` | `string` / — | Approved non-secret provider/config policy version. | Adapter configuration registry. | C2; S/B. | Restricted operations/security. | R-COMMS/R-SEC; immutable. | G5,G6 |
| `provider_idempotency_digest` | `KeyedDigest` / — | Server-generated provider idempotency reference without contact/content. | Adapter service. | C3; S/H. | Adapter/reconciler only. | R-COMMS; immutable; protected mapping. | G5,G6 |
| `idempotency_key_version` | `string` / — | Canonicalization/HMAC version. | Adapter/security config. | C1; S/B. | Internal. | R-SEC; immutable. | G5,G6 |
| `started_at` | `Instant` / — | Time adapter effect began after final recheck. | Worker/database. | C1; S/B. | Internal. | R-COMMS; immutable. | G0,G6 |
| `finished_at` | `Instant` / null | Time a known local outcome was recorded. | Adapter/worker. | C1; S/B. | Internal. | R-COMMS; null while active/unknown. | G5,G6 |
| `outcome_code` | `SafeCode<AttemptOutcome>` / — | Safe local outcome, including denied/unknown. | Adapter/worker state machine. | C1; S/B. | Operations read. | R-COMMS; immutable event/projection. | G0,G5,G6 |
| `safe_reason_code` | `SafeCode<AttemptReason>` / null | Payload-free reason; no raw provider error. | Adapter safe-error mapper. | C1; S/B. | Operations read. | R-COMMS/R-SEC; immutable. | G5,G6 |
| `provider_acceptance_state` | `enum(NOT_ATTEMPTED, DENIED, UNKNOWN, ACCEPTED, REJECTED)` / — | Conservative provider acceptance fact, not delivery. | Adapter/reconciler. | C1; S/B. | Internal; approved generic UI only. | R-COMMS; `UNKNOWN` quarantines retry. | G5,G6 |
| `provider_message_reference_ref` | `OpaqueId<ProviderMessageReference>` / null | Protected mapping to provider identifier. | Adapter/reconciler. | C3; S/B reference only. | Restricted adapter/reconciler. | R-COMMS; immutable mapping. | G5,G6 |
| `uncertain_at` | `Instant` / null | Time outcome entered unknown/reconciliation state. | Adapter/worker. | C1; S/B. | Internal. | R-COMMS; remains until reconciled. | G5,G6 |
| `reconciled_at` | `Instant` / null | Time approved reconciliation resolved/closed uncertainty. | Reconciler. | C1; S/B. | Reconciler/authorized operator. | R-COMMS; immutable. | G5,G6 |
| `created_at` | `Instant` / — | Database append time. | Database. | C1; S/B. | Internal. | R-COMMS; immutable. | G4,G6 |

## Contract 16 — `ProviderMessageReference`

Separates provider identifiers from ordinary message/queue/audit rows.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `provider_message_reference_id` | `OpaqueId<ProviderMessageReference>` / — | Internal mapping identity. | Adapter service. | C2; S/B. | Adapter/reconciler only. | R-COMMS/R-PRIV; immutable. | G5,G6 |
| `delivery_attempt_ref` | `OpaqueId<DeliveryAttempt>` / — | Attempt that established mapping. | Adapter service. | C2; S/B. | Restricted internal. | R-COMMS; immutable. | G5,G6 |
| `provider_account_code` | `SafeCode<ProviderAccount>` / — | Approved non-secret account/environment code. | Adapter configuration. | C2; S/B. | Security/operations. | R-COMMS/R-SEC; immutable. | G5,G6 |
| `encrypted_provider_reference` | `Ciphertext` / — | Provider's message/reference value encrypted at field level. | Adapter service. | C3; S/F. | Adapter/reconciler only; never log/URL/client. | R-COMMS/R-PRIV; delete under approved provider/record policy. | G4,G5,G6 |
| `keyed_reference_digest` | `KeyedDigest` / — | Lookup/dedup digest for provider events. | Adapter service. | C3; S/H. | Webhook/reconciler only. | R-COMMS; key/version rotation controlled. | G5,G6 |
| `key_version` | `string` / — | Encryption/digest key version. | Encryption service. | C2; S/B. | Security service. | R-SEC; immutable mapping metadata. | G4,G5,G6 |
| `created_at` | `Instant` / — | Database creation time. | Database. | C1; S/B. | Internal. | R-COMMS; immutable. | G4,G6 |
| `invalidated_at` | `Instant` / null | Time mapping became unusable due to provider/account/security action. | Reconciler/security service. | C2; S/B. | Restricted operator. | R-COMMS/R-SEC; terminal. | G5,G6 |

## Contract 17 — `ProviderWebhookReceipt`

Provider input remains untrusted until raw-body authentication succeeds. Raw
payload retention is off by default.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `webhook_receipt_id` | `OpaqueId<WebhookReceipt>` / — | Immutable receipt identity. | Webhook quarantine service. | C2; S/B. | Public receiver may append only through validation boundary. | R-COMMS/R-SEC; append-only. | G5,G6 |
| `provider_account_code` | `SafeCode<ProviderAccount>` / — | Server-selected verifier/account, not trusted payload tenant. | Webhook routing config. | C2; S/B. | Restricted receiver config. | R-SEC; immutable. | G5,G6 |
| `event_keyed_digest` | `KeyedDigest` / — | Digest of authenticated provider event ID/canonical receipt for dedupe. | Webhook service after/beside authentication per approved scheme. | C3; S/H. | Receiver/reconciler only. | R-COMMS/R-SEC; immutable. | G5,G6 |
| `event_type_code` | `SafeCode<ProviderEventType>` / null | Normalized allowlisted event type; null if unknown/quarantined. | Webhook normalizer. | C1; S/B. | Reconciler/operations. | R-COMMS; unknown remains quarantined. | G5,G6 |
| `signature_outcome` | `enum(VALID, INVALID, MISSING, UNKNOWN)` / — | Result of exact approved raw-body verification. | Webhook verifier. | C1; S/B. | Security/operations. | R-SEC; only `VALID` can normalize. | G5,G6 |
| `provider_event_at` | `Instant` / null | Provider-declared event time after validation. | Webhook normalizer. | C1; S/B. | Reconciler. | R-COMMS; never trusted for ordering alone. | G5,G6 |
| `received_at` | `Instant` / — | Server/database receipt time. | Database. | C1; S/B. | Internal. | R-COMMS/R-SEC; immutable. | G4,G6 |
| `processed_at` | `Instant` / null | Time normalized/reconciled processing completed. | Reconciler. | C1; S/B. | Internal. | R-COMMS; null while quarantined/pending. | G5,G6 |
| `provider_reference_ref` | `OpaqueId<ProviderMessageReference>` / null | Protected matched provider message mapping. | Reconciler. | C3; S/B reference only. | Restricted reconciler. | R-COMMS; null for unmatched/quarantined. | G5,G6 |
| `delivery_attempt_ref` | `OpaqueId<DeliveryAttempt>` / null | Matched internal attempt. | Reconciler. | C2; S/B. | Restricted reconciler. | R-COMMS; immutable once proven; correction by superseding receipt decision. | G5,G6 |
| `receipt_state` | `enum(QUARANTINED, ACCEPTED, IGNORED, RECONCILED)` / — | Safe processing state, not provider delivery state. | Webhook/reconciler state machine. | C1; S/B. | Internal. | R-COMMS; invalid/unknown stays quarantined/ignored. | G5,G6 |
| `replay_outcome` | `enum(FIRST_SEEN, DUPLICATE, REPLAY_DENIED, UNKNOWN)` / — | Replay/dedup result. | Webhook service. | C1; S/B. | Security/operations. | R-SEC; immutable. | G5,G6 |
| `ordering_outcome` | `enum(IN_ORDER, OUT_OF_ORDER, NOT_COMPARABLE, UNKNOWN)` / — | Conservative ordering result. | Reconciler. | C1; S/B. | Reconciler. | R-COMMS; cannot regress terminal projection. | G5,G6 |
| `reconciliation_outcome` | `SafeCode<ReconciliationOutcome>` / null | Safe normalized result. | Reconciler. | C1; S/B. | Reconciler/authorized operator. | R-COMMS; immutable evidence. | G5,G6 |
| `safe_reason_code` | `SafeCode<WebhookReason>` / null | Payload-free reason. | Safe webhook/reconciliation mapper. | C1; S/B. | Operations/security. | R-SEC; immutable. | G5,G6 |
| `raw_payload_ciphertext` | `Ciphertext` / null | Separately approved temporary quarantine payload; default and expected value is null. | Dedicated quarantine service only if explicit approval exists. | C3/C4; S/F. | Named incident/reconciliation role only. | R-SEC/R-PRIV; mandatory short expiry and deletion evidence. | G4,G5,G6 plus separate raw-payload approval |
| `raw_payload_key_version` | `string` / null | Key version; required iff raw payload exists. | Encryption service. | C2; S/B. | Security service. | R-SEC; deleted with payload. | G4,G5,G6 plus separate approval |
| `raw_payload_expires_at` | `Instant` / null | Mandatory destruction deadline iff raw payload exists. | Quarantine policy service. | C2; S/B. | Governance/security. | R-SEC/R-PRIV; legal hold handling separately approved. | G4,G5,G6 plus separate approval |

## Contract 18 — `SuppressionEntry`

Immutable deny evidence. Scope may be global, purpose, channel, destination,
source, provider, or security-specific. The most restrictive applicable active
entry wins.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `suppression_entry_id` | `OpaqueId<SuppressionEntry>` / — | Immutable suppression event identity. | Suppression service. | C2; S/B. | Patient/valid delegate for opt-out; authorized staff/system for other reasons. | R-PRIV/R-SEC; append-only. | G0,G1,G2,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Exact subject. | Suppression service/Task 05. | C2; S/B. | Exact actor-subject authorization. | R-PRIV; immutable. | G2,G4,G6 |
| `contact_point_ref` | `OpaqueId<ContactPointVersion>` / null | Destination scope; null only for broader subject/custodian suppression. | Suppression service. | C2; S/B. | Authorized scope decision. | R-PRIV; immutable. | G1,G2,G4,G6 |
| `channel` | `CommunicationChannel` / null | Optional channel scope. | Suppression service. | C1; A/B as preference/suppression view. | Authorized actor/staff. | R-PRIV; null may mean broader scope per exact scope code. | G1,G6 |
| `purpose_ref` | `OpaqueId<Purpose>` / null | Optional purpose scope. | Suppression service. | C2; A/B with approved label. | Authorized actor/staff. | R-PRIV; immutable. | G1,G6 |
| `source_ref` | `OpaqueId<Source>` / null | Optional producing-record scope. | Source/suppression service. | C2; S/B. | Internal source/authorized operator. | R-COMMS/R-PRIV; immutable. | G1,G3,G4,G6 |
| `provider_account_code` | `SafeCode<ProviderAccount>` / null | Optional provider-wide block. | Security/operations. | C2; S/B. | Kill-switch operator only. | R-SEC; immutable event. | G5,G6 |
| `scope_code` | `enum(GLOBAL, SUBJECT, CONTACT, CHANNEL, PURPOSE, SOURCE, PROVIDER, SECURITY)` / — | Exact suppression precedence scope. | Suppression policy service. | C1; S/B. | Type-specific authorization. | R-PRIV/R-SEC; immutable. | G1,G6 |
| `reason_code` | `SafeCode<SuppressionReason>` / — | Approved reason such as opt-out, revoked/expired consent, wrong recipient, bounce, complaint, dispute, supersession, incident, hold, provider/policy block. | Authorized actor/system/provider normalizer. | C2; A/B only with approved wording. | Type-specific checks; provider event cannot unsuppress. | R-PRIV/R-SEC; immutable. | G1,G5,G6 |
| `state` | `enum(ACTIVE, SUPERSEDED, EXPIRED)` / — | Whether this entry currently denies. | Suppression state projection. | C1; A/B as approved status. | Service only. | R-PRIV; active wins; never auto-cleared by delivery event. | G1,G6 |
| `effective_at` | `Instant` / — | Immediate/server effective time. | Suppression service/database. | C1; A/B. | Internal. | R-PRIV; immutable. | G1,G4,G6 |
| `expires_at` | `Instant` / null | Optional expiry only where approved; null does not imply permanent legal meaning. | Suppression policy. | C2; A/B. | Policy-controlled. | R-PRIV; dispatch rechecks current state. | G1,G4,G6 |
| `created_by_actor_ref` | `OpaqueId<Actor>` / null | Authenticated human actor; null for trusted system/provider-derived event. | Identity/suppression service. | C2; S/B. | Privacy/security review. | R-PRIV; immutable. | G2,G4,G6 |
| `evidence_ref` | `OpaqueId<Evidence>` / — | Safe internal evidence/event reference, never raw reply/body/provider payload. | Suppression service. | C2; S/B. | Restricted privacy/security/operations. | R-PRIV/R-SEC; immutable. | G4,G5,G6 |
| `superseded_by_entry_ref` | `OpaqueId<SuppressionEntry>` / null | Authorized audited replacement/lift evidence. | Suppression service transaction. | C2; S/B. | Named unsuppression authority only. | R-PRIV/R-SEC; immutable; no delete. | G1,G4,G6 |
| `policy_version` | `string` / — | Exact suppression/unsuppression policy. | Policy registry. | C2; S/B. | Privacy/legal/security. | R-PRIV; immutable. | G1,G4,G6 |
| `created_at` | `Instant` / — | Database append time. | Database. | C1; S/B. | Internal. | R-PRIV; immutable. | G4,G6 |

## Contract 19 — `ReconciliationCase`

Human/system workflow for provider uncertainty. It cannot create a new logical
message or infer patient/clinical outcome.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `reconciliation_case_id` | `OpaqueId<ReconciliationCase>` / — | Case identity. | Reconciliation service. | C2; S/B. | Restricted operations/security. | R-COMMS/R-PRIV; immutable identity. | G0,G4,G5,G6 |
| `message_intent_ref` | `OpaqueId<MessageIntent>` / — | Affected logical message. | Reconciliation service. | C2; S/B. | Restricted operations. | R-COMMS; immutable. | G4,G5,G6 |
| `delivery_attempt_ref` | `OpaqueId<DeliveryAttempt>` / — | Uncertain/contested attempt. | Reconciliation service. | C2; S/B. | Restricted operations. | R-COMMS; immutable. | G4,G5,G6 |
| `provider_reference_ref` | `OpaqueId<ProviderMessageReference>` / null | Protected provider mapping if known. | Reconciliation service. | C3; S/B reference only. | Reconciler only. | R-COMMS; immutable. | G5,G6 |
| `reason_code` | `SafeCode<ReconciliationReason>` / — | Unknown outcome, stale/mismatched event, provider outage, status conflict, or other approved safe reason. | Reconciliation state machine. | C1; S/B. | Operations read. | R-COMMS; immutable. | G5,G6 |
| `state` | `enum(OPEN, ASSIGNED, WAITING_PROVIDER, RESOLVED, CLOSED_UNRESOLVED)` / — | Operational case state, not delivery/clinical state. | Reconciliation workflow. | C1; A/B only to authorized staff. | Assigned operations role. | R-COMMS; versioned transitions. | G1,G5,G6 |
| `assigned_role_code` | `SafeCode<OperationsRole>` / null | Approved role category; no new production role is implied. | Operations workflow. | C2; S/B. | Authorized assignment action. | R-COMMS; current projection; reassignment audited. | G1,G5,G6 |
| `assigned_actor_ref` | `OpaqueId<StaffActor>` / null | Exact staff assignee. | Operations workflow. | C2; S/B. | Role/pharmacy/server checks. | R-COMMS/R-PRIV; changes version/audit. | G1,G4,G6 |
| `opened_at` | `Instant` / — | Database creation time. | Database. | C1; S/B. | Internal. | R-COMMS; immutable. | G4,G6 |
| `resolved_at` | `Instant` / null | Resolution decision time. | Authorized reconciler. | C1; S/B. | Assigned authorized operator. | R-COMMS; terminal snapshot. | G5,G6 |
| `resolution_code` | `SafeCode<ReconciliationResolution>` / null | Safe approved result; never “patient read” or clinical completion. | Authorized reconciler. | C1; S/B. | Assigned authorized operator. | R-COMMS; immutable once resolved; correction supersedes. | G1,G5,G6 |
| `resolution_evidence_ref` | `OpaqueId<Evidence>` / null | Protected evidence mapping, no body/provider raw payload in case row. | Reconciliation service. | C2; S/B. | Restricted operations/security. | R-COMMS/R-SEC; immutable. | G4,G5,G6 |
| `state_version` | `Version` / — | Concurrency token. | Database/workflow. | C1; S/B. | Conditional internal transition. | R-COMMS; monotonic. | G0,G6 |
| `retention_classification` | `SafeCode<RecordClass>` / — | Approved operational/incident record class. | Records policy. | C2; S/B. | Governance only. | R-PRIV/R-SEC; no default duration. | G4,G6 |

## Contract 20 — `CommunicationWorkItem`

Minimum-necessary administrative review item. It never contains a message body,
contact value, provider payload, ailment, medication, appointment purpose, or
clinical urgency score.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `work_item_id` | `OpaqueId<CommunicationWorkItem>` / — | Work-item identity. | Communications workflow. | C2; S/B. | Authorized staff queue only. | R-COMMS/R-PRIV; immutable identity. | G0,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `work_type_code` | `SafeCode<CommunicationWorkType>` / — | Approved administrative category, never AI/content-derived urgency. | Trusted workflow state. | C1; A/B to authorized staff. | Server derives from explicit source/provider state. | R-COMMS; immutable per item. | G1,G3,G5,G6 |
| `source_entity_type` | `SafeCode<EntityType>` / — | Type of opaque source reference. | Communications workflow. | C1; S/B. | Internal. | R-COMMS; immutable. | G3,G6 |
| `source_entity_ref` | `OpaqueId<Entity>` / — | Intent/case/contact/suppression/thread reference. | Communications workflow. | C2; S/B. | Authorized staff resolves through source authorization. | R-COMMS/R-PRIV; immutable. | G3,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / null | Optional subject for server authorization; not sent as queue-list client prop unless needed. | Trusted source workflow. | C2; S/B. | Exact pharmacy/role/need-to-know. | R-PRIV; immutable. | G2,G4,G6 |
| `state` | `enum(OPEN, CLAIMED, COMPLETED, CANCELLED, SUPERSEDED)` / — | Administrative queue state only. | Work-item workflow. | C1; A/B to authorized staff. | Role/assignment checks. | R-COMMS; state transitions audited. | G1,G6 |
| `due_at` | `Instant` / null | Approved operational review target; null if none. It is not clinical urgency. | Workflow/policy. | C1; A/B. | Internal derive. | R-COMMS; policy version governs; no promise without approval. | G1,G6 |
| `assigned_role_code` | `SafeCode<StaffRole>` / — | Approved minimum role category. | Workflow/policy. | C2; S/B. | Role mapping must exist; do not invent one. | R-COMMS; reassignment audited. | G1,G6 |
| `assigned_actor_ref` | `OpaqueId<StaffActor>` / null | Exact assignee. | Authorized staff workflow. | C2; S/B. | Pharmacy/role scope. | R-COMMS/R-PRIV; current projection; history audited. | G1,G4,G6 |
| `created_at` | `Instant` / — | Database creation time. | Database. | C1; S/B. | Internal. | R-COMMS; immutable. | G4,G6 |
| `claimed_at` | `Instant` / null | Server claim time. | Work-item workflow/database. | C1; A/B. | Eligible assignee. | R-COMMS; lease/state rules apply. | G1,G6 |
| `completed_at` | `Instant` / null | Administrative work-item completion only. | Authorized staff workflow. | C1; A/B. | Assigned role/actor. | R-COMMS; never propagates clinical completion. | G1,G6 |
| `cancelled_at` | `Instant` / null | Source/system cancellation time. | Communications workflow. | C1; A/B. | Trusted source/system. | R-COMMS; terminal. | G1,G3,G6 |
| `safe_reason_code` | `SafeCode<WorkReason>` / — | Payload-free reason/category. | Trusted workflow. | C1; A/B. | Operations/staff queue. | R-COMMS; immutable. | G1,G5,G6 |
| `state_version` | `Version` / — | Concurrency token. | Database/workflow. | C1; S/B. | Conditional internal transition. | R-COMMS; monotonic. | G0,G6 |

## Contract 21 — `SecureMessageThread`

PHI-capable authenticated portal container. Task 05 owns identity/delegation and
Task 06 owns professional modality/suitability where applicable. No external
channel receives a thread identifier or excerpt.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `thread_id` | `OpaqueId<SecureThread>` / — | Opaque thread identity; never placed in external URL. | Secure-message service. | C2; A/B only inside authenticated portal route. | Recheck participant/subject/custodian every request. | R-PROF/R-PRIV; immutable identity. | G0,G2,G3,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Patient subject of thread. | Task 05/secure-message service. | C2; S/B; minimum portal context only. | Exact actor-subject grant. | R-PROF/R-PRIV; immutable. | G2,G4,G6 |
| `patient_actor_ref` | `OpaqueId<Actor>` / — | Patient actor or authorized agent who initiated/is primary participant. | Task 05 identity service. | C2; S/B. | Active exact actor-subject grant. | R-ID/R-PROF; stale grant denies future access. | G2,G4,G6 |
| `authorized_agent_grant_ref` | `OpaqueId<DelegateGrant>` / null | Exact delegation authority if actor differs from subject. | Task 05 identity service. | C2; S/B. | Exact active grant per request. | R-ID/R-PRIV; revocation blocks access, history remains. | G2,G4,G6 |
| `assigned_pharmacist_ref` | `OpaqueId<StaffActor>` / null | Current pharmacist assignment; null only where approved unassigned queue exists. | Professional assignment workflow. | C2; A/B to authorized participants as approved display. | Staff role/pharmacy and Task 06 rules. | R-PROF; reassignment creates audited version/history. | G1,G3,G4,G6 |
| `source_type` | `SafeCode<ThreadSourceType>` / — | Appointment, follow-up, visit, assessment, or other approved source class. | Producing/professional workflow. | C1; S/B. | Internal source allowlist. | R-PROF; immutable. | G3,G6 |
| `source_ref` | `OpaqueId<Source>` / — | Opaque source record reference. | Producing workflow. | C2; S/B. | Exact source/custodian/subject match. | R-PROF/R-PRIV; immutable. | G3,G4,G6 |
| `thread_purpose_ref` | `OpaqueId<Purpose>` / — | Approved secure-thread purpose, separate from external notice purpose. | Secure-message policy/service. | C2; A/B with approved label. | Exact consent/suitability/participant checks. | R-PROF/R-PRIV; immutable scope. | G1,G3,G4,G6 |
| `professional_modality_ref` | `OpaqueId<ModalityDecision>` / null | Task 06 professional modality/suitability decision where applicable. | Task 06 workflow. | C2; S/B. | Professional workflow only. | R-PROF; stale/withdrawn decision can restrict/close thread. | G3,G4,G6 |
| `professional_consent_ref` | `OpaqueId<ProfessionalConsent>` / null | Task 06 consent reference where applicable; not external notification consent. | Task 06 workflow. | C2; S/B. | Professional workflow. | R-PROF/R-PRIV; rechecked per Task 06 contract. | G3,G4,G6 |
| `response_wording_version` | `string` / — | Exact approved non-monitoring/response-expectation/urgent-path wording. | Policy/template registry. | C2; A/B. | All participants may read; publisher controls. | R-PROF/R-PRIV; immutable for thread version. | G1,G3,G4,G6 |
| `patient_acknowledged_at` | `Instant` / null | Authenticated acknowledgement of wording, not comprehension or clinical completion. | Secure-message service from authorized actor. | C2; A/B. | Exact patient/delegate participant. | R-PROF/R-PRIV; immutable event projection. | G1,G2,G4,G6 |
| `state` | `SafeCode<ThreadState>` / — | Open/restricted/withdrawn/closed/expired state under approved professional policy. | Secure-thread state machine. | C2; A/B to participants. | Type-specific participant/professional/system action. | R-PROF; unknown denies; closed state never reopens silently. | G1,G2,G3,G6 |
| `opened_at` | `Instant` / — | Database opening time. | Database. | C1; A/B. | Authorized creation. | R-PROF; immutable. | G4,G6 |
| `last_activity_at` | `Instant` / — | Server projection of authorized thread activity, not delivery/read. | Secure-message service. | C2; A/B. | Participant view. | R-PROF; monotonically reflects accepted thread events. | G4,G6 |
| `closes_at` | `Instant` / null | Approved planned close time; null means no approved scheduled close, not indefinite monitoring. | Professional policy/workflow. | C2; A/B. | Authorized professional/system. | R-PROF; re-evaluate on policy/source changes. | G1,G3,G6 |
| `expires_at` | `Instant` / — | Maximum authorization/lifecycle expiry. | Secure-message policy. | C2; A/B. | Internal derive. | R-PROF; expiry blocks access/write except governed records access. | G1,G3,G6 |
| `withdrawn_at` | `Instant` / null | Consent/suitability/authorization withdrawal time. | Task 05/06/secure service. | C2; A/B. | Authorized actor/professional/system. | R-PROF/R-PRIV; terminal restriction. | G1,G2,G3,G4,G6 |
| `closed_at` | `Instant` / null | Professional/approved system closure time; not visit completion. | Authorized pharmacist/thread policy. | C2; A/B. | Assigned authorized professional or approved system condition. | R-PROF; terminal under current version. | G1,G3,G4,G6 |
| `assignment_version` | `Version` / — | Assignment concurrency/recheck revision. | Assignment workflow/database. | C1; S/B. | Internal. | R-PROF; any change makes stale action deny. | G3,G6 |
| `state_version` | `Version` / — | Thread lifecycle concurrency token. | Database/state machine. | C1; S/B. | Internal conditional transition. | R-PROF; monotonic. | G0,G6 |
| `retention_classification` | `SafeCode<RecordClass>` / — | Approved secure-thread record class. | Records/professional policy. | C2; S/B. | Governance/professional owner only. | R-PROF/R-PRIV; no default duration. | G3,G4,G6 |
| `retain_until` | `Instant` / null | Computed horizon once approved; null never permits deletion. | Governance service/database. | C2; S/B. | Governance only. | R-PROF/R-PRIV; legal hold/incident overrides. | G4,G6 |

## Contract 22 — `SecureThreadParticipant`

Versioned participant authorization. A thread row alone grants no access.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `participant_id` | `OpaqueId<ThreadParticipant>` / — | Immutable participant-version identity. | Secure-message service. | C2; S/B. | Thread authorization service. | R-PROF/R-PRIV; append-only versions. | G0,G2,G3,G4,G6 |
| `thread_ref` | `OpaqueId<SecureThread>` / — | Thread membership scope. | Secure-message service. | C2; S/B. | Exact thread/custodian. | R-PROF; immutable. | G2,G4,G6 |
| `actor_ref` | `OpaqueId<Actor>` / — | Patient, delegate, pharmacist, or approved staff actor. | Task 05/staff auth/assignment service. | C2; S/B. | Audience-specific identity only. | R-ID/R-PROF; immutable version. | G2,G3,G4,G6 |
| `participant_role_code` | `SafeCode<ParticipantRole>` / — | Approved thread role; not inferred from global app role. | Thread authorization policy. | C2; A/B where roster display is approved. | Exact role mapping/need-to-know. | R-PROF; new version on change. | G1,G2,G3,G6 |
| `patient_subject_ref` | `OpaqueId<Subject>` / — | Subject authorizing/limiting this participation. | Task 05/thread service. | C2; S/B. | Exact actor-subject relation. | R-PROF/R-PRIV; immutable. | G2,G4,G6 |
| `authorization_ref` | `OpaqueId<GrantOrAssignment>` / — | Task 05 delegate grant, staff role/assignment, or professional authorization used. | Identity/assignment service. | C2; S/B. | Rechecked every request. | R-ID/R-PROF; stale/revoked authority denies. | G2,G3,G4,G6 |
| `state` | `enum(ACTIVE, EXPIRED, REVOKED, SUPERSEDED, WITHDRAWN)` / — | Participation lifecycle. | Thread authorization service. | C2; A/B as minimum roster state. | Type-specific authority. | R-PROF; only active may access. | G1,G2,G3,G6 |
| `effective_at` | `Instant` / — | Start time. | Thread authorization service/database. | C1; S/B. | Internal. | R-PROF; immutable. | G4,G6 |
| `expires_at` | `Instant` / — | Maximum authorization time. | Identity/assignment policy. | C2; S/B. | Internal. | R-PROF; expired denies. | G1,G2,G3,G6 |
| `revoked_at` | `Instant` / null | Revocation time. | Identity/assignment/thread service. | C2; S/B. | Authorized revocation. | R-PROF/R-PRIV; terminal. | G2,G3,G4,G6 |
| `added_by_actor_ref` | `OpaqueId<Actor>` / null | Authorized human adding participant; null for trusted source-created membership. | Thread service. | C2; S/B. | Role/relationship/assignment checks. | R-PROF/R-PRIV; immutable. | G2,G3,G4,G6 |
| `superseded_by_participant_ref` | `OpaqueId<ThreadParticipant>` / null | Replacement participant-version row. | Thread service transaction. | C2; S/B. | Internal. | R-PROF; one-way immutable link. | G4,G6 |
| `authorization_version` | `Version` / — | Recheck/concurrency revision. | Thread authorization service. | C1; S/B. | Internal. | R-PROF; any change invalidates stale actions. | G0,G6 |

## Contract 23 — `SecureMessage`

Immutable PHI-capable content record. Correction inserts a new message and links
the old one; no body mutation. Attachments remain blocked.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `secure_message_id` | `OpaqueId<SecureMessage>` / — | Opaque message identity; never external URL/provider metadata. | Secure-message service. | C2; A/B inside authenticated portal only. | Current authorized thread participant. | R-PROF/R-PRIV; immutable. | G0,G2,G3,G4,G6 |
| `thread_ref` | `OpaqueId<SecureThread>` / — | Parent thread. | Secure-message service. | C2; A/B in protected route context. | Recheck thread/participant every read/write. | R-PROF; immutable. | G2,G3,G4,G6 |
| `author_actor_ref` | `OpaqueId<Actor>` / — | Authenticated author. | Identity/staff auth context. | C2; A/B to authorized participants. | Exact active participant. | R-PROF/R-PRIV; immutable. | G2,G3,G4,G6 |
| `author_participant_role` | `SafeCode<ParticipantRole>` / — | Thread role used at receipt time. | Thread authorization service. | C2; A/B where display approved. | Exact participant version. | R-PROF; historical snapshot. | G1,G2,G3,G4,G6 |
| `encrypted_body` | `Ciphertext` / — | Bounded, sanitized message content encrypted at field level. | Secure-message service after validation. | C4; A/F only to current authorized participants. | Exact thread participant and minimum necessary staff. | R-PROF/R-PRIV; immutable; legal hold/incident aware. | G2,G3,G4,G6 |
| `body_key_version` | `string` / — | Encryption key version. | Encryption service. | C2; S/B. | Encryption service/restricted operators. | R-SEC; rotate by controlled re-encryption without message mutation. | G4,G6 |
| `content_format` | fixed approved safe format / — | Approved plain text or strictly sanitized format version; no arbitrary HTML. | Secure-message service. | C1; A/B. | Server validates fixed allowlist. | R-PROF; immutable. | G1,G3,G6 |
| `sanitizer_version` | `string` / — | Exact sanitizer/validator version. | Build/configuration. | C1; S/B. | Release-controlled. | R-SEC/R-PROF; immutable evidence. | G0,G4,G6 |
| `server_received_at` | `Instant` / — | Authoritative receipt time. | Database. | C1; A/B. | Internal; participants may see. | R-PROF; immutable. | G4,G6 |
| `client_idempotency_digest` | `KeyedDigest` / — | Digest of client nonce scoped to author/thread/session; raw token not persisted/logged. | Secure-message service. | C3; S/H. | Internal duplicate check only. | R-PROF/R-SEC; immutable/key-versioned. | G0,G4,G6 |
| `idempotency_key_version` | `string` / — | Digest/canonicalization version. | Security/config service. | C1; S/B. | Internal. | R-SEC; immutable. | G4,G6 |
| `supersedes_message_ref` | `OpaqueId<SecureMessage>` / null | Prior message corrected by this immutable record. | Authorized correction workflow. | C2; A/B to participants. | Same authorized author/professional policy; audited. | R-PROF/R-PRIV; acyclic; original remains. | G1,G3,G4,G6 |
| `superseded_by_message_ref` | `OpaqueId<SecureMessage>` / null | Replacement pointer set only by controlled supersession transaction. | Secure-message service. | C2; A/B. | Controlled database path only. | R-PROF; sole narrowly allowed correction link update or separate junction. | G4,G6 |
| `queue_routing_code` | `SafeCode<QueueRoute>` / — | Explicit trusted workflow route; never body/AI/keyword urgency derived. | Thread/source workflow. | C1; S/B. | Internal routing policy. | R-PROF/R-COMMS; immutable per message. | G1,G3,G6 |
| `attachment_state` | literal `BLOCKED` / — | Tombstone invariant: attachments unavailable. | Schema/domain invariant. | C1; A/B if UI explains. | Cannot be changed under Task 07. | R-PROF; invariant. | New separately approved brief required to change |
| `retention_classification` | `SafeCode<RecordClass>` / — | Approved secure-message/clinical-record class. | Records/professional policy. | C2; S/B. | Governance/professional owner. | R-PROF/R-PRIV; no default duration. | G3,G4,G6 |
| `retain_until` | `Instant` / null | Computed horizon once policy exists; null never authorizes deletion. | Governance service/database. | C2; S/B. | Governance only. | R-PROF/R-PRIV; legal hold/incident overrides. | G4,G6 |

## Contract 24 — `SecureMessageAcknowledgement`

An authenticated portal interaction fact. It is not delivery, comprehension,
response, professional review, or clinical completion.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `acknowledgement_id` | `OpaqueId<Acknowledgement>` / — | Immutable acknowledgement identity. | Secure-message service. | C2; S/B. | Exact authorized participant. | R-PROF/R-PRIV; append-only. | G0,G2,G4,G6 |
| `thread_ref` | `OpaqueId<SecureThread>` / — | Thread context. | Secure-message service. | C2; S/B. | Exact current participant. | R-PROF; immutable. | G2,G4,G6 |
| `message_ref` | `OpaqueId<SecureMessage>` / — | Message presented/acknowledged. | Secure-message service. | C2; S/B. | Exact current participant. | R-PROF; immutable. | G2,G4,G6 |
| `actor_ref` | `OpaqueId<Actor>` / — | Authenticated participant causing event. | Task 05/staff auth context. | C2; S/B. | Exact participant authorization. | R-PROF/R-PRIV; immutable. | G2,G4,G6 |
| `acknowledgement_type` | `enum(PRESENTED, OPENED, EXPLICITLY_ACKNOWLEDGED)` / — | Narrow portal event semantics; labels require product/professional approval. | Secure-message service. | C1; A/B only with honest wording. | Participant action/server observation. | R-PROF; immutable; never upgraded by inference. | G1,G3,G6 |
| `occurred_at` | `Instant` / — | Server receipt time. | Database. | C1; A/B. | Internal. | R-PROF; immutable. | G4,G6 |
| `client_event_digest` | `KeyedDigest` / — | Idempotency digest of bounded client event token. | Secure-message service. | C3; S/H. | Internal only. | R-SEC/R-PROF; immutable. | G0,G4,G6 |
| `session_revision` | `Version` / — | Session/authorization revision used. | Identity service. | C2; S/B. | Internal. | R-ID/R-PROF; historical; stale session events deny. | G2,G4,G6 |
| `clinical_finality` | literal `NONE` / — | Tombstone invariant proving no professional/clinical/billing completion effect. | Schema/domain invariant. | C1; S/B. | Cannot be changed by client/provider/operator. | R-PROF; permanent invariant. | G3,G6 |

## Contract 25 — `SecureMessageQueueItem`

Minimum-necessary professional/admin review reference. Content is retrieved only
after the staff member opens the authorized thread.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `queue_item_id` | `OpaqueId<SecureQueueItem>` / — | Queue identity. | Secure-message workflow. | C2; S/B. | Authorized staff queue. | R-PROF/R-PRIV; immutable identity. | G0,G3,G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `thread_ref` | `OpaqueId<SecureThread>` / — | Thread to authorize/open. | Secure-message workflow. | C2; S/B; opaque client action ref only where needed. | Staff must pass thread authorization when opened. | R-PROF; immutable. | G2,G3,G4,G6 |
| `message_ref` | `OpaqueId<SecureMessage>` / null | Specific triggering message, without body/excerpt. | Secure-message workflow. | C2; S/B. | Authorized staff only. | R-PROF; immutable; null for thread-level work. | G3,G4,G6 |
| `route_code` | `SafeCode<QueueRoute>` / — | Trusted workflow route, never AI/content/keyword-derived urgency. | Thread/source workflow. | C1; A/B to authorized staff. | Internal route allowlist. | R-PROF; immutable. | G1,G3,G6 |
| `state` | `enum(OPEN, CLAIMED, COMPLETED, CANCELLED, SUPERSEDED)` / — | Queue state only. | Queue workflow. | C1; A/B. | Role/assignment server checks. | R-PROF; transitions audited; no clinical finality. | G1,G3,G6 |
| `assigned_role_code` | `SafeCode<StaffRole>` / — | Approved staff role category. | Professional/operations policy. | C2; S/B. | Existing role mapping or explicit new approval. | R-PROF; reassignment audited. | G1,G3,G6 |
| `assigned_actor_ref` | `OpaqueId<StaffActor>` / null | Current staff assignee. | Queue workflow. | C2; S/B. | Pharmacy/role/assignment checks. | R-PROF/R-PRIV; versioned changes. | G3,G4,G6 |
| `due_at` | `Instant` / null | Approved response target, not clinical urgency or promise. | Professional/operations policy. | C1; A/B to staff; patient display only if separately approved. | Internal derive. | R-PROF; no value until response policy approved. | G1,G3,G6 |
| `created_at` | `Instant` / — | Database creation time. | Database. | C1; A/B to authorized staff. | Internal. | R-PROF; immutable. | G4,G6 |
| `claimed_at` | `Instant` / null | Authorized staff claim time. | Queue workflow/database. | C1; A/B. | Eligible assignee. | R-PROF; lease/state policy applies. | G3,G6 |
| `completed_at` | `Instant` / null | Queue review completion only. | Authorized staff workflow. | C1; A/B. | Assigned staff. | R-PROF; cannot complete visit/follow-up/assessment/claim. | G3,G6 |
| `cancelled_at` | `Instant` / null | Source/thread/system cancellation. | Secure-message workflow. | C1; A/B. | Trusted source/system. | R-PROF; terminal. | G3,G6 |
| `safe_reason_code` | `SafeCode<SecureQueueReason>` / — | Payload-free category; no excerpt or clinical urgency. | Trusted workflow. | C1; A/B. | Authorized staff queue. | R-PROF; immutable. | G1,G3,G6 |
| `state_version` | `Version` / — | Concurrency token. | Database/queue workflow. | C1; S/B. | Internal conditional transition. | R-PROF; monotonic. | G0,G6 |

## Contract 26 — `CommunicationAuditEvent`

Append-only metadata evidence. It intentionally has no body, excerpt, contact,
challenge, token, provider raw payload, free-text note, or recipient field.

| Field | Type / null | Meaning / source | Writer | Class / exposure / crypto | Authorization | Retention / staleness | Gate |
|---|---|---|---|---|---|---|---|
| `audit_event_id` | `OpaqueId<CommunicationAuditEvent>` / — | Immutable event identity. | Audit service/database. | C2; S/B. | Append-only service; authorized audit read. | R-PRIV/R-SEC; no update/delete. | G0,G4,G6 |
| `event_type` | `SafeCode<CommunicationAuditType>` / — | Allowlisted action/state/access/control event. | Domain service. | C1; S/B. | Internal append. | R-PRIV; immutable. | G1,G4,G6 |
| `occurred_at` | `Instant` / — | Trusted database event time. | Database. | C1; S/B. | Internal. | R-PRIV; immutable. | G4,G6 |
| `custodian_ref` | `OpaqueId<Custodian>` / — | Server-derived pharmacy/custodian. | Server context. | C2; S/B. | Never client-selected. | R-PRIV; immutable. | G2,G4,G6 |
| `actor_ref` | `OpaqueId<Actor>` / null | Authenticated human actor; null for named trusted service/timer. | Identity/domain service. | C2; S/B. | Audit reviewers only. | R-PRIV; immutable. | G2,G4,G6 |
| `actor_role_code` | `SafeCode<ActorRole>` / null | Role/relationship category used at action time. | Authorization service. | C2; S/B. | Audit reviewers only. | R-PRIV; historical snapshot. | G2,G3,G4,G6 |
| `source_service_code` | `SafeCode<Service>` / — | Approved internal service emitting event. | Audit client allowlist. | C1; S/B. | Internal append allowlist. | R-SEC; immutable. | G0,G6 |
| `entity_type` | `SafeCode<EntityType>` / — | Contract/entity class affected. | Domain service. | C1; S/B. | Internal. | R-PRIV; immutable. | G4,G6 |
| `entity_ref` | `OpaqueId<Entity>` / — | Opaque affected record reference. | Domain service. | C2; S/B. | Authorized audit users; source authorization still applies. | R-PRIV; immutable. | G4,G6 |
| `purpose_ref` | `OpaqueId<Purpose>` / null | Safe purpose reference where relevant. | Domain service. | C2; S/B. | Audit/privacy read. | R-PRIV; immutable. | G1,G4,G6 |
| `channel` | `CommunicationChannel` / null | Channel category where relevant. | Domain service. | C1; S/B. | Audit/operations read. | R-PRIV; immutable. | G1,G4,G6 |
| `policy_version` | `string` / null | Exact policy version applied. | Domain service. | C2; S/B. | Audit/privacy/legal read. | R-PRIV; immutable. | G1,G4,G6 |
| `template_version_ref` | `OpaqueId<TemplateVersion>` / null | Exact template version, not rendered content. | Domain service. | C2; S/B. | Audit/privacy read. | R-PRIV; immutable. | G1,G4,G6 |
| `outcome_code` | `SafeCode<AuditOutcome>` / — | Allowlisted outcome such as allowed/denied/created/superseded. | Domain service. | C1; S/B. | Audit/operations read. | R-PRIV; immutable. | G1,G4,G6 |
| `safe_reason_code` | `SafeCode<AuditReason>` / null | Payload-free reason. | Domain safe-error/state mapper. | C1; S/B. | Audit/operations read. | R-PRIV/R-SEC; immutable. | G1,G4,G6 |
| `request_trace_digest` | `KeyedDigest` / null | Optional safe correlation digest not derived from patient/contact/content. | Request/audit service. | C2; S/H. | Security/audit only. | R-SEC; key/versioned; duration approved. | G4,G6 |
| `trace_key_version` | `string` / null | Required iff trace digest exists. | Security service. | C1; S/B. | Security only. | R-SEC; immutable. | G4,G6 |
| `retention_classification` | `SafeCode<RecordClass>` / — | Approved audit record class. | Records policy. | C2; S/B. | Governance only. | R-PRIV/R-SEC; no default duration. | G4,G6 |
| `retain_until` | `Instant` / null | Computed horizon once approved; hold/incident aware. | Governance service/database. | C2; S/B. | Governance only. | R-PRIV/R-SEC; null never authorizes deletion. | G4,G6 |

## Conceptual relational schema

This is a naming and ownership proposal only. It is not SQL and must not be
copied into a migration without a separately reviewed Workstream C-to-runtime
decision.

| Conceptual table | Contract | Mutation model | Primary owner |
|---|---|---|---|
| `communication_purpose` | `CommunicationPurpose` | Immutable version rows; withdraw by state event/version. | Product/privacy policy registry. |
| `contact_point` | `ContactPoint` | Immutable destination versions; supersede, dispute, suppress, never rewrite raw value. | Task 05/contact + privacy. |
| `contact_verification_challenge` | `ContactVerificationChallenge` | Narrow state transition for attempts/consume/revoke; secret digest only. | Task 05/contact security. |
| `contact_verification_event` | `ContactVerificationEvent` | Append-only. | Identity/security. |
| `communication_consent_event` | `CommunicationConsentEvent` | Append-only. | Privacy/consent. |
| `communication_consent_grant` | `CommunicationConsentGrant` | Immutable effective snapshots with one-way supersession. | Privacy/consent. |
| `communication_preference_profile` | `CommunicationPreferenceProfile` | Immutable profile versions. | Patient preferences/privacy. |
| `quiet_hours_policy` | `QuietHoursPolicy` | Immutable profile versions. | Product/accessibility/privacy. |
| `communication_template` | `CommunicationTemplate` | Stable family plus withdrawal state. | Template governance. |
| `communication_template_version` | `CommunicationTemplateVersion` | Append-only immutable versions. | Template governance. |
| `template_translation_version` | `TemplateTranslationVersion` | Append-only immutable versions. | Translation/accessibility governance. |
| `message_intent` | `MessageIntent` | Immutable business identity plus controlled orthogonal state projection/supersession. | Communications orchestration. |
| `outbox_message` | `OutboxMessage` | Controlled queue state/lease transitions. | Worker operations. |
| `delivery_attempt` | `DeliveryAttempt` | Append-only attempt with conservative result projection. | Adapter/reconciliation. |
| `provider_message_reference` | `ProviderMessageReference` | Immutable encrypted mapping; restricted access. | Adapter/security. |
| `provider_webhook_receipt` | `ProviderWebhookReceipt` | Append-only quarantine/normalized processing states. | Webhook/security/reconciliation. |
| `suppression_entry` | `SuppressionEntry` | Append-only deny/supersession evidence. | Privacy/security/operations. |
| `reconciliation_case` | `ReconciliationCase` | Versioned operational workflow; history audited. | Operations. |
| `communication_work_item` | `CommunicationWorkItem` | Versioned minimum-necessary administrative workflow. | Operations. |
| `secure_message_thread` | `SecureMessageThread` | Versioned state/assignment; content stored separately. | Task 05/06/professional service. |
| `secure_thread_participant` | `SecureThreadParticipant` | Append-only participant versions. | Task 05/06 authorization. |
| `secure_message` | `SecureMessage` | Append-only encrypted messages; supersede-not-edit. | Professional secure-message service. |
| `secure_message_acknowledgement` | `SecureMessageAcknowledgement` | Append-only portal facts. | Secure-message service. |
| `secure_message_queue_item` | `SecureMessageQueueItem` | Versioned minimum-necessary queue workflow. | Professional operations. |
| `communication_audit_event` | `CommunicationAuditEvent` | Database-enforced append-only. | Privacy/security audit. |

`CommunicationChannel` is a closed application/database enum or approved
registry code; the final choice belongs to schema review. Provider credentials
are not business-table fields and belong only in an approved secret store.

## Required keys, relationships, and constraints

The generated design must include at minimum:

1. **Opaque primary keys.** No email, phone, patient identifier, source ID, or
   provider ID serves as a public key or URL credential.
2. **Server-only custodian scope.** Every patient/communication row that needs
   custodian scope carries a foreign key derived from `PHARMACY_ID`. Foreign
   keys include custodian/subject where needed to make cross-scope relationships
   unrepresentable. This does not authorize multi-pharmacy selection.
3. **Version uniqueness.** Unique `(lineage_id, version)` for contact, consent
   grant, preference, quiet hours, template, translation, participant, and other
   versioned aggregates.
4. **One active version.** Partial unique or deferrable exclusion constraints
   ensure at most one current active row per exact lineage/scope while permitting
   atomic supersession.
5. **Acyclic supersession.** A row cannot supersede itself; replacement scope
   must match; a finalized link cannot be redirected. Use the `claim_draft`
   pattern or a separate append-only junction after database review.
6. **Logical-message uniqueness.** Database uniqueness over the server-generated
   idempotency digest/key version prevents concurrent duplicate intent creation.
7. **Attempt uniqueness.** Unique `(message_intent_ref, attempt_number)` and
   provider-idempotency digest under the approved provider/config scope.
8. **Webhook dedupe.** Unique `(provider_account_code, event_keyed_digest)`;
   duplicates are immutable receipts/outcomes, not state rewrites.
9. **Temporal checks.** `not_before <= expires_at`, lease expiry after claim,
   fixed-expiry consent validity, verification expiry, and supersession times are
   internally consistent. Database/server time is authoritative.
10. **Consent completeness.** Exact custodian, subject, actor/grant, contact
    version, channel, purpose, notice, policy, jurisdiction, effective time, and
    either expiry or approved no-fixed-expiry reference are mandatory.
11. **Contact completeness.** Exact encrypted value/key version, destination
    version, lifecycle state, source, timestamps, and verification projection are
    mandatory; raw value has no plaintext/index/log column.
12. **External render closure.** External templates and render parameters have
    database/application content-class checks and a closed placeholder schema;
    no arbitrary JSON/free-text extension bag.
13. **Suppression precedence.** An active applicable suppression row blocks
    claim/dispatch/manual resend. Provider delivery events cannot create an
    unsuppression transition.
14. **No clinical foreign-write path.** Communications roles have no insert,
    update, or delete grants on assessment, claim, prescription, follow-up
    completion, visit, booking finality, or billing tables.
15. **Attachment tombstone.** `secure_message.attachment_state` permits only
    `BLOCKED` until a separate approved design and migration changes the check.
16. **Acknowledgement tombstone.** `clinical_finality` permits only `NONE`.
17. **Retention/hold guard.** Deletion is unavailable until record classes,
    retain-until computation, legal holds, incidents, backups, vendor deletion,
    and destruction order are approved and enforced.
18. **Append-only evidence.** Consent events, verification events, attempts,
    webhook receipts, suppression history, acknowledgements, messages, and audit
    events reject update/delete except narrowly reviewed supersession/projection
    mechanics.

## Orthogonal state rule

Workstream E owns the final state machines. Workstream C reserves separate
columns/contracts so one fact cannot masquerade as another:

- intent state;
- dispatch/outbox state;
- provider acceptance state;
- delivery projection;
- acknowledgement state;
- reconciliation state;
- source workflow state;
- consent/contact/suppression authority state; and
- clinical/professional state, which remains outside communications entirely.

No generic `status` column may combine these axes. Unknown values fail closed.
State transitions use compare-and-set/version predicates or row locks inside a
transaction, and every required audit event commits atomically with its
business transition.

## Transaction boundaries

### Intent creation

One transaction must:

1. lock or otherwise serialize the exact logical idempotency scope;
2. re-read source, actor/subject, contact, consent, preference, suppression,
   template, policy, and lifecycle state;
3. insert one immutable `message_intent` and one `outbox_message`, or return the
   deterministic existing logical result;
4. append the required `communication_audit_event`; and
5. roll back everything if any required insert/audit fails.

### Worker claim and effect

Claiming work and producing an external effect cannot be one database
transaction across an unreliable provider. The honest guarantee is:

- atomic database claim/lease;
- immediate final authority recheck before adapter callback;
- one immutable attempt and provider idempotency key;
- no blind retry after unknown acceptance;
- explicit reconciliation for uncertainty; and
- duplicate resistance, not a false “exactly once delivery” promise.

### Contact/consent change

The same transaction that inserts a new contact, consent, preference, or
suppression version must supersede the old current projection, invalidate
affected pending work or advance an authority revision, and append safe audit
evidence. Already accepted provider effects remain uncertain and are reconciled;
the UI must not promise cancellation.

### Secure-message write

One transaction must recheck session audience, participant/grant, assignment,
thread state, professional suitability/consent where applicable, idempotency,
size/content rules, and retention class; insert encrypted content and its
minimum-necessary queue item; and append a content-free audit event. Any failure
rolls back all rows.

## Index and query rules

- Index opaque references, state codes, server timestamps, versions, and keyed
  digests only.
- Never index plaintext contact values, decrypted content, raw provider
  identifiers, verification codes, tokens, message excerpts, or free text.
- Queue/list queries project only the minimum fields required by the current
  server-rendered view. Message bodies are fetched through a separate authorized
  content query after object authorization.
- Provider lookup uses the keyed protected mapping, never a provider reference
  in a URL, log, metric label, or client prop.
- High-cardinality patient/contact/message/provider identifiers are excluded
  from metric labels.
- Every query involving a patient/subject includes server-derived custodian
  scope as defense in depth even while the application remains single-pharmacy.

## Encryption and key boundaries

- Supabase Postgres remains in the approved `ca-central-1` project, but this is
  a project residency choice, not a claim that PHIPA universally requires
  Canadian hosting.
- Contact values, push tokens, provider references, secure-message bodies, and
  any separately approved raw webhook quarantine payload use application-level
  envelope encryption with versioned keys outside business tables.
- Normalized contact/provider/idempotency matching uses versioned keyed digests,
  not unsalted hashes. Digest input/canonicalization never appears in logs.
- Provider/webhook credentials remain outside Postgres in an approved secret
  store with environment separation, rotation, least privilege, and no client
  exposure.
- Key rotation must preserve immutable business history through controlled
  re-encryption or parallel key-version support; it must not create a new
  patient/contact fact.
- Loss, compromise, rotation, and destruction procedures require security,
  privacy, records, operations, and recovery review before production.

## Database roles and permissions

The production proposal requires dedicated non-owner roles rather than table
ownership by the application:

- orchestration role: create/read intents and outbox through reviewed functions;
- worker role: claim outbox, append attempts, perform final-read checks;
- webhook role: append bounded receipts only, no patient/content read;
- reconciliation role: read protected mappings and append reconciliation state;
- secure-content role: narrow encrypted message operations after authorization;
- audit role: insert-only audit events;
- governance role: hold/retention/destruction functions only; and
- migration owner: unavailable to runtime.

These are database capability descriptions, not approved application roles.
Final role names/grants require schema/security review. Direct `UPDATE`/`DELETE`
on append-only records is revoked from application roles; reviewed stored
functions/transactions expose only valid transitions.

## Client contract boundary

No database contract is serialized wholesale. Separate Zod-validated response
schemas must expose only what each authenticated screen needs:

- contact UI receives masked channel/status/version, never raw value unless an
  explicitly authorized edit flow needs it momentarily;
- preference/consent UI receives approved labels, current state, dates, and
  notice versions;
- worklists receive safe category/state/due/assignment fields, never content or
  destination;
- secure thread view receives decrypted content only after current participant
  authorization and with `private, no-store`, no-referrer, same-origin CSP, no
  analytics/session replay, and sensitive-state clearing; and
- provider, audit, reconciliation, and encryption fields remain server-only.

No contact, patient, thread, message, provider, consent, or token identifier is
placed in an external notification URL. Ordinary authenticated portal routing
must use non-bearer opaque IDs plus server authorization on every request.

## Dispatch authority query

The future dispatch operation must resolve one decision from current server
state, not from fields cached on the outbox row:

```text
DispatchDecision =
  lifecycle current
  AND ticket instance/revision current
  AND source current and still useful
  AND custodian/subject/actor/grant current
  AND exact consent grant ACTIVE at server time
  AND exact contact version VERIFIED + ACTIVE
  AND no applicable active suppression
  AND purpose/channel/template/translation current and approved
  AND quiet-hours/timezone/cadence policy permits now
  AND intent/lease/attempt/idempotency state permits one effect
  AND adapter/configuration is explicitly approved
```

Any false, missing, malformed, contradictory, stale, or unknown term returns a
safe denied reason and executes no callback. A preferred channel or prior
successful delivery cannot fill a missing term. There is no emergency or silent
fallback branch.

## Retention and export proposal

Before schema implementation, the records owner must classify each table as one
or more of:

- identity/contact administration;
- consent/privacy evidence;
- communication operational metadata;
- professional secure-message/clinical record;
- security/incident evidence; or
- transient provider quarantine.

That decision must map each field to custodian record inclusion, patient export,
correction/supersession, access request, legal hold, incident hold, retain-until,
backup, provider/subprocessor deletion, and destruction order. Secure-message
content may belong in the clinical record, but this document does not make that
professional/records decision. Raw webhook payload retention remains disabled
unless separately approved.

## Schema implementation sequence — blocked until approved

If the required gates are later satisfied, the implementation sequence is:

1. agree schema/migration ownership with Tasks 04, 05, 06 and the existing
   follow-up/governance owners;
2. freeze purpose/consent/contact/suppression/template/retention policy versions;
3. produce reviewed TypeScript/Zod contracts in the synthetic sandbox first;
4. prove state, authorization, race, leakage, stale-action, suppression,
   no-fallback, no-clinical-effect, teardown, and evidence controls;
5. obtain a separate production schema decision, then edit Drizzle schema;
6. generate a migration with `npm run db:generate`, show/review the SQL, replay
   from zero and predecessor state, prove rollback/recovery and least privilege;
7. run `npm run db:migrate` only in an approved change window; never `db:push`;
8. perform safe aggregate/catalog/grant/parity verification; and
9. obtain exact-candidate Task 11 and final promotion approval.

No step in this document authorizes step 3 or later today.

## Unresolved decisions that block runtime work

The following remain deliberately unresolved:

- named Task 07 capability owner, backup, privacy/security/operations reviewers,
  kill-switch operator, expiry/review date, risk tier and autonomy level;
- Task 07 Task 01 scope addendum and Task 11 Checkpoint 1;
- Task 04 appointment event contract, Task 05 identity/delegation/contact
  ownership, and Task 06 secure-message suitability/professional contract;
- approved purpose taxonomy and channel/purpose matrix;
- consent wording, capture methods, agent policy, expiry/no-expiry policy,
  withdrawal, witness and jurisdiction rules;
- contact verification provider/method, reverification/shared/recycled contact
  policy, rate limits, and wrong-recipient process;
- quiet hours, timezone, cadence, useful windows, supported languages,
  translations, accessibility accommodations and alternatives;
- suppression scope/precedence/unsuppression authority;
- template copy, placeholder sets, sender identity and status/response wording;
- record classification, retention, patient export, correction, legal hold,
  incident, backup/vendor deletion and destruction policy;
- provider selection, contract, region/data flow, support/subprocessors,
  credentials, idempotency, cancellation, webhook and reconciliation semantics;
  and
- production schema owner, recovery/rollback, operational SLO/on-call/runbooks,
  PIA, TRA, legal/CASL, privacy, security, professional, accessibility,
  procurement and release approvals.

## Workstream C acceptance check

- All 26 requested contracts are defined.
- Every listed field documents meaning, type/nullability, source, trusted writer,
  data classification, client/server exposure, encryption, authorization,
  retention owner, staleness/supersession and production gate.
- Contact, consent, preference, intent/outbox, attempt/webhook and secure-thread
  minimum fields from the brief are present.
- Raw contact/provider/content values are structurally separated from logs,
  audit, URLs, idempotency, queues and ordinary metadata.
- State axes are orthogonal and provider/acknowledgement events have no clinical
  or billing finality.
- The one-pharmacy/server-owned `PHARMACY_ID` invariant is preserved.
- Unknown policy fails closed; no production policy value was invented.
- No migration, schema file, runtime code, provider, credential, recipient, PHI
  or network effect was added.

## Current disposition

**Workstream C: complete as conceptual documentation.** The schema is not
approved for implementation. Workstream D now specifies the behaviour over these
contracts — consent, contact verification, preferences, quiet hours, and
suppression — in
[`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
and
[`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md),
without selecting any of the policy values listed above as unresolved.
Workstream E now owns the final state machines this document reserved columns
for — see
[`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md).
Workstream F populates Contracts 10–12 with a registry structure, placeholder
allowlists, and a rendering contract in
[`minimal-payload-template-catalogue.md`](minimal-payload-template-catalogue.md),
approving no template. Workstream G populates Contracts 15–17 and 19 with the
adapter contract, webhook pipeline, and reconciliation workflow, selecting no
vendor. Workstream H populates Contracts 20–25 with the secure-thread contract,
queue design, and authorization matrix, building no prototype. The next
documentation-only slice is Workstream I: appointment, follow-up, and Task 06
integration boundaries. Runnable synthetic implementation remains **BLOCKED**
pending G0 and Task 11 Checkpoint 1. Pilot and production remain separately
blocked by all applicable G1–G6 decisions.
