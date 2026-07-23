# Next steps

**Prioritized:** 2026-07-23

**Release posture:** do not treat the current build as production-ready until the P0 items are resolved and re-verified.

## P0 — clinical and compliance blockers

1. **Obtain pharmacist approval for the full triage and red-flag set.** `src/config/triage.ts` is still draft clinical content. The tick-bite 72-hour threshold is explicitly unverified and must not be changed by an agent. Record approval and effective dates in a controlled source. This is also the hard release gate for `/check`; only after sign-off should a reviewed change remove its production 404.
2. **Resolve all LTC minor-ailment billing.** The current conservative rule records the assessment and LTC facts but refuses claim drafting for every LTC resident. Confirm the primary, secondary-emergency, and secondary-non-emergency submission/fee rules with the ODB Pharmacy Help Desk, including footnote 5 and `LT`. Do not add `$0`, capitation, or `LT` logic until a human decision is documented; see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).
3. **Resolve the orientation break-glass policy.** The intended rule is a hard billing-eligibility gate, but the current code lets a pharmacy admin supply an audited override reason. Remove it or obtain explicit regulatory/product approval before production.
4. **Enforce identity and eligibility at the server boundary.** Add Zod validation for health-number/eligibility-number format and required health-card fields, and hard-block billable completion when public-service eligibility is absent.
5. **Implement server-enforced self/family and existing-prescription gates.** The derivation function can refuse these conditions, but the pharmacist workflow does not yet collect and pass all facts authoritatively.
6. **Finish the claim-history evidence model.** Persist the patient's self-report, platform trailing-365-day count, clinical-viewer attestation and timestamp side by side. Pass the maximum state into the completion action while retaining honest language that only HNS adjudication determines payment.
7. **Validate the public self-check before enabling it.** After P0-A sign-off,
   perform patient-facing copy review, test both PDF branches, verify a forced
   PDF failure emits no payload to logs, and run one-handed/accessibility checks
   on a 375px device. The current production 404 stays until all of this is
   recorded. See [`SELF_CHECK.md`](SELF_CHECK.md).

## Completed P0 slice

- **P0-B — defensible clinical record and informed consent:** completed in migration `0012_clinical_record_and_consent`. New version-2 assessments require structured consent, presenting complaint, histories, findings, shared decision-making, care/follow-up, coded no-Rx rationale, and outcome-specific prescription/PCP evidence. Legacy version-1 records remain readable and are labelled as such.
- **P0-D — virtual/LTC fact capture and fee-tier reference:** migrations `0013`–`0014` are live. The workspace captures the required facts, remote eligibility is data-driven, and all LTC claim drafting is parked. Post-migration verification found four fee tiers, all checks present, and unchanged operational counts of 3 pharmacies and 12 assessments.

## P1 — pilot readiness

1. Keep `/api/fhir` disabled until the ICD-10 mapping receives pharmacist review and the export has authenticated, pharmacy-scoped authorization. Do not expand the current mapping meanwhile.
2. Add a production password-reset delivery channel and verify rate limits, token expiry, and revocation end to end.
3. Provision and test at least two pharmacies to prove tenant isolation, invitation scoping, settings, and audit exports outside the seeded single-pharmacy path.
4. Add Supabase Storage for Rx/referral documents with Canadian-region configuration, least-privilege access, retention metadata, and audit events.
5. Make assessment, invitation, settings, and external-response boundaries consistently Zod-validated; preserve safe, non-PHI error messages.
6. Review audit-write transaction boundaries. Several audit writes are best-effort after the clinical write; decide which events must be atomic for post-payment review.
7. Conduct usability and accessibility testing on a 375px device with sick/one-handed users and pharmacist counter workflows.

## P2 — engineering maturity

1. Add CI that runs TypeScript, ESLint, pure tests, and a fresh-Postgres migration/integration suite on every pull request.
2. Add deployment and recovery runbooks: Canadian-region verification, role/password provisioning, migration rollback strategy, backup/restore drill, retention/destruction procedure, and privacy-incident response.
3. Reduce portal dependence on the large global stylesheet and document a component-level styling convention without changing intake behaviour.
4. Review public marketing claims so they accurately describe deterministic triage and pharmacist verification rather than implying automated diagnosis.

## Acceptance for a production decision

- Every P0 item is closed with evidence and owner sign-off.
- [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) has no unresolved billing or clinical blocker.
- The database is migrated through the reviewed chain using `db:migrate`, never `db:push`.
- TypeScript, lint, unit tests, fresh-database tests, concurrency tests, and tenant-isolation tests pass.
- A pharmacist has validated the complete record and exports against a realistic end-to-end case.
- Privacy/security review confirms no PHI reaches intake, unnecessary client components, logs, or non-Canadian storage.
