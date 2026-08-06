# Task 07 — Messaging and reminders

**Current phase:** Workstreams A–H complete; producer-integration design is next

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
17. [`../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md`](../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md)

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

The next safe slice is documentation-only Workstream I: appointment, follow-up,
and Task 06 integration boundaries. Runnable synthetic code still waits for a
versioned, expiring Task 07 scope, owner/reviewer metadata, risk/autonomy
registration, kill-switch authority, and Task 11 Checkpoint 1. Production
remains separately gated.
