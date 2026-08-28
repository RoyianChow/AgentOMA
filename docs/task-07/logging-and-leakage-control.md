# Task 07 — Logging and Leakage Control

**Workstream:** J (part 3 of 3) — application-log allowlist rules and the
leakage test surface

**Prepared:** 2026-08-27

**Repository design baseline:** `808fbe73219336544a4d72aef6676444a100ee2f`

**Migration/runtime effect:** none

**Production approval:** not granted

**Depends on:** [`privacy-security-and-retention-plan.md`](privacy-security-and-retention-plan.md)
(Part 2 — this document is the rule set that plan deferred) ·
[`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md)
(the append-only surface this document is *not*) ·
[`minimal-payload-template-catalogue.md`](minimal-payload-template-catalogue.md)
(the forbidden-template-data list, reused rather than restated) ·
[`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md) ·
Task 11's `src/lib/security-policy/` pattern (`PRV-01` raw-`process.env`
detector, `BND-01` forbidden-import detector) — this document proposes the
same AST-based-detector shape for a Task 07 leakage control, once Task 07 has
runnable code to scan.

## Decision summary

Application logs, traces, metrics, alerts, and breadcrumbs are a **different
surface from the audit trail**, with a different owner, a different
retention posture, and a categorically different content rule: the audit
trail (Contract 26) is *designed* to carry safe references to real business
facts; application logs are not designed to carry any patient- or
communication-specific fact at all, safe or not, beyond what operating the
system requires. This document is the allowlist for that second surface, and
the test obligations that keep it honest.

It adds no logging library, no log-shipping configuration, and no runtime
code. Task 07 has no runnable implementation yet (`T07-D02`), so every rule
below is a requirement on the implementation that does not exist yet, not a
description of current behaviour.

# Part 1 — The allowlist principle

A Task 07 log line, trace span, metric label, breadcrumb, or alert payload
may contain only:

1. A safe event-type code from a fixed, reviewed enum (not necessarily the
   same enum as `CommunicationAuditType` — a log-level event can be coarser
   or finer-grained, but it must still be closed and reviewed).
2. An opaque identifier already defined as `S/B`-exposable in the Workstream
   C contracts (e.g. `message_intent_id`, `outbox_message_id`,
   `delivery_attempt_id`) — never a raw contact value, never message
   content, never a provider identifier outside its protected mapping.
3. A safe outcome or reason code from the same allowlisted vocabularies
   Contract 26 already uses (`SafeCode<...>` families).
4. A timestamp.
5. A service/component name.
6. A bounded numeric value used for operational aggregation (attempt count,
   queue depth, age-bucket) — never a value that is itself PHI (e.g. never a
   count of *messages about a specific ailment*, because the category itself
   would leak).

Everything else is denied by default. This is the inverse of a typical
logging policy ("log everything, redact known-sensitive fields") because a
deny-list of "known-sensitive fields" is exactly the approach that misses
the field nobody thought to list — which is also why Task 11's PRV-01/BND-01
controls are AST-based scans against source, not runtime redaction filters.
Task 07's logging control should follow the same shape once it has code:
static analysis of what a log call site is allowed to pass, not a hope that
a redaction filter catches it at runtime.

# Part 2 — Explicit denial list

Restating and consolidating the brief's several overlapping "must never
appear in logs" lists (application logs, evidence, audit events, provider
support tickets) into one list, because Task 07 spans all of them and a
reader should not have to cross-reference four documents to know what is
forbidden everywhere:

| Category | Forbidden values | Also forbidden in |
|---|---|---|
| Contact | Raw email, phone, or push subscription value; keyed-match digest input. | Audit, URLs, provider metadata, evidence |
| Secrets | Verification codes, reusable tokens, magic links, bearer tokens, provider/webhook secrets, encryption keys. | Everywhere, without exception |
| Message content | Secure-message body, subject, excerpt, rendered notification body. | Audit, queue metadata, provider tags |
| Clinical | Ailment, symptom, diagnosis, medication, allergy, lab result, red flag, referral, assessment outcome. | Templates (already forbidden), audit, queue metadata |
| Identity | Patient name, health number, DOB, address, exact location; pharmacist/clinician name where it reveals a care relationship. | Templates, audit, provider metadata |
| Appointment/record | Appointment purpose, service type, claim/prescription/assessment number. | Templates, provider metadata, calendar data |
| Provider | Raw webhook payload (except the one separately-approved, short-lived, encrypted quarantine field in Contract 17), provider error body. | Support tickets |
| Browser | Session-replay capture, full IP address, device fingerprint. | Analytics, breadcrumbs |
| URLs | Query parameters or fragments carrying any of the above. | Referrer headers, browser history |

Any log, trace, metric label, breadcrumb, alert, or support-tooling event
containing a value from this table is a defect, full stop — not a
lower-severity finding, because several of these categories (contact value,
secret, PHI) are the exact things the whole task exists to keep out of
unsecured surfaces, and a log line is an unsecured surface by default.

# Part 3 — Metrics specifically

Metrics need their own short section because aggregation is where leakage
hides best: no single metric event looks like PHI, but a metric labelled by
a high-cardinality identifier reconstructs exactly the record a log-line
rule would have blocked.

- Safe aggregates only: counts by channel, purpose, state, safe
  failure/reason category, and age bucket.
- No metric label may carry a patient, contact, provider-message,
  appointment, thread, or message identifier — including as a label used
  "temporarily for debugging." High-cardinality labels on a metrics system
  are also an operational cost problem independent of privacy, which is a
  second reason this rule holds.
- A safe aggregate metric (e.g. `communications.dispatch_denied_total` by
  `reason_code`) is exactly the kind of visibility operations needs and this
  rule does not forbid — the rule forbids identifying *whose* message it
  was, not that a denial happened.

# Part 4 — Provider-facing surfaces

The brief separately requires that provider tags, custom metadata, support
tickets, and vendor dashboards carry none of the forbidden categories above.
This is not a logging rule in the narrow sense, but it is the same allowlist
discipline applied to a boundary Task 07 does not control once data leaves
the application:

- The provider payload-minimization rule already in
  `provider-adapter-contract.md` (encrypted/protected destination, approved
  rendered template, provider idempotency value, minimum routing
  configuration — nothing else) is the enforcement point; this document adds
  no new rule, only confirms that "logs" in the brief's sense includes
  whatever a vendor's own dashboard or support system would show, and that
  the adapter contract's outbound allowlist is what keeps that surface
  clean.
- A support ticket opened with a vendor about a failed delivery may
  reference the opaque `provider_message_reference_id`/protected mapping,
  never the patient, the content, or the reason category if that category
  itself is sensitive (e.g. "delivery failed" is fine; "delivery failed for
  a mental-health follow-up" is not, even in a ticket to the vendor about
  the vendor's own outage).

# Part 5 — Architecture tests this document requires, once code exists

None of these can run today (`T07-D02`); this is the test obligation a
future implementation inherits, phrased so it can be picked up without
re-deriving the requirement.

| Test | Proves |
|---|---|
| **Static log-call-site scan** (AST-based, mirroring PRV-01/BND-01) | Every logging/tracing/metrics call site in Task 07 code passes only allowlisted field shapes — opaque IDs, safe codes, timestamps, bounded numerics — never a raw string built from a contact value, template render output, or message body. |
| **Dynamic rendered-output scan** | Rendered email subject/preheader/body/headers, SMS body, push title/body/metadata/deep-link, provider tags, and calendar fixtures (if any) contain none of the Part 2 forbidden categories — this is the template/leakage test already required by Workstream F, restated here as also a *logging* obligation because rendered output is exactly what a naive "log the outgoing message for debugging" call would capture. |
| **No-AI-routing architecture test** | No import path from any queue-routing or work-item-creation code to an NLP/sentiment/classification library exists — enforced the same way BND-01 enforces the sandbox boundary: as a forbidden-import check, not a code-review habit. This directly proves the brief's "no AI urgency classification" mandatory stop condition at the source level, the same way BND-01 proves the sandbox boundary at the source level. |
| **Browser-storage scan** | No Task 07 client code writes a contact value, message body, or token to `localStorage`/`sessionStorage`/`IndexedDB`, and no analytics or session-replay script is present on a protected Task 07 route. |
| **Query/URL scan** | No Task 07-generated URL (portal link, redirect, deep link) carries a query parameter or fragment from the Part 2 forbidden list. |
| **Evidence-artifact scan** | Screenshots, accessibility evidence, and test fixtures captured for Task 07 use only synthetic, unmistakably-labelled data and generic filenames — the same rule the brief's fixture requirements already state, reframed as a leakage test that runs against evidence files, not just runtime output. |
| **Metric-label cardinality check** | No metric emitted by Task 07 code carries a label whose value could serve as (or be trivially joined back to) a patient, contact, message, thread, or provider-message identifier. |

These map directly onto the brief's own "Template and leakage tests" and
"Privacy and security tests" requirements; this table exists so a future
implementer has one place naming *which* test proves *which* rule, rather
than re-reading the entire brief to reconstruct the mapping.

# Part 6 — Relationship to Task 11's security-policy pattern

Task 11 already established the shape this document asks Task 07 to follow:
an AST-based, unit-tested detector (`src/lib/security-policy/*.ts`) plus a
CLI wrapper (`tools/security-policy/*.mjs`) plus a CI job, rather than a
runtime filter or a documentation-only promise. `PRV-01` proved this shape
for raw `process.env` access; `BND-01` proved it for import-boundary
violations. A future Task 07 logging control (`T07-D02`-gated, so not built
now) should be a third instance of the same pattern — a
`src/lib/security-policy/communication-logging.ts` detector scanning call
sites for the field shapes Part 5 names — rather than a bespoke mechanism.
This is a design recommendation for whoever picks up Task 07's runnable
implementation, not a claim that such a detector exists today.

# Part 7 — What this document does not do

- It does not implement a logging library, a redaction filter, or a
  structured-logging wrapper. No such code exists in Task 07 yet.
- It does not decide log retention duration — that is
  `privacy-security-and-retention-plan.md` §3.2's logs row,
  `UNRESOLVED(T07-D47)`.
- It does not weaken or duplicate the audit-event catalogue's rules; Contract
  26 already forbids PHI in audit events by construction, and this document
  governs a structurally different, less-trusted surface (ordinary
  application logs) where no such contract exists to rely on.
- It does not approve enabling any analytics, session-replay, open-tracking,
  or link-tracking capability — those remain disabled by default per the
  outbox state machine (I-09) and `AGENTS.md`'s general prohibition.

# Part 8 — Unresolved decisions

| ID | Decision | Blocks |
|---|---|---|
| T07-D02 | Task 07 scope, owners, expiry, kill switch, Task 11 Checkpoint 1 (existing, reused) | All runnable code, including every test in Part 5 |
| T07-D47 | Log/trace/metric retention window (existing, reused from the retention plan) | Part 5 test evidence retention once tests exist |
| T07-D49 | Whether the future logging detector (Part 6) is a new Task 11 `security-policy` CI job or a Task 07-owned check | Implementation ownership, not design |

## Workstream J (part 3) acceptance check

- Every application-log, metric, trace, breadcrumb, alert, and support-event
  category the brief's "Application logs and telemetry" section names has an
  explicit allow/deny rule.
- The forbidden-data list consolidates every scattered "must never appear in
  logs" instruction from the rest of the Task 07 document set into one
  place, cross-referenced rather than duplicated in meaning.
- Metrics are given their own section because label cardinality is a
  distinct leakage vector from log-line content, and the brief calls it out
  separately.
- The AI-routing prohibition is elevated to an architecture-test requirement
  (forbidden import path), matching how Task 11's BND-01 already enforces a
  structurally identical rule for the production/sandbox boundary — this is
  a design decision this document is entitled to make, since "how do we
  prove no AI import exists" is an engineering method, not a policy value.
- No log format, redaction library, retention duration, or runtime code was
  invented or implemented.

## Current disposition

**Workstream J, part 3 — logging and leakage control: complete as design
documentation.**

- **PHI leakage tests (application-log dimension):** PASS as documentation;
  BLOCKED on T07-D02 for any test to actually run, since no Task 07 code
  exists to scan.
- **AI urgency classification:** DISABLED by design, and Part 5 specifies the
  architecture test that will keep it disabled once code exists — matching
  the brief's own status vocabulary (`DISABLED | FAIL`, not `PASS`, until
  that test is actually running).
- **Real PHI, log infrastructure, or runtime effect:** NO.

## Workstream J — overall disposition

With this document, Workstream J is **complete as design documentation**,
matching Workstreams A–I. All three Workstream J deliverables —
[`privacy-security-and-retention-plan.md`](privacy-security-and-retention-plan.md),
[`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md),
and this document — add no schema, endpoint, worker, provider, credential,
recipient, PHI, or network effect, per the same discipline every prior
workstream held to.

The next safe repository slice is **Workstream K — accessibility, language,
and user experience** — as documentation, following the identical pattern.
Runnable synthetic implementation for any workstream remains **BLOCKED**
pending `T07-D02` (Task 07 scope approval and Task 11 Checkpoint 1). Pilot
and production remain separately blocked by all applicable G1–G6 decisions
named across the full Workstream A–J document set.
