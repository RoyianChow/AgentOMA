# Task 06 — Waiting Room, Join Security, and Participant Controls

Defines the deterministic synthetic waiting room, the pharmacist's participant controls, the
privacy properties the waiting room must prove, and the full session lifecycle. Builds directly
on Workstream D's `VirtualVisit` / `VisitParticipant` / `ParticipantAuthorization` contracts and
Workstream E's identity/location/consent/suitability gates.

---

## 1. Patient behavior

| Capability | Backing contract / control |
|---|---|
| Review a plain-language privacy notice | Shown before any gate starts; notice version recorded on the first `VirtualCareConsentEvent` |
| Complete a synthetic device check | `TechnologyReadinessResult` (Workstream D) |
| View an accessible telephone fallback | Always visible, not hidden behind a video-failure state — telephone is a first-class option per Workstream B's build-vs-integrate exception |
| Confirm current location | `IdentityAndLocationCheck` (Workstream E) |
| Review and provide synthetic consent | `VirtualCareConsentEvent` |
| Enter the waiting room | `VisitParticipant.state = waiting` (via `ParticipantAuthorization`) |
| See a non-PHI status | Status surface reads only `VirtualVisit.workflowState`/`connectionState` — never participant names, never other patients' presence |
| Leave voluntarily | Sets `VisitParticipant.leftAt`; **does not** touch `VirtualVisit.pharmacistCompletionAt` (see threat model Group D — this is the single most important non-negotiable here) |
| Rejoin when permitted | Re-runs the full join-authorization sequence (§5) — never a cached "already admitted" shortcut |
| Recover from expiry safely | A clear, non-alarming expired state; a fresh join attempt starts a new lifecycle, not a revived old one |
| Request technical help without sending PHI | The help request is a safe reason code + non-PHI free text bound length, never routed through anything that logs PHI |
| See when the pharmacist determines another modality is required | Reflects `FallbackTransition`/`ModalitySuitabilityDecision` state — patient sees the outcome, never the clinical rationale behind it |

## 2. Pharmacist controls

| Capability | Backing contract / control |
|---|---|
| View only assigned visits | Query scoped by `pharmacistActorRef = requirePortalUser().userId` — same scoping shape as every existing pharmacist query in this repo (`pharmacyId` scoping via `requirePortalUser`) |
| See minimum necessary waiting-room information | No clinical content pre-admission; participant identity is what's shown, not chart content |
| Admit or deny an authorized participant | `ParticipantAuthorization.state` transition, pharmacist-actor only |
| Confirm patient identity | Writes `IdentityAndLocationCheck.identityOutcome` |
| Confirm patient location | Writes `IdentityAndLocationCheck.jurisdiction`/`locationStatement` |
| Confirm participant identities and roles | Per-`VisitParticipant`, before `disclosedToPatientAt` is set |
| Record patient consent | Writes `VirtualCareConsentEvent` |
| Record privacy confirmation | The 6-item checklist (Workstream E §4) |
| Record modality suitability | `ModalitySuitabilityDecision`, pharmacist-role-only write |
| Select an approved contingency | `ContingencyPlan` |
| Remove an unauthorized participant | `ParticipantAuthorization.state = removed`; immediately revokes that participant's ability to read/write anything on the visit (rechecked, not cached) |
| Lock the participant roster | A `VirtualVisit`-level flag preventing further `ParticipantAuthorization` admissions without an explicit pharmacist override |
| Mark a technical interruption | `TechnicalFailureEvent` / `VisitInterruption` |
| Permit guarded rejoin | Re-runs §5's full sequence — pharmacist "permits" it, but the server still re-verifies every gate; permission is not a bypass |
| Resume through an approved fallback | `FallbackTransition`, with `renewedGuardsRef` proving every gate was rechecked |
| End the professional interaction | Sets `VirtualVisit.pharmacistCompletionActorRef`/`pharmacistCompletionAt` — the **only** write path to this field in the entire schema |
| Mark the visit unsuitable without completing the assessment | `ModalitySuitabilityDecision.state = UNSUITABLE` has no dependency on, or effect on, assessment/claim state |
| Navigate to the existing assessment only after server guards pass | `VisitAssessmentLink`, gated by Workstream J's full guard list (next deliverable) |

**No recording or transcription control exists anywhere in this list** — not hidden, not
disabled-by-default-but-present. There is no button, no server action, no adapter method for
either, matching the non-negotiable invariant and the sandbox's own media-prohibition
requirement (Task 01).

## 3. Waiting-room privacy — required proofs

| Property | How it's proven, not just asserted |
|---|---|
| Patients cannot see other patients | Waiting-room query is filtered to `actorRef = current session actor` — there is no roster endpoint that returns cross-patient rows. Tested via an architecture test asserting the query shape, not just manual inspection. |
| Patients cannot hear or view the clinical session before admission | No media path exists pre-admission in the synthetic design at all — this is a structural absence, not a permission check that could be misconfigured. |
| Participant names are not exposed to unrelated users | Names/identity only ever reach the pharmacist's admitted-roster view and the patient's own participant row — never a shared/global endpoint. |
| Room IDs are opaque | `VirtualVisit.id` is a UUID with no embedded sequence, patient reference, or guessable structure. |
| A room ID does not grant access | Join requires the full §5 authorization sequence; presenting an ID alone (no valid session) is denied at the first check. |
| Waiting-room metadata is minimized | The status surface (§1) is the only thing exposed — no participant list, no clinical hints. |
| No PHI in page titles, URLs, browser history, notifications, or logs | Enforced by the same leakage-test class as the rest of this task (Workstream C, Group G) — opaque visit reference only, never a name or health detail. |
| The waiting room expires | `VirtualVisit` has no indefinite `waiting` state — absolute expiry is a defined transition in the state machine (Workstream H). |
| A stale room cannot be reopened | Expiry is a one-way transition; reactivating requires a genuinely new `VirtualVisit`, not resetting a timestamp on the old one — mirrors Task 01's own "DISABLED/EXPIRED cannot be reactivated by changing a browser value" rule, applied here. |
| A forwarded link does not authorize a different actor | Authorization binds to the authenticated session's actor reference, not to the link/token itself (threat model Group A). |
| A duplicate tab cannot create a second authoritative participant | `VisitParticipant` admission is idempotent per actor — a second tab from the same authenticated actor reflects the same participant row, never creates a second one with independent authority. |
| A removed participant cannot rejoin with a stale credential | Removal invalidates the specific authorization; rejoin re-runs the full sequence and finds `state = removed`, denying it — a stale client-held credential is re-checked against current server state every time, never trusted at face value. |
| Rejoin does not bypass consent, identity, location, or suitability checks | Rejoin is defined as a subset of §5's join-authorization sequence, not a separate shortcut path — there is no "already passed once" cache that skips a gate. |

## 4. No reusable bearer tokens in query strings or calendar invitations

Any join reference passed to the patient is either: (a) delivered via an already-authenticated
session context (no token needed once logged in — irrelevant until Task 05 exists), or (b) a
**short-lived, single-use** bootstrap value if a pre-authentication join step is ever needed —
never placed in a query string as a standing credential, and never embedded in a calendar
invitation (which Task 06 does not create in this task regardless — external
invites/notifications are Task 07's stubbed responsibility).

## 5. Session lifecycle

| Stage | Definition |
|---|---|
| Visit creation | `VirtualVisit` row created, `workflowState = draft` or `scheduled` |
| Participant assignment | `VisitParticipant` rows created for the intended patient (and pharmacist once assigned) |
| Join authorization | Full sequence: session validity → audience/actor-type → actor-subject binding → tenant/pharmacy scope → visit assignment → delegate grant (if applicable) → participant role → assurance level → account/session status (Workstream E §1) |
| One-time bootstrap behavior, if needed | Single-use, short-lived, consumed on first successful authentication exchange — never reusable after |
| Waiting-room entry | `VisitParticipant.state = waiting` after join authorization passes |
| Pharmacist admission | `ParticipantAuthorization.state = admitted`, pharmacist-actor-only write |
| Session rotation | New session identifier issued after any material assurance change (mirrors Task 05's eventual session-rotation requirement) |
| Idle expiry | Time-bounded, same rolling-idle philosophy as the existing 30-minute pharmacist session |
| Absolute expiry | A hard ceiling regardless of activity — prevents an indefinitely "waiting" visit |
| Duplicate-tab handling | See §3 — idempotent per actor |
| Concurrent-device handling | Same actor from two devices resolves to the same `VisitParticipant` row; no independent authority granted per device |
| Disconnect grace period | Bounded window before a disconnect becomes a `VisitInterruption` requiring pharmacist-guided rejoin/fallback rather than silent auto-resume |
| Rejoin authorization | Full §5 sequence, not a shortcut (§3) |
| Rejoin credential rotation | Any bootstrap/session token is rotated on rejoin, never reused verbatim |
| Participant removal | `ParticipantAuthorization.state = removed`, immediate effect, no grace period for the removed party |
| Patient departure | `VisitParticipant.leftAt` set — explicitly **not** a completion signal (§1) |
| Pharmacist completion | The one explicit, pharmacist-actor-only write to `pharmacistCompletionAt` |
| Visit cancellation | A distinct `workflowState`, available before the visit starts |
| Visit expiry | Absolute-expiry transition, applies to the whole visit not just the waiting room |
| Revocation | Session/grant revocation takes effect immediately server-side — no path relies on a client noticing and logging out voluntarily |
| Vendor-session cleanup | `VendorSessionReference` teardown on visit end/expiry/cancellation — not left dangling (relevant once a vendor exists; the synthetic adapter proves the cleanup call happens) |
| Cache invalidation | No protected visit/waiting-room response is cacheable by an intermediary (mirrors the existing `PHARMACIST_ROUTE_HEADERS` `private, no-store` pattern — the sandbox's own headers module applies the equivalent to its synthetic routes) |

---

## Cross-references

This document defines *behavior*; Workstream H (failure-and-contingency state machine, not yet
produced) defines the exact, exhaustive state-transition table this lifecycle maps onto, and
Workstream L (synthetic prototype) is where these controls actually get built and tested
against the required scenario list (duplicate tab, wrong-patient join, expired join, replayed
join, forwarded join, etc.).
