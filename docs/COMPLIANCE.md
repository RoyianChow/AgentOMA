# Compliance map — Ontario minor-ailment services

**Implementation review date:** 2026-07-26

This document maps the current code to the Ontario Ministry of Health _Executive Officer Notice: Update to Funding for Minor Ailment Services in Ontario Pharmacies_, effective July 1, 2026. Page references point to [`regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf`](regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf), which is the binding source.

Status: ✅ implemented and tested · 🔶 partial or awaiting human approval · ⬜ not implemented

> This is an implementation traceability document, not legal advice. It deliberately contains no duplicate PIN table. Billing values come only from `src/config/ailment-reference.ts` and the seeded reference tables. The current clinical artifact is approved and hash-bound in [`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md); future content changes require renewed pharmacist review.

## Reference data and claim limits

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Effective-dated funded groups, four PINs per group, fees, and claim maximums | pp.2–3; Table 1, pp.8–10 | Versioned seed source and `ailment_group`/`pin`; claim draft resolves the applicable row and refuses an unknown lookup | ✅ |
| Merged rhinitis and dermatitis groups; 2026 additions | p.2; Table 1 | Seeded reference data | ✅ |
| Acne no-Rx in-person PIN preserved exactly as published | Table 1, p.9 | Reference-source regression test | ✅ |
| HNS looks back 365 days; `LO` maximum rejection has no override | p.7 | Platform count and honest UI language exist; HNS remains authoritative | 🔶 |
| Platform count is advisory because other pharmacies are not visible | p.7 | UI/export state this limitation | ✅ |
| One claim per person/ailment/day | p.2; p.14 | Unique database index; concurrent duplicate is rejected | ✅ |

The claim-history record is still incomplete: the viewer attestation/timestamp and all three evidence signals are not yet persisted together, and the completion action does not yet receive every maximum-state fact. See [`NEXT_STEPS.md`](NEXT_STEPS.md).

## Cross-ailment and scope rules

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Insect bites/urticaria and tick bites cannot both be claimed the same day | Table 1 footnotes, pp.8–9 | Data-driven `claim_rule`; advisory-lock trigger; two-transaction race test | ✅ |
| Verrucae bill under calluses/corns/warts; face/genital warts are out of scope | p.3 | Scope rule exists as data; clinical presentation still needs pharmacist validation | 🔶 |

## Patient and service eligibility

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Valid OHIP/ODB eligibility number; no number means no funded claim | p.6; p.14; footnote 4 | Portal captures a number, but format/eligibility is not fully Zod-validated and enforced server-side | 🔶 |
| Name as on card, DOB, and F/M/U for non-ODB claims | pp.11, 13 | Patient record captures name, DOB, and gender; exact-card/recipient validation remains incomplete | 🔶 |
| LTC primary-provider handling | footnote 5, p.7; p.14 | Facts are captured, but claim drafting is deliberately refused pending ministry clarification; no `$0` claim is emitted | 🔶 |
| LTC secondary-emergency handling and `LT` | pp.14–15 | Facts are captured, but claim drafting is deliberately refused pending ministry clarification; `LT` is not emitted | 🔶 |
| LTC secondary non-emergency handling | p.14; footnote 5 | Facts are captured, but claim drafting is deliberately refused pending ministry clarification | 🔶 |
| Pharmacist does not assess self/family | p.14 | Derivation refuses it, but the authoritative server workflow does not yet collect the attestation | 🔶 |

The unresolved LTC interpretation is recorded in [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md).

## Triage, red flags, and existing prescriptions

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Use ailment-appropriate assessment/red-flag criteria | pp.7–8 | The deterministic triage and red-flag artifact received P0-A clinical approval on 2026-07-26; a hash-backed test prevents unreviewed changes from inheriting approval | ✅ |
| A red flag exits to referral and creates no claim | pp.7–8; p.14 | Separate `triage_exit`, defensive derivation refusal, and database tests prove zero claim rows | ✅ |
| Completed assessment ending in referral remains distinct from red-flag exit | pp.11, 13 | Outcome model distinguishes the paths; only completed referral derives SSC `4` | ✅ |
| Existing fillable/adaptable/extendable prescription blocks the fee | p.15 | Intake self-report and derivation refusal exist; pharmacist/server gate is incomplete | 🔶 |
| Reachable prescriber/verification-only scenario blocks the fee | p.15 | Not yet represented as a complete authoritative gate | ⬜ |

The approval covers the complete current artifact, including the tick-bite and
UTI sections. It does not authorize future clinical-content changes.

## Consent and clinical record

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Informed consent, verbal/written, person or SDM; who/when/method/relationship | pp.5, 12 | Pharmacist records method, giver, timestamp, and conditional SDM identity/relationship; Zod and DB checks enforce completeness | ✅ |
| Presenting complaint, health/medication history, findings, shared decision-making, care plan | p.5 | Version-2 assessment snapshot stores separately queryable complaint/history/findings/decision/plan fields | ✅ |
| Complete prescription record and PCP notification | pp.5, 12 | Rx outcome requires patient address, drug/strength/quantity/directions, server-derived prescriber snapshot, and PCP timestamp/method | ✅ |
| Structured rationale when no prescription is issued | p.12 | Outcome-compatible documentation code is required; notes are supplementary only | ✅ |
| Inform patient prescription may be filled anywhere; follow-up still owed | p.5 | Rx record requires a choice-of-pharmacy information timestamp; billable completion requires a structured follow-up plan, and the worklist repeats the continuing-duty warning | ✅ |
| Follow-up monitoring, safety/efficacy, and next steps | pp.5, 12 | Live `0017` adds immutable plans/attempts, due/overdue tracking, reached/not-reached outcomes, evaluation, disposition, audit events, retention propagation, and export inclusion | ✅ |

## Claim assembly

| Derived field/rule | Notice | Current implementation | Status |
|---|---|---|---|
| PIN from ailment, modality, and Rx outcome | Table 1 | Pure injected lookup; unknown result refuses; immutable snapshot | ✅ |
| Fee from the applicable reference row for non-LTC services | p.5; Table 1 | Pure derivation and tests; LTC billing remains parked rather than guessed | ✅ |
| Prescriber reference `09`; OCP number or As-of-Right identifier | p.11 | Derived from authenticated prescriber profile | ✅ |
| `PS`; non-ODB `ML` and Carrier `S` | p.13 | Pure derivation and tests | ✅ |
| Quantity `2` only for remote virtual | pp.11, 14 | Pure derivation and tests | ✅ |
| SSC `4` only for completed assessment ending in referral | pp.11, 13 | Pure derivation and tests; red-flag exit refuses | ✅ |
| Claim is prepared on service date | p.14 | Assessment and draft are created from the current service action | ✅ |
| Export/handoff only; no HNS submission | Product boundary | Read-only panel and print export state this explicitly | ✅ |

## Modality and virtual service

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| In-person or virtual from pharmacy; record physical location for virtual | pp.4, 13 | Schema, server action, workspace, and live database completeness check enforce the physical location | ✅ |
| Remote virtual only when the effective fee-tier row permits it | p.4 footnote 3; p.15 | Effective-dated `odb_fee_tier.remote_virtual_eligible` drives UI visibility, server refusal, and derivation input; migration `0013` is live | ✅ |
| Remote requires reason on-site staff cannot meet demand | p.4 | Workspace, server action, and live database completeness check require the reason | ✅ |
| Remote quantity `2`, otherwise `1` | pp.11, 14 | Derived and tested | ✅ |

## Authentication and pharmacist eligibility

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Pharmacy HNS subscription/account identity | p.6 | `pharmacy.hns_account_id` and authenticated pharmacy settings exist; operational verification is still required | 🔶 |
| OCP orientation module completed before billable assessment | p.6 | Server gate and supervisor logic exist, but an audited admin override currently bypasses the hard gate | 🔶 |
| Clinical viewer check | p.6 | UI attestation/link exists; durable evidence model is incomplete | 🔶 |
| Portal protects PHI | PHIPA posture | better-auth, mandatory TOTP, invitation-only roles, rolling/revocable sessions, server-action authorization | ✅ |

`src/proxy.ts` performs no authorization. It is an optimistic redirect only. Every server action independently verifies the better-auth session, active role, and pharmacy scope; billable completion additionally resolves prescriber eligibility server-side.

## Audit, retention, and privacy

| Requirement | Notice | Current implementation | Status |
|---|---|---|---|
| Defensible activity trail for post-payment review | p.12 | Pharmacy-scoped append-only audit events and server-generated exports | ✅ |
| Audit records cannot be updated/deleted by the app | p.12 | Trigger plus `agentoma_app` privilege revocation; real-Postgres grant tests | ✅ |
| Retain ten years from last service or ten years after age 18, whichever later | p.12 | Live `0016` patient-wide recomputation extends every prior record after a returning service; live horizon comparison is clean and the pediatric fixture retains through 2047 | ✅ |
| Complete, readily retrievable patient record | PHIPA/OCP recordkeeping posture | Live server-only export schema v2 includes follow-up rows with patient, assessments, claim drafts, linked intakes/audits, retention/holds/corrections, manifest, and per-artifact hashes | ✅ |
| Holds prevent destruction | PHIPA/OCP recordkeeping posture | Live patient/record holds block deletion in database triggers, including controlled destruction | ✅ |
| Corrections preserve historical truth | PHIPA access/correction posture | Live immutable correction overlays use final supersession; source records are not rewritten | ✅ |
| Destruction is deliberate, reviewed, and audited | PHIPA/OCP recordkeeping posture | Live dry-run evidence plus database execution requires elapsed retention, no hold, and a second admin; no automatic cron exists | ✅ |
| Recovery is tested and evidenced | PHIPA security posture | The `restore_drill` model and [`RESTORE_DRILL.md`](RESTORE_DRILL.md) are live; the first isolated Canadian-region drill remains to be performed | 🔶 |
| Improper payments are recoverable | p.12 | Claim, consent, clinical, prescription, PCP, and audit snapshots support post-payment review | ✅ |
| No PHI in patient intake | PHIPA posture | Intake schema/actions/tests contain symptom/handoff state only | ✅ |
| Public self-check has no custodian-dependent persistence | PHIPA posture | `/check` collects no identifiers, keeps answers in memory, generates PDFs client-side, and is available after hash-bound P0-A clinical approval | ✅ |
| No PHI in unnecessary client components or logs | PHIPA posture | Audit records render on the server; exports are generated server-side; continued review required for new features | ✅ |
| PHI remains in Canada | PHIPA posture | Postgres is documented for Supabase `ca-central-1`; future object storage is not yet implemented | 🔶 |
| One pharmacy by construction | PHIPA tenancy posture | Live `PHARMACY_ID` pinning and singleton DB constraint remove tenant switching; post-migration inspection reports one Demo Pharmacy and no cross-pharmacy relationships | ✅ |

## Current release conclusion

The billing derivation, version-2 clinical/consent record, authentication
foundation, audit immutability, and P0-D virtual/LTC fact capture are
implemented. The live migration chain is through `0017` and independently
replays from zero in Docker. All LTC claim drafting remains parked. The product is **not yet
ready for full production** because the eligibility, existing-prescription,
claim-history, LTC-billing, orientation-override, and first restore-drill items
remain incomplete. The ordered remediation list is
[`NEXT_STEPS.md`](NEXT_STEPS.md).
