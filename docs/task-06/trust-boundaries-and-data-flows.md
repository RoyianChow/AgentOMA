# Task 06 — Trust Boundaries and Data Flows

Diagrams are descriptive, not proof — the architecture/authorization/state-transition tests
(Workstream L/M) are what actually enforce every boundary drawn here, per this task's own
instruction.

## 1. Trust boundaries (target design)

```mermaid
flowchart TD
    subgraph PatientSide["Patient side — no production identity today (Task 05 gap)"]
        PB["Patient browser / phone"]
    end

    subgraph PharmacistSide["Pharmacist side — EXISTS in production"]
        PhB["Pharmacist browser"]
    end

    subgraph AgentOMA["AgentOMA server boundary"]
        Auth["requirePortalUser()\n(existing, pharmacist-only)"]
        PatIdentity["Synthetic patient identity\n(Task 06 prototype only —\nreal version is Task 05)"]
        Visit["Virtual-visit orchestration\n(this task's deliverable)"]
        Assess["Task 02 assessment service\n(EXISTS: createAssessment,\nderiveClaimDraft)"]
        Claim["Existing claim service\n(EXISTS)"]
        AuditSvc["Audit service\n(EXISTS: audit_log, append-only)"]
    end

    subgraph VendorBoundary["Vendor boundary — NOT SELECTED (Workstream B: hybrid)"]
        Media["Media/messaging transport"]
    end

    subgraph Denied["Explicitly denied — no path exists"]
        NoNet["Real network call\n(sandbox: denied adapters only)"]
    end

    PB -->|"synthetic requests only,\nin apps/experiment-sandbox/"| PatIdentity
    PhB -->|"real session, TOTP mandatory"| Auth
    Auth --> Visit
    PatIdentity -.->|"synthetic-only binding\n(no real Task 05 yet)"| Visit
    Visit -->|"minimal, non-PHI context only\n(opaque refs, no clinical content)"| Assess
    Assess --> Claim
    Visit --> AuditSvc
    Assess --> AuditSvc
    Visit -.->|"hybrid: transport only,\nnever authorization"| Media
    Visit -. "denied before DNS/socket/SDK" .-> NoNet
    Media -. "no path to Assess or Claim" .-> Assess
```

**Key boundary properties this diagram encodes:**

- The vendor box has **no arrow into Assess or Claim** — matching the non-negotiable invariant
  that a vendor event can never itself complete an assessment or create a claim.
- `PatIdentity` is drawn as synthetic-only with a dashed line into `Visit`, because there is no
  real patient identity to bind to yet (Task 05 gap) — production readiness requires that
  dashed line to become a real Task 05 integration, not requires this task to fake one.
- `Auth` (existing `requirePortalUser`) is reused unchanged for the pharmacist side; Task 06
  does not introduce a second pharmacist authorization path.

## 2. Data flow — visit lifecycle (target design, synthetic in this task)

```mermaid
sequenceDiagram
    participant P as Patient (synthetic)
    participant W as Waiting room
    participant Ph as Pharmacist
    participant V as Visit orchestration
    participant A as Assessment service (existing)
    participant Au as Audit (existing)

    P->>V: Request join (opaque visit ref only)
    V->>V: Verify identity/location/consent gates (server-side)
    V->>W: Admit to waiting room (patient-scoped view only)
    V->>Au: audit: waiting_room_entry
    Ph->>V: View assigned visits only
    V->>Ph: Minimal waiting-room info (no PHI beyond what's authorized)
    Ph->>V: Admit patient
    V->>Au: audit: pharmacist_admission
    V->>Ph: Present identity/location/consent/suitability checklist
    Ph->>V: Record suitability decision (pharmacist-only)
    V->>Au: audit: suitability_decision
    Note over P,Ph: Substantive clinical interaction begins only after ALL gates pass
    Ph->>V: Mark professional interaction complete (explicit, pharmacist-only)
    V->>A: Minimal visit context (opaque refs, modality, consent ref — no PHI)
    A->>A: Existing assessment completion + claim-draft derivation (unchanged)
    A->>Au: audit: assessment.created (existing behavior, unchanged)
```

**What this flow deliberately does NOT show:** any path from "disconnect," "timeout," or
"vendor webhook" to the `A->>A` completion step — because no such path exists in the design.
Those events only ever reach the *connection/interruption* state dimension (see the state-model
deliverable), never the completion action directly.

## 3. Secure-messaging data flow (target design, synthetic in this task)

```mermaid
sequenceDiagram
    participant P as Patient (synthetic)
    participant T as Secure thread service
    participant Ph as Pharmacist
    participant L as Logger (payload-free)
    participant Au as Audit (existing pattern)

    P->>T: Send message (authenticated, thread-scoped)
    T->>T: Recheck authorization (every message, not just thread-open)
    T->>L: log: message_sent (metadata only — no body)
    T->>Au: audit: secure_message.sent (opaque refs only)
    T->>Ph: Deliver to protected review queue (routing by trusted workflow data, never AI/content classification)
    Ph->>T: Read message
    T->>Au: audit: secure_message.read
    Note over P,Ph: Message body never appears in L or Au — only in T's encrypted store
```

## 4. What crosses each boundary (summary table)

| Boundary crossed | What's allowed to cross | What's explicitly forbidden |
|---|---|---|
| Patient browser → AgentOMA server | Opaque visit reference, structured gate-check answers, message text (bounded/sanitized) | Raw identity documents, exact GPS, any client-asserted role/subject/pharmacy value |
| AgentOMA server → Vendor (hybrid) | Encrypted destination, minimal routing config, provider idempotency key | Patient/subject/pharmacy/appointment/assessment/thread identifiers, clinical content |
| Vendor → AgentOMA server (webhook) | Safe event type, outcome, provider reference | Anything treated as authoritative for assessment/claim/consent/suitability state |
| Visit orchestration → Assessment service (existing) | Opaque visit ref, approved modality, suitability/consent/identity/location *references* (not content), safe technical-failure status, timestamps | Any clinical content, any raw consent/location detail |
| Any service → Logs/audit | Safe event type, opaque references, outcome, safe reason code | PHI, tokens, message bodies, secrets, exact location, raw SDP/ICE/TURN |

## 5. Residual gap this diagram cannot close

Every "synthetic-only" and "not selected" label above is a real, currently-open dependency —
this diagram documents the *target* trust model the prototype will implement and test; it is
not evidence that the production version of any dashed/vendor box exists yet.
