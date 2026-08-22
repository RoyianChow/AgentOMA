# Task 06 — Assessment and Claim Integration Boundary

This is the most safety-critical document in this task. Every other workstream exists partly
in service of the one rule this document enforces: **a virtual-care event can request that the
existing Task 02 assessment/claim workflow run — it can never run it, complete it, or infer
anything on its behalf.**

The existing production boundary this document must not weaken is real, not hypothetical:
`createAssessment` and `deriveClaimDraft` (`src/app/(dashboard)/pharmacist/actions.ts`,
`src/lib/claims/derive-claim-draft.ts`) already sit behind `requirePortalUser()` — a
pharmacist-only, session-re-verified-every-call boundary. Task 06 adds a *longer* gate in front
of that same unchanged entry point. It does not add a second door.

---

## 1. Required server guards (the full list, rechecked, never cached)

| # | Guard | Existing precedent in this repo |
|---|---|---|
| 1 | Valid pharmacist session | `requirePortalUser()` — unchanged |
| 2 | Correct pharmacist audience/actor type | `requirePortalUser()` — unchanged |
| 3 | Active pharmacist account | `requirePortalUser()` — unchanged |
| 4 | Pharmacy/tenant scope | `requirePortalUser()`'s `PHARMACY_MISMATCH` check — unchanged |
| 5 | Pharmacist assignment to the visit | New — `VirtualVisit.pharmacistActorRef` match |
| 6 | Valid patient session or approved telephone identity workflow | New, synthetic (Task 05 gap) |
| 7 | Patient actor-to-subject binding | New, synthetic |
| 8 | Delegate grant where applicable | New, synthetic |
| 9 | Visit-to-patient relationship | New — `VirtualVisit.patientSubjectRef` |
| 10 | Visit-to-assessment relationship | New — `VisitAssessmentLink` |
| 11 | Appointment relationship where applicable | New, optional — `VirtualVisit.appointmentRef` (Task 04 now has real code, per the current-state addendum, but this remains optional in Task 06's own contract) |
| 12 | Participant authorization | New — `ParticipantAuthorization` |
| 13 | Identity confirmation | New — `IdentityAndLocationCheck` |
| 14 | Patient location confirmation | New — same |
| 15 | Cross-jurisdictional approval | New — derived, never client-set |
| 16 | Current virtual-care consent | New — `VirtualCareConsentEvent` |
| 17 | Current participant consent | New — same, participant-scoped |
| 18 | Privacy confirmation | New — Workstream E §4 checklist |
| 19 | Current pharmacist suitability decision | New — `ModalitySuitabilityDecision`, must be `SUITABLE`/`SUITABLE_WITH_LIMITATIONS` |
| 20 | Approved modality | New — `VirtualVisit.approvedModality` |
| 21 | Current visit state | New — Workstream H's state machine |
| 22 | Current connection/fallback state | New — same |
| 23 | Visit expiry | New |
| 24 | Session revocation | Reuses `requirePortalUser`'s live-session-check pattern (pharmacist side); synthetic on patient side |
| 25 | Delegation revocation | New, synthetic |
| 26 | CSRF/origin protections | Reuses Next.js server-action same-origin enforcement, unchanged |
| 27 | State version/concurrency token | New — `VirtualVisit.stateVersion` (Workstream D/H) |
| 28 | Task 11 release/feature gate | New — Task 06 registers as a capability once Task 11's control plane exists; today this guard evaluates to `NOT VERIFIED` honestly, not `PASS` |

**Design principle, stated once instead of 28 times per checkpoint:** every checkpoint below
rechecks the **entire** list above, every time, from current server state — never a subset,
never a cached prior result. This mirrors `requirePortalUser()`'s own documented rationale
exactly: *"proxy.ts performs NO authorization... the check that matters is this one, running
inside the action, on the server, per request."* Task 06 does not introduce a lighter-weight
checkpoint anywhere in this list.

## 2. Checkpoints where the full guard set is rechecked

| Checkpoint | Notes specific to this checkpoint |
|---|---|
| Waiting-room entry | Guards 1–9, 12–15 apply (assessment/claim-specific guards 10, 19–23 aren't yet meaningful pre-admission) |
| Pharmacist admission | Adds guard 12 as the primary new fact being decided |
| Before starting clinical interaction | **All 28** — this is the literal "substantive clinical interaction begins only after every gate passes" line from the non-negotiable invariants |
| Before secure-message release | All 28, modality-scoped to messaging (Workstream I §6) |
| After reconnect | All 28, rechecked fresh — not restored from pre-interruption state (Workstream H §1, `RECONNECTING → IN_PROGRESS`) |
| After participant change | Guards 6–9, 12 re-evaluated for the changed roster |
| After location change | Guards 14–15 re-evaluated; may re-trigger 13, 16–19 per Workstream E's reassessment rule |
| After modality change | All 28 — a modality switch is a full fallback transition (Workstream H, `FALLBACK_PENDING`), not a partial recheck |
| Before loading assessment data | Guards 1–11 minimum, plus 19–21 (an unsuitable or non-current visit shouldn't even preview assessment context) |
| Before writing assessment data | All 28 |
| **Before assessment completion** | All 28, **plus every existing Task 02 guard, unchanged** — this document adds a longer gate in front of Task 02's door, it does not shorten what's already on the other side of that door |
| **Before claim generation or submission** | Same — all 28, plus Task 02's full existing claim-derivation guard set, exactly as it runs today for an in-person visit |

## 3. What crosses from the virtual-care layer into the assessment service

**Only this, and nothing else** (matches `VirtualVisit`'s minimal-context fields, Workstream D):

Opaque visit reference · approved modality · pharmacist suitability-decision reference ·
consent reference · identity/location-confirmation references · safe technical-failure status ·
start/end times · participant-provenance references.

**Never:** clinical content, message bodies, raw consent answers, raw location detail — none of
it belongs in a technical event payload, and none of the fields above are typed to carry it
(Workstream D's field-by-field documentation already excludes it at the schema level, not just
by convention).

## 4. The claim boundary — restated as hard prohibitions, each checked against this design

| A virtual-care event must never... | Why this design can't do it anyway |
|---|---|
| ...create a claim | No entity in Workstream D has a write path to a claim table. `VisitAssessmentLink` only *references* an assessment; it has no claim-adjacent field at all. |
| ...mark a claim eligible | Same — eligibility is entirely Task 02/existing-billing-service territory; nothing in this schema represents "eligible" as a settable value. |
| ...set a billing code | Not a field anywhere in this document's contracts. |
| ...select a PIN | Same. |
| ...submit a claim | Same. |
| ...infer reimbursement eligibility | The virtual-care layer has no reference data, no PIN table, no fee table — it structurally cannot compute this even if something tried to; it doesn't have the inputs. |

**"A technical-failure event must explicitly fail any guard that requires successful pharmacist
completion."** — this is Workstream H §3's table again, viewed from the claim side: every guard
in §1 above that touches assessment/claim state (19–23) reads the *current* visit state before
proceeding, and `TECHNICAL_FAILURE`/`INTERRUPTED` are states from which those guards fail by
construction, not by an added special-case check.

**"If an encounter safely continues through an approved fallback, only the pharmacist's later
explicit completion — after all existing clinical and billing guards pass — may allow the
existing claim workflow to proceed."** — restated precisely: `PHARMACIST_COMPLETED`
(Workstream H) is the only state from which `VisitAssessmentLink` may be written, and even
then, writing that link does not itself create a claim — it only makes the assessment
*reachable*. The claim itself is created, if at all, entirely inside Task 02's own existing,
separately-guarded `createAssessment`/`deriveClaimDraft` flow, running exactly as it runs today
for a walk-in patient. Task 06 never touches `deriveClaimDraft` and proposes no change to it.

## 5. What this document deliberately does not do

It does not modify `createAssessment`, `deriveClaimDraft`, any reference table, or any Task 02
guard. Task 02's own spec (§2.3, Protected surfaces) lists assessment-finalization behavior as
read-only under that task, and this task's own instruction is identical in spirit: integrate
through the boundary, never edit what's on the other side of it. No code changes accompany this
document.

---

## Cross-references

Guard list backing: Workstream D (all entities), Workstream E (identity/location/consent/
suitability), Workstream H (state machine, especially §3's proof table). Existing code this
must not weaken: `src/app/(dashboard)/pharmacist/actions.ts` (`createAssessment`),
`src/lib/claims/derive-claim-draft.ts`, `src/lib/auth-guard.ts` (`requirePortalUser`).
