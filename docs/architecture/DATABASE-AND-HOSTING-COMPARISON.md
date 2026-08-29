# AgentOMA — Database and Hosting Comparison (Workstreams 2 & 3)

**Nature:** research and comparison only. No provider is changed, no credentials are created, no
resource is provisioned by this document.

**Method:** every factual claim below is sourced to current official vendor documentation, with
the URL and the date it was checked. Where a source was ambiguous or a claim couldn't be
confirmed, this document says so explicitly rather than filling the gap with an assumption.

---

## Part A — Database options (Workstream 2)

### Requirements this comparison is scored against

Per the task brief and confirmed against the actual schema in
[`SYSTEM-DESIGN-REVIEW.md`](SYSTEM-DESIGN-REVIEW.md) §4: multi-row assessment/evidence/claim/audit
atomicity, database-enforced immutability (triggers + revoked privileges), foreign keys, tenant
isolation, deferrable constraints, race-free same-day exclusion (advisory-lock trigger),
reliable file-based migrations, point-in-time recovery, ten-year clinical-record retention, and
compatibility with better-auth's Postgres session/account/TOTP schema (which lives in the same
database as PHI today).

### Options compared

1. **Supabase PostgreSQL** — current architecture.
2. **Google Cloud SQL for PostgreSQL**.
3. **Azure Database for PostgreSQL Flexible Server**.
4. **AWS RDS for PostgreSQL** (`ca-central-1`) — the fourth credible Canadian-region relational
   option, chosen over Azure/GCP alternatives because it's a major, well-documented,
   Canada-region-confirmed managed Postgres with a materially different operational model
   (classic instance + optional Multi-AZ cluster) worth contrasting against the other two
   hyperscalers.

All four are standard PostgreSQL underneath. None restrict `CREATE TRIGGER` or `REVOKE` on
application-owned tables — the immutability pattern this app relies on (§4 of the system review)
is portable to any of them without redesign.

### Scored comparison

| Criterion | Supabase (current) | Google Cloud SQL | Azure Flexible Server | AWS RDS (`ca-central-1`) |
|---|---|---|---|---|
| **Canadian residency** | ✅ `ca-central-1` explicit region option | ✅ Two options: `northamerica-northeast1` (Montreal), `northamerica-northeast2` (Toronto) | ✅ Two options: Canada Central, Canada East | ✅ `ca-central-1` (Montreal), GA |
| **PHIPA/privacy suitability** | Standard encryption; HIPAA-equivalent compliance is a paid Team-tier add-on ($599/mo base); no CMK except by enterprise sales contact | CMEK is GA, including for enhanced backups | CMK supported at server creation (not switchable after); Entra ID auth | KMS-based encryption (customer- or AWS-managed); IAM DB auth available |
| **Transaction/constraint support** | Full — standard Postgres | Full — standard Postgres | Full — standard Postgres | Full — standard Postgres |
| **better-auth & Drizzle compatibility** | Officially documented Drizzle+Supabase guide, explicit prepared-statement guidance | No vendor-specific driver needed; standard TLS Postgres endpoint | No vendor-specific driver needed; disable prepared statements if routing through built-in PgBouncer | No vendor-specific driver needed for classic RDS endpoint |
| **Connection pooling** | Supavisor (transaction-mode pooler, port 6543); this app already disables prepared statements to work with it | Managed Connection Pooling now built directly into Cloud SQL, or Auth Proxy + self-run PgBouncer | Built-in PgBouncer is GA; transaction mode default; no prepared-transaction (2PC) support; unsupported on Burstable tier | RDS Proxy; multiplexing for PostgreSQL extended query protocol added Nov 2023, reducing (not eliminating) connection pinning |
| **Backup/PITR/regional recovery** | Daily backups included (7d Pro / 14d Team); **PITR is a separate paid add-on** (~$100–400/mo depending on window, requires min "Small" compute) | WAL-based PITR; default 7 daily backups; "Enhanced backups" (GA) add centralized management and longer retention — exact max PITR window not confirmed from the page fetched, verify before relying on it | Configurable 7–35 day retention with PITR anywhere in that window; **Long-Term Retention via Azure Backup supports up to 10 years** — a direct match for this app's clinical-record retention requirement | Automated backups with continuous WAL shipping enable PITR up to 35 days; manual snapshots retained indefinitely, usable to build a 10-year retention policy |
| **Encryption/key management** | AES-256 at rest, TLS in transit, always on; **no self-service CMK** | AES at rest by default; **CMEK is GA**, including for enhanced backups, with same-key restore | Encryption at rest with system- or customer-managed key via managed identity, chosen at creation | KMS at rest (customer- or AWS-managed); TLS in transit |
| **Auditability** | Postgres-standard; `audit_log` design (this app's own) is vendor-independent | Same | Same | Same |
| **Operational burden** | **Lowest** — already integrated, pooler/migration path already solved and working in production today | Moderate — HA, CMEK, and pooling are explicit configuration choices, not defaults | Moderate — HA, CMK, and PgBouncer are explicit choices; LTR is a distinct configured feature | Moderate–higher — Multi-AZ, RDS Proxy tuning, and backup-beyond-35-days all need explicit setup |
| **Pilot-scale cost** | $25/mo Pro tier covers current single-pharmacy scale; PITR add-on would be new spend not currently confirmed as enabled (see finding below) | Pay-per-resource, comparable order of magnitude at pilot scale, but requires assembling HA/CMEK/pooling separately | Comparable order of magnitude; Burstable tier is cheap for pilot scale but doesn't support the built-in pooler | Comparable at pilot scale; Multi-AZ roughly doubles compute+storage cost if enabled |
| **Vendor lock-in** | Low–moderate — standard Postgres, but PITR pricing/UX and Supavisor pooling behavior are Supabase-specific conveniences | Low — standard Postgres; Auth Proxy is optional | Low — standard Postgres; built-in PgBouncer and LTR are optional conveniences | Low for plain RDS; would rise materially if the Aurora variant were chosen instead (see footnote) |
| **Migration difficulty/risk** | N/A (current) | Standard `pg_dump`/logical-replication migration from any Postgres source; re-pointing `DATABASE_URL`/`DIRECT_URL`; re-verifying trigger/privilege setup via the existing migration replay path (the same `db:generate`/`db:migrate` discipline already used) | Same pattern | Same pattern |

**Aurora footnote:** AWS Aurora PostgreSQL was not scored above because it is architecturally
different from plain RDS (distributed shared storage, not standard EBS-backed Postgres) — faster
failover and continuous low-RPO backup are real advantages, but it carries materially more
Aurora-specific operational and lock-in surface than plain RDS. If AWS were ever selected, plain
RDS is the closer match to this app's "standard Postgres, portable" posture; Aurora would be a
deliberate, separate trade-off.

### NoSQL — considered and explicitly not recommended

A document database (Firestore or DynamoDB) was evaluated per the task's instruction, not
dismissed on convenience grounds:

- **Firestore** transactions provide real multi-document ACID (the old 500-document cap is gone),
  but impose a 270-second transaction time limit and have **no equivalent of foreign keys,
  deferrable constraints, or database-enforced triggers**. Immutability would require Security
  Rules plus audited Cloud Functions — a weaker guarantee than a Postgres trigger with revoked
  privileges, because Admin-SDK backends can bypass Security Rules. Race-free same-day exclusion
  would need to be reimplemented as an optimistic-concurrency retry loop rather than a database
  advisory lock.
- **DynamoDB** `TransactWriteItems` is atomic across up to 100 actions and multiple tables, but
  capped at 4MB aggregate size per transaction, can't target the same item twice, and can't
  operate through secondary indexes. There is no FK/deferrable-constraint equivalent, and
  DynamoDB Streams (the closest thing to a trigger) are asynchronous and eventually consistent —
  unsuitable for synchronous immutability enforcement.

**Conclusion:** both products could technically fit this app's write volume (well within their
per-transaction item caps), but immutability, referential integrity, deferrable constraints, and
race-free exclusion would all move from database-enforced guarantees to application-code
guarantees with weaker failure modes. This is a real, disclosed cost, not a reason dismissed with
"NoSQL is simpler" — and it's why this document does not recommend either product.

### Real finding worth acting on regardless of vendor choice

**This app's own documentation gives no evidence that Supabase PITR is currently enabled.**
`docs/COMPLIANCE.md` and `docs/NEXT_STEPS.md` discuss backups and the (never-executed) restore
drill but never confirm the PITR add-on is active. Since PITR is billed separately on Supabase
(§ table above) and ten-year retention is a stated hard requirement, **confirming whether PITR is
currently on, and enabling it if not, is a higher-priority, lower-effort action than any
vendor migration** — this should be verified with whoever manages the Supabase project directly
(this review has no access to billing/project configuration).

### Database recommendation (feeds ADR-001)

**Stay with Supabase PostgreSQL for the current pilot.** The evidence does not support migration:
all four options are equally capable Postgres for this app's actual requirements, migration
carries real (if moderate) risk and effort for a single-pharmacy pilot with no proven capacity
pressure, and Supabase remains the lowest-operational-burden option today specifically because
the pooling/migration path is already solved and working. Azure's native 10-year Long-Term
Retention and the CMEK availability on GCP/Azure/AWS are the most concrete reasons a future
re-evaluation could go differently — worth revisiting specifically at the point AgentOMA moves
toward multi-tenant production scale, not before. See ADR-001 for the recorded decision and its
explicit revisit trigger.

---

## Part B — Hosting options (Workstream 3)

### Current platform: confirmed as Vercel

A second, independent check (not just the one in `SYSTEM-DESIGN-REVIEW.md` §9) again found **no
`vercel.json`, no `.vercel/`, and no hosting configuration anywhere in the repository** — the
platform cannot be determined from committed code alone. The product owner has since confirmed
directly that Vercel is the current hosting platform. The comparison below evaluates Vercel as
the confirmed incumbent against two alternatives, rather than as an unverified guess.

### Options compared

1. **Vercel** — the framework vendor's own platform (Next.js's original commercial host).
2. **Google Cloud Run** — serverless containers, Canadian regions confirmed.
3. **Azure Container Apps** (App Service noted as an alternative within Azure).

### Scored comparison

| Criterion | Vercel | Google Cloud Run | Azure Container Apps |
|---|---|---|---|
| **Execution/logs stay in Canada** | Not by default — functions default to `iad1` (Washington DC); Montréal (`yul1`) is GA and can be explicitly pinned via `vercel.json`. Hobby tier = 1 region only | ✅ Both `northamerica-northeast1` (Montreal) and `northamerica-northeast2` (Toronto) are GA; logs carry the resource's region | Canada Central confirmed; Canada East availability was inconsistently documented in this pass — **re-verify directly against Azure's live products-by-region table before relying on it** |
| **Networking to Canadian Postgres** | Public TLS only (no private-network product for this) | Direct VPC egress (GA) to any VPC resource — **but Supabase's pooler is reached over public TLS regardless**, so this advantage doesn't materialize for this app's current DB choice | VNet integration to Azure-hosted Postgres — same caveat: moot against a public-TLS Supabase endpoint |
| **Serverless connection behavior** | Standard HTTP function invocation; no special DB-connection product | Standard container; direct VPC egress if targeting a VPC-resident DB | Standard container; VNet integration if targeting a VNet-resident DB |
| **Private networking** | Enterprise-only ("Secure Compute") | Direct VPC egress, GA, no extra product tier | VNet integration, standard feature |
| **Secrets management** | Encrypted env vars, scoped per environment, 64KB/deployment cap; no dedicated secrets-manager product | Native Secret Manager integration | Native Key Vault reference support via managed identity, auto-refresh ~30 min after rotation |
| **Deployment rollback** | "Instant Rollback" — seconds; Hobby limited to the immediately previous deployment only, Pro/Enterprise to any prior one | Revision-based traffic-weight reassignment, near-instant, graceful drain of in-flight requests | Revision-based traffic-weight reassignment, near-instant |
| **Logging/PHI controls** | Standard platform logs; no PHIPA-specific statement found; HIPAA BAA available (Pro: $350/mo self-serve, Enterprise via sales) | Cloud Logging, region-scoped to the pinned resource; no PHIPA-specific statement found; BAA path exists under GCP's standard enterprise agreements but wasn't independently verified this pass | Standard platform logs; no PHIPA-specific statement found; BAA path exists under Azure's standard enterprise agreements but wasn't independently verified this pass |
| **WAF/DDoS/rate limiting** | DDoS mitigation automatic on all tiers; WAF (custom/managed rules, rate limiting) included; advanced bot management Pro/Enterprise | Cloud Armor (WAF + DDoS) available but **requires fronting Cloud Run with an external load balancer** — not built-in | **No built-in WAF** — requires Application Gateway (regional) or Front Door (global), a standing resource with its own fixed cost (~$125+/mo) even before traffic |
| **Background-worker support** | No native long-running worker primitive | Standard container can run a worker process; no managed queue product bundled | Standard container; same |
| **Scheduled jobs** | Native Cron Jobs (`vercel.json`, UTC, HTTP-GET trigger) | Cloud Scheduler (managed) | Container Apps Jobs, native Schedule/Event/Manual trigger types |
| **Availability/DR** | Multi-region on Pro (up to 5)/Enterprise; automatic failover config on Enterprise | Standard Cloud Run availability; multi-region requires explicit setup | Standard Container Apps availability; multi-region requires explicit setup |
| **Operational complexity** | **Lowest** — near-zero-config for a standard Next.js app; region-pinning is one explicit setting | Medium — Dockerfile/container build, IAM, and (for WAF) a separate load balancer + Cloud Armor policy, but well-documented and GA for Next.js specifically (official Google quickstart exists) | **Highest** — VNet, subnet delegation, Application Gateway/Front Door + WAF policy, managed identity/Key Vault wiring, typically via Bicep/Terraform; **no official first-party Next.js App-Router deployment guide was found** (Microsoft's Next.js docs focus on Static Web Apps, a different product with different SSR limitations) |
| **Pilot-scale cost** | ~$20–40/mo (Pro seat + light usage), +$350/mo if a BAA is required | Low tens of $/mo, largely within the free tier | Low tens of $/mo compute, **+~$125/mo fixed if WAF/Application Gateway is required** regardless of traffic |
| **Production-scale cost** | Low hundreds to low thousands/mo, dominated by data-transfer/edge-request overage | Low hundreds/mo; Cloud Armor/load balancer adds a fixed line item | Hundreds/mo; WAF/App Gateway is a fixed line item regardless of traffic |
| **Vendor lock-in** | Moderate–high — `vercel.json`, cron format, region/failover config are Vercel-specific; the Next.js app code itself stays portable | Low–moderate — a standard container, portable to any container platform; Cloud Armor/Direct-VPC/Scheduler wiring is GCP-specific IaC | Low on the container; moderate–high on the surrounding VNet/WAF/Key-Vault topology, which is Azure-specific IaC |

### Cross-cutting finding that changes the shape of this decision

**Because Supabase's connection pooler is reached over public TLS, not a private network path,
the "private networking to the database" advantage that would normally favor Cloud Run or
Container Apps over Vercel does not actually apply to this app's current database choice.** This
materially narrows the real-world differentiation between all three platforms — the private-VPC
argument only becomes relevant if the database itself also moves to a VPC-native product (e.g.,
Cloud SQL with direct VPC egress, or Azure Flexible Server with VNet integration), which Part A
does not recommend doing right now.

None of the three vendors name PHIPA specifically in their official documentation found during
this research pass; all lean on HIPAA-equivalent controls. Vercel has the most concrete,
self-serve compliance product for this (a $350/mo BAA add-on on Pro). GCP's and Azure's
HIPAA-BAA paths exist under their standard enterprise agreements but were not independently
verified in this pass — that verification is a prerequisite before those platforms could be
seriously considered for a PHI workload, not an assumption this document makes on their behalf.

### Hosting recommendation (feeds ADR-002)

**Retain Vercel.** The evidence does not support migrating away for the current pilot: it has the
best-verified Next.js fit of the three (official first-party product), the lowest operational
complexity, and a concrete, purchasable compliance path if PHI-handling requires a BAA. Two
concrete actions apply:

1. **Explicitly pin function execution region to Montréal (`yul1`)** — the default is US-based,
   and Canadian residency for compute is not automatic on Vercel the way it is on GCP/Azure's
   regional model.
2. **Determine, with privacy/legal input, whether the $350/mo BAA add-on should be purchased** —
   this is a compliance decision, not an engineering one, and this document does not make it.

If a future migration is ever pursued, **Google Cloud Run is the strongest alternative** found in
this research: official Next.js support, the least operationally complex of the two
infrastructure-heavier options, and Canadian region availability with no ambiguity (unlike Azure
Container Apps' less-certain Canada East status). Azure Container Apps is not recommended as a
first choice for this specific app given the missing official Next.js App-Router guidance and the
mandatory fixed WAF cost.

---

*Verification dates: database research 2026-08-27; hosting research 2026-08-27. Re-verify pricing
and region availability before acting on this document if significant time has passed — cloud
pricing and region lists change without this document being notified.*
