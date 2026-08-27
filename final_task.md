# Task — System Architecture, Database and Hosting Review

**Nature:** Architecture review, diagrams, decision analysis, and synthetic proof of concept  
**Priority:** Research/design  
**Implementation authority:** None unless separately approved

## Objective

Review AgentOMA’s current system design and determine how it could be made more secure, reliable, scalable, maintainable, and cost-effective.

Do not assume that replacing the current database or hosting platform is necessary. Compare realistic alternatives using evidence and recommend retaining the current architecture if it remains the best fit.

## Start here

Read before inspecting implementation files:

- `AGENTS.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/COMPLIANCE.md`
- `docs/NEXT_STEPS.md`
- `docs/tasks/autonomous-pharmacy/CURRENT-IMPLEMENTATION-STATUS.md`

Use these documents as the architecture map. Inspect individual code paths only when needed to verify a specific claim.

## Current baseline

The maintained application currently uses:

- Next.js 16 and React 19
- Vercel hosting
- Supabase PostgreSQL in Canadian region `ca-central-1`
- Drizzle ORM and file-based migrations
- Better Auth with mandatory TOTP
- Server-side PHI access
- Single-pharmacy tenancy through server-controlled `PHARMACY_ID`
- Database-backed audit, retention, supersession, constraints, and transactional clinical/claim persistence
- A separately isolated, synthetic-only experimental sandbox

Verify this baseline against the repository before relying on it.

## Workstream 1 — Current-state architecture review

Document:

- Application boundaries and route groups
- Authentication and authorization boundaries
- PHI and non-PHI data flows
- Database schema and transaction boundaries
- Audit, retention, correction, and export design
- Background jobs and future asynchronous work
- Production versus synthetic-sandbox boundaries
- Deployment, networking, secrets, backups, and recovery
- Current scalability and availability assumptions
- Current sources of operational or architectural risk

Identify:

- Single points of failure
- Tight coupling
- Missing abstractions
- Transactional consistency risks
- Connection-pooling risks
- Recovery and disaster-recovery gaps
- Observability gaps
- Privacy or PHIPA risks
- Cost and vendor-lock-in concerns
- Areas that are over-engineered for the current pilot

Do not modify protected clinical, billing, migration, or audit behavior.

## Workstream 2 — Database options

Compare the existing Supabase PostgreSQL architecture with at least:

1. Supabase PostgreSQL — current architecture
2. Managed PostgreSQL on Google Cloud SQL
3. Azure Database for PostgreSQL Flexible Server
4. Another credible Canadian-region relational option, if one exists

A NoSQL alternative may be discussed, but it must demonstrate how it would safely preserve:

- Multi-row assessment, evidence, claim, and audit atomicity
- Database-enforced immutability
- Foreign keys and tenant isolation
- Deferrable constraints
- Race-free same-day exclusions
- Immutable supersession
- Reliable migrations
- Point-in-time recovery
- Ten-year clinical-record retention
- Better Auth compatibility

Do not recommend Firestore or another NoSQL database merely for simplicity. Explain the concrete benefits and the compliance or consistency costs.

Score each option for:

- Canadian data residency
- PHIPA/privacy suitability
- Transaction and constraint support
- Better Auth and Drizzle compatibility
- Connection pooling
- Backup, restore, PITR, and regional recovery
- Encryption and key-management options
- Auditability
- Operational burden
- Expected pilot and production cost
- Vendor lock-in
- Migration difficulty and risk

Use current official vendor documentation. Record links and the date each claim was verified.

## Workstream 3 — Hosting options

Compare the current Vercel deployment with suitable Canadian-region alternatives, such as:

- Vercel
- Google Cloud Run
- Azure Container Apps or App Service
- Another credible Canadian-region platform

Evaluate:

- Whether application execution and logs can remain in Canada
- Networking to the Canadian PostgreSQL region
- Serverless connection behavior
- Private networking
- Secrets management
- Deployment rollback
- Logging and PHI controls
- WAF, DDoS, rate limiting, and security headers
- Background-worker support
- Scheduled jobs
- Availability and disaster recovery
- Operational complexity
- Cost at pilot and production scale

Clearly distinguish verified facts from assumptions.

## Workstream 4 — System-design diagrams

Create Mermaid diagrams for:

1. C4 system-context diagram
2. Container/component diagram
3. Production deployment diagram
4. PHI data-flow and trust-boundary diagram
5. Authentication and authorization sequence
6. Assessment → evidence → claim draft → audit transaction
7. Patient intake and pharmacist handoff
8. Backup, restore, and disaster-recovery flow
9. Experimental-sandbox isolation boundary
10. Proposed target architecture

Every diagram must label:

- PHI boundaries
- Authentication boundaries
- Canadian-region requirements
- External systems
- Trust transitions
- Production versus synthetic components

## Workstream 5 — Documented proof of concept

Design a small synthetic-only PoC comparing the current architecture with the recommended alternative.

### Checkpoint before implementation

First provide:

- PoC scope
- Files to be added
- Dependencies
- Docker or hosted resources required
- Network behavior
- Test-data design
- Expected cost
- Cleanup procedure
- Security boundaries

Wait for Product Lead and Security/Privacy approval before writing or running the PoC.

### PoC restrictions

- Synthetic data only
- No PHI
- No Supabase production access
- No production credentials
- No live integrations
- No external notifications
- No existing migration changes
- No `db:push`
- No production deployment
- No imports from protected clinical or billing modules
- No weakening Task 01 sandbox boundaries
- Exact teardown of all temporary resources

Prefer a loopback-only Docker PoC. A hosted PoC requires separate approval before resources are created.

### PoC measurements

Where applicable, measure:

- Connection startup and pooling
- Transactional write behavior
- Concurrent updates and race handling
- Migration replay from zero
- Backup and restore
- Failure recovery
- Query latency using synthetic representative records
- Operational setup complexity

Do not present microbenchmarks as production guarantees.

## Deliverables

Create:

- `docs/architecture/SYSTEM-DESIGN-REVIEW.md`
- `docs/architecture/DATABASE-AND-HOSTING-COMPARISON.md`
- `docs/architecture/TARGET-ARCHITECTURE.md`
- `docs/architecture/POC-PLAN.md`
- `docs/architecture/POC-RESULTS.md` if implementation is approved
- `docs/architecture/decisions/ADR-001-data-platform.md`
- `docs/architecture/decisions/ADR-002-application-hosting.md`

Place Mermaid diagrams in the relevant documents or under:

- `docs/architecture/diagrams/`

Update `docs/PROJECT_OVERVIEW.md` only after the review is complete, and only to describe accepted decisions—not proposals.

## Required recommendation format

End the review with:

- Recommended database
- Recommended application host
- Recommended deployment topology
- What should remain unchanged
- What should change now
- What should wait until production scale
- Migration sequence, if any
- Estimated complexity and major risks
- Rollback strategy
- Open decisions requiring human approval
- Confidence level and evidence limitations

Include “stay with the current stack” as a valid conclusion.

## Stop conditions

Stop and ask before:

- Changing any database provider
- Editing migrations
- Creating cloud resources
- Using production credentials
- Connecting to Supabase
- Processing PHI
- Changing authentication or authorization
- Changing audit or retention controls
- Deploying a PoC
- Incurring costs
- Weakening sandbox isolation

## Definition of done

- Current architecture is accurately documented
- All proposed alternatives use current official sources
- Database and hosting comparison is evidence-based
- PHIPA and Canadian residency are addressed explicitly
- Required Mermaid diagrams render correctly
- Recommendation includes costs, risks, migration effort, and rollback
- PoC plan is documented before implementation
- Any approved PoC is synthetic, isolated, reproducible, and fully removed afterward
- No production behavior, protected data, or migrations are changed
- Documentation clearly separates current state, proposal, and approved decisions