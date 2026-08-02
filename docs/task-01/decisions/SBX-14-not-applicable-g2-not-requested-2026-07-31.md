# SBX-14 decision — not applicable

**Date:** 2026-07-31
**Control:** SBX-14 — Hosted access denial
**Decision:** `NOT_APPLICABLE`

SBX-14 is not applicable to the approved Task 01 package because G2 hosted-preview
approval was not requested and no hosted preview, hosted origin, tunnel, LAN listener,
or external access path exists. Task 01 is local loopback-only and synthetic-only.

Accordingly:

- `approval.g2` is `NOT_REQUESTED`.
- `hostedOrigin` is explicitly `null`.
- SBX-14 has no red or green execution evidence; both runs remain `NOT_RUN` with
  reason `G2_NOT_REQUESTED`.
- The evidence validator permits this state only for SBX-14 and only while both
  approval conditions remain true.

This decision does not authorize hosted access, production deployment, production data,
production credentials, live integrations, or a production-module import. If G2 is later
requested or a hosted origin is introduced, SBX-14 must be reopened and independently
tested before promotion.
