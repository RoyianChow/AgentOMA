# Next steps

**Prioritized:** 2026-08-02

**Release posture:** do not treat the current build as production-ready until
the P0 items are resolved, deployed, and re-verified.

## P0 — clinical and compliance blockers

1. **Obtain G1-D and verify P0-C migration `0018` in fresh Docker.** The identity, eligibility,
   self/family, existing-prescription, claim-history, and clinical-viewer gates
   are merged in the application, but the live Supabase database is still at
   `0017`. Replay the full chain and the independent 0017→0018 upgrade, run the
   complete database suite, and prove triggers/grants/atomicity/concurrency.
   Never use `db:push`.
2. **Obtain G1-L, recovery evidence, and verify the one-time live migration.**
   Apply only through `npm run db:migrate` in the named change window after all
   Docker blockers are green. Verify catalog/grants and safe aggregate deltas.
3. **Smoke-test the complete P0-C workflow.** Use a realistic synthetic case to
   prove missing eligibility fails closed, unresolved prescription evidence
   blocks completion, the three history signals persist side by side, and the
   UI never promises HNS payment. Confirm a red-flag exit still writes zero
   assessment, evidence, and claim-draft rows.
4. **Resolve all LTC minor-ailment billing.** The current conservative rule
   records the assessment and LTC facts but refuses claim drafting for every LTC
   resident. Confirm primary, secondary-emergency, and secondary-non-emergency
   submission/fee rules with the ODB Pharmacy Help Desk, including footnote 5
   and `LT`. Do not add `$0`, capitation, or `LT` logic until a human decision is
   documented; see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).
5. **Resolve export-integrity stop S27.** Approve the canonical repeat-export,
   retained-manifest, and reconstruction-verification contract before changing
   hashes. The current bundle intentionally changes as export/audit history
   grows; Task 02 did not invent a competing hash contract.
6. **Obtain Task 11 test-plan/evidence review and G4.** Task 02 cannot approve
   its own production promotion.

## Completed P0 implementation

- **P0-A — clinical triage approval:** the exact current
  `src/config/triage.ts` artifact, including tick-bite and UTI content, was
  clinically approved on 2026-07-26. The hash-backed record is
  [`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md), and `/check` is public.
- **P0-B — defensible clinical record and informed consent:** migration `0012`
  requires structured consent, complaint/history/findings, shared
  decision-making, care/follow-up plans, coded no-Rx rationale, and
  outcome-specific prescription/PCP evidence for version-2 assessments.
- **P0-C — server-enforced identity, eligibility, and gates:** application code
  and migration `0018` are merged. The server validates inspected public-service
  identity evidence, self/family and structured existing-Rx facts, and persists
  patient self-report, an exact advisory platform lookback, and clinical-viewer
   attestation. The protected atomic-audit and orientation fixes are committed
   on candidate `813e3605…`, but the feature is **not production-ready** until
   the Docker/live steps above are complete.
- **P0-D — virtual/LTC facts and fee-tier reference:** migrations `0013`–`0014`
  are live. Remote eligibility is reference-driven and all LTC drafting remains
  parked. Migration `0015` removed disposable TEST tenants and enforces one
  pharmacy.
- **Follow-up tracking:** live migration `0017` requires a structured plan,
  tracks due/overdue and reached/not-reached attempts, preserves corrections by
  supersession, audits changes, and includes follow-ups in patient export.

## P1 — pilot readiness

1. **Finish the public self-check usability evidence.** Both PDF branches were
   exercised successfully at 375px with no answer POST/storage or console
   error. Still force a PDF-generation failure and inspect logs. Fix the
   emergency screen whose primary action begins below the 375×812 fold before a
   wider pilot. Evidence: [`worklogs/p1-7-usability-a11y-375px.md`](worklogs/p1-7-usability-a11y-375px.md).
2. **Complete authenticated portal usability testing.** The prior 375px pass
   could not enter `/pharmacist/*`. Exercise sign-in/TOTP, assessment,
   claim-draft, follow-up, audit, settings, and governance with real synthetic
   credentials. Increase sign-in tap targets to the app's 56px standard when
   that UI is next touched.
3. **Improve intake failure recovery.** `/assessment` reached without its
   pharmacy link has no actionable fallback. Add concise counter-help guidance
   without collecting identity or changing the triage tree.
4. **Verify P0-C evidence in complete retrieval.** The schema-v3 export,
   manifest projection, record view, and PDF implementation are present. Run
   their real-PostgreSQL linkage, missing-evidence, tenant, authorization, and
   hash assertions after G1-D; do not claim them live before 0018.
5. Exercise `/pharmacist/governance` with a realistic synthetic case: complete
   export, patient and record holds, request decision, correction supersession,
   destruction dry run, second-admin refusal/approval, and restore-drill record.
   Do not test actual destruction on retained real records.
6. Perform the first isolated Canadian-region restore drill using
   [`RESTORE_DRILL.md`](RESTORE_DRILL.md), record counts/hashes in
   `restore_drill`, and close any failed check before pilot.
7. Keep `/api/fhir` disabled until the ICD-10 mapping receives pharmacist
   review and the route has authenticated, pharmacy-scoped authorization. Do
   not expand the current mapping meanwhile.
8. Add a production password-reset delivery channel and verify rate limits,
   token expiry, revocation, and safe errors end to end.
9. Add Supabase Storage for Rx/referral documents with Canadian-region
   configuration, least-privilege access, retention metadata, and audit events.
10. Extend Zod validation to any future external integration/FHIR responses.
    Assessment, invitation, settings, and external-session boundaries are now
    covered; preserve safe, non-PHI errors as integrations are added.
11. Review remaining best-effort audit boundaries. Assessment completion and
    governance mutations are transactional, and record-access failures have a
    secondary failure table; settings/invitation paths still need an explicit
    atomicity decision.

## Completed P1 foundation

- Migrations `0015`–`0017` are live and verified; `0018` is checked in only.
- Post-migration inspection reports one Demo Pharmacy, three preserved TOTP
  users, no duplicate cross-pharmacy health-number groups, and no assessment
  tenant mismatch.
- Live verification confirms the hardening triggers, non-owner
  `agentoma_app` privileges, controlled-destruction ACLs, governance tables,
  and patient-wide retention horizons through `0017`.

## Autonomous-pharmacy program — parallel planning track

This program does not displace the P0 deployment and policy blockers above.
Its updated task briefs are implementation contracts, not completed features.

1. Start Task 01 repository discovery and Task 11 control/evidence design in
   parallel. Obtain the approvals in Task 01 before creating its separate npm
   workspace and runnable synthetic build.
2. Allow Task 02's bounded inspection and export work while keeping migration
   execution and live writes behind their explicit approval gate. Reconcile its
   work with the outstanding `0018` operator steps above rather than creating a
   second deployment path.
3. Permit Tasks 03–10 to perform only the discovery, design, contracts, and
   synthetic work authorized in each brief. No runnable prototype shares the
   production app, database, authentication, credentials, or integrations.
4. Route task plans and evidence through Task 11, but keep approval authority
   with the named product, pharmacist, privacy, security, accessibility, and
   regulatory reviewers. Task 11 records evidence; it does not self-approve.
5. Resolve the AgentRx/AgentOMA naming question and add the referenced reviewed
   deep-research artifact if future work materially depends on it; see
   [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

The current dependency map and per-task allowed-work status live in the
[`task execution index`](tasks/autonomous-pharmacy/README.md).

## P2 — engineering maturity

1. Add CI that runs TypeScript, ESLint, pure tests, and a fresh-Postgres
   migration/integration suite on every pull request.
2. Add Canadian-region verification, role/password provisioning, migration
   recovery, and privacy-incident runbooks. Backup/restore and reviewed
   destruction already have foundations.
3. Reduce portal dependence on the large global stylesheet and document a
   component-level styling convention without changing intake behaviour.
4. Review public marketing claims so they describe deterministic triage and
   pharmacist verification rather than implying automated diagnosis.
5. Evaluate new online-pharmacy and dashboard capabilities through
   [`AUTONOMOUS_PHARMACY_ROADMAP.md`](AUTONOMOUS_PHARMACY_ROADMAP.md) and its
   [`task execution index`](tasks/autonomous-pharmacy/README.md). Early
   prototypes must stay inside
   [`EXPERIMENTAL_SANDBOX.md`](EXPERIMENTAL_SANDBOX.md); none of these documents
   authorizes real patient care or a regulatory bypass.

## Acceptance for a production decision

- Every P0 item is closed with deployment evidence and owner sign-off.
- [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) has no unresolved billing or clinical
  blocker.
- The reviewed migration chain is live through the repository head using
  `db:migrate`, never `db:push`.
- TypeScript, lint, pure tests, fresh-database tests, concurrency tests, and
  tenancy tests pass.
- A pharmacist validates a realistic complete record and all exports.
- Privacy/security review confirms no PHI reaches intake, browser persistence,
  URLs, logs, analytics, caches, unnecessary client props, or non-Canadian
  storage. Necessary authenticated pharmacist-form state is cleared at every
  persistence and session/navigation exit.
