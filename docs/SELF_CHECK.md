# Public self-check and pre-visit PDF

**Status:** implemented for development review; hard-blocked in production

**Route:** `/check`

**Release gate:** P0-A pharmacist sign-off on `src/config/triage.ts`

This page is the current decision and implementation record for the
pharmacy-agnostic, unauthenticated self-check. It supersedes earlier feature
notes on this topic.

## Product boundary

The self-check helps a person prepare for a visit to any Ontario pharmacy. It
does not identify a pharmacy or patient, diagnose, prescribe, assess public
funding eligibility, create a clinical record, derive billing data, or submit
anything to HNS.

The pharmacist still performs and documents the actual assessment.

## Approved decisions

- **No PIN or other billing details.** A PIN needs a completed assessment's
  modality and prescription outcome. It appears only in the authenticated,
  read-only claim-draft panel after a real assessment.
- **No persistence.** State exists only in React memory. PDF generation is
  client-side. There is no server action, request payload, database/object
  storage write, cache, temporary file, analytics payload, or browser storage.
- **No health-card or eligibility number.** This flow cannot verify eligibility.
- **No demographics.** It collects no name, date of birth, age, sex, gender, or
  other identifying field. The frozen red-flag questions already ask the
  relevant self-reported safety questions.
- **No production release before P0-A.** `src/app/(self-check)/check/page.tsx`
  returns a 404 in every production build. Removing that gate requires a
  reviewed code change after clinical sign-off.

## Outcome branches

- A funded path with no selected red flag produces a pre-visit PDF containing
  the self-reported question/answer trail, suspected ailment group, generation
  time, disclaimers, and a note that the pharmacist must perform their own
  assessment.
- A red flag, emergency response, out-of-scope path, or unresolved path produces
  an advisory PDF. The advisory model has no ailment field and presents no
  billing framing. It reports what the person selected and directs them to be
  seen without inventing an urgency grade beyond the emergency screen.

Both documents state that they are not a diagnosis or prescription and that
nothing has been billed or submitted.

## Implementation map

| Concern | Location |
|---|---|
| Production gate and metadata | `src/app/(self-check)/check/page.tsx` |
| In-memory flow | `src/app/(self-check)/check/SelfCheckFlow.tsx` |
| Isolated presentation | `src/app/(self-check)/check/SelfCheckFlow.module.css` |
| Typed document branches | `src/lib/self-check/model.ts` |
| Browser-only PDF generation | `src/lib/self-check/pdf.ts` |
| Safety/tombstone tests | `src/lib/self-check/__tests__/` |
| Shared frozen clinical source | `src/config/triage.ts` |

## Reversal control

Showing billing data, persisting answers, or collecting a health number or
demographic identifier is a new feature brief. Each change requires privacy and
clinical review; it must not be introduced as a quiet amendment.
