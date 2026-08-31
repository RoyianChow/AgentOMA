# ADR-002 — Application hosting

**Status:** Proposed (not decided — this review has no authority to approve it; see "Approval"
below)
**Date:** 2026-08-27
**Deciders:** Product Lead, Security/Privacy lead (named, not yet recorded as having reviewed
this)

## Context

The task brief that requested this review asserted "Vercel hosting" as part of the current
architecture baseline. Two independent research passes during this review found **no evidence
of this in the repository** — no `vercel.json`, no `.vercel/` directory, no hosting row in
`docs/PROJECT_OVERVIEW.md`'s own technology table. That gap is itself a finding worth fixing
(nothing in-repo names the deployment target). The product owner has since confirmed directly
that Vercel is the current hosting platform. Full detail:
[`../SYSTEM-DESIGN-REVIEW.md`](../SYSTEM-DESIGN-REVIEW.md) §9.

## Decision drivers

- Whether application execution and logs can stay in Canada (PHIPA-relevant).
- Networking behavior to the Canadian-region Supabase Postgres instance.
- WAF/DDoS/security-header support.
- Deployment rollback capability.
- Background/scheduled-job support (none currently needed, per system review §6, but relevant to
  future planning).
- Operational complexity and cost at pilot vs. production scale.
- Vendor lock-in.

Full scoring and sourcing: [`../DATABASE-AND-HOSTING-COMPARISON.md`](../DATABASE-AND-HOSTING-COMPARISON.md)
Part B.

## Options considered

1. **Vercel** (confirmed current platform).
2. Google Cloud Run.
3. Azure Container Apps (App Service noted as an Azure-internal alternative).

## Key finding that shapes this decision

**Supabase's connection pooler is reached over public TLS, not a private network path.** This
means the private-VPC-to-database advantage that would normally favor Cloud Run or Azure
Container Apps over Vercel does not materially apply to this app's *current* database choice —
narrowing the real-world differentiation between all three platforms considerably. That advantage
would only become relevant if the database also moved to a VPC-native product, which ADR-001 does
not recommend doing.

Of the three, Vercel has the most concrete, verified, self-serve compliance path for PHI-adjacent
work (a $350/mo BAA add-on on its Pro tier) and the least operational complexity. Azure Container
Apps has no official first-party Next.js App Router deployment guide (the weakest documented fit
of the three) and mandates a fixed-cost WAF resource (Application Gateway/Front Door) that the
other two either include or make optional.

## Decision

**Retain Vercel**, with one required configuration change: explicitly pin function execution to
the Montréal region (`yul1`), since Vercel's default is US-based and Canadian residency is not
automatic the way it is on GCP/Azure's regional model.

If a future migration is ever pursued instead, **Google Cloud Run is the recommended
alternative**: official Next.js support, unambiguous Canadian region availability (unlike Azure
Container Apps' less-certain Canada East status), and lower operational complexity than Azure
Container Apps.

## Rationale

No migration is justified by the evidence: Vercel has no repository-visible defect and scores at
least as well as the alternatives once the (largely moot, per the key finding above)
private-networking advantage is set aside. The one concrete gap that *is* real is region pinning:
nothing in this review found evidence that Canadian compute residency is currently guaranteed by
configuration rather than by accident.

## Consequences

- **Positive:** no new vendor relationship, no re-platforming effort, no deployment-pipeline
  rework.
- **Negative:** region-pinning still needs to be applied — until it is, Canadian compute
  residency is not actually guaranteed by anything in the current configuration.
- **Neutral:** the PHI/logging-controls comparison found no vendor with an explicit PHIPA
  statement (all lean on HIPAA-equivalent framing) — this is a shared limitation across every
  option considered, not a reason to prefer one over another.

## Revisit trigger

Re-open this decision if: (a) a background-worker or long-running-process requirement emerges
that Vercel doesn't cleanly support, (b) AgentOMA's database migrates to a VPC-native product
(re-activating the private-networking differentiation this ADR found largely moot today), (c)
Azure's Canada East Container Apps availability is confirmed and materially changes that
platform's standing, or (d) Vercel's pricing, region-failover terms, or BAA product changes
materially.

## Approval

**Not yet approved.** This ADR records the evidence-based recommendation of a documentation-only
architecture review. Per the task's own authority boundary, no hosting platform may be changed
and no cloud resources may be created without separate, explicit approval from the Product Lead
and Security/Privacy lead. This document does not constitute that approval.
