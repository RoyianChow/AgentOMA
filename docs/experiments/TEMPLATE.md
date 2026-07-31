# Experimental proposal

Copy this template for a future synthetic-only experiment. Do not import
production modules, use production credentials/data, add a hosted preview, or
populate the G3 allowlist from this document.

## Proposal

- Owner:
- Date:
- Synthetic capability:
- Why the experiment is needed:
- Explicit non-goals:

## Data and trust boundary

- Synthetic fixture IDs and labels:
- Persistence: none unless a new G1 design approves it:
- External destinations: none unless separately approved:
- Browser storage, analytics, and error reporting: none:

## Approval gates

- G1 design package:
- G2 hosted-preview approval: not granted by default
- G3 production-import allowlist: empty by default

## Controls and evidence

- Red-run controls:
- Green-run controls:
- Artifact marking:
- Expiry/disable/reset/teardown:
- Production invariance result:

## Rollback

List only exact synthetic files and local state to remove. Do not include a
repository root, wildcard, production table, hosted resource, or arbitrary path.
