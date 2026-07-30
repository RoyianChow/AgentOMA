# Task 09 — authenticated interoperability and system handoff

**Owner profile:** integration developer

**Priority:** P2

**Status:** current FHIR route remains disabled; design/tests may begin

## Goal

Create a safe, read-only-first interoperability layer with explicit consent,
provenance, validation, acknowledgement, and reconciliation. Preserve the
existing boundary that AgentOMA does not submit to HNS.

## Scope

- Inventory intended consumers and classify each integration's authority,
  purpose, data minimum, direction, and source of truth.
- Keep `/api/fhir` returning `403` until authentication, pharmacy scope,
  authorization, consent, and pharmacist-reviewed clinical mapping are complete.
- Validate every request and external response with versioned Zod schemas.
- Add provenance, source timestamp, correlation/idempotency key, acknowledgement,
  timeout, retry, dead-letter, and reconciliation states.
- Start with authenticated read-only export of finalized records.
- Design dispensing-software handoff as a reviewed draft transfer; the pharmacy
  system remains authoritative for dispensing and claim submission.
- Provide staff-visible integration failures without payload logging.
- Add patient-visible disclosure/access history where required by the approved
  privacy design.

## Out of scope

- Expanding or silently approving the current ICD-10 map.
- HNS submission, automatic prescribing, automatic dispensing, or writes to an
  external clinical record.
- Accepting an external response as trusted without schema and business
  validation.

## Dependencies

- Tasks 02, 05, and 11.
- Consumer/vendor specifications and test environments.
- Pharmacist review of clinical mappings.
- PIA/TRA, consent, legal, and data-sharing agreements.

## Deliverables

1. Integration inventory and authority/data-flow matrix.
2. Versioned read-only API contract and threat model.
3. Authenticated synthetic conformance harness.
4. Failure/retry/reconciliation dashboard queue.
5. Mapping review package with `// TODO: PHARMACIST REVIEW REQUIRED` preserved
   until sign-off.

## Acceptance criteria

- Anonymous, wrong-role, wrong-pharmacy, expired, replayed, and over-broad
  requests are denied.
- Export returns only finalized, authorized, minimum-necessary records.
- Malformed or semantically inconsistent external content fails closed.
- Retries cannot duplicate an external effect.
- Every handoff has provenance and a visible reconciliation outcome.
- FHIR remains disabled in production until all named gates are evidenced.

## Tests

- Auth/authorization/consent matrix.
- Schema version and malformed-response tests.
- Idempotency, replay, timeout, retry, partial failure, and reconciliation tests.
- Payload-log and PHI-client boundary scans.
