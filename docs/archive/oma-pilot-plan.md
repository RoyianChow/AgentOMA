# Archived: Ontario Minor Ailments pilot build plan

> Historical artifact only. Status and architecture in this plan may be obsolete. Use [`../COMPLETED_WORK.md`](../COMPLETED_WORK.md) and [`../NEXT_STEPS.md`](../NEXT_STEPS.md) for current project state.

# OMA Project — Pilot Build Plan

**Team:** Royian (lead, 180h) · Dev A (55h) · Dev B (55h) · Dev C (55h) — ~345h total
**Assumed cadence:** 6 weeks. Royian ~30h/wk, devs ~9–10h/wk.
**Goal:** a single-pharmacy pilot running on synthetic data at the pilot pharmacy's counter by end of week 6, with the legal path to real data in motion the whole time.

The plan is organized so that the three devs work in lanes that don't touch money or clinical logic, and everything that can silently produce an improper claim stays with the lead. That's not a status thing — it's that AI-assisted juniors are fast at plumbing and confidently wrong about regulation, and the review burden lands on you either way. Better to not create it.

---

## Ground rules (apply to every lane, every week)

1. Every dev works through Claude Code with the `ontario-minor-ailments` skill installed. The skill carries the binding PIN table and the billability rules; it exists so nobody re-derives them from memory.
2. **Nobody except Royian edits:** `ailment-reference.ts`, `triage.ts` red-flag content, any migration, `deriveClaimDraft`, or anything under the audit log. PRs touching these are closed, not reviewed.
3. Every PR needs a test or an explicit "why no test" line. `tsc --noEmit` and lint gate merges.
4. Migrations run through `db:migrate` only. `db:push` is dead — it will drop columns on a PHI database.
5. No real PHI enters any environment until the agent agreement is signed. Synthetic data uses `999…` health numbers only.

---

## Week 1 — Hardening (Royian solo, ~25h) before anyone builds on top

These are the known landmines from the build so far, and they're all foundation:

| Task | Why it can't wait |
|---|---|
| `npm i -D vitest`, make the money-rule tests actually run | The one-per-day and mutex tests have **never executed**. |
| Fix the three Drizzle `Date`/`string` bugs in `pharmacist/actions.ts` | Blocks a clean `tsc`, which blocks gating PRs on it. |
| Move `checkSameDayMutex` to the database (constraint trigger, or serializable transaction) | The application-level check has a concurrency race. Two simultaneous inserts both pass. This is the highest-value single fix in the codebase. |
| Ship the `REVOKE UPDATE, DELETE` migration on the audit log; run the app as a non-owner role | "Append-only" is currently a promise, not a property. |
| Add `pharmacy.odb_fee_tier` and `hns_account_id`; gate `virtual_remote` on the rural tiers | The remote-virtual rule is unenforceable without it. |
| Scope `patient.health_number` uniqueness to `(pharmacy_id, health_number)` | Encodes the single-tenant decision in the schema. |
| Verify `retain_until` computes the age-18 branch (Sam Child seed row must say **2047**, not 2036) | Pediatric retention is the branch everyone forgets. |

Devs spend week 1 on environment setup, reading the EO Notice PDF (yes, actually reading it — 15 pages), and the skill file. Assign each dev one "explain it back" question in the week-1 standup: what's the difference between a red-flag exit and a completed-assessment referral? Why is the 365-day count advisory? What makes a pharmacy rural?

---

## Lanes, weeks 2–5

### Dev A — Pharmacist desk (55h)

The screen the pharmacist lives in. All UI; every server action it calls is written or reviewed by Royian.

- **Code entry + intake claim (12h).** Six-character code field front and centre; on match, render the trail as question/answer pairs. Expired/consumed codes fail with a human message.
- **Identity capture + patient lookup (12h).** Keyed from the physical health card. Search existing patients by health number before creating; validation matches the claim format (name as-on-card, `YYYYMMDD` DOB, F/M/U).
- **Assessment completion UI (18h).** Modality selection (with `virtual_remote` disabled unless the pharmacy is rural-tier), the three claim-history signals side by side — patient self-report, this pharmacy's own count, clinical-viewer attestation checkbox — labelled as advisory, never a green "eligible" badge. Outcome capture with the structured no-Rx rationale. Cold-start path for walk-ins with no code.
- **Queue/dashboard (8h)** and review fixes (5h).

### Dev B — Patient intake quality (55h)

The flow works; this lane makes it work for everyone, in a pharmacy, on bad wifi.

- **Accessibility to WCAG AA (15h).** Public health service — this is table stakes, not polish. Screen-reader pass on the whole tree, focus management between phases, contrast audit of the module palette.
- **French (15h).** i18n scaffolding plus translation of the tree, red flags, and outcomes. Machine-translate then have a French speaker review — clinical wording especially. Flag to Royian anything where translation changes clinical meaning.
- **Offline/retry + error states (10h).** The handoff POST must survive flaky pharmacy wifi: retry with backoff, and a "show this screen to the pharmacist" fallback if the POST never lands.
- **QR entry + printable summary (8h)**, cross-device testing on real low-end Android (7h).

### Dev C — Auth, admin, export (55h)

- **better-auth + mandatory TOTP (18h).** Email/password, 30-minute rolling sessions, rate limits, server-side revocation. No public signup.
- **Invitations + roles (10h).** Pharmacy admin invites; single-use expiring tokens; `pharmacy_admin / pharmacist / intern / student / technician`.
- **Pharmacist profile + the orientation gate (10h).** OCP registration number, orientation-module attestation with date, supervising-pharmacist link for interns/students. The gate is hard: no attestation, no billable assessment. Royian reviews the gate enforcement specifically.
- **Claim draft export (12h).** CSV and PDF of the `ClaimDraft` for hand-entry into the pharmacy's dispensing system, with every derived field (PIN, fee, prescriber ref `09`, intervention codes, quantity, SSC) displayed read-only. Fixes (5h).

### Royian — everything with money or PHI in it (180h total)

- Week-1 hardening (25h, above)
- **`deriveClaimDraft` + the full money-rule test suite (25h):** PIN/fee derivation, 365-day lookback, one-per-day, insect/tick mutex, remote-virtual gating by fee tier, LTC $0 branch, `PHR888`, non-ODB `ML`/Carrier `S`. Pure function, tested against a real Postgres, not mocks.
- **Audit logging + retention wired through every server action (15h).**
- **Assessment-completion server actions (20h)** — the actions Dev A's UI calls; built together in week 2 so A isn't blocked.
- **Continuous review + integration (45h).** This is the real constraint of the whole plan. Three AI-assisted juniors generate more code than 45 hours comfortably reviews; when it overflows, cut scope rather than skim reviews — cut in this order: French → offline hardening → export PDF (keep CSV).
- **Pilot prep + the synthetic pilot itself (25h)** — see week 6.
- **Buffer + the non-code critical path (25h):** chasing the agent agreement, the PIA, the OCP call, and the pharmacist's red-flag review. These are calendar-bound, not effort-bound — start them in week 1 or week 6 arrives without them.

---

## The external dependencies (start week 1, none are yours to control)

| Dependency | Owner | Blocks |
|---|---|---|
| Agent agreement + PIA | Lawyer (pharmacy's counsel intro) | **Any real patient data.** The pilot runs synthetic without it, but nothing more. |
| OCP Practice Consultant call | Pilot pharmacist makes it | Confidence that the workflow survives an inspection question. |
| Red-flag sign-off, line by line | Pilot pharmacist | Go-live. The tick-bite 72h window is a guess and is marked as such in the source — it's the first thing they check. |

---

## Week 6 — the synthetic pilot

One afternoon at the pilot pharmacy, everyone present. Script: five synthetic patients (use the seed personas), full path — phone triage → code → desk → identity → assessment → claim draft → hand-entry into the real dispensing software. **Time each step with a stopwatch.** The number that decides this product is *minutes saved or lost per assessment versus their current paper process*, including the double-entry into Kroll/PharmaClik. If that number is negative, the roadmap changes before more hours go in — and it's far better to learn that in week 6 than after launch.

Also run the failure drills: an expired code, a red-flag exit (confirm zero rows written), a same-day duplicate (confirm the constraint fires in front of the pharmacist), and the wifi-down fallback.

## Done means

- All money-rule tests green against real Postgres; a red-flag exit provably writes nothing
- Pharmacist can go code → identity → completed assessment → exported claim draft without touching a PIN
- `/assessment` passes WCAG AA; French complete or consciously cut
- Audit log immutable at the DB level; `retain_until` correct for the pediatric case
- Synthetic pilot run, timed, and the time-per-assessment number written down
- Agent agreement and PIA in progress with a named lawyer; OCP call made; red flags signed or the unsigned ones listed as launch blockers
