# Task 04 — Identity and Delegation Contract

**Status:** Draft for review
**Branch:** `task-04-booking-waitlist`
**Environment:** Task 01 local synthetic sandbox
**Production authorization:** None
**Production identity integration:** Blocked pending Task 05
**Task 11 Checkpoint 1:** Not yet reviewed

## 1. Purpose

This document defines the identity, actor, subject, delegation, authorization,
management-access, audit-attribution, and production-separation contract for
the synthetic Task 04 booking and waitlist prototype.

The contract must ensure that:

- The person performing an action remains distinct from the person receiving
  the appointment.
- A delegate cannot create authority through self-attestation.
- Every booking and waitlist action is authorized server-side.
- Pharmacy and tenant scope are derived from trusted server context.
- Delegation expiry, revocation, subject scope, and action scope are enforced.
- Possession of a booking reference or management link does not provide broad
  authority.
- Synthetic identity cannot be accidentally activated in production.
- Production identity and delegation semantics remain owned by Task 05.

This contract is administrative only.

It does not define:

- Clinical consent.
- Clinical eligibility.
- Substitute-decision-making law.
- Identity-proofing policy.
- Production authentication.
- Account recovery.
- Production session architecture.
- Production caregiver verification.
- Production patient-record access.
- Assessment, billing, claim, or prescription authority.

## 2. Governing boundary

Task 04 owns authorization for synthetic booking and waitlist actions.

Task 05 remains authoritative for production:

- Patient identity.
- Delegate identity.
- Actor-to-subject binding.
- Caregiver or substitute decision-maker verification.
- Delegation creation and revocation.
- Session assurance.
- Account suspension.
- Authentication factors.
- Recovery.
- Patient and pharmacist identity separation.
- Production authorization policy.

Task 04 must consume an approved identity decision in the future.

Task 04 must not create a competing production identity, authentication, or
delegation system.

When Task 05 semantics are missing or unresolved:

- Synthetic identity work may continue.
- Production caregiver access remains `BLOCKED`.
- No production rule may be guessed.
- No synthetic fixture may be represented as production authority.

## 3. Core authorization model

Every protected decision must be evaluated by the server using:

```text
actor
+ subject
+ pharmacy or tenant scope
+ resource
+ requested action
+ session and assurance state
+ identity-to-subject binding
+ delegation grant when required
+ current grant status
+ current resource state
+ current policy version
```

None of these values become authoritative merely because the client submitted
them.

The client may submit only a bounded command containing approved opaque
references and action-specific values.

The server must derive or verify:

- Actor identity.
- Actor type.
- Appointment subject.
- Pharmacy scope.
- Tenant scope.
- Resource ownership.
- Delegation grant.
- Action scope.
- Grant state.
- Session state.
- Authorization result.

## 4. Identity concepts

### 4.1 Actor

The actor is the person or system performing the command.

Synthetic actor types are:

- `synthetic_patient`
- `synthetic_delegate`
- `synthetic_staff`
- `synthetic_system_worker`

An actor record contains or references:

- Opaque synthetic actor identifier.
- Actor type.
- Synthetic marker.
- Server-owned pharmacy scope.
- Server-owned tenant scope.
- Synthetic session reference where applicable.
- Active, suspended, or disabled state.
- Fixture version.

The actor identifier must not contain:

- A real name.
- Email address.
- Telephone number.
- Health-card information.
- Date of birth.
- Production account identifier.
- Production pharmacy identifier.

### 4.2 Subject

The subject is the person for whom the booking or waitlist entry exists.

A subject record contains or references:

- Opaque synthetic subject identifier.
- Synthetic marker.
- Server-owned pharmacy or tenant relationship.
- Fixture version.
- Active synthetic status.

The subject is not automatically the actor.

### 4.3 Self-service binding

A patient acts for themselves only when the server verifies an approved
identity-to-subject binding.

Required relationship:

```text
verified actor -> approved self binding -> appointment subject
```

The client cannot create this binding by submitting the same identifier for
actor and subject.

### 4.4 Delegate

A delegate is an actor permitted to perform specified actions for another
subject under an active server-owned grant.

A delegate does not become:

- The subject.
- The patient account owner.
- A pharmacist.
- A pharmacy administrator.
- An unrestricted representative.
- An identity-recovery authority.
- A person permitted to create additional delegates.

### 4.5 Staff actor

A synthetic staff actor may perform only explicitly approved administrative
actions for the server-derived pharmacy scope.

A staff role must not automatically grant:

- Clinical authority.
- Cross-pharmacy access.
- Patient-portal access.
- Production identity administration.
- Billing authority.
- Claim authority.
- Prescription authority.
- Access to unnecessary contact or caregiver information.

### 4.6 System worker

A synthetic system worker may perform only deterministic background actions
such as:

- Offer expiry.
- Hold expiry.
- Safe reconciliation.
- Bounded promotion where approved.

A system worker must not:

- Impersonate a patient.
- Impersonate a delegate.
- Create delegation.
- Override authorization.
- Make a clinical decision.
- Access production identity.
- Broaden pharmacy scope.

## 5. Actor and subject separation

Every protected booking record must retain separate references for:

- Actor that created or changed the booking.
- Subject receiving the appointment.
- Delegation grant used, where applicable.

The interface and audit model must not collapse these into one ambiguous
“user” value.

A delegated action must be attributable to:

```text
actor reference
subject reference
grant reference
requested action
authorization result
```

The application must never describe delegated activity as though the subject
personally performed it.

## 6. Synthetic identity model

The prototype uses deterministic server-owned fixtures only.

Synthetic identity must:

- Use unmistakably synthetic identifiers.
- Use a fixed fixture version.
- Use no real names or contact details.
- Use no production-derived records.
- Use no production credentials.
- Use no production authentication provider.
- Use no production account or session cookie.
- Be unavailable outside the approved synthetic environment.
- Fail hard when the environment is not explicitly synthetic.

Suggested fixture identifiers include:

- `SYNTH-T04-ACTOR-PATIENT-001`
- `SYNTH-T04-ACTOR-DELEGATE-001`
- `SYNTH-T04-ACTOR-STAFF-001`
- `SYNTH-T04-SUBJECT-001`
- `SYNTH-T04-GRANT-ACTIVE-001`

These are examples only and must remain clearly non-production.

## 7. Production-disable controls

Synthetic identity must be impossible to enable accidentally in production.

Required controls include:

- Server-owned environment classification.
- Explicit synthetic capability flag.
- Deny-by-default behavior.
- Production environment rejection.
- Production hostname rejection where applicable.
- Production database rejection.
- Production credential rejection.
- Architecture tests blocking production identity imports.
- Startup validation.
- Runtime assertion at every synthetic identity boundary.
- No browser-controlled enablement.
- No query-string enablement.
- No cookie-controlled enablement.
- No local-storage enablement.

When any required environment value is:

- Missing.
- Unknown.
- Malformed.
- Stale.
- Production-like.
- Contradictory.

Synthetic identity must remain disabled.

## 8. Delegation-grant contract

A synthetic delegation grant contains or references:

- Opaque grant identifier.
- Verified synthetic actor reference.
- Verified synthetic subject reference.
- Server-owned pharmacy scope.
- Server-owned tenant scope.
- Authority type.
- Permitted resource family.
- Explicit permitted actions.
- Effective time.
- Expiry time.
- Current status.
- Creation provenance.
- Verification provenance.
- Revocation time where applicable.
- Revocation reason code where applicable.
- Policy version.
- Fixture-set version.
- Audit references.

The grant must not contain unrestricted notes or legal conclusions.

## 9. Delegation states

Task 04 needs only the states required to test booking authorization.

Proposed synthetic states:

- `active`
- `expired`
- `revoked`
- `suspended`
- `superseded`

Task 05 may define a broader production lifecycle including:

- Proposed.
- Verification pending.
- Declined.
- Additional approved authority states.

Task 04 must not activate a production grant lifecycle independently.

### 9.1 Active

A grant is active only when:

- Current state is `active`.
- Current server time is on or after the effective time.
- Current server time is before expiry.
- The grant has not been revoked.
- The grant has not been suspended.
- The grant has not been superseded.
- Actor matches.
- Subject matches.
- Pharmacy and tenant scope match.
- Requested action is explicitly allowed.
- Required session assurance is satisfied.

### 9.2 Expired

An expired grant authorizes no new action.

An old booking or management link must not restore an expired grant.

### 9.3 Revoked

A revoked grant authorizes no new action.

Revocation must take effect server-side without depending on:

- Browser refresh.
- UI hiding.
- Client cache expiry.
- Link expiry alone.

### 9.4 Suspended

A suspended grant authorizes no action while suspended.

The prototype must not invent the production process for removing suspension.

### 9.5 Superseded

A superseded grant authorizes no new action.

The server must use the authoritative current grant rather than trusting an
older reference.

## 10. Delegation action scopes

Booking delegation must use explicit action scopes.

Required scopes:

- `booking:create`
- `booking:view`
- `booking:reschedule`
- `booking:cancel`
- `waitlist:join`
- `waitlist:view`
- `waitlist:leave`
- `waitlist:offer_accept`

Optional future actions require separate review.

A grant for one action does not imply another action.

Examples:

- `booking:view` does not permit cancellation.
- `booking:create` does not permit rescheduling.
- `waitlist:join` does not permit offer acceptance unless explicitly included.
- Appointment-only access does not permit health-record access.
- Booking authority does not permit account recovery.
- Booking authority does not permit delegation creation.

## 11. Authorization decision sequence

Every protected command must perform these checks server-side:

1. Validate the strict Zod request.
2. Reject unknown or client-supplied authority fields.
3. Load the trusted synthetic environment.
4. Derive the actor from trusted server context.
5. Derive pharmacy and tenant scope.
6. Resolve the appointment subject.
7. Verify the actor-to-subject relationship.
8. Require a grant when actor and subject differ.
9. Load the authoritative grant.
10. Verify actor binding.
11. Verify subject binding.
12. Verify pharmacy and tenant scope.
13. Verify current grant state.
14. Verify effective time and expiry.
15. Verify required action scope.
16. Verify session or assurance requirements.
17. Verify resource relationship and current state.
18. Perform the command only after authorization succeeds.
19. Record a safe audit result.
20. Return a minimized response.

Authorization must be reevaluated on every protected action.

A previous successful action does not authorize a later action.

## 12. Self-service authorization

A synthetic patient may create or manage their own appointment only when:

- Actor type is `synthetic_patient`.
- Synthetic session is active.
- Actor-to-subject binding is valid.
- Pharmacy scope matches.
- Tenant scope matches.
- Resource belongs to the subject.
- Requested action is permitted.
- Resource state allows the transition.
- Synthetic environment remains valid.

The server must not accept a client-submitted subject identifier as proof of
self-service authority.

## 13. Delegated authorization

A synthetic delegate may act only when:

- Actor type is `synthetic_delegate`.
- Synthetic session is active.
- A server-owned grant exists.
- Grant actor matches.
- Grant subject matches.
- Grant pharmacy and tenant scope match.
- Grant is active.
- Grant is effective.
- Grant is unexpired.
- Grant is unrevoked.
- Grant is unsuspended.
- Requested action is explicitly scoped.
- Resource belongs to the authorized subject and scope.

Failure of any required condition denies the action.

## 14. Required delegation scenarios

### AUTH-DELEGATE-01 — Active grant

Expected:

- Correct actor.
- Correct subject.
- Correct pharmacy.
- Correct action scope.
- Active and unexpired grant.
- Action may proceed when all other checks pass.

### AUTH-DELEGATE-02 — Expired grant

Expected:

- Action denied.
- No domain mutation.
- No capacity effect.
- No successful outbox event.
- Safe audit denial recorded where required.

### AUTH-DELEGATE-03 — Revoked grant

Expected:

- Action denied immediately.
- Replay of an old link or command does not restore access.

### AUTH-DELEGATE-04 — Wrong subject

Expected:

- Action denied.
- Response does not reveal whether the other subject or resource exists.

### AUTH-DELEGATE-05 — Insufficient scope

Expected:

- Action denied.
- A view-only grant cannot cancel or reschedule.
- A create-only grant cannot manage an existing booking.

### AUTH-DELEGATE-06 — Wrong pharmacy or tenant

Expected:

- Action denied.
- Cross-scope resource relationships are also rejected by the database where
  applicable.

### AUTH-DELEGATE-07 — Suspended grant

Expected:

- Action denied.
- UI visibility does not affect the result.

### AUTH-DELEGATE-08 — Superseded grant

Expected:

- Old grant denied.
- Current authoritative grant is evaluated independently.

### AUTH-DELEGATE-09 — Expired session

Expected:

- Action denied.
- Grant validity alone is insufficient.

### AUTH-DELEGATE-10 — Client role escalation

Expected:

- Submitted role, subject, relationship, grant state, pharmacy, or scope is
  rejected or ignored according to the strict request contract.
- No authority is gained.

## 15. Prohibited caregiver authority paths

A caregiver or delegate cannot gain authority through:

- Selecting a checkbox.
- Typing “I am the caregiver.”
- Knowing the subject’s contact details.
- Knowing a booking time.
- Knowing a service category.
- Possessing a predictable booking identifier.
- Possessing another actor’s management link.
- Submitting a subject identifier.
- Submitting a grant identifier without actor binding.
- Submitting a pharmacy identifier.
- Editing browser state.
- Editing hidden fields.
- Changing a URL.
- Replaying a stale request.
- Accessing a cached page.
- Receiving an unsecured reminder.
- Presenting information about the patient.

Knowledge is not authority.

Link possession is not broad authority.

UI visibility is not authorization.

## 16. Caregiver and legal-role distinctions

Task 04 must not treat these roles as interchangeable:

- Informal caregiver.
- Authorized delegate.
- Parent or guardian.
- Attorney.
- Substitute decision-maker.
- Staff helper.
- Pharmacist.
- Pharmacy administrator.

The production legal basis, proofing requirements, allowed scope, expiry, and
revocation rules for each role remain unresolved under Task 05 and applicable
professional, privacy, and legal review.

The synthetic prototype may model an abstract `synthetic_delegate`.

It must not claim that this model proves any real legal authority.

## 17. Management-access credentials

A management-access credential may provide a bounded path to one booking or
waitlist workflow.

It must not replace the full authorization decision.

The stored record contains:

- Opaque token-record identifier.
- Digest of the presented secret.
- Authorized resource reference.
- Authorized action scopes.
- Actor or session binding where required.
- Subject binding.
- Pharmacy and tenant scope.
- Issue time.
- Expiry time.
- Consumption time where applicable.
- Revocation time where applicable.
- Current status.

The raw token must not be stored.

### 17.1 Management credential states

- `active`
- `consumed`
- `expired`
- `revoked`

### 17.2 Required checks

The server must verify:

- Token digest.
- Current status.
- Expiry.
- Revocation.
- Resource binding.
- Actor or session binding.
- Subject binding.
- Action scope.
- Pharmacy and tenant scope.
- Current authorization policy.
- Current resource state.

### 17.3 Link limitations

A management link must not:

- Contain patient identity.
- Contain a booking identifier in readable form.
- Contain appointment purpose.
- Contain pharmacy or tenant authority.
- Grant access to unrelated resources.
- Bypass delegation.
- Remain valid after revocation.
- Remain valid beyond expiry.
- Be stored in analytics or logs.

## 18. Staff authorization

Synthetic staff access requires:

- Trusted synthetic staff identity.
- Explicit staff actor type.
- Server-derived pharmacy scope.
- Server-derived tenant scope.
- Explicit administrative action permission.
- Active synthetic session.
- Current resource relationship.
- Task 04 capability enabled.

Staff authorization must be checked server-side for every action.

A staff actor must not gain cross-pharmacy access through:

- Query parameters.
- Filter selection.
- Client-provided pharmacy identifiers.
- Modified request bodies.
- Direct route access.
- Cached queue data.

## 19. System-worker authorization

A synthetic system worker requires:

- Trusted server execution context.
- Explicit worker identity.
- Approved capability identifier.
- Approved environment.
- Current feature-gate state.
- Bounded operation type.
- Server-derived pharmacy scope.
- Current kill-switch state.

A worker may perform only the action assigned to that worker.

For example, an expiry worker may expire eligible offers but may not:

- Create delegation.
- Create arbitrary bookings.
- Modify patient identity.
- Override staff authorization.
- Contact an external provider.

## 20. Server and client boundary

The client may receive only minimum necessary values.

Approved client-safe values may include:

- Opaque short-lived slot reference.
- Opaque booking-management reference.
- Allowlisted action code.
- Coarse booking state.
- Safe display labels.
- Expiry display value where approved.
- Non-sensitive validation and recovery state.

The client must not receive:

- Complete actor object.
- Complete subject object.
- Complete delegate object.
- Complete grant object.
- Grant verification provenance.
- Internal pharmacy or tenant identifiers.
- Raw management-token record.
- Staff authorization object.
- Full booking record.
- Unnecessary contact details.
- Production identity records.

An architecture test must fail when a complete actor, subject, caregiver,
delegate, grant, contact, or booking object crosses into a client component.

## 21. URL and browser restrictions

Actor, subject, grant, or identity information must not appear in:

- Query strings.
- Fragment identifiers.
- Page titles.
- Referrers.
- Browser storage.
- Service-worker caches.
- Analytics.
- Error-monitoring breadcrumbs.
- Client console logs.
- Client-visible stack traces.
- Public filenames.
- Screenshot evidence.
- Hydration payloads beyond the approved minimum.

Opaque capability references still require:

- Expiry.
- Scope.
- Server verification.
- Rate limits.
- Revocation where applicable.

## 22. Safe authorization responses

Authorization failures must use stable, non-enumerating responses.

Suggested safe code:

`ACCESS_DENIED`

Where an expired management path requires a distinct recovery flow, the
response may use:

`ACCESS_PATH_EXPIRED`

The server must not reveal:

- Whether another patient exists.
- Whether another booking exists.
- Whether a grant exists.
- Whether the subject belongs to another pharmacy.
- Whether a staff role exists.
- The expected actor.
- The expected subject.
- Grant scope details.
- Internal denial rules.

## 23. Audit attribution

Every protected authorization decision should record minimum necessary
append-only evidence.

Approved audit fields may include:

- Opaque audit identifier.
- Event type.
- Schema version.
- Occurrence time.
- Opaque actor reference.
- Opaque subject reference.
- Opaque grant reference where applicable.
- Opaque resource reference.
- Opaque pharmacy or tenant scope.
- Requested action.
- Allowed or denied outcome.
- Safe reason code.
- Authorization-policy version.
- Synthetic marker.
- Correlation reference.

Audit records must not contain:

- Names.
- Email addresses.
- Telephone numbers.
- Health-card information.
- Raw tokens.
- Raw sessions.
- Clinical information.
- Request bodies.
- Grant-document contents.
- Legal documents.
- Unrestricted notes.

## 24. Revocation behavior

Revocation must be enforced server-side.

After revocation:

- New delegated actions are denied.
- Old links cannot restore authority.
- Cached UI state grants no access.
- Replayed commands are reauthorized.
- In-progress operations follow the reviewed transaction boundary.
- Future Task 07 deliveries must not be treated as authority.
- Existing authoritative booking history remains preserved.

Task 05 must define whether and how production revocation invalidates:

- Sessions.
- Outstanding exports.
- Communication access.
- Other patient-portal capabilities.

Task 04 must not invent those broader rules.

## 25. Expiry behavior

Grant and management-access expiry must use trusted server time.

The browser clock is not authoritative.

At expiry:

- New protected commands are denied.
- A page already displayed does not remain authorized.
- A retry is reauthorized.
- An expired link leads to a safe recovery path.
- No unrelated resources are exposed.
- No resource state changes merely because access expired.

## 26. Concurrency and revocation

Authorization must be rechecked inside the protected command boundary.

Required scenarios include:

- Revocation racing booking creation.
- Revocation racing cancellation.
- Revocation racing rescheduling.
- Revocation racing waitlist join.
- Revocation racing offer acceptance.
- Session expiry racing mutation.
- Management-token consumption racing replay.

The final result must follow one valid authoritative order.

A command must not succeed solely because authorization was checked before the
transaction and then changed before commit.

The final implementation must define whether the grant row, authorization
version, or equivalent authority record is locked or revalidated before the
protected transition commits.

## 27. Idempotency and authorization

Idempotency does not preserve authorization forever.

For a new command attempt:

- Current authorization must be evaluated.
- A conflicting command must not gain access through an existing key.
- A completed result may be returned only through the approved recovery
  contract and current disclosure rules.
- Stored responses must be minimum necessary.

A revoked actor must not use an old idempotency key to retrieve information
that current policy no longer permits.

The exact production recovery behavior remains subject to Task 05 review.

## 28. Rate limiting and abuse

Authorization endpoints must be protected against:

- Identifier enumeration.
- Grant guessing.
- Token guessing.
- Token replay.
- Cross-subject probing.
- Cross-pharmacy probing.
- Automated contact-detail testing.
- Repeated expired-link requests.

Limiter keys must be privacy preserving.

Raw actor, subject, contact, grant, or token values must not become limiter
keys or logs.

Rate limiting is not authorization.

## 29. Required authorization matrix

| Actor condition | Create | View | Reschedule | Cancel | Join waitlist | Leave waitlist | Accept offer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Patient acting for self with valid binding | Allow when state permits | Allow | Allow | Allow | Allow | Allow | Allow |
| Active delegate with all required scopes | Allow | Allow | Allow | Allow | Allow | Allow | Allow |
| Active delegate with view-only scope | Deny | Allow | Deny | Deny | Deny | Deny | Deny |
| Expired grant | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Revoked grant | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Suspended grant | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Wrong subject | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Wrong pharmacy or tenant | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Expired session | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Unknown actor type | Deny | Deny | Deny | Deny | Deny | Deny | Deny |
| Client-supplied role or authority | Deny | Deny | Deny | Deny | Deny | Deny | Deny |

“Allow” means only that the identity condition passes.

The command must still pass:

- State-transition checks.
- Capacity checks.
- Slot validation.
- Idempotency checks.
- Feature-gate checks.
- Database constraints.
- Other applicable policy checks.

## 30. Synthetic fixtures

Required fixtures include:

### Actors

- Self-service synthetic patient.
- Authorized synthetic delegate.
- Synthetic staff actor.
- Synthetic system worker.
- Suspended synthetic actor.
- Unknown actor type fixture.

### Subjects

- Subject bound to self-service patient.
- Subject bound to active delegate.
- Wrong-subject fixture.
- Subject in another pharmacy scope.

### Grants

- Active full booking grant.
- Active view-only grant.
- Active insufficient-scope grant.
- Expired grant.
- Revoked grant.
- Suspended grant.
- Superseded grant.
- Wrong-subject grant.
- Wrong-pharmacy grant.
- Not-yet-effective grant.

### Management paths

- Active valid credential.
- Expired credential.
- Revoked credential.
- Consumed credential.
- Wrong-resource credential.
- Wrong-actor credential.
- Tampered credential.

All fixtures must be deterministic and visibly synthetic.

## 31. Required tests

### ID-AUTH-01 — Actor and subject distinction

Prove that the actor and subject remain separate in domain state and audit
evidence.

### ID-AUTH-02 — Self-service binding

Prove that a client cannot self-select another subject.

### ID-AUTH-03 — Active delegation

Prove that correct active scope authorizes only the expected actions.

### ID-AUTH-04 — Expired delegation

Prove that expiry denies all delegated actions.

### ID-AUTH-05 — Revoked delegation

Prove that revocation denies actions and stale-link replay.

### ID-AUTH-06 — Wrong subject

Prove that a valid grant for one subject cannot access another.

### ID-AUTH-07 — Insufficient scope

Prove that scope is evaluated for every action.

### ID-AUTH-08 — Cross-pharmacy denial

Prove that one pharmacy’s grant cannot access another pharmacy’s resource.

### ID-AUTH-09 — Client authority injection

Prove that submitted actor, subject, role, grant state, pharmacy, tenant, and
authorization fields are rejected or ignored.

### ID-AUTH-10 — Management-token replay

Prove that consumed, expired, revoked, or tampered credentials fail.

### ID-AUTH-11 — Enumeration resistance

Prove that unknown and unauthorized resources use the same safe denial shape.

### ID-AUTH-12 — Client-boundary protection

Prove that complete identity and grant objects cannot reach client components.

### ID-AUTH-13 — URL and logging leakage

Prove forbidden markers do not appear in URLs, logs, analytics, errors, or
evidence.

### ID-AUTH-14 — Synthetic production denial

Prove synthetic identity fails to initialize in a production-like environment.

### ID-AUTH-15 — Revocation race

Prove one valid result when revocation races a protected mutation.

### ID-AUTH-16 — Staff scope

Prove that staff can access only explicitly authorized administrative actions
for the server-derived pharmacy.

### ID-AUTH-17 — Worker scope

Prove that a system worker cannot perform unrelated actions.

## 32. Production handoff requirements

Before production identity integration, Task 05 must provide an approved
contract for:

- Identity provider.
- Actor types.
- Subject binding.
- Patient/pharmacist session separation.
- Token audiences.
- Authentication assurance.
- Delegation authority types.
- Caregiver and substitute decision-maker distinctions.
- Grant lifecycle.
- Grant creation.
- Grant verification.
- Grant expiry.
- Grant revocation.
- Grant suspension.
- Scope vocabulary.
- Pharmacy and custodian scope.
- Account suspension.
- Session revocation.
- Recovery.
- Audit ownership.
- Incident response.

Task 04 must adapt to the approved Task 05 contract rather than copying its
internal identity implementation.

## 33. Production blockers

Production delegated booking remains blocked until:

- Task 05 finalizes identity and delegation semantics.
- Relevant caregiver or legal-authority types are approved.
- Identity proofing is approved.
- Session assurance requirements are approved.
- Patient and pharmacist identity domains are separated.
- Revocation behavior is approved.
- Privacy review is complete.
- Security review is complete.
- Legal or regulatory review is complete where required.
- Task 11 approval is recorded.
- Production release is explicitly authorized.

## 34. Stop conditions

Stop the affected workstream when:

- Actor and subject must be treated as one value.
- Client input must be trusted for actor, subject, relationship, pharmacy,
  tenant, role, or authority.
- A caregiver must self-attest authority.
- A real caregiver, guardian, attorney, or substitute decision-maker rule would
  need to be guessed.
- Task 05 identity semantics are unavailable for production work.
- Expired or revoked grants cannot be enforced server-side.
- A grant for one subject can access another.
- A grant for one pharmacy can access another.
- A management link alone grants broad authority.
- Patient and staff sessions cannot be separated.
- Synthetic identity could initialize in production.
- Identity or booking information must appear in a URL, browser store, log,
  analytics event, or unsafe client payload.
- Existing tenant, authorization, audit, or privacy controls must be weakened.
- Required authorization tests are skipped or replaced by UI-only checks.

Independent synthetic contract work may continue while production identity is
blocked.

## 35. Open decisions

The following remain unresolved and must not be invented:

- Production identity provider.
- Production patient proofing.
- Production caregiver proofing.
- Legal authority categories.
- Substitute decision-maker rules.
- Parent and guardian rules.
- Grant creation authority.
- Grant verification evidence.
- Grant review period.
- Maximum grant duration.
- Required session assurance.
- Recovery effects on grants.
- Revocation effects on active sessions.
- Revocation effects on outstanding management credentials.
- Production audit retention.
- Production alternative-access process.

## 36. Current conclusion

The synthetic Task 04 contract keeps actor and appointment subject distinct,
requires explicit server-owned delegation scopes, enforces expiry and
revocation, denies client-supplied authority, and prevents link possession from
becoming broad access.

The contract has not been integrated with production identity.

Production patient and caregiver access remains blocked until Task 05 and the
required security, privacy, legal, professional, and Task 11 approvals are
complete.