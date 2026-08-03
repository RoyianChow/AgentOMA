# Task 06 — Build-versus-Integrate Decision

**Status:** Recommendation for review. Not a procurement authorization — no vendor account,
contract, or credential may be created from this document.
**Decision owner:** product lead (final selection), security/privacy reviewer (must concur on
the identity/data-boundary implications before procurement starts).

---

## The three options evaluated

1. **Integrate** an Ontario Health-verified solution end to end (identity, waiting room, media,
   and clinical integration all owned by the vendor's product).
2. **Build custom** and separately pursue Ontario Health verification for the resulting product.
3. **Hybrid** — AgentRx owns identity, consent, waiting-room workflow, and the clinical/claim
   integration boundary; a verified vendor supplies only the media transport (video/audio) or
   secure-messaging transport underneath it.

## Recommendation: Hybrid

### Why

- **It's the only option consistent with every other capability this repository already
  built.** Every existing trust boundary in this codebase — the assessment/claim boundary
  (Task 02), the single-tenant enforcement, the pharmacist identity/session model
  (`requirePortalUser`) — follows the same shape: AgentOMA owns identity, authorization, and
  the clinical/billing decision; it never delegates *who is allowed to do what* to an external
  system. Integrating a vendor's product end to end would mean the vendor's waiting room, the
  vendor's participant admission, and possibly the vendor's identity model become the actual
  authorization boundary for a PHI-bearing interaction — a pattern this repo has never used
  anywhere else, and one this task's own non-negotiable invariants explicitly forbid ("A
  patient session cannot become a pharmacist session," "no client value may be trusted for
  patient, subject, pharmacy... completion").
- **Task 05 doesn't exist yet.** A full end-to-end vendor integration would need to plug into
  *some* patient identity system at the vendor's boundary. Since there is no patient identity
  system in this repo at all (confirmed in the current-state analysis), "Integrate" isn't
  actually executable today regardless of vendor choice — there's nothing on the AgentOMA side
  for the vendor's product to authenticate against.
- **Ontario Health's own verification is explicitly not blanket approval** (§4 of the standards
  mapping: "a review process," not an assessment) — even a fully integrated verified vendor
  would not remove AgentOMA's own PHIPA custodian obligations. Since the custodian obligation
  doesn't go away either way, there's no compliance benefit to giving up architectural control.
- **The pure-Build option carries the largest, least-certain cost**: pursuing Ontario Health
  verification independently means AgentOMA itself would need PIA/TRA evidence, SOC 2-equivalent
  audit or documentation, and scenario-based validation testing (§4 of the standards mapping) —
  a substantial, specialized compliance program, for a media-transport capability that mature
  verified vendors already provide. Building WebRTC/SFU/TURN infrastructure from scratch is also
  a large ongoing security/operational surface (exactly the category of asset Task 06's own
  threat model treats as high-risk: SDP/ICE/TURN leakage, media routing).
- **Hybrid keeps the vendor swappable.** Because identity, consent, and waiting-room state live
  in AgentOMA's own data model (per Workstream D's contracts) rather than the vendor's, a vendor
  can be replaced later without redesigning the authorization boundary — directly serving the
  "exit and portability" criterion this task requires evaluating.

### Why the alternatives were not selected

- **Integrate (rejected for now, not permanently):** blocked by Task 05 not existing, and by
  the architectural inconsistency above. Could become viable *later* if a specific verified
  vendor's product demonstrably supports pinning its session/authorization model to an
  AgentOMA-issued, server-verified identity token rather than the vendor's own login — that is
  a vendor-specific technical question this task cannot answer without vendor engagement
  (out of scope here; see the vendor scorecard).
- **Build (rejected):** correct architectural instinct (own the boundary) taken too far — it
  would also mean owning WebRTC infrastructure, TURN/STUN, codec/bandwidth adaptation, and the
  Ontario Health verification burden, none of which is this product's differentiation. The
  telephone modality is a partial exception — see below.

### A partial exception: telephone

Per the OCP Supplemental Guidance (video is not mandatory; an ordinary phone call qualifies as
virtual care when it involves professional service), the **telephone modality does not require
a video vendor at all.** AgentOMA can treat telephone as: pharmacist calls the patient's phone
directly (a PSTN/SIP vendor is optional infrastructure, not a requirement for the modality to
exist), while AgentOMA's own contracts still capture identity/location/consent/suitability
around that call. This is effectively "build" for telephone (no vendor lock-in needed) and
"hybrid" for video/secure messaging. The synthetic prototype should reflect this asymmetry
rather than forcing telephone through the same vendor-adapter shape as video.

## Assumptions vs. verified facts

| Statement | Status |
|---|---|
| Ontario Health verification is not legal/PHIPA approval | **Verified** — direct quote from Ontario Health's own page (standards mapping §4) |
| 38 solutions are currently listed as verified, tagged by modality | **Verified** — fetched 2026-08-03, standards mapping §5 |
| Any specific vendor's identity model can be pinned to an AgentOMA-issued token | **Assumption, not verified** — requires vendor technical documentation not obtained here |
| Any specific vendor's subprocessors, data residency, or contract terms | **Unavailable** — public marketing pages are not evidence per this task's own rules; requires direct vendor engagement, which is not authorized under this task |
| Building custom WebRTC infrastructure is higher ongoing risk than integrating transport | **Judgment call, stated as such** — based on general architecture reasoning (SDP/ICE/TURN threat surface, verification burden), not a vendor-specific comparison |

## Privacy, security, accessibility, and professional blockers to procurement

- No Task 05 patient identity exists to hand a vendor session to (see current-state analysis).
- No PIA/TRA has been produced for AgentOMA itself, let alone for a specific vendor pairing.
- No vendor has been contacted for contract, subprocessor, or residency evidence (not
  authorized under this task).
- OCP's cross-jurisdictional policy is unresolved for any patient outside Ontario — a hybrid
  or integrated vendor must not be selected assuming cross-jurisdictional use is available.
- Two IPC privacy sources could not be retrieved (standards mapping §9) — Workstream K's privacy
  plan cannot be signed off without them.

## Exact review needed before procurement starts

1. Product lead confirms the hybrid direction (or overrides it) in writing.
2. Security/privacy reviewer confirms the identity/session-pinning requirement a candidate
   vendor's video/messaging product must satisfy, before any vendor is shortlisted.
3. Task 05 reaches at least a design/contract stage sufficient for a vendor's session to bind
   to a real (not synthetic) AgentOMA patient-actor identity.
4. The two blocked IPC sources are retrieved and reviewed.
5. A named person is authorized to contact specific vendors for the evidence in the vendor
   scorecard — this task explicitly does not authorize that contact.

## Conditions that would revisit this decision

- Task 05 is cancelled or redesigned such that patient identity will never live in AgentOMA
  (would push toward Integrate).
- A specific verified vendor is found to require exclusive control of participant
  authorization with no way to defer to an external identity check (would push toward Build
  for that modality, or elimination of that vendor as a candidate).
- Ontario Health's verification standard changes to require deeper platform integration than a
  transport-only vendor role can satisfy.
- OCP revises the Virtual Care Policy or Cross-Jurisdictional Policy in a way that changes the
  identity/location requirements this decision was based on.
