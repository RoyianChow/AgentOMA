# Task 06 — Clinical and Operational Validation Plan

**This document is a plan, not a completed review.** Per the task's explicit instruction, it
uses only synthetic cases and does not conduct, schedule, or claim to have conducted a live
patient pilot. No practising Ontario pharmacist has reviewed this prototype as of this writing —
this document defines what that review must cover and how it should be run, so that when a
pharmacist is engaged, the review is structured rather than improvised.

---

## 1. Who must run this review, and what they need first

**Reviewer:** one or more practising Ontario pharmacists, independent of this build (not the
person who wrote the prototype), ideally with community-pharmacy virtual-care experience.

**What they need before starting:**
- Access to the synthetic prototype (`/virtual-care`, `/virtual-care/patient/[scenario]`,
  `/virtual-care/pharmacist/[scenario]`) running locally — see the current, real blocker in
  [`accessibility-and-responsive-evidence.md`](accessibility-and-responsive-evidence.md): the
  sandbox's own G1 lifecycle window is currently expired, so this review cannot actually begin
  until that's renewed by Task 01's owner.
- This document, so they know what they're being asked to judge.
- Explicit instruction that they are evaluating **workflow and control design**, not vendor
  video/audio quality — no vendor is selected (Workstream B) and this prototype makes no real
  media connection.
- A copy of the threat model (`virtual-care-threat-model.md`) and the non-negotiable invariants
  in the task brief, so they understand which behaviours are fixed and out of scope for their
  feedback (e.g., "should suitability ever be automated" is not an open question here).

## 2. What to validate, and how each item is checked against the synthetic prototype

| # | Question | How to check it against this prototype | What a pharmacist reviewer should watch for |
|---|---|---|---|
| 1 | Does the suitability control support rather than interfere with pharmacist judgment? | Walk `/virtual-care/pharmacist/suitability_video_suitable`, `..._suitable_with_limitations`, `..._unsuitable`, `..._telephone_unsuitable` | Whether the four-state model (suitable / suitable with limitations / unsuitable / reassessment required) matches how they actually think through a modality decision, or feels like it's forcing a binary judgment they don't make in practice |
| 2 | Can the pharmacist stop at any time? | Walk the technical-failure and fallback sections on any pharmacist scenario page | Whether "stop" is discoverable and unambiguous, not buried, and whether stopping ever looks like it might be interpreted as clinical completion (it must not — Workstream H) |
| 3 | Is required documentation complete? | Compare the assessment-link guard section against what a real virtual visit note would need | Whether anything a pharmacist would normally document has nowhere to go in this model — a real gap would be a finding, not something to paper over |
| 4 | Are identity and location checks usable? | Walk the identity/location/consent checklist on the pharmacist page | Whether the confirmation flow matches how they'd realistically confirm identity/location over telephone or video, given the design's explicit refusal to auto-infer location (Workstream E) |
| 5 | Is consent language understandable? | Read the privacy & consent section copy on the patient page | This prototype's copy is placeholder/structural, not legal/patient-facing wording — flag this explicitly as unresolved (Workstream K's retention table already marks legal wording as a named gap) rather than reviewing placeholder text as if it were final |
| 6 | Are additional participants visible? | Walk `authorized_interpreter_or_support_person` and `unauthorized_support_person` on both patient and pharmacist pages | Whether the disclosure is prominent enough in a real clinical moment, not just structurally present |
| 7 | Is switching modality clear? | Walk `patient_chooses_telephone_over_video` and the fallback scenarios | Whether a modality change reads as a deliberate, visible event to both parties, not a silent backend switch |
| 8 | Is technical failure distinguishable from clinical completion? | Compare `technical_failure_without_fallback` against `claim_guard_failure` (which has a real completion timestamp) | This is the single most safety-critical question in this whole review — confirm a pharmacist reading only the UI could never mistake one for the other |
| 9 | Does fallback add unnecessary delay? | Walk `technical_failure_with_approved_fallback` | Whether the "renew all guards" requirement (non-negotiable, Workstream H) feels proportionate or like friction a real pharmacist would route around — if the latter, that's a finding about training/UX, not a reason to weaken the guard |
| 10 | Is telephone fallback genuinely usable? | Walk `valid_telephone_visit` | Whether a telephone-only flow feels like a first-class path or an afterthought bolted onto a video-first design |
| 11 | Are secure-message expectations clear? | Walk `valid_secure_message_thread` on both pages | Whether the "this is not monitored continuously, don't use it for urgent issues" disclosure (Workstream I §7) is prominent enough that a patient would actually see it before sending |
| 12 | Does assessment linking save time without weakening clinical controls? | Walk the assessment-link guard section on `claim_guard_failure` (guard passes) vs `assessment_guard_failure` (guard fails) | Whether the guard list feels like a real safety net or bureaucratic friction — and confirm the reviewer agrees no guard should be removed to "save time" |
| 13 | Does the interface work in realistic pharmacy conditions? | Review with the pharmacy's real environment in mind: a shared workstation, patients waiting in person at the same time, interruptions | This can only be partially judged against a static synthetic prototype — flag explicitly as needing a real operational trial once production integration exists |
| 14 | Can a pharmacist complete frequent actions one-handed on mobile where applicable? | Resize to 375px and walk the pharmacist controls | See [`accessibility-and-responsive-evidence.md`](accessibility-and-responsive-evidence.md) — this specific item could not be captured live due to the sandbox's expired lifecycle window; the 56px target-size gap that review *did* find and fix is directly relevant here |

## 3. Format of the review record

When this review actually runs, record, per item above: reviewer name/credential, date, verdict
(supports / interferes / unclear), and free-text rationale. Do not average these into a single
score — a single "interferes" verdict on item 8 (technical failure vs. completion) should block
production readiness regardless of how the other thirteen items score, because of that item's
safety weight.

## 4. What this plan explicitly does not do

- It does not conduct the review itself.
- It does not select or approve a vendor, consent policy, or clinical workflow.
- It does not authorize a live patient pilot — the task brief prohibits that under this task,
  full stop.
- It does not substitute for Task 11's separate security/release gate or for the PIA/TRA/
  professional-review approvals named in the final report format.

## 5. Cross-references

Threat model: `virtual-care-threat-model.md` (especially threats #37/#38 on suitability
integrity and #47/#48 on completion/claim safety, which items 1, 8, and 12 above map to
directly). State machine: `failure-and-contingency-state-machine.md`. Accessibility: the
current, partial `accessibility-and-responsive-evidence.md`.
