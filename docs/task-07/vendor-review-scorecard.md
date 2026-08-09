# Task 07 — Vendor Review Scorecard

**Workstream:** G — the evaluation instrument for a future communications
provider

**Prepared:** 2026-08-06

**Repository design baseline:** `fe384fdba70477b7ea0b06fd6f83321a152210dd`

**Migration/runtime effect:** none

**Vendor selected:** **NONE**

**Production approval:** not granted

**Companions:** [`provider-adapter-contract.md`](provider-adapter-contract.md) ·
[`webhook-and-reconciliation-design.md`](webhook-and-reconciliation-design.md)

## Decision summary

This is an empty instrument, deliberately. It defines what a communications
provider must evidence before it can be considered, who must review each item,
and which items can never be waived. It does **not** evaluate, shortlist,
recommend, or name a vendor, and it does not pre-fill an answer that a reviewer
is supposed to reach.

No provider has been selected, contacted, or assessed. No credential, sending
domain, telephone number, or endpoint exists. Completing this scorecard is a
procurement, legal, privacy, and security activity — not an engineering one.

## Rules for using this scorecard

| Rule | Requirement |
|---|---|
| Evidence, not claims | A vendor marketing page, a trust-centre badge, a "HIPAA/PHIPA compliant" label, a sales assertion, or an AI-generated summary is **not** evidence. Contractual terms, signed documentation, independent reports, and configuration proof are. |
| Product-specific | Evidence must cover the exact legal entity, product, SKU, tier, and region actually used — not the vendor's flagship offering or its enterprise plan. |
| Named reviewer per row | Each row is answered by its named reviewer. Engineering may gather evidence; it does not decide legal, privacy, or professional rows. |
| Program status vocabulary | `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`. A missing, unavailable, or "we'll get it later" answer is `BLOCKED` or `NOT RUN` — never converted to `PASS`. |
| Non-waivable rows | Marked **NW**. There is no exception path, no risk acceptance, and no compensating-control argument for these. |
| Dated and bound | A completed scorecard is bound to the exact vendor, product, region, contract version, and date, and it expires. Re-evaluation is required on renewal, material product change, subprocessor change, incident, or region change. |
| No self-approval | No one approves a row they authored, and no one approves the section they own operationally. |

## Section A — Identity and product

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| A1 | Legal entity contracting with the pharmacy | Executed contract naming the entity | Legal, procurement | |
| A2 | Exact product, SKU, tier, and channels used | Order form / service description | Procurement, engineering | |
| A3 | Service regions for processing and storage | Written configuration commitment | Privacy, security | **NW** |
| A4 | Account and environment separation (production vs non-production) | Configuration evidence | Security | **NW** |
| A5 | Role classification under PHIPA — agent, electronic service provider, or health information network provider | Legal analysis, not a vendor self-description | Legal, privacy | **NW** |

Row A5 determines which statutory obligations attach. It is a legal conclusion
about the facts of the arrangement, and it must not be assumed from what the
vendor calls itself.

## Section B — Data flow, residency, and access

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| B1 | Data-flow map: message content, metadata, logs, backups, and disaster recovery | Vendor documentation plus contract | Privacy, security | **NW** |
| B2 | Subprocessor list, roles, and locations | Contractual list with change-notice terms | Privacy, legal | **NW** |
| B3 | Support-access model: who can view what, from where, under what approval | Written support policy plus contract terms | Privacy, security | **NW** |
| B4 | Cross-border transfer, legal-process exposure, and government-access handling | Legal analysis | Legal, privacy | **NW** |
| B5 | Alignment with the project's Canadian-region policy | Configuration evidence | Privacy, security | |

On B5: the project pins PHI stores to Canadian regions as a **project decision**.
Do not record "PHIPA requires Canadian hosting" as the rationale — it does not
universally, and the briefs prohibit asserting that it does. The requirement
stands on the project's own policy.

## Section C — Security

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| C1 | Encryption in transit and at rest, with key management | Technical documentation | Security | **NW** |
| C2 | Tenant separation | Architecture documentation, independent report | Security | **NW** |
| C3 | Credential model, scoping, and rotation | Documentation plus configuration proof | Security | **NW** |
| C4 | Webhook signing scheme, key rotation, and replay controls | Technical specification | Security | **NW** |
| C5 | Independent security assessment and remediation status | Current report under NDA | Security | |
| C6 | Vulnerability disclosure and patch commitments | Contract/policy | Security | |
| C7 | Logging on the vendor side — what it retains, for how long, and who reads it | Documentation plus contract | Privacy, security | **NW** |

## Section D — Delivery semantics

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| D1 | Idempotency key support and exact semantics | Technical documentation | Engineering, operations | |
| D2 | Documented outcome vocabulary — accepted, sent, delivered, bounced, complaint, unknown | Technical documentation | Engineering | **NW** |
| D3 | Cancellation support and its real guarantee | Technical documentation | Engineering, operations | |
| D4 | Status lookup / reconciliation API, with rate limits | Technical documentation | Engineering | |
| D5 | Duplicate and out-of-order event semantics | Technical documentation | Engineering | **NW** |
| D6 | Rate limits, throttling, and backpressure behaviour | Technical documentation | Operations | |
| D7 | Outage history, status transparency, and disaster recovery | Public record plus contract | Operations | |

D1 is not non-waivable, because the adapter contract already handles its absence:
without idempotency support, automatic retry after an unknown outcome is denied
entirely. The trade-off is more unresolved cases and more manual reconciliation —
a cost to accept knowingly, not a gap to paper over.

D2 and D5 **are** non-waivable: without documented outcome and ordering
semantics, every internal status derived from this vendor is a guess.

## Section E — Privacy, use restrictions, and records

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| E1 | Purpose and use limitation — service delivery only | Contract clause | Legal, privacy | **NW** |
| E2 | Prohibition on advertising, profiling, audience building, and unrelated analytics | Contract clause | Legal, privacy | **NW** |
| E3 | Prohibition on AI/model training over content or metadata | Contract clause | Legal, privacy | **NW** |
| E4 | Retention and deletion behaviour, including backups and vendor-side logs | Contract plus documentation | Privacy, records | **NW** |
| E5 | Data return and export on exit | Contract clause | Procurement, records | |
| E6 | Deletion evidence and verification | Contract plus process | Privacy, records | |
| E7 | Contract/DPA terms equivalent to the custodian's obligations | Executed agreement | Legal, privacy | **NW** |

## Section F — Incident and operations

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| F1 | Breach and incident notification obligations, with time bounds | Contract clause | Legal, privacy, security | **NW** |
| F2 | Forensic access and evidence preservation during an incident | Contract plus process | Security, privacy | **NW** |
| F3 | Support escalation path and hours | Contract | Operations | |
| F4 | Availability commitments and remedies | Contract | Operations, procurement | |
| F5 | Subprocessor incident flow-down | Contract clause | Legal, privacy | **NW** |
| F6 | Wrong-recipient and misdelivery handling on the vendor side | Documentation plus process | Privacy, operations | |

## Section G — Compliance and accessibility

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| G1 | Sender registration and applicable telecommunications requirements for the channels used | Regulatory analysis plus vendor process | Legal | **NW** |
| G2 | CASL implications of the vendor's own required footer, unsubscribe, or sender behaviour | Legal analysis | Legal | **NW** |
| G3 | Whether vendor-injected content can alter an approved template | Technical documentation | Privacy, product | **NW** |
| G4 | Accessibility of any patient-facing vendor surface — opt-out pages, support, hosted content | Accessibility evidence | Accessibility | **NW** |
| G5 | Language support for any vendor-generated string reaching a patient | Documentation | Accessibility, product | |

G3 deserves emphasis. Several providers append their own footer, unsubscribe
link, tracking, or branding. Anything a vendor adds to an approved template is
**unapproved content on an external channel** and must be evaluated as such, not
tolerated as a platform quirk.

## Section H — Program gates

| # | Criterion | Required evidence | Reviewer | NW |
|---|---|---|---|---|
| H1 | PIA covering identity, contact, consent, provider metadata, portal, incidents, retention, and cross-border flows | Approved PIA | Privacy | **NW** |
| H2 | TRA and remediation status | Approved TRA | Security | **NW** |
| H3 | Professional review where the vendor touches care communication | Pharmacist sign-off | Professional | **NW** |
| H4 | Task 11 registration, evidence profile, and release review | Task 11 record | Task 11 reviewer | **NW** |
| H5 | Kill switch, rollback, and exit plan rehearsed | Drill evidence | Operations, security | **NW** |

## Scoring and decision record

A completed scorecard must record, for the exact vendor and product:

- every row's status (`PASS` / `FAIL` / `BLOCKED` / `NOT RUN`) with its evidence
  reference and reviewer;
- every non-waivable row at `PASS` — any `FAIL`, `BLOCKED`, or `NOT RUN` on an
  **NW** row is a stop, full stop;
- known limitations accepted knowingly, with the accepting authority named;
- the exact contract version, region, and configuration the assessment covers;
- an expiry date and re-evaluation triggers; and
- the named approvers, none of whom approved their own section.

A completed scorecard authorizes **evaluation to proceed to a decision**. It is
not itself a go-live authorization: production delivery additionally requires the
adapter gate list, Task 11 release approval, and every applicable G1–G6 decision.

## Current disposition

**Vendor review scorecard: complete as an instrument. Not applied.**

- **Vendor selected:** NONE.
- **Vendor review:** NOT RUN.
- **Contract review:** NOT RUN.
- **Canadian-residency evidence:** NOT VERIFIED.
- **Cross-border data-flow review:** NOT RUN.
- **PIA approval:** NOT RUN.
- **TRA approval:** NOT RUN.
- **Accessibility review of vendor surfaces:** NOT RUN.
- **Real PHI, recipients, credentials, or external delivery:** NO.

Filling this in requires a vendor to exist as a decision (`T07-D31`) and a
procurement process to be opened. That is a human step; nothing in this document
starts it.
