# Task 06 — Virtual-Care Incident Response

This is a design for the synthetic prototype's incident-handling *shape* — it is not a live
runbook (no production vendor, no real incidents possible yet), and **the application never
automatically makes the legal determination that an event is a reportable privacy breach.**
That determination is always a named human decision.

## The 13-step model

| Step | What happens | Who decides | What the system does automatically |
|---|---|---|---|
| 1. Detection | A suspicious pattern is flagged: repeated join denials, an unauthorized-participant attempt, a webhook signature failure, an unexpected state transition | System flags; human confirms | Raises a `suspicious_join_activity`-class audit event (audit catalogue) — never auto-escalates beyond logging the fact |
| 2. Immediate denial or containment | The specific request/session is denied | System (the existing guard architecture, Workstream J) | This is not a *new* incident-response capability — it's the same deny-by-default guard behavior that already runs on every request. Incident response starts from "the guard already said no," not from a separate detection layer bolted on after the fact |
| 3. Participant removal | An admitted-but-now-suspect participant is removed | Pharmacist or authorized security role | `ParticipantAuthorization.state = removed`, immediate effect (Workstream F) |
| 4. Session and credential revocation | The affected session(s) are invalidated server-side | Authorized role | Revocation checked on the very next server action — no reliance on client logout (same pattern as every other revocation check in this task) |
| 5. Vendor-session termination | If a vendor session exists, it's torn down | System, on authorized trigger | `VendorSessionReference` cleanup (Workstream D/F) — same teardown path as ordinary visit-end, just triggered by an incident instead of a normal completion |
| 6. Webhook disablement where necessary | A compromised or misbehaving webhook source is blocked | Security/operations | Not built in this task (no real webhook receiver exists yet) — documented as a requirement for whenever Workstream B's vendor adapter becomes real |
| 7. Evidence preservation | Relevant audit events, safe-only, are retained beyond normal rotation | Security | Audit events are already append-only/immutable (audit catalogue) — "preservation" here means flagging the relevant window for a legal hold, not a new capture mechanism |
| 8. Scope assessment | Which visits/threads/participants were actually affected | Security/privacy reviewer | Human judgment over the audit trail — the system provides the trail, not the conclusion |
| 9. Privacy and security escalation | Formal internal escalation | Named privacy/security roles | Outside this task's scope to build tooling for — organizational process |
| 10. Vendor escalation | If a vendor is implicated | Product/security, per the vendor's contracted incident-notification terms (Workstream B gate G-V6) | N/A until a vendor exists |
| 11. Patient-notification decision | Whether/how affected patients are told | **Always a named human decision, never automated** | The system explicitly does not decide this — matches the task's own instruction almost verbatim |
| 12. Recovery | Restoring normal operation | Security/operations | Verify the specific guard/control that failed is now correct, not just that the symptom went away |
| 13. Post-incident review | What changed as a result | Security/privacy/product | Feeds back into the threat model (Workstream C) — a real incident is exactly the kind of new information that should update it |

## The one rule that governs all 13 steps

**No step in this list, and no combination of them, may cause the application to itself
conclude "this was a reportable privacy breach."** That conclusion has legal consequences this
task is explicitly not authorized to approximate (matches the task's own instruction and this
repo's general pattern of keeping regulatory/legal judgment calls out of application logic —
the same posture already taken toward LTC billing and orientation-override decisions in Task
02's decision notes).

## What's different about incident response here versus a generic app

Because every guard in this task (Workstream J) already fails closed and denies by default, a
large share of "incident response" is really just **the normal control architecture doing its
job** — step 2 above is not a special incident-mode behavior, it's what already happens on an
unauthorized request on an ordinary Tuesday. What this document adds on top of that baseline is
narrow: removal/revocation actions available to an authorized responder beyond what a single
pharmacist's normal controls cover (e.g., a security role terminating a session the assigned
pharmacist didn't initiate), and the evidence-preservation/escalation process around an incident
that's already been contained by the existing guards.

## Explicitly out of scope for this task

Building real alerting, a real on-call process, or a real vendor-notification integration — all
of that requires a real production system and a real vendor, neither of which exists yet
(Workstream B). This document defines the shape those things must eventually have.
