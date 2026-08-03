# Task 06 — Virtual-Care Threat Model

Covers telephone, video, secure messaging, fallback, and assessment/claim integration.
Threats that share an identical control shape are grouped into one row (named individually so
nothing required is silently dropped) — this keeps the model reviewable rather than 60+ near-
duplicate rows saying the same thing.

## Actors — mapped to existing roles, or marked blocked

| Conceptual actor | Mapping |
|---|---|
| Patient | **Blocked — no production mapping.** No patient session/account exists anywhere in this repo (Task 05 gap). Modeled only as a synthetic actor in the prototype. |
| Verified caregiver / delegate | **Blocked** — same reason; also depends on Task 05's delegation model, which doesn't exist. |
| Substitute decision-maker | **Partially exists as a data field, not an actor.** `assessment.consent_given_by = 'substitute_decision_maker'` is pharmacist-entered text today, not an authenticated party. Blocked as an actor for this task. |
| Pharmacist | **Exists.** `PortalUser` with role `pharmacist` or `pharmacy_admin` (`ASSESSING_ROLES`), via `requirePortalUser()`. |
| Pharmacy administrator | **Exists.** Role `pharmacy_admin`. |
| Authorized support person / interpreter | **Blocked** — no such role or grant model exists. Synthetic-only. |
| Technical support staff | **Blocked** — the existing `technician` role is a dispensing-support role, not an IT/support role with elevated access. No technical-support access path exists. |
| AgentRx patient application | **Does not exist.** Would be built as a new surface inside `apps/experiment-sandbox/` for the prototype only. |
| AgentRx pharmacist application | **Exists.** `/pharmacist/*` under `requirePortalUser`/`requirePortalPage`. |
| Task 05 identity service | **Does not exist.** Synthetic stub only (see current-state analysis §2). |
| Virtual-visit orchestration service | **Does not exist.** This task's own deliverable, built in the sandbox. |
| Vendor media/messaging service | **Not selected.** Workstream B recommends hybrid but names no vendor. |
| PSTN/SIP provider | **Not selected**, and per Workstream B's telephone exception, may not be required at all. |
| TURN/STUN/SFU services | **Not selected.** |
| Webhook receiver | **Does not exist.** Built as a synthetic, non-networked stub only. |
| Task 02 assessment service | **Exists.** `createAssessment` / `deriveClaimDraft` in `pharmacist/actions.ts`, `src/lib/claims/derive-claim-draft.ts`. |
| Existing claim service | **Exists.** Same as above — `assessment_billability_evidence`, claim-draft derivation. |
| Audit service | **Exists.** `audit_log` (DB-enforced append-only), `writeAudit`/`writeAuditWith`. |
| Notification service stub | **Does not exist** (Task 07 gap). Modeled as a stub only. |
| Malicious unauthenticated user | Generic — no repo-specific mapping needed. |
| Malicious or compromised participant | Generic. |
| Compromised browser or device | Generic. |
| Insider with excessive access | Maps to `pharmacy_admin`/`pharmacist` roles — the existing model already has no "support" tier with broader-than-clinical access, which is a *good* starting property for this threat, not a gap. |
| Compromised vendor or subprocessor | N/A until a vendor is selected (Workstream B). |

## Assets

Patient/pharmacist identities · actor-to-subject relationships · visit assignments · join/rejoin
credentials · waiting-room state · consent events · identity-verification results · location
confirmation · suitability decisions · contingency plans · participant authorization ·
secure-message content · message delivery metadata · media negotiation metadata (SDP/ICE) ·
vendor credentials · webhook secrets · assessment relationships · technical-failure records ·
audit records · clinical documentation · claim eligibility state.

---

## Threat groups

### A — Join, token, and authorization threats

Covers: meeting/room enumeration · forwarded/reused invitation · link preview/scanner
consumption · token theft/replay/fixation · wrong-patient join · wrong-pharmacy/wrong-assessment
join · patient token accepted as pharmacist · pharmacist token accepted as patient · delegate
joining after grant expiry/revocation · unauthorized support person · participant role
escalation · cross-tenant BOLA/IDOR · client-supplied actor/subject/role/pharmacy/visit/
assessment substitution · CSRF/cross-origin WebSocket attacks · duplicate tabs · concurrent join
from multiple devices · stale rejoin credential.

| Field | Detail |
|---|---|
| Scenario | A party who is not the intended, currently-authorized participant reaches a visit, or reaches it in the wrong role, via a forwarded link, replayed token, stale credential, or a client-supplied identity/role/scope value. |
| Entry point | Visit join endpoint, waiting-room entry, any server action accepting a visit/participant/role reference. |
| Asset | Join credentials, participant authorization, patient/pharmacist identities, PHI accessible once admitted. |
| Preconditions | A token or room identifier is known outside its intended single recipient, or a request omits/forges the actor-type check. |
| Likelihood | Medium — link forwarding and multi-tab behavior are ordinary user actions, not sophisticated attacks; the design must assume they will happen accidentally, not just adversarially. |
| Impact | High — cross-patient PHI exposure, or a patient reaching pharmacist-only controls. |
| Preventive controls | Every join/admit/resume/rejoin action re-verifies session, actor type, audience, subject binding, and visit assignment server-side (mirrors `requirePortalUser`'s existing pattern) — never trusts a client-supplied role or ID. Possession of a room identifier or link grants no authority (matches this repo's existing `PHARMACY_MISMATCH`-style hard denial pattern). Tokens are single-use where the flow allows it, short-lived, and audience-bound. |
| Detective controls | Audit event on every join allowed/denied, with actor/subject/outcome; anomalous join-denial rate flagged for suspicious-access review (design only — no automated response in this task). |
| Response controls | Server-side session/credential revocation; participant removal; state recheck before any delayed action recheck. |
| Test evidence | Required tests: "An expired session cannot join," "A wrong-patient session cannot join," "A forwarded link grants no authority," "A patient session cannot act as pharmacist," "A removed participant cannot rejoin" (see Required Tests deliverable). |
| Residual risk | A stolen, still-valid, correctly-scoped credential (e.g., an unlocked phone) cannot be distinguished from its rightful holder by this layer alone — mitigated by Task 05's session assurance model, not solved here. |
| Approval owner | Security/privacy reviewer. |

### B — Waiting-room privacy threats

Covers: hidden/unannounced participant · patient-to-patient waiting-room exposure · waiting-room
audio/video leakage · host impersonation.

| Field | Detail |
|---|---|
| Scenario | One waiting patient can see, hear, or infer the presence/identity of another; or a participant is admitted/present without being visibly disclosed to the pharmacist and acknowledged by the patient. |
| Entry point | Waiting-room UI, participant roster endpoint. |
| Asset | Waiting-room state, patient identities, participant authorization. |
| Preconditions | Waiting-room membership or media is broadcast rather than individually scoped per patient. |
| Likelihood | Low if built server-scoped from the start (this is a design property, not a race condition) — but High impact if missed, so treated as a hard invariant, not a probabilistic risk. |
| Impact | High — direct cross-patient PHI/presence exposure; also an explicit non-negotiable invariant ("Other waiting patients must never see or hear one another"). |
| Preventive controls | Per-patient-scoped waiting-room queries (never a shared roster query); no pre-admission media path exists at all in the synthetic design; every participant must be visible to the pharmacist and acknowledged by the patient before substantive interaction. |
| Detective controls | Test-only: architecture tests proving the waiting-room query cannot return another patient's row. |
| Response controls | N/A in the synthetic prototype (no real media to interrupt) — production design requires an immediate kill/removal path. |
| Test evidence | "Patient isolation," "No patient-to-patient visibility," "No pre-admission media," "No hidden participants" (Required Tests §Waiting-room). |
| Residual risk | None identified for the synthetic design; production media-layer waiting-room leakage risk is a vendor-integration-time question (Workstream B gate G-V3/G-V4). |
| Approval owner | Security/privacy reviewer. |

### C — Identity, location, consent, and suitability threats

Covers: consent bypass/stale consent · consent-withdrawal race · location falsification ·
cross-jurisdictional care · patient token at pharmacist boundary reused for suitability
manipulation (i.e., a patient attempting to set/bypass suitability).

| Field | Detail |
|---|---|
| Scenario | Interaction proceeds without current identity/location/consent/suitability confirmation, or a non-pharmacist actor influences the suitability decision, or a jurisdiction check is skipped or inferred rather than confirmed. |
| Entry point | Pre-visit gate checks, suitability-recording endpoint, fallback-transition endpoint. |
| Asset | Consent events, identity/location-check results, suitability decisions. |
| Preconditions | A gate check is treated as satisfied by a stale record, or a client-supplied value is trusted for jurisdiction/consent/suitability. |
| Likelihood | Medium — most likely via reconnect/modality-switch code paths that forget to recheck a gate that already passed once. |
| Impact | High — an unsuitable or non-consented interaction proceeds; a cross-jurisdictional visit occurs without review. |
| Preventive controls | Identity/location/consent/privacy/technical-readiness/contingency/suitability all required complete *before* substantive clinical interaction (non-negotiable invariant); suitability is a pharmacist-only enum, never client-writable; location is patient/agent-stated only, never IP/GPS-inferred; reassessment required on modality change, connection degradation, or participant/location change. |
| Detective controls | Audit event on every consent/location/suitability capture and every reassessment trigger. |
| Response controls | Consent withdrawal blocks further interaction immediately, even if the connection stays technically active. |
| Test evidence | "Consent withdrawn," "Location outside approved jurisdiction," "Unauthorized actor attempting to set suitability," "Clinical interaction blocked until all gates pass" (Required Tests §Consent/identity/location/suitability). |
| Residual risk | A patient can misstate their location; the design can require a statement, not verify ground truth — documented, not solved, per the task's own scope limits. |
| Approval owner | Product/compliance lead (cross-jurisdictional policy specifically), security/privacy reviewer (everything else in this group). |

### D — Connection, disconnect, and fallback threats

Covers: disconnect during clinically important interaction · reconnect to a stale/completed
visit · fallback without renewed suitability/consent · network degradation hiding clinically
important cues · microphone/camera/speaker/permission failure · technical failure incorrectly
completing an assessment · session end incorrectly generating a claim · vendor "meeting ended"
webhook confusion.

| Field | Detail |
|---|---|
| Scenario | A technical event (disconnect, timeout, degraded connection, vendor webhook) is misinterpreted by the system as a clinical or professional completion event. |
| Entry point | Connection-state transition handler, webhook receiver, fallback-transition endpoint. |
| Asset | Visit/connection state, assessment completion state, claim eligibility state. |
| Preconditions | Visit/connection/assessment/claim states are collapsed into one field, or a technical event is wired directly to a clinical-completion write. |
| Likelihood | Medium-high — this is the single most likely implementation mistake in a virtual-care system (conflating "the call ended" with "the visit is done"), which is why the task treats it as a **non-negotiable, testable invariant** rather than a residual risk. |
| Impact | Critical — this exact confusion is what could turn a dropped call into a phantom completed assessment or an improper claim. |
| Preventive controls | Visit workflow, modality, connection, suitability, participant authorization, clinical assessment, and claim are modeled as **separate, orthogonal state dimensions** (see the state-model deliverable) — a transition in one must never silently transition another. Only an authorized pharmacist's explicit action can mark professional completion; disconnect/timeout/patient-departure/vendor-webhook code paths are structurally unable to call the completion action. |
| Detective controls | Audit event on every disconnect/reconnect/fallback/technical-failure, distinct from the completion audit event, so the two are never conflatable after the fact. |
| Response controls | Guarded rejoin/fallback re-runs every applicable gate; a technical-failure event explicitly fails any guard requiring successful pharmacist completion. |
| Test evidence | "Patient departure cannot complete a visit," "Disconnect cannot complete a visit," "Timeout cannot complete a visit," "Vendor meeting end cannot complete a visit," "A technical failure cannot complete an assessment," "A technical failure cannot trigger a claim" (Required Tests §Assessment and claim / §Disconnect and contingency). |
| Residual risk | None accepted — this is a non-waivable class per the task's own mandatory stop conditions. |
| Approval owner | Security/privacy reviewer + Task 02 owner (since the assessment/claim boundary is Task 02's authoritative surface). |

### E — Secure-messaging threats

Covers: secure message sent to the wrong patient/thread · message content in logs/error
monitoring · unsafe message attachment · unread/delayed asynchronous message · patient using
messaging for an urgent issue · automatic urgency classification drifting into clinical
decision-making.

| Field | Detail |
|---|---|
| Scenario | PHI-bearing message content reaches the wrong recipient, an unintended system (logs/analytics), or is implicitly treated as reviewed/triaged by something other than a human pharmacist. |
| Entry point | Secure-message send/read endpoints, thread-authorization checks, logging middleware. |
| Asset | Secure-message content, thread participant/authorization records. |
| Preconditions | Thread authorization isn't rechecked on every message; logging captures request bodies; any classifier is wired to route based on message content. |
| Likelihood | Medium. |
| Impact | High — PHI leak, or a genuinely urgent message going unnoticed because the system implied it was being monitored/triaged automatically. |
| Preventive controls | Authorization rechecked server-side on every message read/write, not just thread-open; structured, payload-free logger (mirrors the pattern this repo already uses for `audit_log` metadata) keeps message bodies out of logs entirely; **no AI/NLP/keyword classification of message urgency exists anywhere in the design** — the channel is explicitly described to patients as not continuously monitored, with an approved non-messaging alternative for urgent needs. |
| Detective controls | Audit event on every message send/read/deny (metadata only, never body). |
| Response controls | Pharmacist can close or mark messaging unsuitable at any time. |
| Test evidence | "Cross-patient message," "Cross-pharmacy message," "Message content absent from logs and audit," "Message cannot complete assessment" (Required Tests §Secure-messaging). |
| Residual risk | A patient may still use messaging for an urgent issue despite disclosure — mitigated by clear, prominent alternative-channel guidance, not eliminated. |
| Approval owner | Security/privacy reviewer, clinical/professional reviewer (for the "not continuously monitored" disclosure language). |

### F — Vendor and webhook threats

Covers: webhook spoofing/replay/reordering · vendor event confusion · vendor administrator
overreach · technical-support impersonation · WebRTC IP/network-metadata exposure · SDP/ICE/TURN
credentials leaking into logs · unauthorized recording/transcription · vendor use of session data
for unrelated analytics/AI training.

| Field | Detail |
|---|---|
| Scenario | A vendor-originated event is trusted without verification, or vendor infrastructure/personnel gain access or use beyond the approved scope. |
| Entry point | Webhook receiver, vendor SDK integration points (none exist yet — this threat class is prospective, for when a vendor is chosen). |
| Asset | Vendor credentials, webhook secrets, media negotiation metadata, connection events. |
| Preconditions | No signature verification on webhook payloads; vendor SDK debug/logging left enabled; contract doesn't prohibit AI training on session data. |
| Likelihood | N/A yet — no vendor selected (Workstream B). Modeled prospectively for the adapter design. |
| Impact | High if realized — forged completion-adjacent events, or PHI-adjacent metadata (SDP/ICE/TURN) reaching logs or a vendor's unrelated systems. |
| Preventive controls | Vendor-neutral adapter interface with non-networked synthetic implementations for the prototype (per this task's explicit scope); no vendor event may write directly to clinical or claim state (see Group D); webhook signature verification and replay prevention are design requirements for the eventual real adapter, not implemented against any real vendor here. |
| Detective controls | Audit event on every webhook accepted/rejected/duplicated/replayed (design only, no real webhook exists yet). |
| Response controls | Adapter denial before any state-changing effect; vendor-session termination path defined in the incident-response design (Workstream K). |
| Test evidence | "Valid/invalid signature," "Replay," "Duplicate event," "Wrong visit," "Wrong tenant" (Required Tests §Webhook and vendor-adapter) — run against the synthetic adapter, not a real vendor. |
| Residual risk | Real vendor behavior cannot be tested until a vendor is selected (Workstream B gates) — explicitly deferred, not accepted as closed. |
| Approval owner | Security reviewer, at vendor-selection time. |

### G — Leakage threats

Covers: PHI/token in URLs or query strings · PHI in page titles · PHI in browser storage ·
PHI in analytics/telemetry/error breadcrumbs · secure-message content in logs · consent answers
in logs · exact location in technical logs · raw SDP/ICE/TURN/room-secret/webhook-secret in
logs · PHI in calendar/notification fixtures · PHI in referrers · PHI in screenshots/evidence
filenames · denial-of-service against waiting rooms or secure messages.

| Field | Detail |
|---|---|
| Scenario | Sensitive data reaches a location outside the authenticated, authorized data path — a log, a cache, a URL, an evidence artifact. |
| Entry point | Any logging call, any URL construction, any evidence-capture step. |
| Asset | All PHI-bearing assets in this model, plus tokens/secrets. |
| Preconditions | A raw object (request, error, domain entity) is logged directly instead of through an allowlisted, payload-free logger; a token is placed in a query string instead of a header/cookie. |
| Likelihood | Medium — this is a common, easy-to-introduce class of defect, which is exactly why the task requires enforceable automated tests rather than relying on review alone. |
| Impact | High — direct PHI/secret disclosure, potentially into third-party log aggregation or CI artifact storage. |
| Preventive controls | Payload-free logging convention (mirrors `writeAudit`'s existing metadata-only shape); enforceable leakage tests per the Required Tests §Privacy and leakage list, covering URLs, storage, analytics, telemetry, breadcrumbs, logs, referrers, screenshots, and evidence filenames. |
| Detective controls | The leakage tests themselves are the detective control — they must fail loudly, not just document intent. |
| Response controls | N/A for the synthetic prototype; production incident response covers this class in Workstream K. |
| Test evidence | Full "Privacy and leakage tests" list (Required Tests). |
| Residual risk | None accepted as a known gap — non-waivable per the task's mandatory stop conditions. |
| Approval owner | Security/privacy reviewer. |

### H — Accessibility-as-safety threats

Covers: accessibility failure that prevents the patient from understanding consent or using
fallback.

| Field | Detail |
|---|---|
| Scenario | A patient cannot complete or understand a safety-relevant step (consent, privacy confirmation, fallback selection) because the interface is inaccessible to them. |
| Entry point | Consent UI, fallback-selection UI. |
| Asset | Consent events (validity depends on genuine understanding, not just a recorded click). |
| Preconditions | Consent/fallback UI depends on camera, precise pointing, color alone, or unlabelled controls. |
| Likelihood | Medium — a public/patient-facing safety flow with no accessibility floor will predictably exclude some real users. |
| Impact | High — an invalid or misunderstood consent is a safety and compliance failure, not just a UX defect. |
| Preventive controls | 375px operation, keyboard access, visible focus, screen-reader names/announcements, no essential hover-only behavior, no color-only status, 56px targets, camera-free path, plain-language errors (Workstream G's full accessibility list). |
| Detective controls | Accessibility test suite (Required Tests §Accessibility and responsive). |
| Response controls | N/A — this is a design-time control, not a runtime one. |
| Test evidence | 375px, keyboard, screen-reader, zoom/reflow, reduced-motion evidence (Workstream L §Evidence). |
| Residual risk | Automated accessibility testing cannot fully substitute for real assistive-technology user testing — flagged for the clinical/operational validation plan (final deliverable), not resolved here. |
| Approval owner | Accessibility reviewer. |

---

## Threats explicitly deferred to a later stage (not modeled in depth here)

- **Insider misuse of vendor administrator access** and **compromised vendor/subprocessor** —
  cannot be meaningfully modeled without a selected vendor (Workstream B). Placeholder rows
  exist in Group F; full analysis is a vendor-selection-time deliverable.
- **Real WebRTC IP/network-metadata exposure** in production — the synthetic prototype makes no
  real network calls (Task 01 boundary), so this threat's *production* controls (TURN relay
  policy, IP-masking) are documented as requirements but not tested against real media here.
