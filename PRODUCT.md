# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are Ontario pharmacists and pharmacy team members completing
minor-ailment work in a busy community-pharmacy setting. They need a clear,
defensible path from patient handoff through clinical documentation,
claim-draft preparation, follow-up, and record governance.

Patients and caregivers are secondary users. They may be unwell, supporting a
child, or using a phone at the pharmacy counter. Public surfaces must be simple,
reassuring, accessible, and honest about what the software can and cannot do.

Pharmacy administrators and reviewers use the portal for team access,
orientation status, audit review, retention, export, and governance evidence.

## Product Purpose

AgentOMA helps an Ontario pharmacy conduct and document publicly funded
minor-ailment services. It turns a zero-PHI patient intake into a
pharmacist-reviewed clinical record, follow-up plan, and defensible claim draft.
Success means the pharmacist can complete the workflow efficiently without the
interface weakening clinical judgment, billing controls, patient choice,
privacy, or auditability.

The public self-check helps an Ontarian understand whether speaking with a
pharmacist may be appropriate. It is not a diagnosis, prescription, eligibility
decision, or claim submission.

## Positioning

AgentOMA is an Ontario-specific, pharmacist-supervised workflow rather than a
generic telehealth form or autonomous diagnostic system. Its differentiator is
the combination of zero-PHI public intake, regulated pharmacist review,
reference-derived claim drafting, required follow-up, and an immutable record
that can withstand post-payment review.

AgentOMA does not submit claims to HNS. It prepares a read-only draft for
hand-entry into the pharmacy's dispensing software.

## Operating Context

- A patient may use `/assessment` on a phone while standing in a pharmacy.
- A member of the pharmacy team retrieves the handoff and works in the
  authenticated `/pharmacist/*` portal.
- Pharmacists may be working quickly at a counter and remain professionally
  accountable for every completed assessment and claim draft.
- `/check` is a public, pharmacy-agnostic self-check with no identifying data or
  persistence.
- `/demo` is a public, synthetic, read-only product tour and never creates a
  portal session.
- Governance and audit surfaces support record review, retention, export,
  correction, holds, and recovery evidence.

## Capabilities and Constraints

- The platform is a single-pharmacy, authenticated pilot and is not
  production-ready.
- The patient intake and public self-check collect zero PHI.
- Necessary PHI may exist transiently only in authenticated pharmacist forms
  and must not enter browser persistence, URLs, logs, analytics, or unnecessary
  client props.
- Clinical rules and billing reference data are protected sources. Design work
  may improve presentation but must never rewrite, infer, or duplicate them.
- A red-flag exit creates no claim row and must remain visually distinct from a
  completed assessment that ends in referral.
- Claim-history language is advisory. Only HNS adjudication determines payment.
- Better Auth email/password plus mandatory TOTP protects the pharmacist portal.
- `src/proxy.ts` is an optimistic navigation gate only; server actions enforce
  authorization.
- `/api/fhir` remains disabled with `403`.
- Experimental Task 01-14 capabilities remain isolated under
  `apps/experiment-sandbox/` and have no production authority.

## Brand Commitments

The product name is **AgentOMA**. **AgentRx** is a roadmap/program label and is
not the live product name.

The product voice is quiet, exact, calm, and candid about uncertainty. It never
overstates diagnosis, eligibility, payment, successful handoff, or professional
completion. Patient-facing language should be plain enough for an average
Ontarian and respectful of someone who may be anxious, unwell, or caring for
another person.

Existing company marks and public assets are the only approved brand assets.
Future work must not invent customers, endorsements, clinical outcomes,
performance claims, or Ministry/OCP affiliation.

## Evidence on Hand

- `docs/PROJECT_OVERVIEW.md` documents the implemented routes, architecture,
  workflows, and current release status.
- `docs/PRODUCT_PRINCIPLES.md` records the product's safety philosophy and
  voice.
- `docs/COMPLIANCE.md` maps implemented rules to the Executive Officer Notice.
- `docs/CLINICAL_APPROVAL.md` binds the approved triage artifact.
- `docs/SELF_CHECK.md` records the public self-check boundaries.
- `/demo` provides a synthetic walkthrough of the current product.
- The repository contains no approved testimonials, customer logos, outcome
  studies, pricing claims, or production-readiness claim; future designs must
  not fabricate them.

## Product Principles

1. Refuse unknown or unsafe states instead of guessing or defaulting.
2. Keep patient and pharmacist workflows calm, legible, and explicit about the
   next action.
3. Make regulated distinctions visible rather than hiding them behind generic
   statuses.
4. Collect and expose only the minimum information required for the current
   user and task.
5. Treat follow-up, auditability, and correction history as first-class product
   experiences rather than backend plumbing.

## Accessibility & Inclusion

The public intake must remain usable one-handed on a 375px viewport with large
tap targets, strong hierarchy, reduced-motion support, and one clear question
at a time. All surfaces must support keyboard navigation, visible focus,
semantic structure, readable contrast, zoom/reflow, and screen readers.
Language must not assume clinical, billing, or technical knowledge.
