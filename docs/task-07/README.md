# Task 07 — Messaging and reminders

**Current phase:** Workstreams A and B complete; conceptual contracts are next

**Runtime implementation:** not started

**Synthetic code authority:** blocked pending Task 07 scope approval and Task 11 Checkpoint 1

**Real recipients, PHI, providers, or external effects:** not authorized

Start with:

1. [`current-state-and-gap-analysis.md`](current-state-and-gap-analysis.md)
2. [`communications-standards-and-policy-mapping.md`](communications-standards-and-policy-mapping.md)
3. [`production-dependency-register.md`](production-dependency-register.md)
4. [`communications-threat-model.md`](communications-threat-model.md)
5. [`trust-boundaries-and-data-flows.md`](trust-boundaries-and-data-flows.md)
6. [`../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md`](../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md)

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

The next safe slice is documentation-only Workstream C: conceptual server-only
domain contracts and a schema proposal, with no production migration. Runnable
synthetic code still waits for a versioned, expiring Task 07 scope,
owner/reviewer metadata, risk/autonomy registration, kill-switch authority, and
Task 11 Checkpoint 1. Production remains separately gated.
