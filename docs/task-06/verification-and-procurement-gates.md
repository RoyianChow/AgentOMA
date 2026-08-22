# Task 06 — Verification and Procurement Gates

This is the ordered gate sequence a real vendor must pass before any production connection —
none of these gates are granted by this task. It exists so that "we chose a vendor" is never
mistaken for "we are allowed to connect to it."

## Gate sequence

| Gate | What it proves | Evidence required | Authority |
|---|---|---|---|
| **G-V1: Shortlist** | Candidate is Ontario Health-verified for the required modality | Current listing on Ontario Health's Verified Solutions page, dated | Task 06 implementer / product |
| **G-V2: Vendor evidence request** | Candidate has provided real (not marketing) evidence | Current PIA/TRA summary or SOC 2 report, subprocessor list, data-residency statement, identity-integration technical docs | Named procurement owner (not this task) |
| **G-V3: Identity-integration feasibility** | The vendor's session model can be pinned to an AgentOMA-issued, server-verified identity — never the vendor's own login as the authorization boundary | Vendor technical documentation + a written design review | Security/privacy reviewer |
| **G-V4: Privacy/security review** | Encryption, recording defaults, AI/training defaults, support access, and incident-notification terms meet this task's non-negotiable invariants (§"Non-negotiable invariants": no recording, no transcription, no AI summaries, PHI never in provider tags/metadata) | Written review against the threat model (Workstream C) | Security/privacy reviewer |
| **G-V5: Accessibility review** | Vendor's client meets AODA/WCAG 2.1 AA in practice, not just Ontario Health's general accessibility guidance | Accessibility testing evidence (independent of vendor claims) | Accessibility reviewer |
| **G-V6: Contract and legal terms** | Data ownership, deletion, incident notification, audit rights, and termination/data-return terms are acceptable | Signed or draft contract review | Legal / product lead |
| **G-V7: PIA/TRA for the AgentOMA+vendor pairing** | The combined system (not just the vendor in isolation) has a privacy impact assessment and threat/risk assessment | PIA/TRA documents specific to this integration | Privacy officer / security lead |
| **G-V8: Task 05 readiness** | A real (non-synthetic) patient identity exists for the vendor session to bind to | Task 05 reaches at least `NON_PRODUCTION_INTEGRATION` per its own release-stage model | Task 05 owner |
| **G-V9: Task 11 release gate** | The capability has an owner, risk tier, evidence bundle, kill switch, and rollback plan registered in the release-control plane | Task 11 evidence manifest, `ALLOW` decision | Task 11 / release authority |
| **G-V10: Professional sign-off** | A practising Ontario pharmacist has validated the workflow against real counter conditions | Clinical/operational validation plan (this task's final deliverable) with pharmacist sign-off | Pilot pharmacist |
| **G-V11: Cross-jurisdictional decision** | Explicit policy for what happens if a patient's confirmed location is outside Ontario — allowed, blocked, or narrowly permitted | Separate, dedicated cross-jurisdictional review — not created by this task | Product/compliance + OCP guidance |

## What "PASS" on this task does NOT satisfy

Per the task's own acceptance criteria: a synthetic-prototype `PASS` proves the architecture
and controls are sound in isolation. It does **not** satisfy G-V2 through G-V11 above — every
one of those requires evidence this task is explicitly not authorized to produce (vendor
contact, contracts, PIA/TRA, Task 05's actual completion, pharmacist review of a real
workflow).

## Order matters

G-V1–G-V2 (shortlist + evidence request) can start in parallel with this task's synthetic
prototype work. **G-V3 onward cannot meaningfully start until Task 05 exists** (G-V8) — there
is no patient identity to design an integration against yet. Attempting G-V3–G-V7 before Task
05 reaches a stable contract risks having to redo the vendor-integration design once real
patient identity shapes exist.
