# Task 06 — secure pharmacist-led virtual care

**Owner profile:** virtual-care integration developer

**Priority:** P1/P2

**Status:** design/stubs only until privacy, vendor, and professional review

## Goal

Add secure telephone/video/messaging visit support while preserving pharmacist
judgment, the same standard of care as in person, and a safe fallback when the
modality is unsuitable or fails.

## Scope

- Evaluate whether to integrate an Ontario Health-verified solution or pursue
  verification for a custom solution; document the decision.
- Capture patient and pharmacist location, identity-verification method,
  virtual-modality consent, privacy confirmation, technology suitability, and
  fallback plan.
- Create pre-visit browser/device/connectivity checks with an accessible
  telephone fallback.
- Let the pharmacist mark virtual care unsuitable and move to in-person or
  referral without forcing completion.
- Record modality and technical failure without recording session media.
- Add waiting-room privacy, session expiry, participant authorization, and
  disconnect/rejoin behaviour.
- Connect to the existing assessment only after every server guard is rechecked.

## Out of scope

- Recording audio/video by default.
- Automated virtual-care suitability, diagnosis, prescribing, or referral.
- Reusing consumer meeting links or placing PHI in calendar invitations.
- Cross-jurisdictional care without separate review.

## Dependencies

- Tasks 02, 05, and 11.
- Current OCP Virtual Care Policy and supplemental guidance review.
- PIA/TRA, vendor/contract review, Canadian-residency evidence, and applicable
  Ontario Health verification.

## Deliverables

1. Build-vs-integrate decision and vendor assessment.
2. Virtual-visit data flow and consent/identity/location schema proposal.
3. Synthetic waiting room and pharmacist controls.
4. Failure/contingency state machine.
5. Privacy, accessibility, security, and clinical-validation plan.

## Acceptance criteria

- Only authenticated, authorized participants can join a visit.
- The pharmacist makes and records the modality-appropriateness decision.
- Identity, location, consent, method, and contingency fields are complete
  before clinical interaction.
- Technical failure cannot produce a completed assessment or claim.
- No session token or PHI appears in logs, analytics, or unsecured messages.
- A patient can switch safely to the approved fallback path.

## Tests

- Unauthorized/expired/wrong-patient join attempts.
- Disconnect, reconnect, device failure, duplicate-tab, and timeout cases.
- Consent withdrawal and pharmacist-unsuitable paths.
- 375px, keyboard, screen reader, low bandwidth, and reduced-motion evidence.
