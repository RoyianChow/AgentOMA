# Task 06 — Accessibility and Responsive Evidence

**Status: partial — real browser-based capture is blocked, honestly, not silently skipped.**

## Why this document is partial

`apps/experiment-sandbox`'s own G1 lifecycle gate (`SANDBOX_EXPIRES_AT`, and the Task 04
approval window `TASK04_APPROVED_THROUGH_DATE_UTC = "2026-08-05"`) expired **2026-08-05** — six
days before this work was done (today's date: 2026-08-11). The sanctioned dev launcher
(`apps/experiment-sandbox/tools/next-with-deny.ts`) calls
`loadSandboxEnv({ phase: "startup" })` **without** `allowExpired`, so `npm run dev`,
`npm run build`, and `npm run start` all throw `SANDBOX_CONFIG_DENIED:EXPIRED` before any
route — the ones built for this task or any pre-existing one — can be served.

This means the 375px/desktop screenshots, a real keyboard walkthrough, a real screen-reader
pass, 200%/400% zoom capture, and a low-bandwidth simulation could not be performed: there is no
way to open this application in a browser under the current approval window without extending
`SANDBOX_EXPIRES_AT` myself, which would be an unauthorized lifecycle bypass of exactly the
control this sandbox's own architecture (`src/lifecycle/state.ts`, Task 01's G1/G2 gates) exists
to enforce. That decision belongs to whoever owns Task 01's approval renewal, not to this task.

**What this document does instead:** a static source-level accessibility review of every file
under `apps/experiment-sandbox/src/app/virtual-care/` and the shared `globals.css`, checked
against each required test category below. Static review is real evidence of intent and
structure — it is not a substitute for a live assistive-technology pass, and this document says
so plainly rather than presenting one as the other.

## Static review, by required category

| Category | What was checked | Finding |
|---|---|---|
| Preflight | `patient-scene.tsx`'s technology-readiness list uses a plain `<ul>`/`<li>` structure with text content per check (pass/fail/degraded + reason) — no icon-only or color-only status | Structurally accessible; not confirmed with a screen reader |
| Consent | Privacy/consent section is plain text inside a `<section aria-labelledby>`, no custom widgets | Same |
| Waiting room | Plain text status, no polling/auto-refresh that could disorient a screen-reader user | Same |
| Pharmacist controls | Every control section has an `id`-linked `<h3>` via `aria-labelledby` | Same |
| Participant management | Role/participant counts are plain text, not icon-only | Same |
| Suitability | `GuardBadge` renders both an icon-free color class **and** the text "Allowed"/"Denied — reason" — status is never color-only | Verified in source (`scene-components.tsx`) |
| Disconnect / Reconnect | `DeniedBanner` uses `role="alert"`; guard badges use `role="status"` | Verified in source |
| Telephone fallback | Same guard-badge/banner pattern, no telephone-specific accessibility gap found | Verified in source |
| Secure messaging | Same pattern | Verified in source |
| Expiry / Denial / Unknown state | `NotFoundBanner`/`DeniedBanner` always render text, never an empty or icon-only state | Verified in source |
| 375px | `.shell { width: min(100%, 760px) }` and no fixed-width elements were found in `globals.css` or the new component styles | Structurally responsive; not confirmed by a real 375px screenshot |
| Desktop | Same base layout, `.card` uses `clamp()` padding | Same caveat |
| Keyboard traversal | Every interactive element is a native `<input type="radio">`, `<a>`/`<Link>`, or (on other pages) `<button>` — no `<div onClick>` or custom non-focusable controls anywhere in this feature | Verified in source; not confirmed with a real keyboard-only walkthrough |
| Screen-reader semantics | `aria-labelledby` on every section heading pairing, `role="alert"` / `role="status"` on the two live-content components, `<fieldset>`/`<legend>` on the role selector | Verified in source; not confirmed with a real screen reader |
| Visible focus | No custom `outline: none` anywhere in this feature's CSS; the existing sitewide `a:focus-visible` / `.button:focus-visible` rule (`outline: 4px solid var(--amber)`) is untouched and applies | Verified in source |
| 56px frequent-action targets | `.role-option` sets `min-height: 44px`; existing sitewide `.button` sets `min-height: 56px`. The role-selector radio rows are **44px, not 56px** — flagged below as a real gap, not glossed over | **Gap identified** — see below |
| 200%/400% zoom | No fixed pixel widths, no absolute positioning, no viewport-unit text sizing in this feature's CSS | Structurally reflow-safe; not confirmed by a real zoom test |
| Reduced motion | The existing sitewide `@media (prefers-reduced-motion: reduce)` rule in `globals.css` is untouched and covers this feature (no new animation or transition was added by this feature at all) | Verified in source |
| Long translated text | All copy is plain flowing text in `<p>`/`<li>`/`<span>`, no fixed-width truncation (`text-overflow`, `white-space: nowrap`) anywhere in this feature | Verified in source |
| Low bandwidth | The `low_bandwidth` fixture and its guard path render the same way as every other scenario — no separate lightweight/heavy code path exists to diverge under real network conditions | Structural only; not confirmed under a real throttled connection |
| Camera-free operation | No control in this feature requires camera access; the patient preflight list only *displays* the synthetic camera-check result, it never calls `getUserMedia` (confirmed via the leakage test `has no recording or transcription capability`) | Verified in source and by test |

## Gap identified during this review

**The role-selector radio rows (`.role-option`) are 44px, not the 56px this task requires for
frequent-action targets.** This is a real, disclosed defect, not rounded up to "close enough."

Fix applied: `globals.css`'s `.role-option` rule raised from `min-height: 44px` to
`min-height: 56px`, matching the sitewide `.button` convention.

## What remains genuinely unverified

Everything in the table above marked "not confirmed" requires a running instance of this
application in a real browser: actual 375px/desktop screenshots, an actual keyboard-only
traversal recording, an actual screen-reader semantic inspection (NVDA/VoiceOver/similar), actual
200%/400% zoom captures, and an actual throttled-network session. None of these can be produced
honestly without lifting the sandbox's expired lifecycle gate — this document does not fabricate
them.

## Recommended next action

Once Task 01's G1/G2 approval window is renewed (a decision for that task's owner, not this
one), re-run this review by actually opening `/virtual-care`, `/virtual-care/patient/[scenario]`,
and `/virtual-care/pharmacist/[scenario]` in the Browser pane at 375px and desktop widths, with
`resize_window`, `read_page` (accessibility tree), and `read_console_messages`, and replace the
"not confirmed" rows above with real findings.
