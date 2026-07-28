# Worklog — P1.7: 375px usability & accessibility pass

**Date:** 2026-07-28
**Scope note:** The source task file this was assigned from (`P1-B-multitenant-usability.md`)
also asked for two-pharmacy tenant-isolation testing (P1.3). That part is **not attempted
here** — `docs/SESSION_HANDOFF.md` and the `feat: enforce single-tenancy and record
governance` history show the team already tried two test pharmacies, found a real
cross-tenant defect, and deliberately reverted to a DB-enforced single pharmacy
(`pharmacy_singleton_key_unique` + `CHECK (singleton_key = 1)`). Re-testing multi-tenancy
would work against that decision. `docs/NEXT_STEPS.md` P1 items 1 and 9 still explicitly ask
for the 375px usability/accessibility pass, so that's what this covers.

## What I tested

Live `next dev`, real data, 375×812 viewport, verified via DOM measurement
(`getBoundingClientRect`, computed styles, console/network logs) rather than visual
inspection alone.

1. `/check` — the public, unauthenticated self-check (`docs/SELF_CHECK.md`). Full flow:
   emergency screen → symptom picker → red-flag screen → **both** outcome branches
   (funded pre-visit PDF, and the emergency/advisory PDF).
2. `/assessment` — the pharmacy-scoped patient intake landing screen.
3. `/sign-in` — the pharmacist portal entry point.

**Not reached:** anything inside `/pharmacist/*` past sign-in — the portal now requires a
real account + mandatory TOTP (`src/lib/auth-client.ts`, `src/proxy.ts`), which I don't have
test credentials for in this environment. `/assessment`'s actual triage tree is also gated
behind a per-pharmacy link/QR code (`?pharmacy=` — now cosmetic only, tenancy is fixed
server-side per `SESSION_HANDOFF.md`) that I didn't have on hand.

## Findings

### P1 — Emergency/red-flag screen's primary button starts below the fold

**Where:** `/check`'s first screen (shared triage source, `config/triage.ts` — very likely
also affects `/assessment` once reachable).

**What:** Page content measures 992px tall at a 375×812 viewport. The "None of these —
continue" button sits at `top: 918px`, `position: static` — off-screen on load, below all 8
safety checkboxes.

**Why it matters:** This is the mandatory first screen of the flow, for a public,
unauthenticated, possibly sick/rushed user. A user who doesn't realize the page scrolls may
never find the way to proceed. Every subsequent screen I measured (red-flag, summary) fit
inside 812px with no scrolling — this is specific to the emergency screen's length.

**Triage:** Fix before wider pilot use of `/check`. A sticky/fixed bottom action bar is
probably the cheapest fix.

### Low — `/assessment` landing has no way forward without a working QR/link

**Where:** `/assessment` (no `?pharmacy=` present).

**What:** The screen reads "Scan your pharmacy's code to get started" with **zero**
interactive elements — no link, no button, nothing to click if the code doesn't scan or the
page was reached some other way.

**Triage:** Low priority (this screen is meant to be reached only via a physical QR code at
the counter), but a "having trouble? ask the pharmacist" fallback costs little.

### Low — sign-in page tap targets under the app's own 56px standard

**Where:** `/sign-in`

**What:** Email/password inputs are 40px tall, the submit button 39px, and the "stay signed
in" checkbox is a bare 16×16px with no expanded hit area. All correctly labelled
(`Email`, `Password`, `Stay signed in on this device` all present as accessible names) — this
is a tap-target-size note, not a labeling defect.

**Triage:** Low priority — a seated, deliberate sign-in action, not a rushed one-handed
counter interaction. Cosmetic pass whenever the auth UI gets touched next.

## Verified clean (no defect — recorded because `NEXT_STEPS.md` P1 item 1 asked for it)

- **Both `/check` PDF branches** (funded pre-visit summary, and the emergency/advisory
  branch) generate successfully. Network log for each shows only static asset `GET`s and a
  `blob:` URL for the generated file — **no POST, no server round trip carrying the
  answers**, matching `docs/SELF_CHECK.md`'s "no persistence" claim. No console errors on
  either branch.
- No horizontal overflow at 375px on `/check` or `/sign-in` (`scrollWidth` == `innerWidth`
  throughout).
- `/sign-in` has correct labelling for all fields and states two-factor + 30-minute
  inactivity sign-out plainly in the copy.

## Not done here (out of scope for this pass)

- Forcing a PDF-generation failure to confirm no payload is logged on error (`NEXT_STEPS.md`
  P1 item 1) — would need to induce a client-side jsPDF failure deliberately; not attempted.
- Anything behind pharmacist sign-in (dashboard, audit, settings, governance, follow-ups) —
  no test account/TOTP available in this environment.
