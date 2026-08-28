# Task 07 — Privacy, Security, and Retention Plan

**Workstream:** J (part 2 of 3) — privacy/security controls and the field-level
retention inventory

**Prepared:** 2026-08-27

**Repository design baseline:** `808fbe73219336544a4d72aef6676444a100ee2f`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`communication-contracts-and-schema-proposal.md`](communication-contracts-and-schema-proposal.md)
(data classes, exposure/encryption codes, retention owners, gate codes — reused
verbatim here, not redefined) · [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
· [`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md)
· [`provider-adapter-contract.md`](provider-adapter-contract.md) and
[`webhook-and-reconciliation-design.md`](webhook-and-reconciliation-design.md)
· [`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md)
· [`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md)

## Decision summary

This document does two things the brief asks for together because they are
the same problem seen from two directions: **privacy/security controls**
(what must be true of the system) and **retention** (how long each dataset
may exist and under what authority it stops existing). It selects no
retention period, no encryption algorithm beyond what Contract 26's exposure
codes already name, and no vendor. It states which controls this design
already structurally provides, which remain policy inputs, and which cannot
be assessed at all until a dependency Task 07 does not own is resolved.

Nothing here is a privacy, security, legal, or professional approval. It is
the inventory those approvers need in order to give one.

# Part 1 — Privacy and security controls

## 1.1 What is already structurally enforced

These are not proposals; they are restatements of decisions already made in
Workstreams C–I, gathered here because the brief asks for a single privacy
and security control list and scattering the answer across nine documents
would make it easy to miss that the answer already exists.

| Control area | Mechanism | Where defined |
|---|---|---|
| Encryption in transit | Approved TLS baseline (`S/B`, `A/B` exposure codes) on every contract field. | Contract field catalogue |
| Encryption at rest — contact values, secure content, provider references | Application-level envelope encryption with a separate key version (`S/F`, `A/F`), never database-baseline-only. | Contracts 3, 16, 23 |
| Field protection for credentials/secrets | `C5` class; outside business tables, in an approved secret store. | Contracts, "Encryption and key boundaries" |
| Contact/token value never in logs, URLs, or idempotency keys | Non-negotiable contract rule #6. | Contracts §"Non-negotiable contract rules" |
| Least privilege / separation of patient, pharmacist, administrator, support access | Per-contract `Authorization` column; §8 of `secure-portal-messaging-contract.md`'s authorization matrix denies technical support message-body access by default. | Contracts; `secure-message-authorization-matrix.md` |
| Tenant/custodian isolation | `custodian_ref` derived server-side from `PHARMACY_ID` on every scoped row; never client-selected. | Contracts, rule #2; matches `AGENTS.md` invariant 4 |
| No clinical foreign-write path | Communications database roles hold no grants on assessment/claim/booking/visit tables. | Contracts, constraint #14; invariant I-10 |
| Webhook authentication before parsing | Signature verified over raw bytes before any field is read. | `webhook-and-reconciliation-design.md` |
| No open/click tracking by default | Disabled by adapter configuration default; architecture test denies enabling it. | Outbox state machine, I-09 |
| Attachment boundary | Tombstone `BLOCKED` invariant; cannot be changed without a separately approved brief. | Contract 23, constraint #15 |
| Append-only evidence | Consent, verification, attempts, receipts, suppression, acknowledgements, messages, and audit events reject update/delete except reviewed supersession. | Contracts, constraint #18 |

## 1.2 Controls that require policy or infrastructure decisions this document cannot make

| Control area | What is missing | Decision |
|---|---|---|
| Key ownership and rotation | Which service owns key generation, storage, and rotation cadence; how rotation replays through the versioned key fields already in the schema. | `T07-D42` |
| Protected-route no-store/private-cache headers | Not yet specified for any Task 07 route, because no route exists. | `T07-D02` gates all runnable code; header policy itself is `T07-D43` |
| CSRF and origin protection | Standard for the application, not Task 07-specific; confirm Task 07 routes inherit it rather than re-deriving it. | `T07-D43` |
| Rate limits and abuse controls | Verification-challenge rate limiting is specified (`ContactVerificationChallenge.max_attempts_policy_ref`); message-send frequency and thread-list request limits are not yet bounded. | `T07-D44` |
| Generic authorization failures resisting enumeration | Every denial in the authorization matrix already returns a generic outcome; whether the *same* generic message is used across distinct denial reasons (to prevent an attacker distinguishing "wrong patient" from "wrong pharmacy" by response shape) is `T07-D41`, already raised in the audit catalogue. | `T07-D41` |
| Referrer policy / Content Security Policy | Application-wide; Task 07 adds no new inline content but secure-message rendering is the one surface with any content model at all, and its `content_format` fixed-allowlist constraint (Contract 23) is the load-bearing control. | `T07-D45` for CSP specifics |
| Vendor employee/support access | Cannot be assessed — no vendor is selected. | `T07-D30` (vendor review, pre-existing in `vendor-review-scorecard.md`) |
| Vulnerability/dependency/incident/subprocessor-change management | Task 11's dependency-scanning control (`security:dependencies`) already covers the application generally; Task 07 introduces no new dependency and inherits that gate. | Confirmed in place, no new decision needed |
| Vendor data return, deletion, and backup expiry | Cannot be assessed — no vendor is selected. | `T07-D29`/`T07-D30` |

## 1.3 Browser-storage and client-exposure prohibition

Restating and extending `AGENTS.md`'s definition-of-done rule ("No PHI in
browser persistence, URLs, logs, analytics, caches, or unnecessary client
props") for Task 07's specific surfaces:

- No contact value, verification code, secure-message body, provider
  reference, push token, or bearer token may reach `localStorage`,
  `sessionStorage`, `IndexedDB`, a service worker cache, or a URL (path,
  query, or fragment) on any Task 07 surface, external or portal.
- A generic portal-entry URL (per the brief's Channel and content boundary
  table) carries no reusable credential and no identifier; this is already a
  non-negotiable contract rule and is repeated here because it is also a
  browser-storage/URL rule, not only a template rule.
- Session-replay and equivalent DOM-capture tooling must not run on any
  authenticated Task 07 route (secure inbox, thread, preference pages,
  pharmacist/administrative queues). This is the same prohibition
  `AGENTS.md` already states for the pharmacist claim-derivation form,
  extended here because Task 07 introduces the first *patient-facing*
  authenticated surface — see the open scope question below.
- Analytics on protected Task 07 routes is disabled by default, matching the
  brief's channel/content boundary and Workstream H's "leave application
  logs free of message content" rule.

## 1.4 The open `AGENTS.md` scope question, restated for this document

`secure-portal-messaging-contract.md` already flags that Workstream H
introduces the first authenticated **patient-facing** surface, and that
`AGENTS.md` invariant 2 ("the patient intake collects ZERO PHI") predates
that surface's existence. This plan does not resolve that question. It
notes the consequence for privacy/security control design specifically: the
controls in §1.1–§1.3 above are written as if a patient-facing PHI surface
is approved to exist under Task 06/07's own consent and authorization model,
*separate from* the zero-PHI public intake, which remains unchanged. If the
lead's answer to the scope question is narrower than that, every control in
this section still holds — they would simply apply to a smaller surface, not
change in kind.

# Part 2 — Application logs and telemetry (summary; full rules in the companion document)

The brief asks for application-log and telemetry rules under this workstream
as well as under a dedicated logging document. To avoid two authorities for
the same rule, this plan states only the *ownership boundary* and defers the
rule set itself:

- **Structured, allowlist logging** — what a log line is permitted to
  contain, by field, per Task 07 service — is defined in
  [`logging-and-leakage-control.md`](logging-and-leakage-control.md).
- **What the audit trail records** — a different, database-enforced,
  append-only surface with its own field set — is defined in
  [`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md).

Neither document may be satisfied by the other: a fact absent from
application logs is not thereby exempt from audit-event capture, and an
audited fact is not thereby safe to also place in a log line, trace, or
metric label.

# Part 3 — Retention mapping

## 3.1 How to read this table

Columns follow the brief's required retention-inventory fields. `Retention
owner` values (`R-ID`, `R-PRIV`, `R-COMMS`, `R-PROF`, `R-SEC`) are the same
codes Contract C already defined; they are not redefined here. No cell in
the "Proposed retention period" column contains an invented duration —
where the brief would expect one, the cell reads `UNRESOLVED(T07-D27)` and
the "Required approval" column names who must resolve it.

## 3.2 Dataset inventory

| Dataset | Purpose | Source of truth | PHI/PI classification | Collection necessity | Authorized roles | Client exposure | Vendor exposure | Encryption | Retention trigger | Proposed period | Deletion/archival/de-ID | Legal hold | Backup | Data-return | Required approval |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Contact points and versions | Destination for external notices. | `ContactPoint` (Contract 3). | C3 (value), C2 (metadata). | Necessary — no external send is possible without it. | Contact/identity/privacy services; masked view to subject. | Masked label only (`A/B`). | If a verification/delivery vendor is later approved. | `S/F` value, `S/B` metadata. | Supersession, dispute, suppression, account closure. | `UNRESOLVED(T07-D27)` | Old versions inaccessible except governed need; never hard-deleted while lineage is referenced by evidence. | Governed by R-PRIV/R-ID hold policy. | Standard DB backup; vendor backup N/A pre-vendor. | N/A pre-vendor. | Privacy + Task 05 owner |
| Contact-verification challenges/events | Prove destination control. | Contracts 4–5. | C5 (digest), C1–C2 (metadata). | Necessary for the anti-abuse/anti-enumeration model. | Verification/security services only. | None. | None (synthetic; no vendor SMS/email provider yet). | `S/H` digest. | Consumption, expiry, revocation. | Short, approved evidence window per `T07-D46` (new) | Digest destroyed after the approved evidence window; raw code never persisted at all. | R-SEC. | Standard DB backup. | N/A. | Security + privacy |
| Consent events and current grants | Prove and project communication authority. | Contracts 6–7. | C2, some `A/B` label exposure. | Necessary — this is the authority record itself. | Consent/privacy services; actor sees own history. | Approved projection only. | None pre-vendor. | `S/B`/`A/B` per field. | Never deleted while any dependent record (message, attempt, thread) still exists; append-only by design. | `UNRESOLVED(T07-D27)`, likely long-lived given it is authority evidence | Superseded, never rewritten; deletion (if ever approved) would require severing dependent-record references first. | R-PRIV. | Standard DB backup. | N/A. | Privacy + legal |
| Preferences and quiet hours | Non-authority routing input. | Contracts 8–9. | C2, `A/B` exposure. | Necessary for usability; explicitly not an authority record. | Preference service; actor. | Approved fields. | None. | `S/B`/`A/B`. | Superseded by new version. | `UNRESOLVED(T07-D27)`, likely shorter than consent since it carries no authority | New version supersedes; old versions retained only as long as needed to explain historical scheduling decisions. | R-PRIV. | Standard DB backup. | N/A. | Privacy |
| Templates and translations | Approved copy the system may render. | Contracts 10–12. | C0–C1 (external), C2/C4 (secure-portal class). | Necessary; also the mechanism that keeps PHI out of unsecured channels. | Template governance; publisher. | Approved rendered output only, never raw source to an unintended channel. | None. | Per content class. | Withdrawal. | Indefinite for audit/reproducibility of what was ever sent; `UNRESOLVED(T07-D27)` for any pruning of ancient withdrawn versions | Withdrawn versions kept for evidence, not served. | R-COMMS/R-PRIV. | Standard DB backup. | N/A. | Template governance + privacy |
| Logical messages and render parameters | The business record of an intended communication. | Contract 13 (`MessageIntent`). | C1–C2; render parameters are C0/C1 only by construction. | Necessary; is the evidentiary spine of the whole system. | Communications orchestration/privacy. | Approved generic status only. | None. | `S/B`. | Terminal state reached (cancelled/expired/completed). | `UNRESOLVED(T07-D27)` | Never edited; superseded only. | R-COMMS/R-PRIV. | Standard DB backup. | N/A. | Privacy + records |
| Delivery attempts and provider references | Evidence of what was actually attempted with a provider. | Contracts 15–16. | C1–C3 (encrypted provider reference). | Necessary for reconciliation and dispute resolution. | Adapter/reconciler only. | None. | Yes, once a vendor exists — this is exactly the data a vendor DPA must cover. | `S/F` (reference), `S/H` (digest). | Terminal attempt outcome; superseded provider mapping invalidation. | `UNRESOLVED(T07-D27)`; also `UNRESOLVED(T07-D29)` for any vendor-side retention mismatch | Provider mapping invalidated under approved provider/account policy; internal record retained per T07-D27. | R-COMMS/R-SEC. | Standard DB backup; vendor backup terms pending `T07-D30`. | Pending `T07-D30`. | Security + vendor review |
| Webhook receipts | Raw provider-input evidence, quarantined by default. | Contract 17. | C1–C2 metadata; C3/C4 for the *default-null* raw-payload field. | Metadata necessary; raw payload **not** collected by default. | Webhook/security/reconciliation services. | None. | Inherent — this *is* vendor-originated data. | `S/H`/`S/B` metadata; `S/F` for the rare, separately approved raw-payload retention. | Processing complete, or approved raw-payload expiry. | Metadata: `UNRESOLVED(T07-D27)`. Raw payload (if ever approved): mandatory short expiry per Contract 17's own field, never open-ended. | Raw payload deleted on `raw_payload_expires_at`; metadata retained per T07-D27. | R-SEC/R-PRIV. | Standard DB backup; raw payload excluded from backup by default pending approval. | Pending vendor review. | Security + privacy, plus a *separate* approval specifically for any raw-payload retention (Contract 17 already requires this twice) |
| Suppression records | Evidence a destination must not be used. | Contract 18. | C2 metadata, C1 status. | Necessary — this is a safety record, not a convenience record. | Privacy/security/operations. | Approved status only. | None. | `S/B`. | Never expires by default; explicit `expires_at` only where policy approves. | `UNRESOLVED(T07-D27)`; safety floor is "retain, do not guess a deletion date" | Superseded only via authorized, audited lift; never silently cleared. | R-PRIV/R-SEC. | Standard DB backup. | N/A. | Privacy + security |
| Reconciliation cases | Operational resolution of provider uncertainty. | Contract 19. | C1–C3. | Necessary for the honesty of the delivery guarantee (Part 1 of the state-machine doc). | Operations. | Approved status to authorized staff. | None directly; may reference vendor evidence. | `S/B`/`S/H` reference. | Case closed (any terminal state, including `RECONCILED_UNRESOLVED`). | `UNRESOLVED(T07-D27)` | Corrections supersede, do not overwrite. | R-COMMS/R-SEC. | Standard DB backup. | N/A. | Operations + privacy |
| Work items (administrative) | Minimum-necessary staff review queue. | Contract 20. | C1–C2; explicitly excludes body/contact/clinical content by contract. | Necessary; deliberately minimized. | Assigned staff role. | Approved status to authorized staff. | None. | `S/B`. | Completed/cancelled/superseded. | `UNRESOLVED(T07-D27)`, expected short relative to the evidence it points to, since the item itself has no PHI | Terminal item retained for operational audit trail. | R-COMMS. | Standard DB backup. | N/A. | Operations |
| Secure threads, participants, messages, acknowledgements | The one PHI-capable Task 07 dataset. | Contracts 21–24. | C2–C4. | Necessary — it is the professional-communication record itself. | Authorized participants; minimum-necessary staff. | Content only to current authorized participants, in-session. | None (no vendor holds secure-message content). | `A/F` content, `S/B` metadata. | Thread closure/expiry/withdrawal, subject to Task 06/professional-records rules. | `UNRESOLVED(T07-D27)` — explicitly, the brief forbids inventing a period here because this content **may form part of the clinical record**, and clinical-record retention is a professional/regulatory decision, not a communications-engineering one. | Corrections supersede; no body mutation, ever. Deletion (if ever approved) requires professional and records sign-off, not a Task 07 default. | R-PROF/R-PRIV, with Task 06 input required. | Standard DB backup with the same encryption as the live table. | N/A — no vendor holds this content. | **Professional (pharmacist/regulatory) review is mandatory before any retention or deletion behaviour is activated for this dataset specifically** |
| Audit events | Append-only evidence trail for everything above. | Contract 26; enumerated in `communication-audit-event-catalogue.md`. | C1–C2 by construction — Contract 26 structurally excludes PHI-bearing fields. | Necessary; is the accountability mechanism the whole design relies on. | Privacy/security audit roles. | None. | None. | `S/B`, `S/H` for optional trace digest. | Never deleted while the entity it references still exists; deletion policy for events referencing since-deleted entities is `UNRESOLVED(T07-D27)`. | Likely long-lived; `UNRESOLVED(T07-D27)` | Database-enforced append-only; no update/delete path exists to bypass with. | R-PRIV/R-SEC. | Standard DB backup. | N/A. | Privacy + security |
| Application logs, metrics, traces, alerts | Operational visibility. | `logging-and-leakage-control.md`. | Must be C0–C1 only by the allowlist rule in that document; a leak here is a defect, not a classification decision. | Necessary for operations, minimized by allowlist. | Operations/security, subject to normal log-access controls. | None. | Depends on log/metrics vendor already in use for the application generally — no new Task 07-specific vendor. | Per platform standard. | Platform-standard rotation. | Platform default, `UNRESOLVED(T07-D47)` if Task 07 needs a shorter window given its allowlist-only content. | Platform default. | N/A. | Platform default. | Security, if a Task 07-specific shorter window is proposed |
| Provider-held data | Whatever a future vendor retains on its own systems. | Vendor, once selected. | Unknown until vendor review. | Cannot assess. | N/A. | N/A. | Full — this is the row vendor DPA review exists for. | Vendor-dependent. | Vendor-dependent. | `UNRESOLVED(T07-D30)` | Vendor-dependent; must be contractually bounded before go-live. | Vendor-dependent, contractually required. | Vendor-dependent. | Contractually required exit clause. | Vendor review + contract + `T07-D29` residency review |
| Backups (of all the above) | Disaster recovery. | Database/infrastructure platform. | Inherits the classification of what is backed up. | Necessary. | Infrastructure/security. | None. | Platform-dependent, no new Task 07 vendor. | Platform standard, at minimum matching the live table's encryption. | Platform rotation policy. | Platform default; `UNRESOLVED(T07-D48)` if Task 07's PHI-capable dataset needs a stricter backup-retention ceiling than the platform default. | Platform default plus legal-hold override. | Same as live legal-hold policy. | N/A. | Platform default. | Security, for any PHI-specific exception |
| Synthetic fixtures and evidence | Test/demo data proving the design. | `docs/task-07`, future test suites. | None — fixtures are, by the brief's own fixture requirements, unmistakably synthetic and non-deliverable. | Necessary for evidence without touching real data. | Anyone with repository access; this is not a PHI surface. | N/A — synthetic. | N/A. | N/A. | N/A. | Retained as long as useful for regression evidence; no PHI retention question applies. | Superseded by newer evidence as the design evolves. | N/A. | Standard repository backup. | N/A. | None beyond normal engineering review |

## 3.3 What this table deliberately does not do

- It does not invent a number of days, months, or years anywhere a real
  policy decision is required. Every such cell is `UNRESOLVED` with a named
  decision ID and a named approval owner, per the brief's explicit
  instruction not to invent legally required retention periods.
- It does not treat "secure-message content may form part of the clinical
  record" as settled in either direction. The table states the consequence
  (professional review is mandatory before any behaviour is activated for
  that one dataset) without pre-judging what that review will conclude.
- It does not assume a vendor's retention terms. Every vendor-touching row is
  explicitly gated on vendor review, consistent with
  `vendor-review-scorecard.md`'s empty-instrument stance.

# Part 4 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D27 | Communication record classification and retention (existing, reused across nearly every row of §3.2) | The specific period/trigger for every dataset above |
| T07-D29 | Cross-border/data-location review (existing) | Vendor-touching rows |
| T07-D30 | Vendor selection and DPA/contract terms (existing, via `vendor-review-scorecard.md`) | Provider-held-data row, delivery-attempt/webhook vendor exposure |
| T07-D41 | Generic-denial reason-code granularity (existing, raised in the audit catalogue) | §1.2 authorization-failure enumeration control |
| T07-D42 | Key ownership and rotation cadence | §1.2 |
| T07-D43 | Protected-route cache-header and CSP specifics for Task 07 routes | §1.2 |
| T07-D44 | Message-send and thread-list rate limits | §1.2 |
| T07-D45 | CSP specifics for secure-message rendering | §1.2 |
| T07-D46 | Verification-evidence retention window | §3.2 contact-verification row |
| T07-D47 | Whether application logs need a Task 07-specific retention window shorter than platform default | §3.2 logs row |
| T07-D48 | Whether backups of the PHI-capable secure-message dataset need a stricter retention ceiling than platform default | §3.2 backups row |

## Workstream J (part 2) acceptance check

- Every control area the brief's "Privacy and security controls" list names
  is addressed, either as already-structurally-enforced (§1.1, with a
  citation to where) or as a named open decision (§1.2).
- The retention table covers every dataset the brief's retention-mapping
  list names, with every required column populated and no invented period.
- The secure-message/clinical-record retention question is flagged as
  requiring professional review specifically, not folded into a generic
  privacy sign-off, matching the brief's explicit instruction on this point.
- Vendor-dependent rows are honest about being unassessable pre-vendor,
  rather than filled with placeholder assumptions.
- This document adds no TypeScript, SQL, migration, encryption
  implementation, or runtime effect.

## Current disposition

**Workstream J, part 2 — privacy, security, and retention plan: complete as
design documentation.**

- **Retention mapping:** PASS as documentation; BLOCKED on T07-D27 (and, for
  specific rows, T07-D29/T07-D30/T07-D41 through T07-D48) for any concrete
  period or vendor-dependent fact.
- **Privacy/security control inventory:** PASS as documentation; the
  structurally-enforced controls in §1.1 require no further decision to
  remain true, and the open items in §1.2 are named rather than assumed.
- **Real PHI, contact data, or vendor engagement:** NO.
- **Production schema, authentication, key management, or vendor changed:**
  NO.

Continue to
[`logging-and-leakage-control.md`](logging-and-leakage-control.md) for the
application-log allowlist rules this plan deferred in Part 2, and to
[`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md)
for the audit-event enumeration this plan's §3.2 "Audit events" row governs
the retention of.
