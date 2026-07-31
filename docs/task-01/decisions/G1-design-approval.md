# G1 design approval

**Task:** Task 01 — Enforce the Experimental Sandbox
**Design version:** 2026-07-31 proposed G1 package
**Status:** GRANTED — implementation authorized within the scope below

## Package under review

- [`../current-state-and-gap-analysis.md`](../current-state-and-gap-analysis.md)
- [`../experimental-sandbox-design.md`](../experimental-sandbox-design.md)
- [`../experimental-sandbox-threat-model.md`](../experimental-sandbox-threat-model.md)
- [`../experimental-sandbox-data-flow.md`](../experimental-sandbox-data-flow.md)

## Required decisions

Both required reviewers must explicitly approve the same design version.
Silence, earlier task approval, or a general “looks good” does not grant G1.

### Product lead

**Reviewer:** Royian Chowdhury
**Role:** Product Lead
**Decision:** G1 GRANTED
**UTC date/time:** 2026-07-31
**Verbatim decision:**

> I, Royian Chowdhury, acting as Product Lead, approve the 2026-07-31 Task 01 Experimental Sandbox G1 package, including the current-state analysis, sandbox design, trust boundaries, threat model, data-flow model, environment contract, hosting/network model, and planned repository changes.
>
> This approval authorizes implementation of the separately built, synthetic-only sandbox. It does not authorize production deployment, production data, production credentials, live integrations, hosted preview access, or production-module imports.

### Security/privacy reviewer

**Reviewer:** Royian Chowdhury
**Role:** Security/Privacy Reviewer
**Decision:** G1 GRANTED
**UTC date/time:** 2026-07-31
**Verbatim decision:**

> I, Royian Chowdhury, acting as Security/Privacy Reviewer, approve the 2026-07-31 Task 01 G1 package after review of its trust boundaries, data-flow controls, synthetic-data requirements, credential classification, network-denial requirements, lifecycle controls, artifact protections, and fail-closed security requirements.
>
> This approval does not grant G2 hosted-preview approval or G3 approval for any production-module import. The production-import allowlist remains empty.

## Decision scope

Approval must cover:

- the separate npm workspace/build and exact proposed root-file changes;
- local loopback-only origin and no initial database or hosted preview;
- the empty G3 production-import allowlist;
- typed environment validation and production-variable denial;
- server/browser egress denial;
- server-owned synthetic identity, fixtures, lifecycle state, kill switch, and
  contained teardown;
- persistent marking, response headers, and the non-operational sample
  artifact;
- red/green evidence, commit binding, and production-invariance normalization;
- the additive CI workflow location; and
- the required Node evidence version.

## Explicit exclusions

G1 does not approve:

- G2 hosted access;
- a G3 production import;
- production deployment or navigation;
- production data, users, sessions, credentials, or systems;
- real patient care or operational records;
- a database, object storage, vendor, recipient, model, analytics, or external
  destination;
- clinical, billing, authentication, migration, audit, retention, or production
  release changes; or
- any later autonomous-pharmacy capability.

## Agent action

Implementation is authorized only within the approved local-only scope. G2 is
not granted, G3 remains empty, production capability is not authorized, and no
production data, credentials, integrations, hosted preview, or production
module may be introduced.
