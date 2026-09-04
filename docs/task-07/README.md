# Task 07 — Messaging and reminders

**Current phase:** Workstreams A–L complete; the final validation plan and the Task 11 Checkpoint 1 submission are next

**Runtime implementation:** not started

**Synthetic code authority:** blocked pending Task 07 scope approval and Task 11 Checkpoint 1

**Real recipients, PHI, providers, or external effects:** not authorized

Start with:

1. [`current-state-and-gap-analysis.md`](current-state-and-gap-analysis.md)
2. [`communications-standards-and-policy-mapping.md`](communications-standards-and-policy-mapping.md)
3. [`production-dependency-register.md`](production-dependency-register.md)
4. [`communications-threat-model.md`](communications-threat-model.md)
5. [`trust-boundaries-and-data-flows.md`](trust-boundaries-and-data-flows.md)
6. [`communication-contracts-and-schema-proposal.md`](communication-contracts-and-schema-proposal.md)
7. [`consent-contact-and-preference-model.md`](consent-contact-and-preference-model.md)
8. [`suppression-and-contact-change-policy.md`](suppression-and-contact-change-policy.md)
9. [`outbox-and-delivery-state-machine.md`](outbox-and-delivery-state-machine.md)
10. [`minimal-payload-template-catalogue.md`](minimal-payload-template-catalogue.md)
11. [`provider-adapter-contract.md`](provider-adapter-contract.md)
12. [`webhook-and-reconciliation-design.md`](webhook-and-reconciliation-design.md)
13. [`vendor-review-scorecard.md`](vendor-review-scorecard.md)
14. [`secure-portal-messaging-contract.md`](secure-portal-messaging-contract.md)
15. [`reply-and-review-queue-design.md`](reply-and-review-queue-design.md)
16. [`secure-message-authorization-matrix.md`](secure-message-authorization-matrix.md)
17. [`appointment-follow-up-and-task-06-integration.md`](appointment-follow-up-and-task-06-integration.md)
18. [`privacy-security-and-retention-plan.md`](privacy-security-and-retention-plan.md)
19. [`communication-audit-event-catalogue.md`](communication-audit-event-catalogue.md)
20. [`logging-and-leakage-control.md`](logging-and-leakage-control.md)
21. [`accessibility-language-and-responsive-design.md`](accessibility-language-and-responsive-design.md)
22. [`retry-opt-out-outage-and-reconciliation-runbook.md`](retry-opt-out-outage-and-reconciliation-runbook.md)
23. [`communications-incident-response.md`](communications-incident-response.md)
24. [`../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md`](../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md)

Workstream A found no patient communications subsystem on `main`: there is no
integrated patient identity, verified contact/communication consent,
appointment event source, outbox/worker/provider, webhook, or secure thread.
The existing pharmacist follow-up workflow remains authoritative and sends no
notification.

Workstream B now models all required actors, assets, threats, trust boundaries,
data classes, authority ownership, dispatch-time rechecks, provider/webhook
handling, secure-content isolation, audit/retention flows, and the synthetic
boundary. No risk is accepted and no runtime authority is granted by those
documents.

Workstream C now defines all 26 requested server-only contracts, field-level
provenance/classification/authorization/encryption/retention metadata, a
conceptual relational model, database constraints, transaction boundaries,
least-privilege capabilities, and dispatch-time authority resolution. It adds no
schema, migration, code, provider, credential, recipient, PHI, or network effect.

Workstream D now defines the behaviour over those contracts: the exact consent
tuple and state machine, the four dispatch rechecks, withdrawal and its
cancellation cascade, contact-verification and challenge handling with
anti-enumeration, quiet-hours/timezone evaluation including DST determinism,
language and accessibility preference rules, the eleven-reason suppression
catalogue with most-restrictive-wins precedence, unsuppression authority, and
the contact-change, shared/recycled-destination, and wrong-recipient contract.
No policy value, wording, threshold, duration, or keyword list was selected;
unresolved decisions carry a named owner and a fail-closed safety floor.

Workstream E now defines the transactional outbox and the state machine over it:
four orthogonal axes (intent, dispatch, delivery, reconciliation) with legal
combinations and a truthful presentation mapping, a full transition catalogue,
server-derived idempotency enforced by database uniqueness, atomic leasing,
race determinism for every window including the two irreducible ones, webhook
idempotency and monotonic projection, scheduling that expires rather than
flushing a backlog, and the eleven required invariants with their enforcing
mechanism. It states the guarantee honestly — duplicate resistance with a named
residual window, never exactly-once delivery.

Workstream F now defines the template registry: immutable versioned families
with separated author/reviewer/publisher roles, the nine required template
classes with their blocking producer dependencies, closed and typed placeholder
allowlists rejected at both publication and render, server-side per-channel
rendering with pre-dispatch length limits, a generic scanner-safe URL carrying
no identifier or parameter, one review boundary covering subjects/preheaders/
sender names/push fields/provider tags, and the forbidden-data list with its
deterministic leakage tests. It approves no template and writes no production
copy. Two things are surfaced rather than settled: the brief's sample strings
say **AgentRx** while the product is **AgentOMA**, so brand is an unresolved
slot; and the contact-verification template is the one external payload that
deliberately carries a secret, so it carries its own rules.

Workstream G now defines the provider boundary: six adapter operations with
closed inputs and safe-code outputs, a capability declaration that makes an
adapter's limits enforceable (without idempotency support, retry after an
unknown outcome is denied entirely), the eighteen deterministic synthetic
outcomes mapped onto dispatch/delivery/reconciliation state, a four-item
outbound payload allowlist with tracking and enrichment off by default, an
ordered webhook pipeline where nothing is parsed before it is authenticated, a
monotonic projection that never regresses, and a reconciliation workflow in
which `RECONCILED_UNRESOLVED` stays a legitimate final answer. The vendor
scorecard is an empty instrument: no provider is selected, contacted, or
assessed, and its non-waivable rows have no exception path.

Workstream H now defines the one PHI-capable surface in Task 07 — treated as a
professional communication modality, not consumer chat. Thirteen eligibility
checks (nine of which depend on contracts absent from `main`), thirteen thread
states with sixteen documented transitions, patient-facing rules that forbid
typing indicators, presence, and response countdowns absent an operating model
that supports them, queue routing from trusted structural signals with AI/NLP/
keyword/sentiment routing denied by architecture test, inbound free text either
contained as PHI or disabled, and a full actor × action authorization matrix in
which technicians, administrators, and technical support cannot read message
content and only a pharmacist may mark messaging unsuitable or export to the
clinical record. The prototype the brief also names is **NOT BUILT**.

Workstream H additionally surfaces a scope question for the lead: `AGENTS.md`
invariant 2 (zero-PHI intake) predates authenticated **patient-side** surfaces,
and this workstream introduces one by design. The public intake and self-check
are unchanged; the rescoping decision is the lead's.

Workstream I now defines the producer boundaries. Task 07 is strictly a
consumer: it reads committed, versioned source events and never creates,
confirms, cancels, completes, or closes anything in the producing domain.
Appointment purpose is excluded structurally rather than filtered, no inbound
path can confirm or alter an appointment, the production follow-up notification
feature stays disabled by remaining unbuilt (verified against the repository,
not assumed), and **reminder delivery is never evidence that follow-up
occurred** — the professional duty is discharged by contact and documentation,
not by a message leaving a queue. Every prohibition is enforced by absent
database grants rather than by convention.

Workstream J now closes the privacy, security, audit, and retention design in
three parts. The audit-event catalogue enumerates every `SafeCode<CommunicationAuditType>`
value the brief requires, grouped by domain, with a per-type statement of what
Contract 26 permits it to carry — no new field, no new table. The privacy,
security, and retention plan gathers the controls already structurally
enforced by Workstreams C–I into one inventory, names the controls that still
need a policy or infrastructure decision, and produces the full dataset-level
retention table the brief requires — with every period left `UNRESOLVED(T07-D27)`
rather than invented, and secure-message content specifically flagged as
needing professional review before any retention or deletion behaviour is
activated, since that content may form part of the clinical record. The
logging and leakage control document draws the line between the audit trail
(designed to carry safe references) and application logs, metrics, and traces
(designed to carry nothing patient- or communication-specific at all), states
the same deny-list once instead of scattering it across four documents, and
recommends that a future logging control follow Task 11's existing AST-based
detector pattern (`PRV-01`, `BND-01`) rather than a runtime redaction filter —
including elevating the "no AI urgency classification" rule to a forbidden-
import architecture test, the same mechanism that already enforces the
production/sandbox boundary.

Workstream K now specifies every patient and staff control surface the brief
requires, each traced to the contract it renders rather than inventing new
authorization behaviour, plus the full accessibility requirement set (375px
through 400% zoom, keyboard, screen-reader, reduced motion, colour
independence, 56px targets, long-label and Bangla-script rendering) as its
own numbered subsection. It calls out one interaction risk explicitly: a
preference control that doesn't immediately show its consent is missing
would visually imply a capability the account doesn't have, even though the
backend already refuses to use it — so the preference and consent controls
must be shown together. Bangla-script rendering is required in synthetic
accessibility tests and is explicitly not treated as approval to use Bangla
in any production Ontario workflow. No visual design, component library, or
copy is approved; seventeen planned evidence items are named but none has
run, since no interface exists yet.

Workstream L now closes the operational-runbook design in two parts. The
retry/opt-out/outage/reconciliation runbook sequences six required scenarios
(opt-out, wrong number/recipient, bounce/complaint/failure, provider
timeout/uncertain send, provider outage, secure-message response delay) into
step-by-step procedures, each step citing the existing contract or state
transition it applies rather than inventing new behaviour — the
wrong-recipient procedure repeats, at the exact step an operator might
otherwise treat suppression as case-closed, that the software does not
decide reportability; the outage procedure repeats the state machine's
"recovery is not permission" rule against a backlog flush. The incident
response document names every phase from detection through post-incident
review, cross-references the threat model rather than re-deriving it, and
states the brief's central rule — the application never decides that an
event is a legally reportable privacy breach — at the phase (scope
assessment) where violating it by omission is easiest. Neither document
names a specific role, threshold, or deadline; both attribute every such gap
to its existing `T07-Dxx` owner.

Every Task 07 workstream the brief requires as documentation (A through L)
is now complete. The next safe slice is the brief's final deliverable: the
clinical, privacy, accessibility, and operational validation plan — which
this repository can draft, though the reviews it calls for (practising
Ontario pharmacists, privacy, security, accessibility, and operations
owners) remain the lead's to arrange. After that, the accumulated design is
ready for the Task 11 Checkpoint 1 submission itself: the brief's
fifteen-item test-plan review (bounded purpose, capability split, risk tier,
autonomy level, actors/scope, authoritative systems, data
classification/flow, external effects, threat model, controls/evidence
profile, test matrix, synthetic fixture plan, accessibility plan,
failure/rollback/reconciliation plan, feature gate/kill switch, stop
conditions) that Task 11 itself requires before any implementation begins.
Runnable synthetic code still waits for a versioned, expiring Task 07 scope,
owner/reviewer metadata, risk/autonomy registration, kill-switch authority,
and that Checkpoint 1 review. Production remains separately gated.
