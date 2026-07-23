# Documentation index

Use this page to find the current source instead of searching historical prompts.

## Read first

1. [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) — current architecture, workflows, security, and migration state.
2. [`COMPLETED_WORK.md`](COMPLETED_WORK.md) — implemented and verified capabilities.
3. [`NEXT_STEPS.md`](NEXT_STEPS.md) — prioritized remaining work and go-live blockers.
4. [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) — decisions that require a pharmacist, ODB, or product lead.
5. [`SELF_CHECK.md`](SELF_CHECK.md) — approved boundaries and production gate
   for the public `/check` feature.

## Safety and compliance

- [`COMPLIANCE.md`](COMPLIANCE.md) maps implemented and missing controls to the Executive Officer Notice.
- [`regulatory/`](regulatory/) contains the binding Ministry source document.
- [`PRODUCT_PRINCIPLES.md`](PRODUCT_PRINCIPLES.md) explains the product's safety posture and non-negotiable invariants.
- [`../AGENTS.md`](../AGENTS.md) is the single canonical instruction document for AI agents.

Never copy the PIN table or clinical rules into another document. Billing values belong in the versioned reference source and seeded tables; clinical rules remain subject to pharmacist review.

## Historical material

[`archive/`](archive/) contains superseded implementation prompts and planning notes. They are retained for provenance only and must not be used as current architecture or compliance guidance.
