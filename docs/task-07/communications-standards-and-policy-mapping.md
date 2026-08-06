# Task 07 — Communications Standards and Policy Mapping

**Workstream:** A

**Prepared:** 2026-08-06

**Repository baseline:** `12801c7211cb6ce3286d209762d61c11b6830193`

**Status:** research and gap mapping only

## Important limitation

This document is not legal, privacy, security, accessibility, professional, or
procurement approval. It records current official sources, the repository's
present evidence, and decisions still required. Applicability can depend on the
message purpose, sender, recipient, channel, custodian/agent relationship, and
vendor contract. Where that analysis is unresolved, the row says so instead of
inventing a rule.

The Ministry minor-ailments notice remains authoritative for the funded service
and clinical follow-up duty. It does not by itself authorize an email, SMS,
push notification, or portal disclosure.

## Status vocabulary

- **Implemented:** current repository evidence directly satisfies the mapped
  technical control for the existing feature.
- **Partial:** a reusable control exists, but not the Task 07 policy/model.
- **Gap:** the required policy, evidence, or control does not exist.
- **Legal/professional decision required:** the implementation team must not
  select an interpretation.

## Source register

| ID | Source and authority | Version/date | Accessed | Why it is in scope |
|---|---|---|---|---|
| S01 | [Personal Health Information Protection Act, 2004](https://www.ontario.ca/laws/statute/04p03), Ontario e-Laws | Current consolidation; individual amendment dates appear in the statute | 2026-08-06 | Consent, safeguards, agents, collection/use/disclosure, minimization, withdrawal, and outside-Ontario disclosure. |
| S02 | [O. Reg. 329/04: General](https://www.ontario.ca/laws/regulation/040329), Ontario e-Laws | Current consolidation | 2026-08-06 | Electronic service-provider restrictions, safeguards, breach notification, and provider access/transfer records where applicable. |
| S03 | [Consent and your personal health information](https://www.ipc.on.ca/en/health-individuals/consent-and-your-personal-health-information), Information and Privacy Commissioner of Ontario (IPC) | Current page; no revision date stated | 2026-08-06 | Knowledgeable consent, express/implied consent, withdrawal, capacity, and substitute decision-makers. |
| S04 | [Fact Sheet: Communicating Personal Health Information by Email](https://www.ipc.on.ca/en/resources-and-decisions/fact-sheet-communicating-personal-health-information-email), IPC | 2016-09-15 | 2026-08-06 | Email risk assessment and administrative, technical, physical, policy, and training safeguards. |
| S05 | [Privacy and virtual health care](https://www.ipc.on.ca/en/covid-19-information-and-resources/privacy-and-virtual-health-care), IPC | Current page; originally published during COVID-19 response | 2026-08-06 | PHIPA applies to virtual care, including secure messaging, telephone, and videoconferencing. |
| S06 | [Responding to a privacy breach](https://www.ipc.on.ca/en/health-organizations/responding-to-a-privacy-breach), IPC | Current page; no revision date stated | 2026-08-06 | Containment, safeguards, unauthorized use/disclosure, secure retention/transfer/disposal, and breach response. |
| S07 | [Report a health privacy breach](https://www.ipc.on.ca/en/health-organizations/report-a-privacy-breach), IPC | Current page; no revision date stated | 2026-08-06 | Individual and IPC notification duties in prescribed circumstances. |
| S08 | [Detecting and Deterring Unauthorized Access to Personal Health Information](https://www.ipc.on.ca/en/resources-and-decisions/detecting-and-deterring-unauthorized-access-personal-health-information), IPC | 2015-01-28 | 2026-08-06 | Role restrictions, logging, auditing, monitoring, training, and unauthorized-access controls. |
| S09 | [Frequently Asked Questions: PHIPA](https://www.ipc.on.ca/sites/default/files/legacy/2015/11/phipa-faq.pdf), IPC | 2015 FAQ; verify against current Act before relying on a legal conclusion | 2026-08-06 | Clarifies that PHIPA does not universally require Ontario/Canada storage and emphasizes custodian accountability and safeguards. |
| S10 | [Virtual Care Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/), Ontario College of Pharmacists (OCP) | Version 1.10; approved 2025-09-16; effective 2025-09-30 | 2026-08-06 | Consent, patient choice, identity/location, secure technology/encryption, privacy, confidentiality, documentation, and contingency plans. |
| S11 | [Supplemental Guidance to the Virtual Care Policy](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/virtual-care-policy/supplemental-guidance-to-the-virtual-care-policy/), OCP | Version 1.00; published/reviewed 2025-10-15 | 2026-08-06 | Authorized-agent identity, consent explanation, secure remote access, and virtual-care suitability context. |
| S12 | [Documentation Guideline](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/documentation-guidelines/), OCP | Current published guideline page; not the separate consultation draft | 2026-08-06 | Communication/attempt documentation, continuity of care, corrections, and avoiding extraneous content. |
| S13 | [Record Retention, Disclosure and Disposal Guideline](https://ocpinfo.com/pharmacy-professionals/rules-and-standards-of-the-profession/practice-policies-guidelines/record-retention-disclosure-and-disposal/), OCP | Published 2012; revised 2014 | 2026-08-06 | Complete patient record, secure/auditable/traceable records, retention, holds, transfer, and disposal. |
| S14 | [Frequently Asked Questions about Canada's Anti-Spam Legislation](https://crtc.gc.ca/eng/com500/faq500.htm/), Canadian Radio-television and Telecommunications Commission (CRTC) | Current page; no revision date stated | 2026-08-06 | CEM applicability, consent proof, sender identification, push/SMS, and unsubscribe behavior. |
| S15 | [The Act, regulations, and guidelines](https://crtc.gc.ca/eng/internet/anti/reg.htm), CRTC | Current page | 2026-08-06 | CASL's statutory/regulatory source list and main CEM requirements. |
| S16 | [Key Unsolicited Telecommunications Rules](https://crtc.gc.ca/eng/phone/telemarketing/tobligations/rules-regles.htm), CRTC | Current page; framework is under 2026 review | 2026-08-06 | If future outbound calling is telemarketing/automated calling: identification, internal do-not-call, calling windows, and records. |
| S17 | [How to make websites accessible](https://www.ontario.ca/page/how-make-websites-accessible), Government of Ontario | Current page; no revision date stated | 2026-08-06 | AODA/Integrated Accessibility Standards and WCAG 2.0 AA public-web requirements where applicable. |
| S18 | [How to make information accessible](https://www.ontario.ca/page/how-make-information-accessible), Government of Ontario | Current page; no revision date stated | 2026-08-06 | Accessible formats and communication supports on request, in consultation with the person. |
| S19 | [How to comply with the Accessibility Standard for Customer Service](https://www.ontario.ca/page/how-comply-accessibility-standard-customer-service), Government of Ontario | Updated 2025-07-31 | 2026-08-06 | Accessible customer service and communication accommodation. |

## Requirements and repository mapping

### 1. Purpose, authority, and minimum necessary information

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S01, PHIPA ss. 29–30 | Collection, use, or disclosure needs consent or another lawful authority; do not use PHI where other information serves, and do not use more PHI than reasonably necessary. | Ontario; all PHI channels | Public intake is zero-PHI; pharmacist routes minimize client exposure; Task 01 fixtures are synthetic. | Define a purpose catalogue and field-level payload allowlist. External notices must be generic and contain no ailment, symptom, appointment detail, medication, clinical outcome, claim, health number, or patient name unless an approved minimum-necessary analysis explicitly allows a field. | Privacy + legal + product. Blocks pilot/production. Synthetic fixtures may model only non-identifying placeholders after Task 07 approval. |
| S01, PHIPA ss. 10, 17 | Custodian information practices and agent activity must be authorized and controlled; the custodian remains accountable for agents. | Ontario; staff, system, and vendor activity | Server actions reauthorize staff; pharmacy is server-pinned; audit foundation exists. | Define the pharmacy/custodian, application operator, vendor/agent, support, and subprocessor roles. Contract and access terms must bind each role. | Privacy/legal/procurement/security. Blocks live vendor and PHI. |
| S01, PHIPA s. 50; S09 | Outside-Ontario disclosure has statutory conditions. PHIPA does not impose a universal Ontario/Canada storage prohibition, but custodians remain accountable for safeguards and agents. | Cross-border storage, support, transit, and disclosure | Project policy pins PHI stores to Canadian regions. No communications vendor exists. | Keep the stricter project residency rule unless the lead changes it. Separately map storage, transit, backups, support access, subprocessors, legal process, and cross-border disclosure. Do not claim “PHIPA requires Canada” as the rationale. | Privacy/legal/security/procurement. Blocks live vendor and production. |

### 2. Consent, patient choice, and withdrawal

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S01 s. 18; S03 | Where consent is required, it must be the individual's/authorized decision-maker's, knowledgeable, related to the information, and not deceptive/coercive. The person must know the purpose and ability to give/withhold consent. | Ontario; all PHI uses/disclosures | Clinical assessment consent captures method, giver, timestamp, and SDM details. | Create separate communication consent by purpose and channel, with notice/version, scope, actor/subject, authorized-agent evidence, captured time/method, effective state, and policy version. Never repurpose clinical consent. | Privacy/legal/product. Blocks pilot/production; policy must be approved before synthetic UI copy is presented as policy. |
| S01 s. 19; S03 | Consent may be withdrawn prospectively; conditions/withdrawal must be respected where applicable. | Ontario; all channels | No communication withdrawal/suppression model. | Model append-only grant, withdrawal, supersession, effective time, and immutable evidence. Dispatch rechecks current state; suppression cancels pending work. | Privacy/legal + backend. Blocks any dispatcher. |
| S03; S10–S11 | Capacity and authorized-agent/SDM identity matter; patient choice remains central. | Ontario health care and virtual care | Clinical SDM fields exist, but no patient/delegate identity domain on `main`. | Consume the approved Task 05 relationship/grant contract; do not accept a client “caregiver” assertion. Keep secure-message modality consent (Task 06) distinct from external-notification consent (Task 07). | Task 05/06 owners + privacy/professional. Blocks secure messaging and delegate notifications. |
| S10 | A patient must have a choice whether to receive virtual care; initiated interactions require documented consent under OCP's policy. | Ontario virtual pharmacy care | Virtual assessment consent exists in clinical workflow; no secure-message workflow. | Task 06 owns suitability and virtual-care consent. Task 07 may dispatch only after Task 06 supplies a current authorized intent. | Professional + Task 06. Blocks secure professional messaging. |

**Open legal question:** whether a particular administrative health reminder is
a CASL commercial electronic message cannot be decided globally. Message
purpose and content require legal review. The design should satisfy a stricter
consent/evidence/sender/suppression baseline without claiming that doing so
settles CASL applicability.

### 3. Safeguards, email, secure messaging, and wrong recipients

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S01 s. 12 | Take reasonable safeguards against theft, loss, unauthorized use/disclosure, copying, modification, or disposal. | Ontario; every PHI record/channel | TOTP staff auth, server authorization, no-store headers, database protections, and audit/retention foundations exist. | Threat-model message creation through deletion. Encrypt in transit/at rest where PHI exists; enforce least privilege, secret management, key rotation, secure deletion, recovery, and kill switches. | Security/privacy. Blocks pilot/production. |
| S04 | Emailing PHI introduces specific privacy/security risks and needs administrative, technical, physical, policy, procedure, and training controls. | Email | No outbound email exists. | Keep ordinary email generic and PHI-free. Put substantive content behind an authorized secure portal. Complete a channel risk assessment and staff training before live use. | Privacy/security/professional. Blocks live email. |
| S10 | Virtual-care technology must protect PHI, limit access to the intended patient, use secure encryption when PHI is transmitted/stored, and document the method. | Professional virtual care, including secure messaging where applicable | No patient secure messaging exists. | Task 05 identity + Task 06 suitability/consent + Task 07 secure delivery controls are all required. No generic email/SMS can substitute for a secure professional channel. | Professional/security/privacy. Blocks secure messaging pilot/production. |
| S11 | Reasonable efforts are expected to confirm the patient and any authorized agent so PHI is not disclosed to the wrong person. | Virtual/remote interaction | No patient/agent identity boundary on `main`. | Reauthorize participants at thread access and send time; revoke immediately when identity/grant state changes. | Task 05 + professional/privacy. Blocks secure thread. |
| S06–S07 | Unauthorized use/disclosure triggers containment and may require notice to individuals and the IPC in prescribed cases. | All channels, including wrong recipient/provider breach | Audit exists; no communications incident workflow. | Approve wrong-recipient and provider-breach runbooks: stop/cancel, contain, preserve safe evidence, assess/report, notify through approved process, remediate destination, and prevent replay. The system must not decide reportability. | Privacy officer/legal/security/operations. Blocks pilot/production. |

### 4. Service providers, subprocessors, and auditability

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S01 s. 10(4); S02 s. 6 | Electronic service providers must follow prescribed use/access/disclosure restrictions; health information network providers have additional notice, safeguard-description, access/transfer record, and agreement duties where the definition applies. | Ontario; electronic providers | No vendor or provider relationship exists. Task 01 adapters deny external transport. | Classify the selected vendor's legal role instead of assuming it is a HINP or agent. Obtain the required written terms, safeguards, incident notice, audit/access/transfer evidence, use limits, deletion, and subprocessor controls. | Privacy/legal/procurement/security. Blocks vendor connection and PHI. |
| S08 | Logging, auditing, monitoring, role restriction, policy, and training help deter unauthorized access. | Custodian and agents | Append-only audit exists; no communications event catalogue. | Define safe audit events for consent/contact/suppression/intent/dispatch/reconciliation/thread access/incidents. Separate operational telemetry from PHI records and test payload exclusion. | Privacy/security/operations. Blocks pilot. |
| S06, S02 | Providers/agents need timely breach notification and custodian-coordinated response. | Vendor/provider | No SLA or contract. | Contract must define incident detection, notification time, forensic access, containment, evidence, subprocessor flow-down, support escalation, and deletion. | Legal/privacy/security/procurement. Blocks production vendor. |

Required procurement evidence before a live provider:

- legal entity and product/SKU actually used;
- service/data-flow description and role classification;
- data regions for message bodies, metadata, logs, backups, and disaster
  recovery;
- subprocessor and support-access locations;
- encryption/key-management and tenant-separation evidence;
- retention/deletion and backup-deletion behavior;
- webhook signing/replay controls and provider event semantics;
- breach, outage, support, and forensic SLAs;
- accessibility evidence for patient/vendor surfaces;
- independent security reports and remediation status;
- contract/DPA/BAA-equivalent terms as applicable; and
- completed PIA, TRA, procurement, privacy, security, and legal approvals.

Marketing claims and a vendor's generic “compliant” badge are not evidence of
these items.

### 5. Contact verification, recycled/shared destinations, and channel changes

No reviewed Ontario source supplies a complete technical algorithm for recycled
phone numbers, shared inboxes, destination expiry, or re-verification cadence.
That absence is not permission to guess.

Required product/privacy/security decisions before implementation:

1. normalization rules per channel;
2. proof/verification method and assurance level;
3. destination version and verification timestamp;
4. validity/reverification period, if any;
5. high-risk change flow, old-destination notification policy, and recovery;
6. treatment of shared/family destinations and authorized agents;
7. recycled-number/wrong-person report flow;
8. what event invalidates queued work;
9. whether a generic message may include the patient's name; default is no;
10. whether channel fallback is ever permitted; default is no silent fallback;
11. destination masking in staff UI; and
12. retention/export of verification evidence.

Until approved, the implementation must fail closed with no send. A destination
that was verified when a reminder was scheduled must be rechecked at dispatch.

### 6. Sender identification, opt-out, CASL, and telephony

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S14–S15 | If a message is a commercial electronic message, CASL generally requires consent, sender identification/contact information, and a working unsubscribe mechanism; the sender bears proof of consent. SMS and some push notifications can be in scope. | Canada; email/SMS/electronic addresses/push depending on facts | No external messages or policy. | Legal review must classify each approved template purpose. Store evidence, identify the approved legal sender, and implement accessible suppression even if a specific transactional message is ultimately exempt. | Legal/product/privacy. Blocks live electronic delivery. |
| S14 | Express consent uses a positive opt-in; pre-checked boxes/silence are not express consent. Unsubscribe must be readily performed; CRTC guidance states links remain valid at least 60 days and requests are processed without delay/no later than 10 business days for CEMs. | CEMs | No UI/model. | Do not preselect communication consent. Make suppression immediate in the application even if a legal outside limit is longer; queued jobs must fail the dispatch recheck. | Legal/product/backend. Blocks pilot/production. |
| S16 | Telemarketing/automated calling rules can require sender identification, internal do-not-call controls, calling windows, and records. | Canadian voice/fax/automated calling when applicable | Voice/fax automation is not in Task 07's approved current scope. | Keep automated voice/fax disabled. Any later proposal needs a separate brief and CRTC/DNCL legal analysis; do not treat SMS consent as voice-call consent. | Legal/product. Blocks any future voice/fax automation. |

Suppression is broader than a CASL unsubscribe field. It must also cover
withdrawn PHIPA authority, invalid/revoked delegate access, wrong-recipient
reports, destination supersession, source cancellation, legal hold on deletion
(not dispatch), security incidents, and kill-switch state.

### 7. Professional records and communication attempts

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S12 | Document pertinent patient/provider discussions and communication that occurred or was attempted; avoid extraneous information; corrections must preserve the record. | Ontario pharmacy patient record | Follow-up attempts and supersession are documented; audit is append-only. | Decide which secure messages, attempts, delivery facts, and patient replies become part of the patient record. Use immutable/superseding correction, not destructive edits. | Professional/privacy/records owner. Blocks pilot. |
| S13 | Patient records must remain secure, auditable, traceable, retrievable, and retained/disposed under the applicable pharmacy schedule; holds can extend retention. | Ontario pharmacy records | Governance schema has retention, holds, exports, destruction, and restore foundations. | Map each communication record type to patient-record or operational retention; include legal hold, export, correction, vendor deletion, backups, and secure disposal. Do not apply one blanket period without review. | Professional/privacy/legal/records owner. Blocks production; synthetic design may use expiring synthetic data after approval. |
| S10 | Virtual-care method and consent must be documented; documentation expectations remain equivalent to in-person care. | Secure professional messaging/virtual care | Clinical assessment documents modality and consent; no thread. | Task 06 decides which thread content is professional care and when a pharmacist record must be created. Task 07 cannot infer a clinical conclusion from a message. | Task 06 + professional. Blocks secure-messaging pilot. |

### 8. Accessibility, language, and alternative channels

| Source | Requirement/recommendation | Jurisdiction/channel | Current evidence | Gap/action | Owner and gate |
|---|---|---|---|---|---|
| S17 | Public web content must meet applicable AODA/IASR requirements, including WCAG 2.0 AA where the organization/content is covered. | Ontario public web | Existing site has responsive/reduced-motion patterns; no Task 07 evidence. | Test Task 07 UI at 375px/desktop, keyboard, screen reader, 200%/400% zoom/reflow, reduced motion, contrast, focus, status announcements, and 56px frequent actions. | Accessibility reviewer. Blocks pilot/production and synthetic PASS evidence. |
| S18–S19 | Make information/communication accessible on request and consult the person about suitable formats/supports; communicate in a way that considers disability. | Ontario customer service and information | No communication preference/accommodation model. | Define accessible alternative channels and staff workflow; do not make portal/email/SMS the only route. Record only minimum necessary accommodation preferences. | Accessibility/product/privacy/operations. Blocks pilot. |
| Product policy (not supplied by an official source) | Plain language, supported languages, translation review, timezone, quiet hours, and alternative channel must be explicit. | All Task 07 channels | English UI; no communication language/time policy. | Product must approve supported languages and fallback behavior. Human review is required for translated clinical/professional text. No machine translation or guessed cadence in v1. | Product/accessibility/professional. Blocks templates and scheduling. |

## Proposed policy decisions requiring human approval

These are questions, not implemented rules:

| Decision ID | Decision needed | Required approvers | Blocks |
|---|---|---|---|
| T07-P01 | Communication purpose taxonomy and which purposes may use each channel | Product, privacy, legal, professional | Consent schema, templates, dispatch |
| T07-P02 | Exact notice/consent wording, evidence, expiry/reverification, agent/SDM handling, withdrawal, and suppression | Privacy, legal, professional, accessibility | Consent UI and dispatch |
| T07-P03 | Contact normalization, proof, validity, recycled/shared destination, change/recovery, and masking | Security, privacy, product | Contact model |
| T07-P04 | Approved sender legal identity, brand (`AgentOMA` vs `AgentRx`), contact information, sending domains/numbers, and opt-out language | Product, legal, privacy | Templates/provider |
| T07-P05 | CASL classification for each purpose/template and any applicable exemptions | Legal | Live email/SMS/push |
| T07-P06 | Reminder cadence, maximum attempts, useful-until time, quiet hours, timezone/DST, overdue handling, and no-fallback policy | Product, operations, privacy, accessibility | Scheduler |
| T07-P07 | Secure-message response expectations, non-monitored/urgent language, escalation, and closure | Professional, operations, Task 06 | Secure threads |
| T07-P08 | Message/template content allowlists, translations, and review/version process | Product, privacy, professional, accessibility | Rendering |
| T07-P09 | Communication audit event catalogue and record-type retention/hold/export/disposal mapping | Privacy, legal, professional, records owner | Persistence |
| T07-P10 | Wrong-recipient, breach, vendor outage, delayed webhook, duplicate send, and reconciliation runbooks | Privacy, security, operations, legal | Pilot/production |
| T07-P11 | Vendor selection, product/SKU, region, subprocessors, support, contract, incident SLA, deletion, PIA, and TRA | Procurement, legal, privacy, security, operations | Live provider |
| T07-P12 | Task 07 risk tier, autonomy level, owner/backup, expiry/review date, kill-switch operator, and Task 11 evidence profile | Product/capability owner, Task 11, security, operations | Runnable synthetic implementation |

## Minimum safe template boundary for future design

Until T07-P01/P04/P05/P08 are approved, no production template is approved.
The following is only a design boundary:

- external notice: generic sender identification and an instruction to sign in
  to the secure portal or contact the pharmacy using an independently verified
  channel;
- never include ailment, symptom, medication, clinical outcome, referral,
  health number, claim/billing, appointment purpose, or secure-message body;
- do not put an access token, patient identifier, or resource identifier in the
  URL;
- do not imply diagnosis, eligibility, clinical review, payment, or urgency;
- no attachment, tracking pixel, third-party image, or link shortener; and
- do not send at all when identity, source state, consent, contact,
  suppression, lifecycle, template, or vendor state is missing/unknown.

## Workstream A standards status

- **Official-source inventory:** PASS for initial design mapping.
- **Legal approval:** NOT GRANTED.
- **Privacy approval:** NOT GRANTED.
- **Security approval:** NOT GRANTED.
- **Professional/template approval:** NOT GRANTED.
- **Accessibility approval/evidence:** NOT GRANTED / NOT RUN.
- **Vendor/contract/PIA/TRA/residency evidence:** NOT SELECTED / NOT VERIFIED.
- **Real PHI or contact data used:** NO.
- **External delivery:** NO.
- **Next safe action:** resolve T07-P12, then create the threat model and data
  flows; policy-dependent schema/UI work waits for the corresponding decisions.
