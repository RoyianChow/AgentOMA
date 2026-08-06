# Task 07 — Messaging and reminders

**Current phase:** Workstream A complete; threat modelling is next

**Runtime implementation:** not started

**Synthetic code authority:** blocked pending Task 07 scope approval and Task 11 Checkpoint 1

**Real recipients, PHI, providers, or external effects:** not authorized

Start with:

1. [`current-state-and-gap-analysis.md`](current-state-and-gap-analysis.md)
2. [`communications-standards-and-policy-mapping.md`](communications-standards-and-policy-mapping.md)
3. [`production-dependency-register.md`](production-dependency-register.md)
4. [`../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md`](../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md)

Workstream A found no patient communications subsystem on `main`: there is no
integrated patient identity, verified contact/communication consent,
appointment event source, outbox/worker/provider, webhook, or secure thread.
The existing pharmacist follow-up workflow remains authoritative and sends no
notification.

The next safe slice is documentation-only Workstream B: threat model, trust
boundaries, and data flows. Runnable synthetic code waits for a versioned,
expiring Task 07 scope, owner/reviewer metadata, risk/autonomy registration,
kill-switch authority, and Task 11 Checkpoint 1. Production remains separately
gated.
