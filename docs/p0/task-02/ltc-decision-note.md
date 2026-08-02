# Task 02 LTC billing decision note

**Status:** PARKED (G2 not decided)  
**Decision authority:** ODB Pharmacy Help Desk (1-800-668-6641), with the pilot
pharmacist and product/compliance acceptance  
**Code owner after decision:** claim/completion owner under separate approval

## Current behavior

The pharmacist workspace captures whether the patient is an LTC resident, the
pharmacy's provider role, and the emergency fact for a secondary provider.
Database checks preserve coherent fact combinations. The protected
`deriveClaimDraft` path returns `LTC_PENDING_MINISTRY_CLARIFICATION` for every
LTC combination before PIN/fee lookup. The clinical assessment may be retained,
but no LTC claim-draft row is created and the export page states that LTC
billing is parked.

This fail-closed behavior is covered by pure tests. Fresh migration/runtime
evidence for 0018 has not been run under Task 02.

## Why it remains parked

The EO Notice language recorded in `docs/OPEN_QUESTIONS.md` is unresolved:

- the exclusions section says LTC minor-ailment services must be provided by
  the contracted primary pharmacy except an emergency involving a secondary
  provider; and
- footnote 5 says a pharmacy ineligible for a service fee must submit a
  zero-dollar claim.

Task 02 must not decide how those statements interact or infer the fee,
intervention code, submission requirement, or billability path.

## Exact question for the authority

For an Ontario LTC resident receiving a minor-ailment service, what claim must
be submitted, at what fee, and with what intervention code for each of:

1. the home's contracted primary pharmacy;
2. a secondary pharmacy in an emergency; and
3. a secondary pharmacy in a non-emergency?

Specifically, does footnote 5 require a zero-dollar claim when no service fee
is payable, and in which exact scenario is `LT` required?

The decision record must include the response, source/authority, date, caller,
effective scope/date, and product/compliance acceptance. No answer should be
recorded from agent memory or an informal paraphrase.

## Options requiring an authoritative decision

These are questions, not recommendations:

- a zero-dollar submission path for one or more LTC cases;
- a paid secondary-emergency path with the authority-specified intervention;
- a no-submission/refusal path for one or more cases; or
- another documented HNS workflow supplied by the authority.

## Consequences of the eventual decision

Any change may affect the P0-C evidence snapshot, completion eligibility,
`deriveClaimDraft`, seeded references, claim-draft fields, workspace language,
audit event catalogue, export/PDF output, regression/concurrency tests, and
release scope. Because those are protected clinical/billing surfaces, the
decision does not itself authorize implementation; a separate reviewed change
is required.

## Task 02 disposition

No LTC billing behavior, PIN, fee, or intervention rule was inferred or
implemented. G2 remains PARKED and LTC is excluded from any limited core
release claim.
