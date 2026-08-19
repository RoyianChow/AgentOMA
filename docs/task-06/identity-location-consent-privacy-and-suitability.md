# Task 06 — Identity, Location, Consent, Privacy, and Suitability Gates

All five gates below are **synthetic-only in this task.** Every gate is designed to reuse
Task 05's *shape* (server-verified, actor ≠ subject, opaque references, no client-trusted
values) — but since Task 05 does not exist in this repository yet (confirmed in the
current-state analysis), "reuse Task 05's approved boundaries" is not literally possible today.
What follows is the contract Task 06's synthetic identity stub implements now, and the exact
shape Task 05's real patient-identity service must match before this stops being synthetic.

---

## 1. Identity

### The pattern being reused (not invented)

This repo already has exactly one server-side identity boundary that does this correctly:
`requirePortalUser()` (`src/lib/auth-guard.ts`) re-verifies, on **every single server action**,
never just at the route:

1. a live session (30-minute rolling idle, revocable),
2. mandatory second factor (TOTP),
3. tenant/pharmacy assignment,
4. an allowed role for the specific action.

Task 06's pharmacist-side identity check is **this exact function, unchanged** — there is no
second pharmacist identity system to build. The gap is entirely on the patient side, where no
equivalent exists.

### What the server must verify (patient side, synthetic stub now / Task 05 in production)

Mirroring `requirePortalUser()`'s shape exactly:

1. Patient session validity (synthetic session record in the prototype).
2. Correct audience and actor type (a patient token must be rejected by any pharmacist-only
   check, and vice versa — tested explicitly, see Required Tests).
3. Actor-to-subject binding (the authenticated actor is not automatically the record subject —
   this matters the moment a delegate is involved).
4. Custodian/pharmacy scope (which pharmacy this visit belongs to — reuses the existing
   single-tenant `PHARMACY_ID` pattern; a visit is never scoped by a client-supplied value).
5. Visit assignment (this actor is actually a participant on this specific visit).
6. Delegate grant, scope, expiry, and revocation, when the actor is not the subject
   (synthetic-only grant model here — see the threat model, Group A/C).
7. Participant role (patient / pharmacist / delegate / support-person / interpreter).
8. Required assurance level for the action being attempted (routine view vs. e.g. authorizing
   a delegate — kept as an explicit, checkable value rather than assumed uniform).
9. Current account and session status (not suspended, not revoked).

**In-session identity confirmation is additive, never a substitute.** A pharmacist visually
recognizing a returning patient, or the patient answering a knowledge question in-session,
*supplements* the server-side session check above — it never replaces it, and it is never by
itself sufficient to admit an unauthenticated party.

### Explicitly insufficient alone (each of these, alone, must be rejected as identity proof)

Meeting-link possession · caller ID · email address · telephone number · date of birth ·
address · health-card number · video appearance · knowledge of appointment details.

This list is enforced structurally, not just by policy: `IdentityAndLocationCheck` (Workstream
D) has no field that stores any of the above *as* an identity-outcome value — only a safe,
enumerated `identityConfirmationMethod` and a `confirmed/failed/pending/expired` outcome. There
is no code path where, say, a correct DOB alone can set `identityOutcome = confirmed`.

### What is never retained

No identity-document image, no video screenshot, at any point. `TechnologyReadinessResult` and
`IdentityAndLocationCheck` (Workstream D) both explicitly exclude any image/frame-capture field.

---

## 2. Location

### Why this is required even for a known, returning patient

The Virtual Care Policy requires location confirmation **per encounter**, not per patient — a
returning patient's location on file is a stale fact the moment they aren't demonstrably in the
same place. `IdentityAndLocationCheck` is visit-scoped, not patient-scoped, for exactly this
reason (Workstream D).

### Options for the minimum detail actually needed

| Purpose | Minimum detail required | What is explicitly NOT collected |
|---|---|---|
| Determine jurisdiction | A jurisdictional bucket: `ON` / `OTHER_CANADIAN_PROVINCE` / `NON_CANADIAN` / `UNKNOWN` | Exact address, GPS coordinates, postal code |
| Apply the cross-jurisdictional policy (OCP Cross-Jurisdictional Policy) | The same bucket, plus the resulting `crossJurisdictionalBlocked` boolean | Nothing further — the policy decision is binary at this level of detail |
| Execute an approved contingency/emergency process | The jurisdictional bucket is sufficient to know whether the pharmacy's own emergency contact procedures apply; a full 911-dispatchable address is **out of scope for this task** and would need its own separate, explicitly justified approval (per the task's own instruction: "Any exact-address requirement must be justified and approved separately") | Full street address |
| Meet documentation requirements | Confirmation method + patient/agent statement + jurisdictional value + time + confirming pharmacist, all recorded on `IdentityAndLocationCheck` | Raw free-text location narrative |

### What is never done

- **No automatic GPS collection.** No `navigator.geolocation` call exists anywhere in this
  design.
- **No IP-based jurisdiction inference.** `IdentityAndLocationCheck.locationStatement` is
  patient/agent-stated only, by construction — there is no server code path that derives
  `jurisdiction` from a request's IP address.

### What gets recorded (matches `IdentityAndLocationCheck`, Workstream D)

Confirmation method · patient-or-agent statement · required jurisdictional value ·
confirmation time · confirming pharmacist · safe outcome · whether a cross-jurisdictional
blocker resulted.

---

## 3. Consent

### The six things this repo must never conflate

| Consent type | Where it lives | Existing or new? |
|---|---|---|
| Choice to receive care virtually | `VirtualVisit.requestedModality` (a fact, not itself a consent record) | New |
| Consent to collect/use/disclose PHI via the selected technology | `VirtualCareConsentEvent`, `scope = collect_use_disclose` | New |
| Consent to the selected modality | `VirtualCareConsentEvent`, `scope = modality` | New |
| Consent to additional participants | `VirtualCareConsentEvent`, `scope = participants`, or the `Privacy confirmation` checklist item below | New |
| Consent to treatment or a procedure | `assessment.consent_method` / `consent_given_by` / `consent_obtained_at` | **Existing, Task 02-owned — untouched by this task** |
| Consent to recording | **Not applicable — recording stays disabled regardless of any consent value, full stop.** There is no `scope = recording` value in `VirtualCareConsentEvent`, because there is nothing for it to authorize. | N/A by design |

**Why this table matters more than it looks:** the single most likely real-world mistake here
is treating "the patient agreed to a video visit" as if it also means "the patient consented to
treatment" or "the patient consented to being recorded." This repo already keeps treatment
consent structurally separate (it's a set of columns on `assessment`, owned by Task 02); Task 06
adds a parallel, equally separate `VirtualCareConsentEvent` rather than extending or reusing
those columns.

### What every consent event preserves

Actor · subject · authorized-agent relationship (when applicable) · modality · scope ·
notice/wording version · capture method · effective time · withdrawal time · supersession ·
pharmacist witness (where applicable) · provenance. (Matches `VirtualCareConsentEvent`,
Workstream D, field-for-field.)

### Open policy question — explicitly not decided here

OCP's Supplemental Guidance allows *implied* consent when the patient initiates the
interaction (standards mapping §2). This task's non-negotiable invariants push toward
**always** requiring express modality consent, which is stricter than the regulatory floor.
Per the task's own instruction, this is kept **configurable and blocked pending review** — the
synthetic prototype defaults to always-express (the safer, stricter behavior) and the
`VirtualCareConsentEvent.captureMethod` field has room for an `implied` value that is not
enabled by any code path today. **This is a product/compliance decision, not resolved by this
document.**

---

## 4. Privacy confirmation

Before clinical interaction, the pharmacist confirms, as a discrete checklist (not a single
checkbox — each item independently recorded):

1. The pharmacist is in an appropriate private environment.
2. The patient has been advised to use a private environment.
3. The patient understands people nearby may hear or see PHI.
4. Everyone present on both sides has been disclosed (ties directly into `VisitParticipant` —
   nobody reaches this checklist item true while an undisclosed participant exists).
5. The patient consents to any additional authorized participants.
6. The selected technology's privacy limitations have been explained, in approved (not
   improvised) language.

**What this checklist explicitly never claims:** absolute confidentiality or security. The
approved language for item 6 must state limitations honestly — this is a documentation
requirement on the *language*, not a design detail this task invents (the actual wording needs
professional/privacy review before production, per the task's general instruction against
inventing consent language).

---

## 5. Suitability

### The enum (pharmacist-only, exactly as specified)

`PENDING | SUITABLE | SUITABLE_WITH_LIMITATIONS | UNSUITABLE | REASSESSMENT_REQUIRED`

### What the system may and may not do

- **May:** display which prerequisites (identity/location/consent/privacy/technical-readiness)
  are still incomplete.
- **May not:** recommend, default to, or pre-select an outcome. There is no scoring, no
  "looks suitable" hint — `ModalitySuitabilityDecision.state` starts at `PENDING` and only a
  pharmacist-role write can move it, matching Workstream D's contract exactly.

### What the pharmacist must be able to do (all match `ModalitySuitabilityDecision` +
`ContingencyPlan`, Workstream D)

- Mark unsuitable **before** the visit begins.
- Mark unsuitable **during** the visit.
- Record an approved structured reason (`structuredReasonCode` — a safe enum, not free text).
- Add clinically necessary rationale to the **proper clinical record** (Task 02's assessment,
  via `VisitAssessmentLink`) — **never** to application logs or `VirtualVisitAuditEvent`
  metadata.
- Select an approved contingency: in-person, telephone, or referral.
- Stop without completing the assessment — this is the "unsuitability must not force
  assessment/claim completion" invariant, and it's structurally true here: nothing in
  `ModalitySuitabilityDecision` or `ContingencyPlan` has a write path toward
  `assessment.consent_method` or claim creation. Only the pharmacist's separate, explicit
  completion action in the *existing* Task 02 flow can do that.
- Reassess after: modality change, material connection degradation, participant change, or
  location change — each of these is a named `reassessmentTriggerRef` value on
  `ModalitySuitabilityDecision` (Workstream D), not an implicit side effect of some other
  write.

---

## Cross-references

This document defines *policy and gate behavior*. The underlying data shapes are Workstream D's
`IdentityAndLocationCheck`, `VirtualCareConsentEvent`, `ModalitySuitabilityDecision`,
`ContingencyPlan`. The *order* these gates must be (re)checked in — waiting-room entry,
admission, before clinical interaction, before secure-message release, after reconnect, after
participant/location/modality change, before assessment read/write, before claim action — is
Workstream J's assessment-and-claim-integration-boundary document (not yet produced).
