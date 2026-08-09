# Task 06 — Virtual-Care Threat Model

**Revision note (2026-08-06):** the first version of this document grouped the required threats
into 8 category rows sharing one set of fields each. On review, that fell short of the task's
explicit "for every threat, document [12 fields]" requirement — several grouped threats have
materially different entry points, preconditions, or likelihood even when their preventive
control is similar. This revision gives every required threat its own individually-assessed
entry. Where two threats genuinely share identical preconditions/controls, that's stated
explicitly in the entry rather than used as a reason to merge the rows.

Covers telephone, video, secure messaging, fallback, and assessment/claim integration.

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
| Notification service stub | **Exists as design, not runtime.** Task 07 merged 2026-08-06 with full documentation (`docs/task-07/`) but no running code — see the current-state analysis §13 addendum. Task 07's own document defines itself as a strict downstream consumer of Task 06, never a producer into it. |
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

## Threats

Format per threat: **Scenario** (what happens) → **Entry** (where) → **Asset** → **Preconditions**
→ **Likelihood/Impact** → **Preventive / Detective / Response** controls → **Test evidence** →
**Residual risk** → **Owner**.

### Category A — Join, token, and authorization

**1. Meeting or room enumeration**
Scenario: an attacker guesses or iterates visit/room identifiers to find a live visit.
Entry: join endpoint. Asset: visit assignments, waiting-room state.
Preconditions: room identifiers are sequential or otherwise guessable.
Likelihood: Low (if opaque IDs are used from the start) / Impact: Medium (enumeration alone
doesn't grant access, but confirms a visit exists at a given time).
Preventive: `VirtualVisit.id` is an opaque UUID with no embedded sequence (Workstream D).
Detective: rate-limiting/anomalous-request-pattern detection (design requirement, not built in
the synthetic prototype — no real network surface exists to rate-limit yet).
Response: N/A for the prototype.
Test evidence: architecture test asserting ID generation is non-sequential and unguessable.
Residual risk: none identified for the synthetic design. Owner: Security reviewer.

**2. Forwarded or reused invitation**
Scenario: a patient forwards their join link/code to someone else, intentionally or not.
Entry: join endpoint. Asset: join credentials, participant authorization.
Preconditions: a link or code alone would authorize the holder.
Likelihood: Medium (ordinary, non-malicious user behavior) / Impact: High (unauthorized PHI
access if unmitigated).
Preventive: authorization binds to the authenticated session's actor reference, never to the
link/token itself — possession grants no authority (non-negotiable invariant).
Detective: `join_denied` audit event when a non-matching actor attempts to use a forwarded link.
Response: no automated response needed — the join is simply denied.
Test evidence: "A forwarded link grants no authority" (Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**3. Invitation link preview or scanner consumption**
Scenario: an email/SMS security scanner, chat-preview bot, or link-unfurling service visits the
join link before the real recipient does, potentially consuming a single-use token.
Entry: join/bootstrap endpoint. Asset: join credentials.
Preconditions: a single-use bootstrap token exists and GET requests to it have side effects.
Likelihood: Medium (automated scanners are common) / Impact: Medium (a burned single-use token
locks out the real patient, a usability/availability issue more than a confidentiality one).
Preventive: any bootstrap step requires an explicit user action (e.g., a button click, not a
bare GET) before consuming the token; the sandbox's own `getUserMedia`-style "explicit user
action" requirement (Workstream G) is the same design principle applied here.
Detective: repeated bootstrap-consumption attempts from a non-patient user agent.
Response: re-issue a fresh bootstrap token through the same authenticated channel.
Test evidence: test that a bare GET to a bootstrap URL does not consume it.
Residual risk: some scanner behaviors are hard to fully distinguish from a real first click —
documented, not eliminated. Owner: Security reviewer.

**4. Token theft, replay, or fixation**
Scenario: a session/join token is stolen (device compromise, network interception) and reused,
or an attacker fixes a session ID before authentication.
Entry: any authenticated endpoint. Asset: join/rejoin credentials, sessions.
Preconditions: a token is long-lived, reusable, or predictable, or session IDs aren't rotated
on authentication.
Likelihood: Medium / Impact: High.
Preventive: short-lived, single-use-where-possible tokens; session rotation on authentication
(Workstream F §5, mirroring Task 05's eventual session-rotation requirement).
Detective: replay detection via token-use tracking.
Response: revoke the session; force re-authentication.
Test evidence: "A replayed join is denied," "A stale rejoin is denied" (Required Tests).
Residual risk: a stolen *and* still-valid credential before rotation/expiry is not distinguishable
from its rightful holder by this layer alone. Owner: Security reviewer.

**5. Wrong-patient join**
Scenario: Patient A's session is used to attempt joining Patient B's visit.
Entry: join endpoint. Asset: patient identities, visit assignments.
Preconditions: visit-to-patient binding isn't checked server-side, or is checked against a
client-supplied value.
Likelihood: Low if built correctly (this is a design property) / Impact: Critical (direct
cross-patient PHI exposure).
Preventive: every join rechecks `VirtualVisit.patientSubjectRef` against the *authenticated*
actor's own subject binding — never a client-supplied patient/visit pairing (Workstream E §1).
Detective: `join_denied` with reason `wrong_patient`.
Response: N/A — denied before any exposure.
Test evidence: "A wrong-patient session cannot join" (Required Tests).
Residual risk: none accepted — non-waivable. Owner: Security reviewer.

**6. Wrong-pharmacy or wrong-assessment join**
Scenario: a session scoped to Pharmacy A or Assessment X is used to reach a visit belonging to
Pharmacy B or Assessment Y.
Entry: join endpoint, assessment-link endpoint. Asset: tenant scope, assessment relationships.
Preconditions: same class as #5 — tenant/assessment binding trusted from the client.
Likelihood: Low if built correctly / Impact: Critical (cross-tenant PHI exposure — this repo's
`AGENTS.md` treats single-tenant/cross-tenant boundaries as a top invariant already).
Preventive: reuses the exact same server-derived `PHARMACY_ID` scoping pattern this repo already
enforces everywhere else (`requirePortalUser`'s `PHARMACY_MISMATCH` check) — Task 06 introduces
no second, weaker tenant-scoping mechanism.
Detective: `join_denied` with reason `wrong_pharmacy`/`wrong_assessment`.
Response: N/A — denied before exposure.
Test evidence: "A wrong-pharmacy actor cannot join," "A wrong-tenant actor cannot join"
(Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**7. Patient token accepted as pharmacist**
Scenario: a patient-audience session/token is presented at a pharmacist-only endpoint and
accepted.
Entry: any pharmacist-only action (admission, suitability, completion). Asset: pharmacist
authority, all downstream PHI.
Preconditions: audience/actor-type isn't checked, only "is this a valid session."
Likelihood: Low if built correctly / Impact: Critical (a patient could self-admit, self-approve
suitability, or worse).
Preventive: explicit actor-type/audience check on every pharmacist-only action, structurally
separate from the patient-side check (Workstream E §1, item 2) — mirrors `requirePortalUser`'s
existing `FORBIDDEN_ROLE` pattern.
Detective: `join_denied`/action-denied with reason `wrong_audience`.
Response: N/A.
Test evidence: "A patient session cannot act as pharmacist" (Required Tests).
Residual risk: none accepted — this is explicitly listed as a non-negotiable invariant.
Owner: Security reviewer.

**8. Pharmacist token accepted as patient**
Scenario: the mirror image of #7 — a pharmacist session used to act as if it were the patient.
Entry: patient-only actions (e.g., granting consent, viewing only-own-thread messages).
Asset: consent integrity, patient identity.
Preconditions: same as #7.
Likelihood: Low if built correctly / Impact: High (a pharmacist could not, and must not, be
able to grant consent *on the patient's behalf* by wearing the patient's session).
Preventive: same audience check as #7, applied symmetrically.
Detective: same pattern.
Response: N/A.
Test evidence: "A pharmacist session cannot act as patient" (Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**9. Delegate joining after grant expiry or revocation**
Scenario: a caregiver/delegate whose grant has expired or been revoked still attempts (or
succeeds) to join.
Entry: join endpoint, participant-authorization check. Asset: delegation grants, patient PHI.
Preconditions: grant status is cached or checked only at initial admission, not re-verified.
Likelihood: Medium (revocation timing races are a realistic, not exotic, scenario) / Impact:
High.
Preventive: grant status re-verified at every join/rejoin, not cached (Workstream E §1 item 6,
Workstream F §5) — synthetic-only since Task 05's real delegation model doesn't exist yet.
Detective: `join_denied` reason `delegate_expired`/`delegate_revoked`.
Response: N/A — denied.
Test evidence: "A delegate with expired or revoked scope cannot join" (Required Tests).
Residual risk: real-world delegation revocation timing depends entirely on Task 05's eventual
implementation — flagged, not solved here. Owner: Security reviewer + Task 05 owner (once it
exists).

**10. Unauthorized support person**
Scenario: someone claiming to be a support person or interpreter joins without patient
awareness or pharmacist authorization.
Entry: participant-admission flow. Asset: participant authorization, patient privacy.
Preconditions: no explicit disclosure/consent step for additional participants.
Likelihood: Medium / Impact: High (undisclosed third party hearing/seeing PHI).
Preventive: every participant requires `disclosedToPatientAt` before being counted as present
(Workstream D `VisitParticipant`), and the patient explicitly consents to additional
participants (Workstream E §4, item 5).
Detective: `participant_denied` audit event.
Response: pharmacist can remove immediately (Workstream F §2).
Test evidence: "Additional-participant consent," "Unauthorized participant removal" (Required
Tests).
Residual risk: none accepted for the design; real-world social-engineering (someone claiming
identity outside the system) is out of this task's technical scope. Owner: Security reviewer.

**11. Participant role escalation**
Scenario: an admitted participant (e.g., a support person) attempts to act with pharmacist or
full-patient authority.
Entry: any role-gated action. Asset: participant authorization, all role-gated state.
Preconditions: role isn't rechecked per-action, only at admission.
Likelihood: Low if built correctly / Impact: High.
Preventive: `VisitParticipant.role` is rechecked at every action, not just admission-time
(consistent with the "recheck everything, every time" principle — Workstream J §1).
Detective: action-denied audit event with reason `role_insufficient`.
Response: N/A — denied.
Test evidence: "No participant self-promotion" (Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**12. Hidden or unannounced participant**
Scenario: a participant is present (audio/video/message-visible) without being disclosed.
Entry: participant roster / media session. Asset: participant authorization, patient privacy.
Preconditions: no structural requirement that every present party appear in the roster.
Likelihood: Low if built correctly (structural design property) / Impact: Critical — this is
explicitly a non-negotiable invariant ("A participant cannot silently join or remain hidden").
Preventive: the participant roster *is* the source of truth for who can access media/messages —
there is no path to presence that bypasses `VisitParticipant`/`ParticipantAuthorization`.
Detective: "No hidden participants" architecture test.
Response: N/A for the prototype (no real media exists to hide behind).
Test evidence: "No hidden participants" (Required Tests, Waiting-room section).
Residual risk: none accepted for the synthetic design. Owner: Security reviewer.

### Category B — Waiting-room privacy

**13. Patient-to-patient waiting-room exposure**
Scenario: Patient A sees that Patient B is also waiting (or vice versa).
Entry: waiting-room status endpoint. Asset: waiting-room state, patient identities.
Preconditions: a shared/global roster query instead of a per-actor-scoped one.
Likelihood: Low if built correctly / Impact: High.
Preventive: waiting-room query is filtered to `actorRef = current session actor` — there is no
endpoint that returns cross-patient rows (Workstream F §3).
Detective: architecture test on the query shape itself, not just manual inspection.
Response: N/A.
Test evidence: "Patient isolation," "No patient-to-patient visibility" (Required Tests).
Residual risk: none accepted — explicit non-negotiable invariant. Owner: Security reviewer.

**14. Waiting-room audio or video leakage**
Scenario: a waiting patient can hear/see the pharmacist's current (different) session before
being admitted.
Entry: media/connection layer. Asset: waiting-room state, clinical session content.
Preconditions: any media path exists before admission.
Likelihood: Low if built correctly / Impact: Critical.
Preventive: no pre-admission media path exists at all in the synthetic design — a structural
absence, not a permission check that could be misconfigured (Workstream F §3).
Detective: N/A — nothing to detect if the capability doesn't exist.
Response: N/A.
Test evidence: "No pre-admission media" (Required Tests).
Residual risk: none for the synthetic design; a real vendor's waiting-room media behavior is a
procurement-time question (Workstream B gate G-V3/G-V4). Owner: Security reviewer, at
vendor-selection time.

**15. Host impersonation**
Scenario: a non-pharmacist party presents as the host/pharmacist to gain admission-control
authority.
Entry: admission-control actions. Asset: participant authorization.
Preconditions: same as #7 (audience/role check).
Likelihood: Low if built correctly / Impact: Critical.
Preventive: admission-control actions require the pharmacist audience/role check (same
mechanism as #7) plus `pharmacistActorRef` matching the visit's assignment (Workstream J guard
5).
Detective: action-denied audit event.
Response: N/A.
Test evidence: covered by the same tests as #7 plus "Pharmacist assignment" (Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**16. Duplicate tabs**
Scenario: the same patient opens the visit in two browser tabs.
Entry: join endpoint. Asset: participant authorization state.
Preconditions: each join creates an independent, authoritative participant record.
Likelihood: High (ordinary user behavior, not an attack) / Impact: Low-Medium (state confusion,
not a confidentiality breach, if handled correctly — but could become one if handled wrong,
e.g., two independently-authoritative sessions racing on suitability).
Preventive: `VisitParticipant` admission is idempotent per actor — a second tab reflects the
same participant row, never creates a second independently-authoritative one (Workstream F §3).
Detective: N/A — this is a normal, expected case, not an anomaly.
Response: N/A.
Test evidence: "Duplicate tab" (Required Tests, multiple sections).
Residual risk: none accepted for the design. Owner: Engineering (state-model correctness, not
strictly a security review item).

**17. Concurrent join from multiple devices**
Scenario: the same patient joins from phone and laptop simultaneously.
Entry: join endpoint. Asset: same as #16.
Preconditions: same as #16.
Likelihood: Medium / Impact: Low-Medium, same reasoning as #16.
Preventive: same idempotent-per-actor mechanism as #16 — device is not a dimension the
authorization model treats as separately authoritative.
Detective: N/A.
Response: N/A.
Test evidence: "Concurrent device" (Required Tests).
Residual risk: none accepted. Owner: Engineering.

**18. Stale rejoin credential**
Scenario: a rejoin attempt uses a credential/token issued before a material state change
(removal, expiry, revocation).
Entry: rejoin endpoint. Asset: join/rejoin credentials.
Preconditions: rejoin trusts a previously-issued credential without rechecking current server
state.
Likelihood: Medium / Impact: High.
Preventive: rejoin re-runs the *entire* join-authorization sequence fresh — never a cached
"already admitted" shortcut (Workstream F §3/§5).
Detective: `reconnect_denied` audit event.
Response: N/A — denied.
Test evidence: "A stale rejoin is denied," "A removed participant cannot rejoin" (Required
Tests).
Residual risk: none accepted. Owner: Security reviewer.

### Category C — Tenant, authorization-substitution, and web-platform threats

**19. Cross-tenant BOLA or IDOR**
Scenario: an authenticated actor at Pharmacy A manipulates an identifier to reach Pharmacy B's
visit/thread/participant data.
Entry: any ID-parameterized endpoint. Asset: all tenant-scoped assets.
Preconditions: authorization checks trust the object ID without an independent ownership check.
Likelihood: Medium (a classic, common web-app defect class) / Impact: Critical.
Preventive: every lookup is scoped by the server-derived tenant/actor context first, with the
requested ID checked *against* that scope — never "look up by ID, then check ownership after
the fact" (same discipline as this repo's existing `PHARMACY_MISMATCH` pattern).
Detective: access-denied audit events clustering on a single actor across many IDs (anomaly
signal for suspicious-access review — design only).
Response: N/A for the prototype.
Test evidence: "Cross-tenant BOLA or IDOR" tests across visit/thread/participant endpoints.
Residual risk: none accepted — non-waivable per Task 11's own control catalogue language for
this exact class of defect. Owner: Security reviewer.

**20. Client-supplied actor, subject, role, pharmacy, visit, or assessment substitution**
Scenario: a request includes a client-controlled field for one of these values and the server
trusts it instead of deriving it independently.
Entry: any server action accepting a body/params. Asset: all of the above.
Preconditions: a handler reads `req.body.pharmacyId` (or equivalent) instead of deriving it
from the authenticated session.
Likelihood: Medium / Impact: Critical.
Preventive: this is the single design principle repeated throughout every Task 06 document —
"no client value may be trusted for patient, subject, pharmacy, tenant, assessment, claim,
participant, role, consent, location, suitability, or completion" (non-negotiable invariants,
restated in Workstream J §1 as the reason every guard is *rechecked*, not read from the
request).
Detective: architecture test scanning for any handler reading one of these fields from
untrusted input.
Response: N/A.
Test evidence: "A client-supplied role, actor, patient, pharmacy, visit, or assessment value is
ignored or denied" (Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**21. CSRF and cross-origin WebSocket attacks**
Scenario: a malicious page triggers a state-changing action against the visit/thread on behalf
of an authenticated user without their intent.
Entry: any state-changing endpoint; any real-time channel, if one is added later.
Asset: participant authorization, message content.
Preconditions: no CSRF protection, or a cross-origin WebSocket accepted without origin
validation.
Likelihood: Low (Next.js server actions have built-in same-origin protection this repo already
relies on) / Impact: Medium-High depending on the action.
Preventive: reuses this repo's existing server-action same-origin enforcement unchanged
(current-state analysis §4) — Task 06 introduces no new cross-origin surface; if a real-time
channel is ever added, it requires explicit origin validation before being considered safe (a
production requirement, not built in the synthetic prototype since no real-time infra exists
yet — current-state analysis §5).
Detective: N/A for the prototype.
Response: N/A.
Test evidence: relies on the existing platform-level protection; no new test needed unless a
real-time channel is added, at which point origin-validation tests become required.
Residual risk: deferred until real-time infrastructure is actually built (not in this task's
scope — see current-state analysis §5). Owner: Security reviewer, at that time.

### Category D — Vendor and webhook

**22. Webhook spoofing, replay, or reordering**
Scenario: a forged, replayed, or out-of-order event is sent to the webhook receiver.
Entry: webhook receiver (prospective — no vendor selected). Asset: connection events, vendor
session references.
Preconditions: no signature verification, or no dedup/ordering handling.
Likelihood: N/A yet (no vendor exists) — modeled prospectively / Impact: High if realized
(forged completion-adjacent events).
Preventive: signature verification before processing; dedup by event ID/digest; monotonic
ordering rules (`VendorWebhookReceipt`, Workstream D).
Detective: `vendor_webhook_rejected`/`vendor_webhook_duplicate`/`vendor_webhook_replayed` audit
events (already in the catalogue).
Response: reject, no state change.
Test evidence: "Valid/invalid signature," "Replay," "Duplicate event," "Reordered event"
(Required Tests) — run against the synthetic adapter only.
Residual risk: real vendor behavior untested until a vendor exists — explicitly deferred, not
accepted as closed. Owner: Security reviewer, at vendor-selection time.

**23. Vendor event confusion**
Scenario: a webhook event references the wrong visit/tenant, or an event type is misinterpreted.
Entry: webhook receiver. Asset: connection/technical-failure records.
Preconditions: event-to-visit mapping trusts the vendor's own identifiers directly.
Likelihood: N/A yet / Impact: Medium (could misattribute a technical event, not a completion —
per Workstream H, no webhook event reaches completion regardless).
Preventive: vendor identifiers are mapped through an internal opaque reference, never trusted
directly (`VendorWebhookReceipt.mappedVisitRef`, Workstream D); tenant/visit scope rechecked
after mapping.
Detective: `vendor_webhook_rejected` reason `wrong_visit`/`wrong_tenant`.
Response: reject.
Test evidence: "Wrong visit," "Wrong tenant" (Required Tests).
Residual risk: deferred to vendor-selection time. Owner: Security reviewer.

**24. Vendor administrator overreach**
Scenario: a vendor's own support/admin staff access more than the transport role requires.
Entry: N/A (vendor-side). Asset: vendor credentials, potentially media/message metadata.
Preconditions: contractual/technical least-privilege isn't enforced.
Likelihood: N/A yet / Impact: High if realized.
Preventive: Workstream B procurement gate G-V4 (privacy/security review) explicitly requires
evidence of least-privilege vendor administration before any vendor is approved.
Detective: N/A until a vendor exists.
Response: contract-defined incident-notification terms (Workstream K's incident-response §10).
Test evidence: none possible pre-vendor-selection — recorded as `NOT APPLICABLE YET`, not
skipped.
Residual risk: fully open until Workstream B completes. Owner: Product lead / security
reviewer, at procurement time.

**25. Technical-support impersonation**
Scenario: someone claims to be "AgentOMA support" or "vendor support" to gain access or extract
information from a patient or pharmacist.
Entry: out-of-band (phone/email), not a system endpoint. Asset: patient/pharmacist trust,
potentially credentials if a target is socially engineered.
Preconditions: no defined, authenticated support-access path exists (confirmed in current-state
analysis — no technical-support role exists in this repo at all).
Likelihood: Medium (social engineering is common) / Impact: Medium-High depending on what's
extracted.
Preventive: because no technical-support role or access path exists in this design at all
(Category A, actor mapping), there is no *legitimate* support-impersonation target to imitate
convincingly — the absence of the capability is itself the control, same reasoning as
Workstream K §1's "no support role" note.
Detective: N/A — outside system telemetry.
Response: user education (organizational, not a code control).
Test evidence: N/A — not a testable code property.
Residual risk: accepted as an organizational/training risk, out of this task's technical scope.
Owner: Product/security lead.

### Category E — Media, network, and data-minimization

**26. WebRTC IP or network-metadata exposure**
Scenario: raw IP addresses or network topology are exposed to other participants via WebRTC
negotiation.
Entry: media negotiation (prospective — no real media exists in the synthetic prototype).
Asset: media negotiation metadata.
Preconditions: direct peer-to-peer connection without a relay, or ICE candidates logged/exposed.
Likelihood: N/A yet (no real media) / Impact: Medium (network metadata, not PHI directly, but
can reveal approximate location or enable follow-on attacks).
Preventive: for the synthetic prototype, no real network call exists at all (Task 01 boundary);
for production, this becomes a TURN-relay-policy requirement (Workstream G §retention list
already excludes raw IP addresses from anything stored).
Detective: N/A for the prototype.
Response: N/A.
Test evidence: "No live model called... No production deployment changed" class of Task-01
boundary tests already cover "no real network call happens at all" for the synthetic prototype.
Residual risk: real WebRTC IP exposure is a production, vendor-integration-time question,
explicitly deferred (matches this document's own §"Threats deferred" note below). Owner:
Security reviewer, at vendor-selection time.

**27. SDP, ICE, TURN, or media credentials leaking into logs**
Scenario: media negotiation payloads or TURN credentials are captured by a debug log or error
monitor.
Entry: any logging call in the media-adapter path. Asset: media negotiation metadata, vendor
credentials.
Preconditions: raw objects logged instead of a payload-free logger.
Likelihood: Medium (a common, easy-to-introduce defect class in any WebRTC integration) /
Impact: High.
Preventive: payload-free logging convention applied to every layer, including the (currently
non-networked, synthetic) adapter boundary (Workstream K §1, threat model Group G equivalent).
Detective: leakage tests scanning logs for planted SDP/ICE/TURN-shaped markers.
Response: N/A for the prototype (nothing real to leak yet).
Test evidence: "Raw SDP or ICE data appears in logs," "TURN credentials appear in logs"
(Required Tests, Privacy and leakage).
Residual risk: none accepted as a design gap; real enforcement depends on the eventual real
adapter following this same discipline. Owner: Security reviewer.

**28. Unauthorized recording or transcription**
Scenario: audio/video is recorded or transcribed without authorization (or at all).
Entry: media/session layer. Asset: clinical documentation, secure-message content.
Preconditions: any recording/transcription control exists.
Likelihood: N/A — Impact: Critical if it ever existed.
Preventive: **no recording or transcription control exists anywhere in this design, full stop**
— not disabled-by-default, structurally absent (Workstream F §2, Workstream K §2).
Detective: N/A — nothing to detect because the capability doesn't exist.
Response: N/A.
Test evidence: "Media recording or transcription code is enabled" (Required Tests, Privacy and
leakage) — a test that must find nothing to disable.
Residual risk: none accepted — explicit non-negotiable invariant, non-waivable. Owner: Security
reviewer.

**29. Vendor use of session data for unrelated analytics or AI training**
Scenario: a selected vendor's default configuration uses session data for its own analytics,
model training, or advertising.
Entry: vendor contract/configuration (prospective). Asset: all session data.
Preconditions: vendor defaults aren't reviewed/disabled before use.
Likelihood: N/A yet / Impact: High if realized (PHI used for a purpose the patient never
consented to).
Preventive: Workstream B procurement gate G-V4 explicitly requires evidence of AI/training
defaults before vendor approval; Workstream K §1 lists this as a required contract term.
Detective: N/A until a vendor exists.
Response: contract termination / incident escalation if discovered post-hoc.
Test evidence: none possible pre-vendor-selection — `NOT APPLICABLE YET`.
Residual risk: fully open until Workstream B completes. Owner: Product lead, at procurement
time.

### Category F — Secure messaging

**30. Secure message sent to the wrong patient or thread**
Scenario: a message is written to, or delivered from, the wrong `SecureMessageThread`.
Entry: message send/read endpoint. Asset: secure-message content.
Preconditions: thread ID trusted without an ownership/scope check.
Likelihood: Low if built correctly / Impact: Critical.
Preventive: same server-scoped-query discipline as #19 (cross-tenant BOLA), applied to threads
specifically — authorization rechecked on every message, not just thread-open (Workstream I
§12).
Detective: `secure_message_denied` audit event.
Response: N/A — denied.
Test evidence: "Wrong-thread message," "Cross-patient message," "Cross-pharmacy message"
(Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**31. Misdirected notification**
Scenario: an external "you have a new message" notice is sent to the wrong contact.
Entry: Task 07's notification dispatch (out of Task 06's own build scope). Asset: message
delivery metadata.
Preconditions: contact-point resolution error on Task 07's side.
Likelihood: N/A for Task 06 directly — this is Task 07's own threat surface (its own threat
model covers contact-point versioning and verification). Task 06's relevant control is limiting
what such a notice could ever reveal even if misdirected.
Preventive: the generic notice carries no thread/participant/visit/purpose reference at all
(Workstream I §14, Task 07's own Part 3) — a misdirected notice discloses nothing beyond "you
have an AgentOMA account."
Detective: N/A on Task 06's side.
Response: N/A on Task 06's side.
Test evidence: N/A — owned by Task 07's own WI-04/WI-06 evidence plan.
Residual risk: none on Task 06's side given the content minimization; full risk ownership is
Task 07's. Owner: Task 07 owner.

**32. PHI in notification previews**
Scenario: a push/lock-screen notification preview shows PHI.
Entry: same as #31. Asset: same.
Preconditions: same.
Likelihood: N/A for Task 06 directly / Impact: High if realized.
Preventive: same as #31 — no PHI is ever in the payload Task 06 could hand to a notification
layer in the first place; the field doesn't exist to leak.
Detective/Response/Test evidence/Residual risk: same as #31 — owned by Task 07.

**33. Message content in logs or error monitoring**
Scenario: a `SecureMessage.bodyEncryptedRef`'s plaintext reaches a log or error breadcrumb.
Entry: any logging call in the message send/read path. Asset: secure-message content.
Preconditions: raw message object logged instead of payload-free metadata.
Likelihood: Medium (common defect class) / Impact: Critical.
Preventive: message content lives only in the encrypted thread store; audit/log events carry
metadata only (Workstream I §11, Workstream K §Audit envelope).
Detective: leakage test with planted marker content.
Response: N/A for the prototype.
Test evidence: "Message content absent from logs and audit" (Required Tests).
Residual risk: none accepted. Owner: Security reviewer.

**34. Unsafe message attachment**
Scenario: a malicious or oversized file is attached to a secure message.
Entry: attachment upload (does not exist). Asset: N/A.
Preconditions: an attachment capability exists.
Likelihood: N/A / Impact: N/A.
Preventive: **attachments remain fully blocked** — no upload boundary exists in this repo today
(current-state analysis), so per the task's own rule, this task does not build one
(Workstream I §13). There is nothing to attack.
Detective/Response: N/A.
Test evidence: "Unsafe attachment denial" (Required Tests) — must prove the capability is
absent/denied, not merely discouraged.
Residual risk: none — deferred entirely until an approved upload boundary exists elsewhere in
the repo. Owner: N/A until that boundary exists.

**35. Unread or delayed asynchronous message**
Scenario: a clinically time-sensitive message sits unread because messaging is asynchronous by
nature.
Entry: N/A — this is an inherent property of the modality, not a code defect.
Asset: patient safety (indirectly).
Preconditions: the patient or pharmacist doesn't check the thread promptly.
Likelihood: Medium-High (structural to the modality) / Impact: potentially High if used for
something urgent.
Preventive: explicit, prominent disclosure that the channel is not continuously monitored, plus
an approved non-messaging alternative for urgent needs (Workstream I §7) — this is a disclosure/
design control, not a technical prevention, because the underlying risk (asynchronous
communication is asynchronous) can't be engineered away.
Detective: N/A.
Response: N/A — mitigated by disclosure, not eliminated.
Test evidence: presence/visibility of the disclosure in the accessibility evidence (Workstream
G).
Residual risk: **explicitly accepted, not solved** — inherent to offering an asynchronous
channel at all, same as it would be for any asynchronous patient-communication system. Owner:
Clinical/professional reviewer (this is fundamentally a scope-of-modality decision, not a
security one).

**36. Patient using messaging for an urgent issue**
Scenario: a patient sends an urgent concern via secure message instead of calling.
Entry: N/A — a usage-pattern risk, not a code defect.
Asset: patient safety.
Preconditions/Likelihood/Impact: same as #35.
Preventive: same disclosure-based control as #35, plus the pharmacist's ability to mark
messaging unsuitable if it's clearly the wrong channel for a given patient's needs (Workstream E
§5).
Detective/Response: same as #35.
Test evidence: same.
Residual risk: same — accepted, disclosed, not eliminated. Owner: Clinical/professional
reviewer.

**37. Automatic urgency classification drifting into clinical decision-making**
Scenario: someone adds a keyword filter, sentiment score, or AI classifier to triage messages
by urgency, which quietly becomes a de facto clinical decision.
Entry: message-routing logic. Asset: clinical judgment integrity.
Preconditions: any classifier is wired to influence routing/priority based on content.
Likelihood: Medium (a "reasonable-sounding" feature to add later under time pressure — this
exact framing, "just add a quick keyword check," is how this kind of scope-creep usually
happens) / Impact: Critical — this is explicitly listed in the task's Authority Boundary as
prohibited.
Preventive: **no AI/NLP/keyword classification of message urgency exists anywhere in the
design** (Workstream I §7) — queue routing uses only trusted workflow data (thread type,
participant role, explicit staff action), never message content, matching Task 07's
independently-stated identical rule for its own reminder system.
Detective: architecture test denying any import of a model/classification module into the
message-routing path (mirrors Task 11's own forbidden-import-graph concept).
Response: N/A — the capability doesn't exist to misuse.
Test evidence: "automatic urgency classification drifting into clinical decision-making" — an
architecture test, not a runtime test, since there's no runtime behavior to exercise.
Residual risk: none accepted — non-waivable per the task's own authority boundary. Owner:
Security/architecture reviewer.

### Category G — Consent, location, and jurisdiction

**38. Consent bypass or stale consent**
Scenario: substantive interaction proceeds on a consent record that's expired, superseded, or
was never actually granted for this modality.
Entry: pre-interaction gate check. Asset: consent events.
Preconditions: consent checked once and cached rather than rechecked at the point of use.
Likelihood: Medium (the most likely real implementation slip in this whole category — "it
passed once, don't bother checking again" is a natural but wrong shortcut) / Impact: Critical.
Preventive: consent rechecked at every gate checkpoint (Workstream J's full guard-recheck list,
guards 16–17), not cached from an earlier pass.
Detective: `consent`-related denial audit events.
Response: N/A — denied.
Test evidence: "Consent pending," "Consent granted," "Stale consent" (Required Tests).
Residual risk: none accepted. Owner: Security/privacy reviewer.

**39. Consent withdrawal race**
Scenario: a patient withdraws consent at the exact moment an interaction is starting or a
message is being sent.
Entry: consent-withdrawal endpoint racing against any gated action. Asset: consent events,
visit/thread state.
Preconditions: withdrawal isn't given priority/immediate effect over a concurrent action.
Likelihood: Low (a narrow timing window) but the consequence is severe enough to treat as
Medium priority / Impact: High.
Preventive: withdrawal is modeled as pre-empting any concurrent action (Workstream H §1,
`CONSENT_WITHDRAWN` reachable from "any active state," highest priority) — the state-version
concurrency mechanism (Workstream H §2) ensures a racing action against a stale version loses.
Detective: `consent_withdrawn` audit event with timestamp precision sufficient to reconstruct
the race if reviewed.
Response: N/A — the design makes the safe outcome (block) the default winner.
Test evidence: "Consent withdrawal during interruption," "Fallback concurrency race" (Required
Tests, adapted to this specific race).
Residual risk: a genuinely simultaneous (same-millisecond) race is bounded by database
transaction isolation, not eliminated by application logic alone — documented, not claimed as
impossible. Owner: Engineering + security reviewer.

**40. Location falsification**
Scenario: a patient states a false jurisdiction to access virtual care or avoid a
cross-jurisdictional block.
Entry: location-confirmation step. Asset: `IdentityAndLocationCheck`.
Preconditions: location is self-reported (by design — GPS/IP inference is explicitly
prohibited).
Likelihood: Medium (this is the accepted cost of not surveilling location) / Impact: Medium
(the OCP policy basis for confirming location is a professional/documentation requirement, not
a guaranteed-accurate GPS lock).
Preventive: none technical — this is an accepted, disclosed limitation, not a solvable
engineering problem, per the task's own instruction not to infer location technically.
Detective: N/A.
Response: N/A.
Test evidence: N/A — not a testable code property; this is a policy/professional-judgment
matter.
Residual risk: **explicitly accepted, not solved** — a patient can misstate their location; the
design requires a statement, not verified ground truth (matches this task's own scope
limitation, restated from the identity/location document). Owner: Product/compliance
(documented decision, not an open engineering task).

**41. Cross-jurisdictional care**
Scenario: a patient's confirmed location is outside Ontario, and the visit proceeds anyway.
Entry: post-location-confirmation gate. Asset: jurisdiction/policy compliance.
Preconditions: the cross-jurisdictional block isn't enforced, or is client-overridable.
Likelihood: Low if built correctly / Impact: High (direct OCP Cross-Jurisdictional Policy
violation).
Preventive: `crossJurisdictionalBlocked` is server-derived from the confirmed jurisdictional
bucket, never client-settable (Workstream E §2); cross-jurisdictional care remains hard-blocked
in the synthetic prototype pending a separate review this task does not grant (Workstream B
§Cross-Jurisdictional Policy discussion).
Detective: `cross_jurisdictional_block` audit event (already in the catalogue).
Response: N/A — blocked, with a clear message directing the patient to an appropriate
alternative.
Test evidence: "Patient location outside approved jurisdiction" (Required Tests).
Residual risk: none accepted for the synthetic design; production enablement is permanently
gated pending separate review. Owner: Product/compliance lead.

### Category H — Connectivity, disconnect, and clinical-safety-adjacent

**42. Network degradation hiding clinically important cues**
Scenario: poor video/audio quality causes the pharmacist to miss a visual or auditory sign that
would matter clinically (e.g., difficulty breathing, visible distress).
Entry: N/A — an inherent risk of the modality, not a code defect.
Asset: patient safety (indirectly).
Preconditions: degraded connection during a clinically significant moment.
Likelihood: Medium (technology fails) / Impact: potentially High.
Preventive: the pharmacist can mark the modality unsuitable *during* the visit at any point
(Workstream E §5) specifically to handle exactly this — the design gives the professional an
explicit off-ramp rather than pretending degraded video is equivalent to clear video.
Detective: `connection_degraded` audit event is visible to the pharmacist in real time
(Workstream H).
Response: pharmacist-initiated fallback or in-person requirement.
Test evidence: "Video connection degraded" (Required Tests, synthetic scenario).
Residual risk: **explicitly accepted** — this is a real limitation of any remote modality, not
an engineering defect; the control is giving the pharmacist an easy, always-available exit, not
preventing degradation from happening. Owner: Clinical/professional reviewer.

**43. Microphone, camera, speaker, or permission failure**
Scenario: a device/permission failure prevents the intended modality from working at all.
Entry: preflight check. Asset: `TechnologyReadinessResult`.
Preconditions: N/A — a normal device/environment condition.
Likelihood: Medium-High (common in real-world use) / Impact: Low if handled gracefully (Medium
if it blocks care entirely with no fallback).
Preventive: distinguished failure categories (`permission_denied` vs. `device_busy`, Workstream
G §1) with a always-available telephone fallback that has no device dependency at all.
Detective: N/A — an expected, handled case, not an anomaly.
Response: offer fallback.
Test evidence: "Camera permission denied," "Microphone unavailable," "No speaker output"
(Required synthetic scenarios).
Residual risk: none accepted beyond the inherent fact that hardware sometimes fails — mitigated
by always-available telephone fallback. Owner: Engineering.

**44. Disconnect during a clinically important interaction**
Scenario: the connection drops mid-visit, potentially mid-sentence on something important.
Entry: connection layer. Asset: visit continuity, patient safety.
Preconditions: N/A — inherent risk.
Likelihood: Medium / Impact: Medium-High depending on timing.
Preventive: guarded reconnect (full gate recheck, Workstream H) plus the fact that disconnect
never silently completes or abandons the visit — it becomes `INTERRUPTED`, a visible, actioned
state, not a silent failure.
Detective: `visit_interrupted` audit event.
Response: guided rejoin or pharmacist-approved fallback.
Test evidence: "Disconnect during clinical interaction" (Required Tests).
Residual risk: the interruption itself can't be prevented (network conditions aren't
controllable); the control is making sure it's handled safely, not making it not happen. Owner:
Engineering + clinical reviewer.

**45. Reconnect to a stale or completed visit**
Scenario: a patient's browser attempts to rejoin a visit that has since expired or been
completed.
Entry: rejoin endpoint. Asset: visit state integrity.
Preconditions: rejoin doesn't check current terminal state.
Likelihood: Medium (browser tabs left open are common) / Impact: Low-Medium (confusion, not a
security breach, if handled correctly — but could reopen already-closed clinical state if
handled wrong).
Preventive: `EXPIRED`/`PHARMACIST_COMPLETED`/other terminal states have no outgoing edge back
into an active state (Workstream H) — a rejoin attempt against a terminal state is denied, full
stop.
Detective: `reconnect_denied` audit event reason `visit_terminal`.
Response: N/A — denied, clear message shown.
Test evidence: "Reconnect after expiry" (Required Tests).
Residual risk: none accepted. Owner: Engineering + security reviewer.

**46. Fallback without renewed suitability or consent**
Scenario: a modality switch happens but carries over stale suitability/consent from the
original modality.
Entry: fallback-transition endpoint. Asset: suitability decisions, consent events.
Preconditions: `FallbackTransition` doesn't require fresh gate evidence.
Likelihood: Low if built correctly (this is exactly the kind of shortcut Category G threat #38
also describes — "it passed once") / Impact: Critical.
Preventive: `FallbackTransition.renewedGuardsRef` is a required field with no write path that
skips it (Workstream D, Workstream H Phase 3) — structurally required, not merely conventionally
expected.
Detective: `fallback_approved` audit event references the renewed-guards bundle explicitly.
Response: N/A — the transition simply cannot commit without it.
Test evidence: "Fallback without renewed suitability or consent" — architecture test proving no
code path writes `FallbackTransition` without `renewedGuardsRef` populated.
Residual risk: none accepted — this is one of the task's own explicitly named critical
transition rules. Owner: Security reviewer.

**47. Technical failure incorrectly completing an assessment**
Scenario: a disconnect/timeout/vendor-webhook event is wired (accidentally or through scope
creep) to trigger assessment completion.
Entry: any technical-event handler. Asset: assessment/claim state.
Preconditions: a handler for a technical event calls the completion action directly.
Likelihood: Medium (this is, honestly, the single most likely real-world implementation mistake
in a system like this — see Workstream H's own threat-model framing of the exact same risk) /
Impact: Critical.
Preventive: `pharmacistCompletionAt` has exactly one write path in the entire schema — the
pharmacist's explicit completion action (Workstream D, Workstream H §3) — and no technical-event
handler has, or could plausibly be extended to reach, that write path without a deliberate,
reviewable code change.
Detective: architecture test asserting only one function in the codebase writes that field.
Response: N/A — structurally prevented.
Test evidence: "A technical failure cannot complete an assessment" (Required Tests) — the
single most important test in this entire task.
Residual risk: none accepted — non-waivable. Owner: Security reviewer + Task 02 owner.

**48. Session end incorrectly generating a claim**
Scenario: the visit ending (any way) is treated as sufficient to generate a claim.
Entry: visit-end handler. Asset: claim state.
Preconditions: same class as #47.
Likelihood: Medium (same reasoning as #47) / Impact: Critical.
Preventive: same as #47 — claim creation only ever happens inside Task 02's own existing,
unchanged `deriveClaimDraft` path, reachable only after `PHARMACIST_COMPLETED` (Workstream J
§4). No visit-end event of any kind writes claim state directly.
Detective: same class of architecture test as #47, applied to claim-table writes.
Response: N/A.
Test evidence: "A technical failure cannot trigger a claim," "Session end incorrectly generating
a claim" (Required Tests, Workstream J).
Residual risk: none accepted — non-waivable. Owner: Security reviewer + Task 02 owner.

**49. Assessment or authorization changing while the visit is active**
Scenario: the linked assessment's state, or the pharmacist's own authorization, changes mid-visit
(e.g., role revoked, assessment separately modified) and the visit doesn't notice.
Entry: any long-running visit session. Asset: assessment relationship, pharmacist authorization.
Preconditions: guards checked once at visit start, not rechecked before each subsequent
sensitive action.
Likelihood: Low-Medium (a genuine but narrower race than #38/#39) / Impact: High.
Preventive: Workstream J's guard-recheck matrix explicitly includes "before loading assessment
data," "before writing assessment data," and "before assessment completion" as separate,
independently-rechecked checkpoints — not one check reused across the whole visit.
Detective: `assessment_completion_denied_visit_state` audit event (already in the catalogue)
exists specifically to make this kind of denial visible.
Response: N/A — denied at whichever checkpoint the change is caught.
Test evidence: "Authorization change between visit start and assessment write," "Authorization
change before assessment completion," "Authorization change before claim action" (Required
Tests).
Residual risk: none accepted. Owner: Security reviewer.

**50. Insider access to room metadata**
Scenario: an AgentOMA staff member (not the assigned pharmacist) accesses visit metadata beyond
their role's need.
Entry: any internal tooling/admin access. Asset: visit metadata, participant identities.
Preconditions: no role-scoping on internal access, or a broad "admin can see everything" pattern.
Likelihood: Low (this repo has no broad admin/support role today at all — current-state
analysis) / Impact: Medium-High if it existed.
Preventive: the absence of a broad support/admin role is itself the control (same reasoning as
#25) — `pharmacy_admin` is scoped to its own pharmacy like every other role, not a cross-tenant
superuser.
Detective: `administrative_support_access` audit event exists in the catalogue for if/when such
access is ever introduced.
Response: N/A currently — no such access path exists to respond to.
Test evidence: N/A — absence-of-capability, same reasoning as #34.
Residual risk: none currently; flagged for re-review if a support/admin tier is ever added.
Owner: Security reviewer, if/when that role is proposed.

**51. Analytics, referrer, URL, browser-cache, screenshot, or evidence leakage**
Scenario: PHI or tokens end up in analytics, a referrer header, a URL, a shared cache, a
screenshot, or evidence artifact filename.
Entry: many — any client-side rendering, any evidence-capture step. Asset: all PHI-bearing
assets.
Preconditions: analytics/session-replay present (it isn't, current-state analysis §6); PHI
placed in a URL; evidence captured without redaction.
Likelihood: Medium (a broad, easy-to-introduce class) / Impact: High.
Preventive: no analytics/session-replay SDK exists anywhere in this repo (verified, not
assumed); no PHI in URLs anywhere in this task's contracts (Workstream D field-by-field
review); protected responses use `private, no-store` (Workstream K §1); evidence filenames stay
generic (matches Task 01's own `SYNTHETIC-NOT-FOR-CARE-` convention).
Detective: the full "Privacy and leakage tests" list (Required Tests).
Response: N/A for the prototype.
Test evidence: same list, run against the synthetic prototype once built (Workstream L).
Residual risk: none accepted — non-waivable per this task's own invariants and Task 11's control
catalogue. Owner: Security reviewer.

**52. Denial-of-service against waiting rooms or secure messages**
Scenario: a flood of join attempts or messages degrades availability for legitimate users.
Entry: join endpoint, message-send endpoint. Asset: availability.
Preconditions: no rate-limiting.
Likelihood: Low for a pilot-scale system, but not zero / Impact: Medium (availability, not
confidentiality).
Preventive: not built in the synthetic prototype (no real network surface to attack yet); a
production requirement documented here for the eventual real deployment (rate-limiting is
explicitly listed in Workstream K §1's control list, marked as inheriting whatever this repo's
general abuse-control conventions become under Task 11).
Detective: N/A for the prototype.
Response: N/A for the prototype.
Test evidence: N/A — deferred to production implementation.
Residual risk: open, deferred to production, documented rather than silently skipped. Owner:
Security/operations, at production-implementation time.

### Category I — Accessibility as a safety property

**53. Accessibility failure that prevents the patient from understanding consent or using
fallback**
Scenario: a patient using a screen reader, keyboard-only navigation, or with low vision/motor
impairment cannot complete or understand a safety-relevant step.
Entry: consent UI, fallback-selection UI. Asset: consent validity (a consent obtained from
someone who couldn't actually understand the interface isn't a meaningful consent).
Preconditions: UI depends on camera, precise pointing, color alone, or unlabelled controls.
Likelihood: Medium (a public/patient-facing flow with no accessibility floor will predictably
exclude some real users — this isn't a hypothetical edge case, it's a predictable outcome of
skipping accessibility work) / Impact: High (an invalid or misunderstood consent is a safety
and compliance failure, not just a UX defect).
Preventive: the full accessibility requirement list from Workstream G (375px, keyboard, visible
focus, screen-reader names/announcements, no hover-only, no color-only status, 56px targets,
camera-free path, plain-language errors).
Detective: automated + manual accessibility test suite (Workstream L, once built).
Response: N/A — this is a design-time control, not a runtime one.
Test evidence: 375px/keyboard/screen-reader/zoom/reduced-motion evidence (Workstream L
deliverable).
Residual risk: automated accessibility testing cannot fully substitute for real assistive-
technology user testing — flagged for the clinical/operational validation plan (this task's
final deliverable), not resolved here. Owner: Accessibility reviewer.

---

## Threats explicitly deferred to a later stage (not modeled to production depth here)

- **#24 (vendor administrator overreach) and #29 (vendor AI/analytics use)** cannot be fully
  modeled without a selected vendor (Workstream B). Both entries above record what's known now
  and what's blocked pending that decision — not silently dropped, but honestly marked
  `NOT APPLICABLE YET` rather than given a fabricated risk rating.
- **#26 (real WebRTC IP/network-metadata exposure)** in production — the synthetic prototype
  makes no real network calls (Task 01 boundary), so this threat's *production* controls (TURN
  relay policy, IP-masking) are documented as requirements but not tested against real media
  here.
- **#52 (DoS)** — no real network surface exists yet to attack or defend; documented as an open
  production requirement rather than tested.
