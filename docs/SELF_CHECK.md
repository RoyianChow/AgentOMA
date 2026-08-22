# Public self-check and pre-visit PDF

**Status:** clinically approved, available in production, and beta-ready for
guided user feedback

**Route:** `/check`

**Clinical approval:** P0-A satisfied on 2026-07-26; see
[`CLINICAL_APPROVAL.md`](CLINICAL_APPROVAL.md)

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
- **Production release is tied to the approved artifact.** The route is public
  after P0-A sign-off. A hash-backed test prevents changed clinical content from
  silently inheriting the approval.

## Outcome branches

- A funded path with no selected red flag produces a pre-visit PDF containing
  the question/answer trail, suspected ailment group, and generation time in a
  branded report layout. Repetitive `self-reported` labels are omitted from the
  report body; the fine print explains once that the answers have not been
  clinically verified and that the pharmacist must perform their own
  assessment.
- A red flag, emergency response, out-of-scope path, or unresolved path produces
  an advisory PDF. The advisory model has no ailment field and presents no
  billing framing. It reports what the person selected and directs them to be
  seen without inventing an urgency grade beyond the emergency screen.

Both documents use the AgentOMA logo and place the privacy, clinical, funding,
and billing limitations in fine print at the bottom of every page. They state
that the report is not a diagnosis or prescription and that nothing has been
billed or submitted. Emergency and other next-step guidance remains prominent
in the report body rather than being reduced to fine print.

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
| Approval and change control | `docs/CLINICAL_APPROVAL.md` |

## Beta experience

The public flow now uses a dedicated, mobile-first AgentOMA shell rather than
site chrome. It provides:

- a short plain-language introduction explaining what the self-check can and
  cannot do;
- a visible beta label, persistent exit, and three-stage progress indicator;
- programmatic focus on each new question for keyboard and screen-reader users;
- 56px answer and action targets, visible focus states, reduced-motion support,
  and live selection counts;
- a fixed mobile action dock on the long emergency and red-flag screens, so the
  way forward remains visible at 375px without changing any approved question;
- a clearer result card, practical next steps, and a plain explanation of the
  private PDF boundary; and
- a visible flagged-item list that is not suppressed by the marketing site's
  global list reset.

These are presentation and accessibility changes only. The flow continues to
import the hash-approved emergency signs, narrowing tree, red flags, labels,
and outcomes directly from `src/config/triage.ts`.

## Latest usability evidence

The 2026-07-28 375×812 pass successfully generated both PDF branches. Browser
network evidence showed static asset requests and local `blob:` downloads only:
no answer POST, server round trip, retained browser storage, or console error
was observed.

The earlier below-the-fold emergency action is now addressed by a fixed,
safe-area-aware mobile action dock. The focused test suite also forces PDF
generation to fail and verifies that neither the health-answer payload nor the
thrown error is written to `console.log`, `console.warn`, or `console.error`.

Remaining beta evidence:

- repeat the full pre-visit and advisory paths on physical iOS and Android
  devices at 375px-equivalent width, including browser zoom and large text;
- confirm the fixed action dock does not obscure content with each device's
  browser controls and safe-area inset; and
- repeat a keyboard and screen-reader pass for the new focus and progress
  semantics.

See [`worklogs/p1-7-usability-a11y-375px.md`](worklogs/p1-7-usability-a11y-375px.md)
for measurements and scope.

## Reversal control

Showing billing data, persisting answers, or collecting a health number or
demographic identifier is a new feature brief. Each change requires privacy and
clinical review; it must not be introduced as a quiet amendment.

Changing any clinical question, route, emergency sign, red flag, threshold, or
outcome also invalidates the recorded P0-A approval until a pharmacist reviews
the new artifact.
