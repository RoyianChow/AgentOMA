# Task 02 Workstream F — export and PDF verification

**Implementation status:** bounded code complete; unit and real-PostgreSQL
evidence/export checks PASS on candidate `dcaab91f9adba7457a85214d51d1614c8560f404`
**Hash-contract status:** BLOCKED(S27) for repeat-export determinism and
restore/reconstruction semantics

## Additive export contract

Complete-patient export schema version 3 adds
`record.billabilityEvidence: BillabilityEvidenceRecord[]`. Each immutable row
is serialized without inference or billing recomputation. Its three timestamp
fields become ISO-8601 strings; every other persisted field is copied exactly.
Missing evidence is an empty collection and produces no evidence artifact.

The manifest gains one `assessment_billability_evidence` artifact per present
row. The artifact uses the existing canonical JSON/SHA-256 implementation.
Task 02 did not change canonicalization, bundle-hash input, manifest ordering,
or old artifact-retention behavior.

The authorized assessment record query now loads at most one evidence row by
both assessment ID and actor pharmacy. The server component and server-side PDF
render identity inspection, claim-history signals/window, viewer attestation,
billability gates, and provenance. They state that platform history is advisory
and HNS adjudication determines payment. No PIN, fee, maximum, SSC or outcome
is recomputed from evidence.

## Authorization and leakage boundary

- Complete-patient JSON remains `pharmacy_admin` only through
  `requirePortalUser(["pharmacy_admin"])`; the patient ID is UUID-validated and
  the query pins to actor/configured pharmacy.
- Assessment record/PDF revalidate the live session, mandatory TOTP, active
  role and configured pharmacy server-side. `proxy.ts` remains UX only.
- PHI remains in server-rendered HTML or finished downloads; no new client
  component, browser storage, analytics, URL query, or payload log was added.
- Download filenames are now generic and contain neither patient/assessment ID
  nor service date.
- Responses use `Cache-Control: private, no-store`.
- A PDF audit-write failure is recorded through the existing payload-free
  failure mechanism rather than printing the record identifier or exception.

## Test-first evidence

The unit test was added before the serializer.

| Run | UTC | Exact command | Exit | Safe result |
|---|---|---|---:|---|
| Red | 2026-08-02T02:12:40.3941922Z–02:12:43.2080801Z | `npm run test:pure -- src/lib/__tests__/billability-evidence-export.test.ts` | 1 | Expected module-not-found for the not-yet-created serializer; no tests executed, no data/database involved |
| Initial green | 2026-08-02T02:13:54.6322664Z–02:13:56.8903090Z | same command | 0 | 1 file, 2 tests passed; exact-copy and null-preservation behavior |

The final pure run also covers the shared PDF/record display projection and
local database endpoint guard. Final command/totals are recorded in the Task
02 evidence index.

The exact-candidate database suite executed these cases successfully:

- authorized patient export includes and hashes the evidence row;
- missing evidence stays empty and creates no artifact;
- foreign-pharmacy actor is refused before a manifest is written; and
- the authenticated assessment detail returns the evidence linked to the
  persisted assessment.

The complete suite passed twice (20 files, 211 tests, zero skipped/focused).
This is PostgreSQL proof for the listed persisted/export cases, but it does not
resolve the S27 canonical-repeat or reconstruction contract.

## Unresolved required cases

| Requirement | Status | Reason/next action |
|---|---|---|
| Authorized PDF content | BLOCKED | Static/unit projection passes; dedicated byte/content test remains required |
| Authorized patient export | PASS | DB export includes and hashes persisted evidence |
| Missing evidence | PASS | Serializer/DB export keep the collection empty and create no artifact |
| Wrong assessment/patient/tenant | PASS | Foreign-pharmacy export refused before collection/write |
| Unauthorized/revoked session | PASS | Server boundary tests pass; no client authorization is trusted |
| Multiple-assessment linkage | NOT RUN | Requires a dedicated multi-assessment fixture |
| Exact artifact/hash coverage | PASS | Persisted evidence manifest hash assertion passed |
| Fixed-clock repeat export | BLOCKED(S27) | Each export includes generation metadata and prior manifest/audit history; no approved canonical-repeat contract exists |
| Tampered artifact/retrieval | BLOCKED(S27) | No approved persisted-bundle reconstruction verifier exists |
| Restore/reconstruction | BLOCKED(S27) | Operational restore checklist exists, automated export reconstruction does not |
| PHI/secret scans | PASS | Metadata only; no live rows or credentials used |

## S27 decision boundary

`assemblePatientExport()` currently hashes `generatedAt` and a record containing
prior export manifests and audit entries. Exporting also inserts a new manifest
and audit event. A second export is therefore a different legal-record snapshot
even with a fixed clock. Task 02 cannot silently exclude fields, reorder old
groups, or add a competing canonical-content hash. An authorized governance
owner must approve the intended repeat-export and retained-manifest semantics
before T02-22/T02-23 can pass.
