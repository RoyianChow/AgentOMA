# Task 06 — Privacy, Security, and Retention Plan

---

## 1. Privacy and security controls

| Control | Design |
|---|---|
| Encryption in transit and at rest | All PHI-bearing entities (`SecureMessage.bodyEncryptedRef`, consent/identity/location content) encrypted at rest; transport is TLS-only, matching this repo's existing all-HTTPS posture |
| Vendor key ownership | Not decided — depends on Workstream B's eventual vendor selection; flagged, not invented |
| AgentOMA key ownership | AgentOMA holds the keys for everything it stores itself (identity/location/consent/suitability/message content) regardless of which vendor eventually handles transport — matches the hybrid decision's whole rationale (Workstream B) |
| Credential rotation | Any vendor adapter credential rotates on the same cadence this repo already treats as baseline for secrets (not weaker than existing `BETTER_AUTH_SECRET`-class handling) |
| Webhook signature verification | Required before any webhook event is processed at all — no adapter accepts an unsigned or invalid-signature event (threat model Group F) |
| Replay prevention | Deduplication by event ID/digest, timestamp window (`VendorWebhookReceipt`, Workstream D) |
| Network and origin controls | Same-origin CSP pattern this repo already uses (`PHARMACIST_ROUTE_HEADERS`) — the sandbox's own `src/security/headers.ts` (Task 01) applies the equivalent to Task 06's synthetic routes |
| Participant authorization | Rechecked at every checkpoint (Workstream J) |
| Least-privilege vendor administration | No vendor administrator has PHI access beyond what the transport role requires — a procurement-time (Workstream B gate G-V3/G-V4) requirement, not something this task can prove without a vendor |
| Support access | No "technical support" role exists in this repo today with elevated access (current-state analysis) — Task 06 does not introduce one; any future support tooling needs its own review |
| Audit review | Same append-only pattern as `audit_log` (§3 below) |
| Vulnerability management | Inherits the repo's existing dependency/CI conventions (Task 11's domain, not re-invented here) |
| Dependency management | Same |
| Availability monitoring | Not built in this task (no real vendor, no real infrastructure) — documented as a production requirement, not implemented |
| Incident containment | §4 (separate deliverable, cross-referenced here) |
| Vendor outage handling | `TECHNICAL_FAILURE`/`INTERRUPTED` states (Workstream H) already cover this generically; a specific vendor's outage behavior is a procurement-time question |
| Subprocessor change handling | Procurement-time (Workstream B gate G-V2) |
| Data return and deletion | Procurement-time for vendor-held data; AgentOMA-held data follows §2's retention table |
| Backup expiry | Inherits whatever this repo's existing Supabase backup policy is (not re-derived here — out of this task's scope to invent) |
| Canadian-residency evidence | **Not claimed as a PHIPA requirement.** Per the task's own instruction and the Ontario standards mapping (§7), residency is a project/procurement/contract/risk decision requiring its own evidence — this document does not assert Canadian hosting is legally mandatory, only that it remains a real evaluation criterion in Workstream B's vendor scorecard |
| Remote pharmacist workstation safeguards | Out of scope for the synthetic prototype — a real operational/device-management question, flagged, not designed here |
| Protected route cache controls | `private, no-store`, matching `PHARMACIST_ROUTE_HEADERS` exactly, applied to the sandbox's own equivalent routes |
| Referrer policy | `no-referrer`, same as the existing pattern |
| Content Security Policy | Same-origin default; camera/microphone permitted **only** on the sandbox's own synthetic video routes (§7 of the current-state analysis — never on `/pharmacist/*`) |
| Analytics prohibition | No analytics SDK anywhere in this repo today (current-state analysis); Task 06 adds none |
| Session-replay prohibition | Same — none exists, none added |
| Browser-storage prohibition | No PHI, token, or reusable credential in `localStorage`/`sessionStorage`/`IndexedDB`/service-worker caches — enforced by the same class of leakage test as the rest of this task (threat model Group G) |

## 2. Media prohibition — proven, not asserted

| Prohibited artifact | Why the design cannot produce it |
|---|---|
| Audio recordings | No recording control exists anywhere in the pharmacist control list (Workstream F §2) — structurally absent, not disabled-by-default |
| Video recordings | Same |
| Session screenshots | No screenshot-capture code path exists in any contract (Workstream D) |
| Video thumbnails | Same — no field, no generator |
| Transcripts | No transcription adapter exists (Workstream G explicitly excludes silently activating one) |
| Closed-caption transcripts retained after session | If captions are ever shown, they're live-only, from an explicitly reviewed source (Workstream G) — nothing persists them |
| AI summaries | No AI/model integration anywhere in this task's scope (matches the Authority Boundary's prohibition on autonomous logic) |
| Biometric templates | No identity-confirmation method in `IdentityAndLocationCheck`'s safe-enum involves biometric capture |
| Face recognition results | Same — not a representable value |
| Emotion/sentiment analysis | Not a field, not a capability, anywhere in this design |
| Background-scene analysis | Same |
| Raw media diagnostic captures | `TechnologyReadinessResult` explicitly stores only a safe category, never raw diagnostics (Workstream G §1) |

Secure-message content is handled separately, as PHI-bearing clinical communication (Workstream
I) — encrypted, never logged, never conflated with the media-prohibition list above (message
text isn't "media").

## 3. Retention proposal

Per the task's own instruction, **no retention period below is invented.** Every "Proposed
retention period" cell that isn't already governed by an existing repo policy is marked
`UNRESOLVED — requires privacy/legal decision`, matching how this repo's own existing
compliance documentation (`docs/COMPLIANCE.md`, the assessment `retain_until` model) treats
retention: as a legal/professional decision recorded in code, not guessed by whoever wrote the
schema.

| Dataset | Purpose | PHI class | Client exposure | Encryption | Retention trigger | Proposed period | Deletion/archival | Legal hold | Approval required |
|---|---|---|---|---|---|---|---|---|---|
| Visit metadata (`VirtualVisit`) | Operational record of the encounter | Low (opaque refs) / high (subject binding) | Own-record only | At rest | Visit terminal state | UNRESOLVED | UNRESOLVED | Same as clinical record hold, once linked | Privacy/legal |
| Participant records | Who was present, when | Medium | Pharmacist-visible summary only | At rest | Visit terminal state | UNRESOLVED | UNRESOLVED | Same | Privacy/legal |
| Consent events | Legal basis for the interaction | Medium | Own-record only | At rest | **Never deleted while the linked record exists** — consent history is append-only/superseding by design (non-negotiable invariant), not time-expired the way operational logs are | Tied to the underlying clinical record's own retention (mirrors this repo's existing 10-year/age-18 `retain_until` model for assessments) | Superseded, never deleted | Same | Privacy/legal |
| Identity/location confirmation | Compliance evidence | Medium | Server-only | At rest | Visit terminal state | UNRESOLVED | UNRESOLVED | Same | Privacy/legal |
| Suitability decisions | Clinical/professional record | Medium | Server-only, pharmacist-authored | At rest | Never deleted while linked assessment exists | Same as linked assessment | Superseded via reassessment, not deleted | Same | Privacy/legal, professional |
| Contingency plans | Same category as suitability | Low | Server-only | At rest | Same | Same | Same | Same | Privacy/legal |
| Technical-readiness results | Operational, minimized by design (§Workstream G) | Very low | Own-record only | At rest | Short — this data has no clinical value after the visit | UNRESOLVED, but should be materially shorter than clinical retention given its content is already minimized to a safe category | Deleted | Unlikely to be subject to hold | Privacy/security |
| Connection events | Operational/technical | Very low | Own-record only | At rest | Short | UNRESOLVED, likely short | Deleted | Unlikely | Privacy/security |
| Technical failures | Operational | Very low | Own-record only | At rest | Short-to-medium (may be needed for incident review) | UNRESOLVED | Deleted after incident-review window | Possible, if under active incident review | Security |
| Secure-message content | Clinical communication | **High** | Never — authenticated thread view only | At rest, encrypted | Never deleted while linked record/patient relationship exists | Same as clinical record retention (needs explicit decision — this is exactly the kind of "field-level inventory" decision this task cannot make unilaterally) | Superseded/corrected, not silently edited (Workstream I) | Same as clinical hold | Privacy/legal, professional |
| Vendor metadata (`VendorSessionReference`) | Operational mapping only | Very low (opaque) | Server-only | At rest | Visit terminal state | Short | Deleted | Unlikely | Security |
| Audit events | Compliance/security record | Low (opaque refs + safe metadata only) | Never | At rest | Append-only — never deleted on a normal cycle | Mirrors this repo's existing `audit_log` append-only, DB-enforced-immutable model | Never routinely deleted | Yes, by nature | Privacy/legal, security |
| Application logs | Operational | None (payload-free by design) | Never | At rest | Standard log rotation | UNRESOLVED — inherits whatever this repo's general log-retention policy is | Rotated | Rare | Security |
| Analytics | N/A — none exists (§1) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Backups | Operational/DR | Inherits the classification of whatever it backs up | Never | At rest | Standard backup cycle | UNRESOLVED — inherits existing Supabase backup policy | Standard expiry | Possible during active hold | Security/operations |
| Synthetic evidence (this task's own test output) | Development/review evidence | **None — synthetic only, by construction** | Not applicable (not PHI) | Not required (contains no real PHI to protect) | N/A | Kept per this repo's existing evidence conventions (mirrors Task 01's evidence-manifest pattern) | N/A | N/A | N/A |

**Every `UNRESOLVED` cell above is a genuine, named gap** — not a placeholder that got missed.
Per the task's instruction, this document does not invent a legally required retention period,
and none of the `UNRESOLVED` rows should be read as "the default is fine until someone
objects."

---

## Cross-references

Media-prohibition claims are checked against Workstream D's actual field lists and Workstream F
§2's control list, not asserted independently. Retention design deliberately parallels this
repo's existing `computeRetainUntil`/`retain_until` model (`docs/PROJECT_OVERVIEW.md` §7) rather
than inventing a new philosophy.
