# Task 07 — Messaging and reminders

**Current phase:** Workstreams A–D complete; outbox and state-machine design is next

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
9. [`../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md`](../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md)

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

The next safe slice is documentation-only Workstream E: the transactional outbox
and orthogonal state machine. Runnable synthetic code still waits for a
versioned, expiring Task 07 scope, owner/reviewer metadata, risk/autonomy
registration, kill-switch authority, and Task 11 Checkpoint 1. Production
remains separately gated.
