# Next steps

**Prioritized:** 2026-08-22

**Observed candidate:** `e1c7973086a0223e72ac90e01c33cd85fa407b67`

**Release posture:** **BLOCKED - not production-ready**

The complete task-by-task comparison is in
[`CURRENT-IMPLEMENTATION-STATUS.md`](tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md).
This file lists the next executable outcomes; it grants no approval.

## P0 - production blockers

1. **Complete changed-candidate Task 01 review.** PR #56 resolved the build and
   production-invariance failures and added candidate-bound SBX-04/SBX-13
   evidence. Task 11 must now review candidate `2358570a...`; merge and green
   CI are not promotion approval.
2. **Finish the Task 02 predecessor/restart gate.** Freeze a new clean SHA,
   obtain an exact unexpired G1-D, and run the single approved harness. Never
   rerun an evidence-bound candidate or manually edit migration history.
3. **Resolve S27 export reconstruction.** Approve canonical repeat-export,
   retained-manifest, and historical reconstruction semantics before changing
   hashes or declaring export evidence complete.
4. **Complete independent Task 11 review and recovery proof.** Bind reviews to
   the exact candidate, migration bytes, G1-D artifacts, S27 decision, and
   recovery evidence.
5. **Apply migration `0018` only after G1-L.** Use `npm run db:migrate` in the
   approved live window, verify catalog, grants, triggers, tenancy aggregates,
   and post-apply parity, then obtain independent G4. `db:push` is banned.
6. **Resolve LTC billing through the named human authority.** Continue the
   conservative no-claim-draft behavior until the ODB Help Desk decision in
   [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) is recorded and separately
   approved.

## Merge-integration blockers

### Task 04 - booking and waitlist

The sandbox now contains `/book`, but the v3 renewal record is still
`DRAFT - NOT GRANTED`, the earlier scope expired, and the current runtime is
fail-closed. Before any further implementation, Docker run, migration,
evidence promotion, or hosted access:

1. freeze the exact current Task 04 candidate and hashes;
2. select the precise permitted capabilities;
3. record future start/expiry/review timestamps and named owners;
4. obtain independent Security/Privacy, Operations/SRE, Quality/Test,
   Accessibility, and Task 11 decisions; and
5. commit the decision separately from implementation.

After approval, the remaining implementation is cancellation, rescheduling,
bootstrap exchange if selected, waitlist command runtime, promotion/expiry
workers, real-PostgreSQL races, abuse controls, timezone/DST, accessibility,
recovery, and teardown evidence.

### Task 06 - virtual care

The deterministic synthetic prototype is merged and its non-Postgres tests are
green. It is not production virtual care. Next:

1. renew exact sandbox runtime authority;
2. capture real browser, keyboard, screen-reader, zoom/reflow, mobile, and
   low-bandwidth evidence;
3. obtain Task 05 identity/delegation integration decisions;
4. complete PIA, TRA, vendor/procurement, privacy, accessibility, professional,
   and operations review; and
5. obtain exact-candidate Task 11 review before any promotion discussion.

No recording, transcription, meeting AI, real patient, vendor connection, or
external communication is permitted.

### Task 11 - release control plane

The incremental workflow slice is merged, including raw-environment policy.
Complete:

- secret and dependency scanning;
- forbidden-import and PHI/secret leakage policy checks;
- automated accessibility;
- release-evidence validation and an aggregate release gate;
- capability/control catalogues and evidence schemas;
- independent reviewer records; and
- required-check branch protection with admin enforcement. The current GitHub
  settings require one review but have no required status checks and do not
  enforce protection for admins.

Task 11 records decisions; it never grants or self-approves them.

## P1 - pilot usability and operations

1. Complete real-device beta testing for `/check` on current iOS and Android
   browsers, including PDF download/share, long safety screens, reduced
   motion, zoom, screen readers, and failure recovery.
2. Test `/sign-in`, TOTP enrollment, invitation acceptance, portal navigation,
   assessment completion, follow-ups, audit, and governance at 375px and with
   keyboard/screen-reader use.
3. Improve `/assessment` missing/expired handoff recovery without changing the
   approved triage tree or zero-PHI boundary.
4. Exercise one realistic authored-synthetic governance case from assessment
   through export, hold, correction, destruction dry run, and restore evidence.
5. Complete the first isolated restore drill and record exact evidence.
6. Configure production password-reset delivery only after provider,
   privacy/security, and operational approvals.
7. Implement Supabase Storage for Rx/referral documents only under a reviewed
   Canadian-region storage, authorization, retention, malware-scan, and audit
   design.

## Autonomous-program work that can proceed safely

- Reconcile the existing unmerged Task 03 and Task 05 branches before starting
  duplicate implementation.
- Complete Task 07 Workstream J privacy/security/audit/retention design.
- Continue Task 08 contracts/state machines with no medication, payment,
  courier, dispensing, or claim effect.
- Keep Task 09 interfaces disabled; `/api/fhir` remains 403 and allowlists stay
  empty.
- Preserve the completed AI-RX-06 retirement. Do not restore it or create a
  replacement without a new Task 10 decision, changed-candidate Task 01
  approval, and Task 11 review.
- Continue Tasks 12-14 as design-only work under their briefs. No runtime
  drill, participant study, automated regulatory interpretation, or protected
  clinical/billing change is authorized.

## Acceptance for a production decision

Production consideration requires all applicable P0 controls, current
candidate-bound Task 01 and Task 11 evidence, independent reviews, live
migration/recovery evidence, security/privacy/accessibility verification, and
an explicit G4 decision. A merged PR, green unit suite, demo, or product-lead
implementation approval is not a production release.
