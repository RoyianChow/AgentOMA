# Task 01 G1 amendment — CI gate compatibility

**Task:** Task 01 — Enforce the Experimental Sandbox
**Decision:** `G1 AMENDMENT GRANTED`
**Base candidate:** `af2473c546b11c5097597733530be698f7b8588a`
**Approver:** Royian Chowdhury
**Roles:** Product Lead and Security/Privacy Reviewer
**Approval supplied:** `2026-08-22 09:09:42` (Asia/Dhaka, the thread timezone)
**Approval normalized to UTC:** `2026-08-22T03:09:42Z`
**Expiry supplied:** `2026-08-23 09:09:42` (Asia/Dhaka, the thread timezone)
**Expiry normalized to UTC:** `2026-08-23T03:09:42Z`
**G2:** not granted
**G3:** not granted; production-import allowlist remains empty

The same person supplied both required G1 decisions. This records the two
roles accurately and does not describe either decision as an independent
review. Changed-candidate Task 11 review remains required before promotion.

## Verbatim approval

> I, Royian Chowdhury, acting as Product Lead and Security/Privacy Reviewer,
> grant a scoped Task 01 G1 amendment against base candidate
> `af2473c546b11c5097597733530be698f7b8588a`.
>
> Authorized changes:
>
> - Permit `NODE_ENV=production` only during the explicitly identified Next.js
>   sandbox build phase.
> - Continue denying it for sandbox startup/runtime and continue rejecting
>   production credentials, production origins, external integrations, invalid
>   lifecycle state, and unsafe variables.
> - Add positive and negative tests proving these boundaries and proving
>   rejected values are never logged.
> - Replace the overly broad package-script comparison with a
>   production-runtime-script canonicalization.
> - Calculate the revised expected hash from original baseline commit
>   `7737ef26f09fec858d23337885ca7d31e9ccbc64` using the same canonicalization
>   function—never from the current sandbox commit.
> - Continue failing when production build/start behavior changes or sandbox
>   code enters production.
> - Capture changed-candidate red/green evidence and obtain Task 11 review
>   before promotion.
>
> This does not authorize production deployment, hosted sandbox access, G2/G3,
> real data, production credentials, external integrations, or weakening any
> sandbox boundary.
>
> Approval timestamp: 2026-08-22 09:09:42
> Expiry timestamp: 2026-08-23 09:09:42

## Implementation boundary

This amendment authorizes only the two CI-control corrections and their tests,
documentation, and evidence. It does not renew Task 04 or Task 06 runtime
authority, authorize a hosted preview, or make a green build a promotion
decision. The original production baseline commit remains authoritative; the
current sandbox candidate must never be used to manufacture an expected hash.
