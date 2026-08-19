# Task 06 — Device, Connectivity, Accessibility, and Telephone Fallback

**No telephone provider is activated in this task.** Everything here is synthetic design.

---

## 1. Preflight checks

Backing contract: `TechnologyReadinessResult` (Workstream D).

| Check | Safe result category | Notes |
|---|---|---|
| Supported browser | pass / fail | Feature-detected, not user-agent-string-matched where avoidable |
| Secure browser context (HTTPS/localhost) | pass / fail | |
| Camera availability (video only) | pass / fail / not-applicable | Not-applicable for telephone/secure-messaging |
| Microphone availability | pass / fail | |
| Speaker/audio-output confirmation | pass / fail | |
| Permission denied | fail (`permission_denied`) | Distinguished from "device unavailable" — different remediation message |
| Device already in use | fail (`device_busy`) | |
| Device change (mid-session) | changed event, safe category only | Triggers a re-check, not a silent continue |
| Network unavailable | fail (`network_unavailable`) | |
| Low bandwidth | degraded (`low_bandwidth`) | |
| High latency | degraded (`high_latency`) | |
| Packet-loss / unstable-connection category | degraded (`unstable`) | Bucketed severity, not a raw metric |
| Vendor/service outage | fail (`vendor_outage`) | Synthetic adapter returns this deterministically for the outage fixture scenario |
| Reduced-motion preference | detected (`prefers_reduced_motion`) | Read from `prefers-reduced-motion`, not asked |
| Captioning/screen-reader need | patient-stated preference | Not auto-detected from assistive-tech fingerprinting (would itself be a privacy risk) |
| Telephone fallback availability | always pass | Telephone has no device dependency by design (Workstream B) |

### What is minimized (retained fields only)

Per the task's explicit list, the stored result is limited to: **check performed, safe result
category, time, selected modality, whether fallback was offered, whether the patient requested
help.** Nothing else.

### What is never retained, under any circumstance

Raw audio · raw video · device labels · hardware serials · full user-agent strings (unless a
specific, justified, separately-approved need exists — none exists in this task) · raw SDP ·
ICE candidates · IP addresses · persistent network fingerprints · detailed WebRTC statistics.

### The synthetic default

Every preflight check in the prototype uses **deterministic test adapters and makes no network
calls** — matching Task 01's sandbox boundary exactly (no DNS/socket/SDK reachable at all).

### If a local dev-only `getUserMedia` test is ever added (not required for this task to pass)

All six of the task's conditions apply verbatim and are treated as a single indivisible
requirement — implementing four of six is not acceptable:

1. Requires an explicit user action (never auto-triggered).
2. Never records or uploads media.
3. Tracks stop immediately after the check completes.
4. Disabled in CI and production (fails hard outside local dev, mirroring Task 01's
   `SANDBOX_MODE` fail-closed pattern).
5. Covered by its own privacy test.
6. **Not required for the synthetic prototype to pass** — the deterministic adapter path above
   is sufficient on its own; this is optional polish, not a dependency.

---

## 2. Telephone fallback

Treated as a genuinely valid, accessible modality — not a degraded fallback UI bolted onto the
video path. This directly reflects OCP's own guidance that video is not mandatory (standards
mapping §2).

| Question | Answer |
|---|---|
| How the pharmacist initiates or approves fallback | `FallbackTransition` (Workstream D), pharmacist-actor-only — same as any other modality switch |
| How identity is rechecked | Full `IdentityAndLocationCheck` re-run — a phone call does not inherit a video visit's prior identity confirmation |
| How location is rechecked | Same — re-run, not carried over |
| How consent is updated for the new modality | A **new** `VirtualCareConsentEvent` with `modality = telephone` — the video-modality consent does not silently cover a telephone fallback (consent is modality-specific per Workstream E) |
| How suitability is reassessed | `ModalitySuitabilityDecision` re-decided, `reassessmentTriggerRef = modality_change` |
| How the patient receives non-PHI instructions | Generic, pre-approved instruction text only ("the pharmacist will call you shortly") — no clinical content, matching the same minimal-payload principle the task applies to external notifications generally |
| How a failed call is recorded | `TechnicalFailureEvent` with a safe reason code — same shape as a failed video connection, not a special case |
| How administrative calls are distinguished from professional virtual care | Only a call explicitly linked to a `VirtualVisit` (via `FallbackTransition` or a telephone-modality visit) counts as virtual care under this model; an ordinary appointment-reminder or admin call is out of this system's scope entirely (and, per Task 07's non-existence, isn't built anyway) |
| How caller ID is prevented from becoming identity proof | Structurally: `IdentityAndLocationCheck.identityConfirmationMethod` has no `caller_id` value in its safe-enum — it is not a representable outcome, not just a discouraged one |
| How PSTN/SIP vendor metadata would be assessed | Deferred to Workstream B's procurement gates (G-V2 onward) if/when a PSTN/SIP vendor is ever selected — this task's telephone exception assumes ordinary pharmacist-dials-patient calling, not a vendor-mediated PSTN integration, unless a later decision changes that |
| How the pharmacist continues documentation | Through the **existing, unchanged** Task 02 assessment workflow — telephone fallback changes the modality field, nothing about how the clinical record itself is written |

---

## 3. Accessibility

This repo already has a working internal standard to build on, not a blank slate: the earlier
375px usability pass (`docs/worklogs/p1-7-usability-a11y-375px.md`) found and fixed real issues
(a below-the-fold primary button, overflow on narrow viewports) on other flows. Task 06's
synthetic UI is designed to meet that bar **from the start**, not retrofit it later.

| Requirement | How it's met in the design |
|---|---|
| 375px, no horizontal scrolling | Every synthetic screen (waiting room, preflight, consent, suitability control) designed single-column at 375px from the start |
| Keyboard access to every control | No control (admit/deny, suitability radio group, fallback selector) is pointer-only |
| Visible focus | Standard focus-visible styling, never suppressed |
| Logical headings/landmarks | One `<h1>` per screen state, consistent with this repo's existing intake-flow convention |
| Screen-reader names + status announcements | Waiting-room/connection status changes use an ARIA live region — a disconnect or admission is announced, not just visually shown |
| Accessible consent | Consent checklist items are real, individually labelled controls — not a single opaque "I agree" |
| Accessible waiting-room status | Text status, not colour/icon-only |
| Accessible reconnect/expiry handling | Plain-language state + a clear next action, announced via the same live region |
| Accessible fallback | Telephone option is always keyboard/screen-reader reachable, never hidden behind a failed-video state only |
| No essential hover-only behavior | Every interactive affordance has a non-hover trigger |
| No keyboard trap | Standard focus-management testing (Task 01's own accessibility evidence requirement already exercises this pattern for the sandbox shell; Task 06 extends it to its own screens) |
| Status not dependent on colour | Every status (suitable/unsuitable, connected/degraded) pairs colour with text/icon+label |
| Reduced-motion support | Respects `prefers-reduced-motion`; no motion-only status indicator |
| 200%/400% zoom and reflow | No fixed-width containers that would clip at high zoom |
| Long translated labels | Layout tested with padded/long placeholder text, not just English-length strings |
| Captions/communication alternatives that don't silently activate an unreviewed transcription vendor | If captions are ever offered, they come from an explicitly reviewed, approved source — never a default "just turn on the vendor's auto-captions" toggle, which would be exactly the kind of unreviewed-transcription risk the non-negotiable invariants prohibit |
| 56px targets for frequent mobile actions | Admit/deny, suitability selection, and fallback-selection controls sized to 56px, matching the convention already used on the patient-facing kiosk intake flow elsewhere in this repo |
| Clear absolute times | No relative-only "in 2 minutes" without an absolute time alongside it, especially for expiry |
| Plain-language technical errors | Safe reason codes map to plain-language copy, never a raw error/stack surfaced to the patient |
| A way to complete the workflow without camera use | Telephone modality + secure messaging are both camera-free by construction, not just camera-optional-if-it-happens-to-work |

---

## Cross-references

`TechnologyReadinessResult` and `ContingencyPlan` (Workstream D) are the data shapes backing
§1–2. The full accessibility evidence capture (actual screenshots/keyboard walkthroughs/
screen-reader inspection) happens in Workstream L once the synthetic prototype exists — this
document is the design contract that evidence will be captured against.
