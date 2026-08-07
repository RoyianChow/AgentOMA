# Research context — not binding

Planning research, preserved for traceability. **Nothing in this directory is
authoritative.**

Do not confuse it with [`../regulatory/`](../regulatory/), which holds the
Ministry of Health Executive Officer Notice — the binding source of truth for
covered ailment groups, claim maximums, fees, PINs, and billing rules. Where
this directory and the EO Notice disagree, **the EO Notice wins**, per
`AGENTS.md`.

## `four-month-mvp-plan-ai-pharmacy-ontario.pdf`

| | |
|---|---|
| Origin | The `AgentRx-master` drop, deleted 2026-08-07 |
| Preserved | 2026-08-07, byte-identical (SHA-256 `f5cf5257df78…`) |
| Length | ~4,400 words |
| Status | Undated, unattributed research. Not reviewed, not approved, not verified against current sources. |

### Why this one was kept

Three task briefs — [`TASK-07`](../tasks/autonomous-pharmacy/TASK-07-messaging-and-reminders.md),
[`TASK-08`](../tasks/autonomous-pharmacy/TASK-08-fulfilment-and-delivery.md), and
[`TASK-10`](../tasks/autonomous-pharmacy/TASK-10-bounded-ai.md) — instruct the
reader to "use `deep-research-report.md` as project-planning context." **No such
file exists in this repository.**

This PDF is not confirmed to be that document; the phrasing the briefs quote does
not appear verbatim. But it is plainly the same research, and it carries the same
controlling thesis the briefs attribute to it:

> an AI-assisted pharmacy operations platform with pharmacist sign-off, not a
> fully autonomous public pharmacy

It was the only Ontario-grounded artifact in a 118-file drop that was otherwise
deleted: Ontario ×32, PHIPA ×8, PIPEDA ×3, PrescribeIT ×7, and HIPAA only once —
correctly scoped to "only if the product later serves U.S. covered entities."

### What it covers

- Ontario College of Pharmacists accreditation, including the 45-day pre-opening
  submission requirement and the rule that online pharmacy services must be run
  by an accredited bricks-and-mortar Ontario pharmacy
- Remote dispensing: Board-approved automated systems, the live two-way
  audiovisual link requirement, and restrictions on narcotics and controlled drugs
- PHIPA safeguards and Ontario's electronic audit-log obligations for custodians
- The PHIPA / PIPEDA / HIPAA jurisdictional split
- A scope argument for excluding controlled substances, injectables, compounding,
  and insurance adjudication from an initial build

### One time-sensitive claim worth acting on

The report states that **Canada Health Infoway's PrescribeIT operated service
concludes 2026-05-29**, and argues against hard-wiring to it. That date has now
passed. Anyone starting
[`TASK-09`](../tasks/autonomous-pharmacy/TASK-09-interoperability.md) should
reconfirm the current e-prescribing landscape against Infoway directly rather
than relying on this document.

### Before citing it for anything that matters

`TASK-10` is explicit that a research report is not legal, privacy, security,
accessibility, professional, procurement, or regulatory approval. Reconfirm every
requirement against current official sources, and record the source title,
authority, URL, version, access date, and jurisdiction. Treat this PDF as a
starting point for that work, never as the evidence itself.
