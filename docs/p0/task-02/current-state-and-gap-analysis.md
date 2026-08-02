# Task 02 current-state and gap analysis

**Recorded:** 2026-08-02  
**Baseline source commit:** `76098acad4afee5e80aa0dc71074d7ec97e14cf3`  
**Branch:** `feat/moh-compliance-migration`  
**Assessment:** safe ungated work can continue, but the production-readiness
claim is already false on two protected completion-path invariants.

## Repository state

The worktree was dirty before Task 02 began. The pre-existing changes are
`docs/tasks/autonomous-pharmacy/TASK-11-quality-security-release.md` and the
untracked `docs/task-11/` tree. They belong to the parallel Task 11 developer
and are excluded from Task 02 edits and commits.

The applicable instruction file is `AGENTS.md`. It prohibits changes to
triage/red flags, reference PIN data, existing migrations, `deriveClaimDraft`,
and audit-log semantics without explicit lead approval. Task 02 further marks
the assessment completion path, auth/tenant boundary, orientation behavior,
and migrations as protected. This work therefore changes only documentation,
local-only test safeguards, and the expressly permitted Workstream F export
projection.

| Fact | Discovered value |
|---|---|
| Package manager | npm 11.16.0 |
| Runtime | Node v24.18.0 on Windows PowerShell |
| Framework | Next.js 16.2.10 (`src/proxy.ts`, not middleware) |
| Database/query layer | Supabase PostgreSQL in Canada; Drizzle ORM + postgres.js |
| Test runner | Vitest 4.1.10; pure suite plus destructive local-PostgreSQL suite |
| Migration workflow | `npm run db:generate` → SQL review → `npm run db:migrate`; `db:push` is banned |
| Migration implementation | `drizzle-kit migrate` using `drizzle.config.ts` and `DIRECT_URL` |
| Migration head | `0018_clever_mister_fear` |
| Predecessor | `0017_tense_pandemic` |
| Migration bytes | `src/lib/db/migrations/0018_clever_mister_fear.sql` |
| Migration SHA-256 | `33bcf5ab4aa289c17100fb59af1c9527204303e54b5f7d47dcdf5a2424a07a1c` |
| Ordered chain digest | `ac7202c197b876b143b7b83ec04cbe65f6b5116f53674ff95bf73e05aaade4bb` |

The digest covers all 19 SQL files sorted by filename. For each file the input
record is its repository-relative POSIX path, LF, then lowercase file SHA-256;
records are joined by LF, one final LF is appended, and the UTF-8 payload is
SHA-256 hashed. The machine-readable baseline is
`artifacts/p0/task-02/baseline.json`.

## Service and data-flow map

The configured runtime connection is expected to authenticate as the
non-owner `agentoma_app` role; application code does not issue `SET ROLE`.
Consequently, the actual live connection role is an operational configuration
fact that still needs catalog verification.

| Step | Current source and authority | Transaction/failure/audit behavior | Existing proof and gap |
|---|---|---|---|
| Pharmacist request | `src/lib/auth-guard.ts` revalidates better-auth session, TOTP, role, configured pharmacy. `src/proxy.ts` is UX only. | Per-request server check; client role/pharmacy is ignored. | Auth tests exist; live revocation and Task 02 release evidence are not current. |
| Tenant/patient resolution | `createAssessment()` in `src/app/(dashboard)/pharmacist/actions.ts`; actor pharmacy comes from `PHARMACY_ID`, patient query scopes to it. | Refuses before completion when patient is absent/foreign. | DB tests exist but 0018 has not been rerun from zero. |
| Assessment authorization | Same action; allowed role, supervising pharmacist, profile and orientation facts are server-loaded. | Runs before the completion transaction. | **Defect:** admin orientation override is currently enabled without G3. |
| Red-flag path | Public intake uses approved `src/config/triage.ts`; terminal exits use the separate `triage_exit` path. `deriveClaimDraft` has a defensive refusal. | Red-flag exits should never call completion or insert evidence/claim rows. | Existing tests record zero-row behavior; gated fresh-0018 proof is not run. |
| Completion and billability | `createAssessment()` validates the boundary, loads effective reference rows, then calls the injected-reference pure `deriveClaimDraft`. | Core assessment/evidence/claim/follow-up work is inside `db.transaction()`. | Reference-derived behavior is tested; protected derivation was not changed. |
| Evidence insertion | `createAssessment()` inserts `assessment_billability_evidence` after the assessment inside the same transaction. | One-to-one row; a failing insert rolls back transaction work. | Static path exists. Runtime trigger/role/concurrency proof requires G1-D. |
| Claim draft | Same transaction inserts only when derivation returns billable. | No default PIN; non-billable cases insert no claim. | Existing tests exist; no Task 02 Docker run yet. |
| Follow-up audit | `writeAuditWith(tx)` records `follow_up.created` inside the transaction when a plan is created. | Required write failure rolls back that branch. | Existing DB tests; not rerun at 0018. |
| Assessment audit | `writeAudit()` at actions lines 1055–1081 runs **after** the transaction and catches failure. Orientation override audit is also post-commit/best-effort. | Assessment/evidence/claim can commit without their required assessment-created audit event. | **Protected code defect; T02-13 fails.** |
| PDF/retrieval | `queryAuditRecordById()` rechecks actor pharmacy and server-renders `RecordDetail`; the PDF route rechecks session. | Reads the persisted active claim and immutable evidence; does not derive billing. | Task 02 adds evidence projection. Real-DB linkage and authorization tests remain gated. |
| Complete export | `collectPatientRecord()` and `assemblePatientExport()` are admin-only through the route and pharmacy-pinned. | Manifest insertion and `record.exported` audit are one transaction. | Task 02 adds evidence and schema version 3. Real-DB tests remain gated. |
| Manifest hashing | `src/lib/governance.ts` canonicalizes object keys and SHA-256 hashes artifacts and the bundle. | Bundle includes generation time plus prior manifests/audits. | Specific exports are hashable, but repeat-export determinism is not an established contract; stop S27. |
| Restore/reconstruction | Governance records restore-drill metadata; `docs/RESTORE_DRILL.md` defines operator checks. | No automated stored-bundle retrieval/reconstruction verifier was found. | T02-23 is not proven; do not claim restore tamper validation. |

## Relevant database-object inventory (static)

| Area | Objects and controls | Static conclusion |
|---|---|---|
| Completion evidence | `assessment_billability_evidence`, UUID PK, one row per assessment, evidence version/checks, identity/history/gate snapshots | Additive 0018 object; no backfill or DML |
| Tenant linkage | Composite FK `(assessment_id, pharmacy_id)` to unique assessment `(id, pharmacy_id)` plus pharmacy FK | Cross-pharmacy evidence/assessment pairing is structurally denied; runtime proof required |
| Actor linkage | Viewer/verifying pharmacist FKs to `user.id` | No cascade; user deletion behavior requires runtime/operational proof |
| Immutability | `assessment_billability_evidence_no_mutate` calling `assessment_billability_evidence_immutable()` | UPDATE/DELETE denied except controlled parent cascade with transaction-local destruction marker |
| App privileges | 0011 grants future-table CRUD by default; 0018 revokes evidence UPDATE/DELETE from `agentoma_app` | SELECT/INSERT retained; owner can bypass and must not be the runtime role |
| Audit | `audit_log_no_mutate` and app-role UPDATE/DELETE revoke predate 0018 | Static files exist; live grants and trigger state need verification |
| RLS | 0018 creates no RLS policy and does not enable/force RLS | Server tenancy + composite FKs are the current boundary; runtime role must be verified |
| Migration history | `drizzle.__drizzle_migrations`; journal registers 0018 after 0017 | Repository ordering is consistent; Docker/live history is unverified |
| References | `odb_fee_tier`, `ailment_group`, `pin`, `claim_rule` | Export code does not read or recompute billing values |
| Deletes | Evidence cascades from assessment only; controlled governance destruction sets `agentoma.authorized_destruction=on` | Direct app DELETE remains revoked; owner behavior is deliberately privileged |

No live row contents were read. The last repository handoff says live Supabase
was at 0017, but this run did not have authority to treat that historical note
as a current live preflight.

## Gap register

| ID | Classification | Severity / invariant | Evidence | Owner and safe next action | Task 02 may fix? |
|---|---|---|---|---|---|
| GAP-01 | PROTECTED_CODE_DEFECT | Critical; completion/evidence/claim/audit failure atomicity | `actions.ts:1049–1081` commits first and catches audit failure | Completion/audit owner: separate approved remediation must move required audit into the transaction and add fault injection | **No** |
| GAP-02 | PROTECTED_CODE_DEFECT + POLICY_DECISION_REQUIRED | Critical; orientation must remain a hard gate while G3 is blocked | `actions.ts:538–566`; DB tests explicitly allow admin override | Product/compliance must decide G3, then a separately approved change removes or constrains the override | **No** |
| GAP-03 | PRODUCTION_RELEASE_BLOCKER | Critical; 0018 replay/live parity unknown | G1-D/G1-L absent; Docker daemon unavailable | Migration owner obtains exact gates and executes the runbook | Only after gates |
| GAP-04 | EXPORT_IMPLEMENTATION_ALLOWED | High; defensible retrieval omitted evidence at baseline | Governance export, audit detail and PDF had no evidence projection | Addressed by bounded Workstream F code; verify under G1-D | **Yes; implemented** |
| GAP-05 | TEST_MISSING / BLOCKED(S27) | High; deterministic manifest semantics | Bundle hashes generation time and a history changed by each export | Governance owner approves a canonical repeat-export contract before any hash redesign | No silent contract change |
| GAP-06 | TEST_MISSING | High; restore/retrieval tamper proof | No automated reconstruction verifier found | Governance owner defines and approves stored-artifact retrieval contract | Not while S27 unresolved |
| GAP-07 | ENVIRONMENT_OR_ACCESS_BLOCKER | High; real PostgreSQL evidence | Docker CLI exists, daemon connection fails; G1-D absent | Start Docker Desktop, freeze a clean candidate commit, obtain G1-D | After gate only |
| GAP-08 | PRODUCTION_RELEASE_BLOCKER | Critical; live application/recovery/parity | No G1-L, project ref, change window, recovery owner or restorability evidence | Deployment authority supplies exact approval and recovery package after Docker gates pass | No current authority |
| GAP-09 | PRODUCTION_RELEASE_BLOCKER | High; independent promotion review | No Task 02-specific Task 11 review record exists | Parallel Task 11 owner registers/reviews the frozen Task 02 evidence | No self-approval |
| GAP-10 | ENVIRONMENT_OR_ACCESS_BLOCKER | High; runtime least privilege | Code uses the connection role and does not issue `SET ROLE` | Verify configured live runtime role is non-owner `agentoma_app` using catalog-only evidence | Read-only after authority |
| GAP-11 | TEST_MISSING | Medium; local destructive-test isolation | Baseline Docker port was all-interface and guard accepted any localhost DB | Addressed: loopback binding and exact endpoint guard with pure negative tests | **Yes; implemented** |

## Current conclusion

Task 02 cannot be reported PASS or merely BLOCKED: T02-13 and T02-18 are
proven false in protected production code. The safe Task 02 result is **FAIL**
with Docker/live phases **NOT RUN**. That result does not authorize an in-flight
fix; it creates two explicit follow-up changes for lead approval.
