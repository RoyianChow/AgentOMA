# Task 06 — Current-State and Gap Analysis

**Baseline commit:** `12801c7211cb6ce3286d209762d61c11b6830193` (`main`, merge of PR #37)
**Branch:** `feat/task-06-virtual-care`
**Working tree at capture:** clean
**Prepared per:** `docs/tasks/autonomous-pharmacy/TASK-06-virtual-care.md` §"Required repository discovery"

This document records what exists today, not what Task 06 will build. It is read-only
discovery — no code changed to produce it.

---

## 1. Applicable instruction files

| File | Scope | Relevant constraint |
|---|---|---|
| `AGENTS.md` | Whole repo | Single-tenant invariant (`PHARMACY_ID` server-only, never client/QR/session-selected); migrations/`triage.ts`/reference PIN data/audit log require the lead's explicit sign-off; `npm run test` must exercise real Postgres |
| `docs/tasks/autonomous-pharmacy/README.md` | The 11-task program | Task 06 depends on Task 01 (sandbox) for any runnable prototype, and on Task 02/05/07/11 for production integration. No task may connect to production merely because its tests pass |
| `docs/PROJECT_OVERVIEW.md`, `docs/SESSION_HANDOFF.md`, `docs/NEXT_STEPS.md`, `docs/OPEN_QUESTIONS.md` | Live-system status | Read for orientation; see §11 |

No parent-scope `AGENTS.md` exists beyond the repo root.

---

## 2. Dependency task status (verified from repository evidence, not assumed)

| Task | Repo evidence found | Status for Task 06's purposes |
|---|---|---|
| **01 — Sandbox** | `docs/task-01/README.md`: G1 granted 2026-07-31 by Royian Chowdhury (product lead + security/privacy reviewer). Separate npm workspace `apps/experiment-sandbox/` exists with typed env, lifecycle gates, denied adapters, marked fixtures, tests. Evidence manifest is `BLOCKED` — SBX-17/18 evidence incomplete, "final reviewer sign-offs... recorded, but remaining controls still lack the complete red-run set and the repository-bound root database test evidence." | **Usable but not fully proven.** A runnable Task 06 prototype may be built inside `apps/experiment-sandbox/` (G1 covers this), but I cannot describe Task 01 itself as `PASS` — it is `READY` for building, with its own evidence gaps still open. |
| **02 — P0 production readiness** | Extensive: `docs/p0/task-02/{sql-review,threat-model,final-report,operational-runbook,release-readiness-checklist,ltc-decision-note,orientation-decision-note}.md`, migration `0018_clever_mister_fear.sql`, `src/lib/claims/derive-claim-draft.ts`, `assessment_billability_evidence` table. Task 02's own spec (§4.4) states: *"Task 06 virtual-care events cannot complete an assessment or create a claim."* | Assessment/claim boundary exists and is actively hardened by Task 02. Task 06 must integrate only through the existing `createAssessment`/`deriveClaimDraft` boundary in `pharmacist/actions.ts`, never bypass it. Reported as `NOT VERIFIED` in Task 06's own final report — I have not independently re-run Task 02's evidence. |
| **04 — Booking/waitlist** | Only `docs/task-04/decisions/synthetic-sandbox-scope-approval-2026-08-02.md` exists. **No appointment/booking code or schema anywhere in `src/`** (`grep -rl "appointment" src/lib/db/schema/*.ts` returns nothing). | Not started beyond a scope-approval decision. Task 06's `AppointmentReference` fields must be optional/nullable and cannot assume a real appointment model exists. |
| **05 — Patient identity/portal** | **No `docs/task-05/` directory exists at all.** No patient-facing session, account, or portal code anywhere in `src/`. The only "patient" the codebase currently models is `patient` (a PHI row owned and entered by the *pharmacist*, via `upsertPatient` in `pharmacist/actions.ts`) — there is no concept of a patient logging in. | **Zero real dependency to build on.** Task 06's identity/location/consent workstream (E) must define a fully synthetic patient-actor model from scratch, matching Task 05's *contract shape* (actor ≠ subject, opaque references, server-derived) but with no real integration possible. Report `Task 05 identity integration: BLOCKED` (not "NOT VERIFIED" — the dependency literally does not exist yet). |
| **07 — Messaging/reminders** | **No `docs/task-07/` directory exists at all.** No email/SMS/push/notification code, no outbox, no webhook receiver anywhere in `src/`. | Same as Task 05 — zero real dependency. Task 06's secure-messaging workstream (I) and external-notification stubs must be pure synthetic contracts. Report `Task 07 notifications: STUBBED`. |
| **11 — Quality/security/release** | `docs/task-11/current-state-and-gap-analysis.md` (dated, scoped explicitly as "the ungated first slice... not the full Task 11 specification"). CI workflow (`.github/workflows/ci.yml`) exists only on unmerged PR #31. No control catalogue, no evidence-manifest schema, no `release-gate` job yet. | Release-control plane is embryonic. Task 06 cannot claim any Task 11 gate as `PASSED`. Report `Task 11 security/release gate: NOT VERIFIED`. |

---

## 3. Existing patient, pharmacist, tenant, assessment, and claim relationships

- **Tenant model:** single-tenant by explicit, deliberate design. `pharmacy` table has a checked, unique `singleton_key = 1` constraint (added by a prior governance migration) — **a second pharmacy row cannot exist in the current schema.** `PHARMACY_ID` is a server-only configured value (`src/lib/pharmacy-config.ts`, `getConfiguredPharmacyId()`), never derived from the client, a query string, or a session claim.
- **Pharmacist identity:** `better-auth` (`src/lib/auth.ts`, `src/lib/auth-guard.ts`). `PortalUser` = `{ userId, pharmacyId, role, name, email, supervisingPharmacistId }`. Roles: `pharmacy_admin | pharmacist | intern | student | technician` (`userRole` enum, `src/lib/db/schema/auth.ts`). TOTP (`twoFactorEnabled`) is **mandatory** before any portal action succeeds — enforced inside `requirePortalUser()`, not just at the route level.
- **Patient identity:** **no patient session concept exists.** `patient` is a data row (name, DOB, health number, address) created by an authenticated pharmacist via `upsertPatient`, keyed to the pharmacist's own `pharmacyId`. There is no patient login, no patient-held credential, no patient-side actor type anywhere in the codebase.
- **Assessment/claim:** `assessment` table, `createAssessment` (`pharmacist/actions.ts`) inserts an assessment row + calls `deriveClaimDraft` (`src/lib/claims/derive-claim-draft.ts`) inside the same authorization boundary. `assessment_billability_evidence` is the immutable completion-evidence row (Task 02's subject). Completion is **exclusively pharmacist-actor-driven** — there is no code path today where a non-pharmacist event (webhook, timer, external system) can reach `createAssessment` or the claim-draft path.
- **Consent (existing, different concept than Task 06 needs):** migration `0012_clinical_record_and_consent.sql` adds `assessment.consent_method` (`verbal|written`), `consent_given_by` (`patient|substitute_decision_maker`), `consent_obtained_at` — this is **treatment consent**, captured once at assessment completion, by the pharmacist, as part of the clinical record. It is *not* modality/virtual-care consent and must not be conflated with it (matches the task's own non-negotiable invariant that virtual-care consent ≠ treatment consent).

## 4. Existing authentication and session boundaries

- Provider: `better-auth` (`src/lib/auth.ts`), Drizzle-adapter-backed, cookie-based session, 30-minute rolling idle expiry, mandatory TOTP.
- `src/proxy.ts` (Next 16's `middleware.ts` equivalent) performs **only** an optimistic cookie-presence redirect to `/sign-in` — it explicitly documents itself as *not* the authorization boundary. The real boundary is `requirePortalUser()`, called inside every server action, re-verifying session + TOTP + pharmacy + role server-side, every request.
- Cookie/session material is pharmacist-only. There is no second session namespace, audience, or cookie prefix for a different actor type — because no second actor type (patient) exists yet.
- CSRF: relies on Next.js server actions' built-in same-origin enforcement; no separate CSRF token scheme observed.

## 5. Existing real-time, notification, and vendor infrastructure

- **No WebSocket, SSE, or real-time push infrastructure anywhere in the repo** (`grep` for `WebSocket|EventSource|socket.io|pusher` across `src/` returns nothing).
- **No email/SMS/push adapter, no `src/lib/integrations/` directory.**
- **No video/voice/WebRTC/SIP/PSTN code or dependency in `package.json`.**
- The only external "vendor" surface is Supabase (Postgres + storage) and the self-check PDF generator (`jspdf`, fully client-side, no network call).

## 6. Existing logging, analytics, and audit behavior

- `audit_log` table: append-only at the database level (owner-role REVOKE + trigger, per `docs/PROJECT_OVERVIEW.md`/hardening SQL). `writeAudit`/`writeAuditWith` (`src/lib/audit.ts`) is the only write path.
- No third-party analytics, session-replay, or error-monitoring SDK found in `package.json` dependencies.
- `src/lib/phi-route-security.ts` defines `PHARMACIST_ROUTE_HEADERS`, applied in `next.config.ts` to `/pharmacist/:path*`: `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow, noarchive`, a same-origin CSP (`connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), and — **directly relevant to Task 06** — `Permissions-Policy: camera=(), microphone=(), geolocation=(), ...browsing-topics=(), payment=(), usb=()`. **Camera and microphone are explicitly denied on every current pharmacist route.**

## 7. Architectural conflict identified (per the task's required discovery step)

**The production `Permissions-Policy` header denies `camera` and `microphone` on all `/pharmacist/*` routes.** A video-visit prototype needs both. This is not a defect — it is a deliberate PHI-route hardening default from before virtual care existed — but it is a direct conflict with Task 06's video-modality requirement if the prototype were ever placed under `/pharmacist/*`.

**Resolution, not override:** the prototype belongs in `apps/experiment-sandbox/` (Task 01's boundary) regardless, which already ships its own independent `src/security/headers.ts` module. The sandbox can define its own `Permissions-Policy` permitting `camera=(self)`/`microphone=(self)` for its own synthetic routes only, **without touching** `PHARMACIST_ROUTE_HEADERS` or `next.config.ts`. No production file needs to change for the synthetic prototype to exist. Flagged here per the task's instruction to document rather than silently resolve.

## 8. Existing accessibility and mobile patterns

- 375px usability passes exist for other surfaces (`docs/worklogs/p1-7-usability-a11y-375px.md`, an earlier task in this repo) and for the self-check flow (`docs/p0/task-02` evidence references WCAG-relevant work). No virtual-care-specific accessibility pattern exists, since no virtual-care UI exists yet.
- Existing convention: 56px minimum tap targets on the patient-facing kiosk flow (`(intake)/assessment/TriageFlow.module.css`), inconsistently applied elsewhere (documented gap in the worklog above). Task 06's synthetic UI should follow the 56px convention from the start rather than repeat that gap.

## 9. Existing synthetic/test environment and conventions

- `apps/experiment-sandbox/` (Task 01) — the only place a Task 06 prototype may run code. Own `package.json`, `next.config.ts`, `vitest.config.ts`, typed env (`src/env/server.ts`), fixtures (`src/fixtures/synthetic.ts`), denied network adapters (`src/integrations/adapters.ts`), lifecycle state machine (`src/lifecycle/`), production-invariance verifier (`tools/verify-production-invariance.mjs`).
- Production-side test convention: Vitest, `*.db.test.ts` suffix for tests requiring real Postgres (Docker, `docker-compose.yml`, port 5433, `assertLocalTestDb` guard that fails hard against anything resembling the live Supabase project). `test:pure` runs the no-DB subset.
- No existing virtual-care, communications, or appointment abstraction of any kind in either the production tree or the sandbox — confirming the answer to repository-discovery item 11 (*"Determine whether the repository already contains a virtual-care, communications, or appointment abstraction"*): **it does not.**

## 10. Existing failure/retry and PHI-leakage conventions worth reusing

- `requirePortalUser()`'s pattern (re-verify session, TOTP, tenant, role — every single server action, never trust the client) is the direct model for Task 06's "recheck every guard on every protected transition" requirement.
- `assessment_billability_evidence`'s immutability pattern (DB-level constraint + REVOKE, not just application logic) is the direct model for Task 06's audit-immutability and "technical failure cannot complete an assessment" requirements.
- The single-tenant `singleton_key` constraint demonstrates this team's preference for **database-enforced** invariants over application-trusted ones — Task 06's state-machine and participant-authorization design should follow the same bias.

## 11. Gap register

| Gap | Classification | Owner | Notes |
|---|---|---|---|
| No Task 05 patient identity exists | `POLICY_DECISION_REQUIRED` (blocks production) / not a Task 06 defect | Task 05 owner | Task 06 can only define synthetic patient-actor contracts; production identity integration is fully gated on Task 05 shipping |
| No Task 07 messaging/notification infra exists | `POLICY_DECISION_REQUIRED` (blocks production) | Task 07 owner | Same — Task 06's external-notification and secure-messaging paths remain stubs |
| No Task 04 appointment model exists | `MISSING_CONTROL`, non-blocking for synthetic work | Task 04 owner | Task 06's `AppointmentReference` field must be optional |
| Task 01 evidence incomplete (`BLOCKED`) | `ENVIRONMENT_OR_ACCESS_BLOCKER` | Task 01 owner | Does not block *building* in the sandbox (G1 covers that); blocks calling the sandbox itself fully proven |
| Task 11 control plane is a first slice only | `MISSING_CONTROL` | Task 11 owner | Task 06 cannot claim a Task 11 release gate passed |
| Production `Permissions-Policy` denies camera/microphone on `/pharmacist/*` | Not a gap — documented design conflict, resolved by building in the sandbox instead | N/A | See §7 |
| No vendor (video/SMS/email) integration of any kind exists | Expected — out of scope for this task per its own "Not authorized now" list | N/A | Confirms Workstream B (build-vs-integrate) starts from a clean slate, no existing vendor lock-in to account for |

## 12. Unresolved questions for the named authorities (not decided here)

- Whether the eventual production identity model for Task 06 waits for Task 05 to fully ship, or whether a narrower interim patient-identity mechanism is acceptable for a virtual-care pilot specifically — this is a product/security decision, not inferred here.
- Whether `apps/experiment-sandbox/`'s current G1 scope (Task 01) is broad enough to cover a WebRTC-shaped synthetic prototype (peer connections, media permission prompts even in a stub) or whether that needs its own sandbox-scope decision, analogous to `docs/task-04/decisions/synthetic-sandbox-scope-approval-2026-08-02.md`. Flagging this explicitly for Royian before Workstream L (synthetic prototype) begins.

## 13. Addendum — 2026-08-06, after re-syncing with `main`

§2's dependency-status table was accurate as of the original baseline (`12801c7`) but `main`
has since advanced (`feat/task-06-virtual-care` merged forward to `063847c`, incorporating
`main` through `07385ba`). Two corrections, not silently edited into §2 above so the original
discovery record stays intact:

- **Task 04 (booking/waitlist) now has real runtime code on `main`** — booking infrastructure,
  public availability/creation/retrieval, a pharmacist queue (backend + UI), an expiry worker,
  and synthetic delegation fixtures (PR #42). §2's "no appointment/booking code... anywhere in
  `src/`" is now out of date. `VirtualVisit.appointmentRef` (Workstream D) remains nullable/
  optional in this task's design regardless — that was a defensive choice, not one that
  depended on Task 04 being unbuilt — but a deeper Task 04 integration is now *possible* in a
  way it wasn't at original discovery time. Not pursued in this task without a separate
  decision, since Task 06's own scope doesn't require it.
- **Task 07 (messaging) is now fully documented on `main`** (17 files under `docs/task-07/`,
  merged via PR #41), including `docs/task-07/appointment-follow-up-and-task-06-integration.md`
  — Task 07's own Workstream I, which defines *its* consumer relationship to Task 06 in detail:
  strict read-only consumption of suitability/consent, participant authorization rechecked
  before every message, no external receipt ever satisfies a Task 06 fact, and no Task 07 event
  may bypass a Task 06 gate. This is the authoritative source for Task 06's secure-messaging
  workstream (I, not yet written) rather than something this task needs to invent from scratch.
  Task 07's own document reports its Task 06 integration as `BLOCKED — no contract on main`
  (true at *its* baseline) — this task's Workstream D contracts (`SecureMessageThread`,
  `SecureMessage`) are the contract Task 07 is waiting on.

No other §2 entries changed: Task 05 still does not exist on `main`, Task 01/02/11 status is
unchanged from the original discovery.
