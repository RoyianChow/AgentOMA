# AgentOMA — System Design Diagrams (Workstream 4)

**Nature:** documentation only. These diagrams describe the *current* system (items 1–9) as
verified in [`../SYSTEM-DESIGN-REVIEW.md`](../SYSTEM-DESIGN-REVIEW.md). The proposed target
architecture (item 10) lives in [`../TARGET-ARCHITECTURE.md`](../TARGET-ARCHITECTURE.md) since it
is tightly coupled to that document's recommendation narrative, not reproduced here.

**Labeling convention used throughout:** since Mermaid has no native "boundary label" primitive,
every diagram below uses a consistent visual/textual convention instead of prose annotation:

- 🔒 **PHI boundary** — nodes/subgraphs handling PHI are prefixed `🔒` and styled `fill:#fde2e1`.
- 🔑 **Authentication boundary** — nodes enforcing or checking identity are prefixed `🔑` and
  styled `fill:#fff3cd`.
- 🍁 **Canadian-region requirement** — infrastructure that must stay in Canada is prefixed `🍁`.
- 🌐 **External system** — anything outside AgentOMA's own deployment is styled `fill:#e2e8f0`
  with a dashed border.
- ⇢ **Trust transition** — an edge crossing from a lower-trust to higher-trust context (or
  vice versa) is drawn as a dashed arrow (`-.->`) instead of a solid one.
- 🧪 **Synthetic/sandbox component** — anything inside `apps/experiment-sandbox/` is prefixed
  `🧪` and styled `fill:#f5f0ff`, to keep it visually distinct from production (unprefixed).

---

## 1. C4 system-context diagram

```mermaid
flowchart TB
  patient["Patient\n(walk-in, at pharmacy counter)"]
  pharmacist["🔑 Pharmacist / pharmacy staff\n(authenticated user)"]

  subgraph agentoma["AgentOMA (single-pharmacy pilot system)"]
    app["AgentOMA application\nNext.js 16 App Router"]
  end

  supabase["🌐🍁 Supabase Postgres\nca-central-1"]
  hns["🌐 HNS / ODB adjudication\n(external, not integrated —\nAgentOMA never submits claims)"]

  patient -->|"uses kiosk, zero PHI"| app
  pharmacist -->|"authenticated portal,\nPHI entry"| app
  app -->|"reads/writes PHI,\nTLS"| supabase
  app -.->|"claim DATA is exported for\nhand-entry — no API call"| hns

  classDef phi fill:#fde2e1,stroke:#97292a
  classDef auth fill:#fff3cd,stroke:#a9701a
  classDef ext fill:#e2e8f0,stroke:#5f726a,stroke-dasharray: 4 3
  class app,supabase phi
  class pharmacist auth
  class supabase,hns ext
```

## 2. Container / component diagram

```mermaid
flowchart TB
  subgraph client["Browser / kiosk device"]
    publicUi["Public UI\n(site, demo, check, intake)"]
    portalUi["🔑🔒 Pharmacist portal UI\n(dashboard route group)"]
  end

  subgraph server["AgentOMA server (Next.js 16)"]
    proxyTs["proxy.ts\noptimistic redirect ONLY —\nno authorization"]
    serverActions["🔑🔒 Server Actions\n(requirePortalUser() on every call)"]
    authGuard["🔑 auth-guard.ts\nrequirePortalUser / requirePortalPage"]
    betterAuth["🔑 better-auth\nsession, TOTP, roles"]
    envTs["env.ts\nsole validated process.env reader"]
    dbClient["🔒 db/index.ts\npooled Postgres client (Drizzle)"]
  end

  subgraph data["🍁 Supabase Postgres (ca-central-1)"]
    phiTables["🔒 PHI tables\npatient, assessment, claim_draft,\nfollow_up, audit_log"]
    refTables["Reference tables\nailment_group, pin, claim_rule"]
    authTables["🔑 Auth tables\nuser, session, account, two_factor"]
  end

  sandbox["🧪 apps/experiment-sandbox\n(separate workspace, isolated —\nsee diagram 9)"]

  publicUi --> proxyTs
  portalUi --> proxyTs
  proxyTs --> serverActions
  serverActions --> authGuard
  authGuard --> betterAuth
  serverActions --> dbClient
  dbClient --> phiTables
  dbClient --> refTables
  betterAuth --> authTables
  serverActions --> envTs

  server -.->|"forbidden-imports CI check:\nno path exists"| sandbox

  classDef phi fill:#fde2e1,stroke:#97292a
  classDef auth fill:#fff3cd,stroke:#a9701a
  classDef sandbox fill:#f5f0ff,stroke:#6b4fa0,stroke-dasharray: 4 3
  class portalUi,serverActions,dbClient,phiTables,authGuard phi
  class proxyTs,authGuard,betterAuth,authTables auth
  class sandbox sandbox
```

## 3. Production deployment diagram

```mermaid
flowchart TB
  users["Patients / pharmacists\n(browsers)"]

  subgraph hostUnknown["Hosting platform — UNCONFIRMED\n(no vercel.json or hosting config\ncommitted; see SYSTEM-DESIGN-REVIEW §9)"]
    appInstance["AgentOMA app instance(s)"]
  end

  subgraph gh["🌐 GitHub"]
    ciPipeline["CI (.github/workflows/ci.yml)\ntypecheck, lint, tests, build,\nsecurity-policy, db migration/constraint tests\n— NO deploy step"]
  end

  subgraph supa["🌐🍁 Supabase (ca-central-1)"]
    pooler["pgBouncer transaction pooler\n(port 6543 — runtime)"]
    direct["Direct connection\n(port 5432 — migrations only)"]
    pg["🔒 Postgres (PHI)"]
  end

  users --> appInstance
  appInstance -->|"pooled, TLS,\nprepare:false"| pooler --> pg
  ciPipeline -.->|"direct, TLS —\nmigration test run only,\nnever live Supabase"| direct

  gh -.->|"push/merge triggers deploy —\nmechanism unconfirmed from repo"| hostUnknown

  classDef phi fill:#fde2e1,stroke:#97292a
  classDef ext fill:#e2e8f0,stroke:#5f726a,stroke-dasharray: 4 3
  classDef unknown fill:#fff,stroke:#97292a,stroke-width:2px,stroke-dasharray: 6 3
  class pg,pooler,direct phi
  class gh,supa ext
  class hostUnknown unknown
```

## 4. PHI data-flow and trust-boundary diagram

```mermaid
flowchart LR
  subgraph zeroPhi["Zero-PHI zone"]
    kiosk["Patient kiosk\n/assessment"]
    intakeSession["intake_session row\n(symptom + handoff code only)"]
  end

  subgraph handoff["Trust transition point"]
    code["6-character handoff code\nshort-lived, single-use"]
  end

  subgraph phiZone["🔒 PHI zone (authenticated only)"]
    pharmacistUi["🔑 Pharmacist portal"]
    identity["Health-card identity entry"]
    clinicalRecord["Clinical record, consent,\nprescription"]
    billing["🔒 claim_draft\n(export only, never submitted)"]
    audit["🔒 audit_log\n(append-only)"]
  end

  kiosk --> intakeSession --> code
  code -.->|"⇢ trust transition:\nzero-PHI to PHI"| pharmacistUi
  pharmacistUi --> identity --> clinicalRecord --> billing
  clinicalRecord --> audit
  billing --> audit

  classDef nophi fill:#e6f4ea,stroke:#0e5a4a
  classDef phi fill:#fde2e1,stroke:#97292a
  classDef trans fill:#fff3cd,stroke:#a9701a
  class kiosk,intakeSession nophi
  class code trans
  class pharmacistUi,identity,clinicalRecord,billing,audit phi
```

## 5. Authentication and authorization sequence

```mermaid
sequenceDiagram
  participant B as Browser
  participant P as 🔑 proxy.ts (optimistic gate)
  participant A as Server Action
  participant G as 🔑 auth-guard.ts\n(requirePortalUser)
  participant BA as 🔑 better-auth
  participant DB as 🔒 Postgres

  B->>P: GET /pharmacist/*
  P->>P: check session COOKIE PRESENCE only\n(no validation)
  alt cookie missing
    P-->>B: redirect /sign-in
  else cookie present
    P-->>B: allow navigation (optimistic)
  end
  B->>A: invoke Server Action (e.g. save assessment)
  A->>G: requirePortalUser()
  G->>BA: verify session is real, active, unexpired
  BA->>DB: SELECT session/user/role
  DB-->>BA: session row
  BA-->>G: session valid + role + TOTP status
  G->>G: check role permitted for this action
  G->>G: resolve PHARMACY_ID from SERVER config\n(never from client input)
  alt any check fails
    G-->>A: throw / deny
    A-->>B: error, no PHI returned
  else all checks pass
    G-->>A: authorized context
    A->>DB: 🔒 perform PHI read/write
    DB-->>A: result
    A-->>B: response
  end
```

## 6. Assessment → evidence → claim draft → audit transaction

```mermaid
sequenceDiagram
  participant Ph as 🔑 Pharmacist (authenticated)
  participant A as Server Action\n(complete assessment)
  participant DB as 🔒 Postgres transaction

  Ph->>A: submit structured clinical record + eligibility evidence
  A->>A: requirePortalUser() + orientation gate\n(unconditional server-side billability gate)
  A->>DB: BEGIN
  DB->>DB: INSERT assessment (version-2 snapshot)
  DB->>DB: INSERT assessment_billability_evidence\n(immutable, one-to-one)
  DB->>DB: pure derivation: PIN, fee, SSC from\nseeded reference tables only
  DB->>DB: INSERT claim_draft (immutable snapshot)
  DB->>DB: INSERT follow_up plan\n(required for every billable completion)
  DB->>DB: INSERT audit_log event\n(same transaction — not a side effect)
  DB->>DB: trigger: recompute retain_until\n(longer-of adult/minor branch)
  alt any step fails or evidence unresolved
    DB->>DB: ROLLBACK — nothing partially persists
    DB-->>A: error
  else all steps succeed
    DB->>DB: COMMIT
    DB-->>A: assessment + claim_draft + audit committed atomically
  end
  A-->>Ph: read-only claim_draft panel for hand-entry\n(AgentOMA never calls HNS)
```

## 7. Patient intake and pharmacist handoff

```mermaid
flowchart TB
  patient["Patient at kiosk"]
  emergency{"Emergency or\nred-flag answer?"}
  triageExit["triage_exit\n(zero-PHI, non-billable,\nstructurally separate)"]
  assessable["intake_session created\n(zero-PHI: symptoms + handoff code)"]
  queue["Zero-identity waiting queue\n(pharmacist-visible)"]
  pharmacist["🔑 Pharmacist retrieves by handoff code"]
  recovery["Authenticated recovery state\n(missing/expired/consumed/unavailable —\nALL render identically,\nnever echoes the attempted code)"]
  identityEntry["🔒 Health-card identity entered\n(first PHI in this flow)"]
  assessment["🔒 Structured assessment created\n— NO cold-start path exists;\nmust link to a real submitted intake"]

  patient --> emergency
  emergency -->|yes| triageExit
  emergency -->|no| assessable --> queue
  queue --> pharmacist
  pharmacist -->|valid code| identityEntry --> assessment
  pharmacist -->|invalid/expired/consumed| recovery

  classDef nophi fill:#e6f4ea,stroke:#0e5a4a
  classDef phi fill:#fde2e1,stroke:#97292a
  classDef auth fill:#fff3cd,stroke:#a9701a
  class patient,emergency,triageExit,assessable,queue nophi
  class identityEntry,assessment phi
  class pharmacist,recovery auth
```

## 8. Backup, restore, and disaster-recovery flow

```mermaid
flowchart TB
  subgraph prod["🍁 Production Supabase (ca-central-1)"]
    prodDb["🔒 Live Postgres"]
    backup["Automated backups / PITR\n(Supabase-managed)"]
  end

  subgraph drill["🍁 Restore drill (per docs/RESTORE_DRILL.md)\n⚠ NEVER EXECUTED — see SYSTEM-DESIGN-REVIEW §5/§8"]
    isolated["New isolated Supabase project\nca-central-1, fresh credentials,\nno prod connections"]
    verify["Integrity verification:\nmigration state, row counts,\naggregate hashes, trigger presence,\nprivilege checks (SET ROLE agentoma_app)"]
    record["Record drill in\n/pharmacist/governance\n(append-only audit event)"]
    teardown["Teardown: revoke credentials,\ndelete isolated project"]
  end

  prodDb --> backup
  backup -.->|"⇢ restore-to-new-project,\nnever restore over production"| isolated
  isolated --> verify --> record --> teardown

  classDef phi fill:#fde2e1,stroke:#97292a
  classDef gap fill:#fff,stroke:#97292a,stroke-width:2px,stroke-dasharray: 6 3
  class prodDb,isolated phi
  class drill gap
```

## 9. Experimental-sandbox isolation boundary

```mermaid
flowchart TB
  subgraph production["Production application (src/)"]
    prodApp["AgentOMA app\nreal PHI, real auth, real claims"]
  end

  subgraph ci["CI enforcement (.github/workflows/ci.yml)"]
    forbiddenImports["security:forbidden-imports\nAST-based, no allowlist:\nsrc/ importing sandbox/ FAILS build;\nsandbox importing unreviewed src/ FAILS build"]
    prodInvariance["sandbox:verify-production\nhashes production route manifest/\nscripts/deps against frozen baseline"]
  end

  subgraph sandbox["🧪 apps/experiment-sandbox (separate npm workspace)"]
    sandboxEnv["🧪 Isolated env schema\n— rejects DATABASE_URL, SUPABASE_*,\nBETTER_AUTH_* variable names"]
    sandboxApp["🧪 Task 04 booking prototype\n🧪 Task 06 virtual-care prototype\n(synthetic fixtures only)"]
    sandboxLifecycle["🧪 G1/G2 lifecycle gate\n(expiring approval window —\ncurrently expired/ungranted)"]
  end

  production -.->|"BLOCKED by forbidden-imports —\nno legitimate exception"| sandbox
  sandbox -.->|"BLOCKED unless explicitly reviewed —\nno legitimate exception"| production
  ci -->|verifies| production
  ci -->|verifies build doesn't perturb prod| sandbox
  sandboxLifecycle -->|"gates whether sandbox\ncan even run"| sandboxApp

  classDef prod fill:#fde2e1,stroke:#97292a
  classDef sandboxStyle fill:#f5f0ff,stroke:#6b4fa0,stroke-dasharray: 4 3
  classDef ciStyle fill:#e6f4ea,stroke:#0e5a4a
  class production,prodApp prod
  class sandbox,sandboxEnv,sandboxApp,sandboxLifecycle sandboxStyle
  class ci,forbiddenImports,prodInvariance ciStyle
```

---

## Cross-references

Every node and boundary above traces to a specific, cited finding in
[`../SYSTEM-DESIGN-REVIEW.md`](../SYSTEM-DESIGN-REVIEW.md) — no new architectural claim is
introduced here that wasn't already verified there. Diagram 3 (deployment) deliberately renders
the hosting platform as unconfirmed rather than guessing, consistent with §9 of that document.
Diagram 10 (proposed target architecture) is in
[`../TARGET-ARCHITECTURE.md`](../TARGET-ARCHITECTURE.md).
