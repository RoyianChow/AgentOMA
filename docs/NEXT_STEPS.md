# Next steps

**Prioritized:** 2026-08-10

**Release posture:** do not treat the current build as production-ready until
the P0 items are resolved, deployed, and re-verified.

**Latest Task 02 runtime update:** exact candidates `3a271a7d…` and
`4e479514…` failed closed with `LOOPBACK_TCP_DENIED` before migration or
synthetic fixture writes. Their evidence is preserved under
`docs/p0/task-02/evidence/runs/`; do not rerun either candidate. Freeze a new
clean candidate and obtain a new exact, expiring G1-D before using the single
approved predecessor/restart command. The full current programme status is in
[`tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md`](tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md).

## P0 — clinical and compliance blockers

1. **Remediate then rerun the gated predecessor/restart proof.** Exact candidate
   `dcaab91…` passed the full 211-test from-zero PostgreSQL suite twice. Every
   later predecessor/restart run remains preserved as fail-closed evidence;
   the newest recorded candidates, `3a271a7d…` and `4e479514…`, stopped at
   `LOOPBACK_TCP_DENIED` before migration or synthetic fixture writes. Do not
   rerun an evidence-bound candidate. Freeze a new clean SHA, grant a new
   expiring G1-D using
   `docs/p0/task-02/g1-d-predecessor-upgrade-approval-contract.md`, then run its
   single orchestrated command. Do not manually operate Compose, weaken tmpfs,
   or edit migration/history.
2. **Resolve export-integrity stop S27.** Approve canonical repeat-export,
   retained-manifest, and reconstruction-verification semantics before changing
   hashes. The current bundle changes as export/audit history grows.
3. **Obtain independent Task 11 review.** Bind the exact candidate, migration,
   G1-D artifacts, remaining controls, and approved S27 contract.
4. **Establish recovery evidence, obtain G1-L, and verify the one-time live migration.**
   Apply only through `npm run db:migrate` in the named change window after all
   Docker blockers are green. Verify catalog/grants and safe aggregate deltas.
5. **Smoke-test the complete P0-C workflow.** Use a realistic synthetic case to
   prove missing eligibility fails closed, unresolved prescription evidence
   blocks completion, the three history signals persist side by side, and the
   UI never promises HNS payment. Confirm a red-flag exit still writes zero
   assessment, evidence, and claim-draft rows.
6. **Resolve all LTC minor-ailment billing.** The current conservative rule
   records the assessment and LTC facts but refuses claim drafting for every LTC
   resident. Confirm primary, secondary-emergency, and secondary-non-emergency
   submission/fee rules with the ODB Pharmacy Help Desk, including footnote 5
   and `LT`. Do not add `$0`, capitation, or `LT` logic until a human decision is
   documented; see [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).
7. **Obtain independent G4 after live verification.** Task 02 cannot approve its
   own production promotion.

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
   attestation. Candidate `dcaab91…` passed atomic-audit rollback, orientation,
   persistence, isolation, concurrency, red-flag, referral, and export evidence
   tests on real PostgreSQL. The feature is **not production-ready** until the
   remaining predecessor/restart, S27, Task 11, recovery, live, and G4 gates pass.
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
   hash assertions are green under G1-D; do not claim them live before 0018.
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

1. Preserve Task 01's recorded local synthetic PASS. G2 was not requested and
   G3 remains empty; any changed sandbox candidate needs fresh boundary,
   artifact, evidence, and production-invariance proof.
2. Keep Task 02 and Task 11 as the release-critical lanes. Task 02 must follow
   the G1-D → predecessor/restart → S27 → independent Task 11 → recovery →
   G1-L → live parity → G4 sequence above. Task 11 must receive independent
   review before merge or promotion.
3. Keep Task 04 blocked until a superseding versioned approval records the
   exact candidate and configuration hashes, owners, future expiry/review
   dates, capability decisions, and independent Security/Privacy,
   Operations/SRE, Quality/Test, and Task 11 reviews. Its approved waitlist
   policy alone authorizes no implementation.
4. Continue Task 07 with Workstream J privacy/security/audit/retention design
   only. No real recipient, provider, PHI, message delivery, or runtime is
   authorized.
5. Start Task 03 discovery/design as the next unowned product capability. Do
   not introduce clinical ranking, triage, billing inference, or client-side
   source queue records.
6. Reconcile reported external Task 06 and Task 11 branches before duplicate
   work. Tasks 05, 08, and 09 remain discovery/contract work; `/api/fhir`
   stays disabled. AI-RX-06 is retired and Task 10 expansion remains blocked;
   any future candidate requires a new charter, Task 01 sandbox isolation, and
   Task 11 review.
7. Tasks 12, 13, and 14 are design-only: operational resilience, human factors
   and controlled-pilot readiness, and regulatory change governance. Runtime
   drills, participant studies, automated source tooling, or production
   activation require exact task approval plus Task 11 Checkpoint 1.
8. Resolve the AgentRx/AgentOMA naming question and add the referenced reviewed
   deep-research artifact if future work materially depends on it; see
   [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

The current dependency map and per-task allowed-work status live in the
[`task execution index`](tasks/autonomous-pharmacy/README.md).

## P2 — engineering maturity

1. Reconcile and independently review Task 11's reported CI/control-plane
   branch, then require TypeScript, ESLint, pure tests, and fresh-Postgres
   migration/integration checks on protected pull requests.
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
