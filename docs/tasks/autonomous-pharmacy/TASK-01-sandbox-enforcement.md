# Task 01 — enforce the experimental sandbox

**Owner profile:** platform/security developer

**Priority:** P0 for every later experiment

**Status:** ready for synthetic implementation

## Goal

Make it technically difficult for experimental code to reach production data,
credentials, users, integrations, or unmarked artifacts. Implement the controls
defined in [`../../EXPERIMENTAL_SANDBOX.md`](../../EXPERIMENTAL_SANDBOX.md).

## Scope

- Propose and implement a dedicated experimental build/route boundary.
- Fail the build when an experimental surface is enabled in a production
  deployment configuration.
- Require local Docker or an explicitly approved synthetic preview data source.
- Add persistent experiment banners and generated-artifact watermarks.
- Add `noindex`/navigation exclusion and an expiry mechanism for previews.
- Replace external email, SMS, video, FHIR, payer, payment, courier, storage,
  and dispensing adapters with throwing or recording stubs.
- Create a clearly synthetic fixture package that does not use realistic
  health-card identifiers.
- Add architecture tests preventing production database/auth/integration
  imports into the experimental entry point. Approved pure functions may be
  imported only when the sandbox policy permits them.
- Document teardown and emergency disable procedures.

## Out of scope

- A hidden bypass flag, universal password, admin override, or permissive API.
- Any production deployment, real account, PHI, or external message.
- Changes to clinical, billing, audit, or migration internals.

## Deliverables

1. Short design note describing isolation, threat model, and failure mode.
2. Synthetic-only experimental shell with obvious visual marking.
3. Stubbed integration boundary and denied production adapters.
4. Automated tests proving production configuration rejects the sandbox.
5. Preview expiry/teardown checklist.

## Acceptance criteria

- A production build cannot expose the experimental surface.
- A sandbox process cannot connect when given a production database URL or
  production credential class.
- No experiment page is indexed or linked from production navigation.
- Generated files are watermarked and cannot be mistaken for clinical or claim
  records.
- A network/integration attempt fails closed and produces no payload log.
- All fixtures and accounts are visibly synthetic.

## Evidence required in the PR

- Test output for production-rejection and adapter-denial cases.
- Screenshot at 375px showing the persistent experiment banner.
- Data-flow diagram proving no production/external path.
- `rg` results showing no browser storage, raw `process.env`, or payload logging
  in the experimental path.
