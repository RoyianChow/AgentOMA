---
name: ontario-minor-ailments
description: Authoritative rules for Ontario pharmacy minor-ailment assessments, billing, and PHI handling under PHIPA. Use whenever working on assessment flows, claim/PIN derivation, ailment reference data, pharmacist auth, audit logging, or anything touching patient health information in this codebase. Contains the binding PIN table and claim maximums — never derive these from memory.
---

# Ontario Minor Ailments — Compliance Rules

Source of truth: `docs/regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf`
(Ontario MoH Executive Officer Notice, **effective July 1, 2026**, replacing the Nov 18 2024 notice.)

**If a rule here conflicts with the PDF, the PDF wins — and you must tell the user the skill is stale rather than silently picking one.**

---

## STOP — do these before anything else

These are live exposures, not cleanup. If you find any of them, fix or disable them **before** starting whatever task you were asked to do, and tell the user you did:

- **Any unauthenticated route that accepts or returns assessment/patient data.** (The FHIR/Kroll export route historically did this.)
- **Any client-side read or write of PHI** — Firestore from a client component, `localStorage` holding health numbers, PHI in a client component's props.
- **Any hardcoded PIN or claim maximum in application code.** These have been wrong before. They must come from the seeded reference tables.

## Never do

- Never invent a PIN, claim maximum, fee, or intervention code. If it isn't in the table below or the PDF, **stop and ask**.
- Never invent clinical content. Red-flag algorithms come from OCP guidance and require pharmacist sign-off. Scaffolded rules get `// TODO: PHARMACIST REVIEW REQUIRED`.
- Never log PHI. Never pass PHI to a client component that doesn't need it.
- Never state or imply in the UI that a claim **will** be paid. See "Advisory only" below.

---

## Architecture (fixed — do not relitigate)

| Concern | Decision |
|---|---|
| Primary datastore | Supabase Postgres, `ca-central-1` (Canada Central) |
| ORM | Drizzle |
| Identity | `better-auth` + Drizzle adapter — **not** Supabase Auth, **not** Firebase Auth |
| File storage | Supabase Storage (Rx / referral PDFs) |
| Firebase | **Removed entirely.** Do not reintroduce it, including Firestore for "non-PHI" state. |
| Package manager | `npm` |
| Env | `@t3-oss/env-nextjs`, wired into `next.config.ts`. No raw `process.env` anywhere. |

Next.js 16 replaces `middleware.ts` with `proxy.ts`. **`proxy.ts` performs no authorization.** It is an optimistic UX gate only. Every server action independently re-verifies session, role, and orientation attestation server-side.

---

## Reference data — the binding table

Fees: **$19 in-person, $15 virtual — paid regardless of whether a prescription is issued.** `$0` for an LTC primary provider (see LTC branch).

Four PINs per group, in column order: Rx In-Person, No-Rx In-Person, Rx Virtual, No-Rx Virtual.

| Ailment group | Max / 365d | Rx IP | NoRx IP | Rx Virt | NoRx Virt |
|---|---|---|---|---|---|
| Rhinitis (allergic, viral) | 4 | 9858181 | 9858182 | 9858183 | 9858184 |
| Candidal stomatitis (oral thrush) | 4 | 9858185 | 9858186 | 9858187 | 9858188 |
| Conjunctivitis (bacterial, allergic, viral) | 3 | 9858189 | 9858190 | 9858191 | 9858192 |
| Dermatitis (atopic, eczema, allergic, contact, diaper, seborrheic) | 6 | 9858193 | 9858194 | 9858195 | 9858196 |
| Dysmenorrhea | 2 | 9858197 | 9858198 | 9858199 | 9858200 |
| GERD | 3 | 9858201 | 9858202 | 9858203 | 9858204 |
| Hemorrhoids | 3 | 9858205 | 9858206 | 9858207 | 9858208 |
| Herpes labialis (cold sores) | 8 | 9858209 | 9858210 | 9858211 | 9858212 |
| Impetigo | 2 | 9858213 | 9858214 | 9858215 | 9858216 |
| Insect bites / urticaria | 8 | 9858217 | 9858218 | 9858219 | 9858220 |
| Musculoskeletal sprains & strains | 4 | 9858221 | 9858222 | 9858223 | 9858224 |
| Tick bites (Lyme PEP) | 4 | 9858225 | 9858226 | 9858227 | 9858228 |
| Urinary tract infection (uncomplicated) | 3 | 9858229 | 9858230 | 9858231 | 9858232 |
| Acne (mild) | 4 | 9858248 | **9858250** | 9858251 | 9858252 |
| Canker sores (oral aphthae) | 4 | 9858253 | 9858254 | 9858255 | 9858256 |
| Nausea & vomiting of pregnancy | 3 | 9858261 | 9858262 | 9858263 | 9858264 |
| Pinworms / threadworms | 3 | 9858265 | 9858266 | 9858267 | 9858268 |
| Vulvovaginal candidiasis | 4 | 9858269 | 9858270 | 9858271 | 9858272 |
| Calluses, corns and warts | 2 | 9858404 | 9858405 | 9858406 | 9858407 |
| Tinea corporis / cruris | 3 | 9858408 | 9858409 | 9858410 | 9858411 |
| Headache (mild, tension-type) | 3 | 9858412 | 9858413 | 9858414 | 9858415 |
| Pediculosis (head lice) | 3 | 9858428 | 9858429 | 9858430 | 9858431 |
| Xerophthalmia (dry eye) | 2 | 9858432 | 9858433 | 9858434 | 9858435 |

Acne's No-Rx In-Person PIN really is **9858250**, not 9858249. Do not "correct" it.

Reference tables carry `effective_date` and nullable `end_date` so future PIN revisions coexist with this set.

### Cross-ailment rules (encode as data in `claim_rule`, not as `if` statements)
- **Same-day mutex:** insect bites/urticaria and tick bites cannot both be claimed for the same person on the same day.
- **Scope exclusion:** warts on **face or genitals** are out of scope — referral, not assessment.

---

## Billability — the distinction that costs money

Three outcomes that look similar and are not:

| Situation | Billable? | Claim fields |
|---|---|---|
| Assessment completed, prescription issued | Yes | Rx PIN for the modality |
| Assessment completed, no Rx (OTC / non-pharm advice) | Yes | No-Rx PIN |
| Assessment **completed**, then referred to another provider | **Yes** | No-Rx PIN + **`SSC = 4`** |
| **Red flag fired** → patient must be referred | **No claim at all** | — |
| Claim maximum already reached | **No claim** | Refer per professional judgment |
| Existing Rx that could be filled/adapted/extended in scope | **No claim** | — |
| Other prescriber's Rx just needs verification and they're reachable | **No claim** | — |
| Pharmacist assessing self or family member | **Never** | — |

The red-flag exit and the completed-then-referral case are the pair most likely to produce an improper claim. Keep them visually and structurally distinct in both code and UI.

---

## `deriveClaimDraft()` — pure, unit-tested, single source

Derive every field. The user types none of them.

- **PIN** = lookup(ailment_group, modality, rx_issued)
- **Fee** = `1900` in-person / `1500` virtual / `0` LTC primary provider
- **Prescriber ID Reference** = `09` — never `01` or `99` (those reject with `60 – Prescriber License Code Error`)
- **Prescriber ID** = pharmacist's OCP registration number, or `PHR888` if practising under As-of-Right without an Ontario licence yet
- **Intervention code** = `PS`. For **non-ODB** recipients, also `ML`, with **Carrier ID `S`**
- **Quantity** = `2` for remote virtual, `1` for everything else
- **SSC** = `4` only for completed-assessment-then-referral
- **LTC secondary provider, emergency only** = intervention code `LT`, otherwise $0 claim

Do **not** integrate with HNS. Produce, validate, persist, and export the draft for handoff to the pharmacy's dispensing software. Say so in the UI.

---

## Assessment flow — guarded server-action wizard

Order matters; each gate can block, force referral, or downgrade the claim.

1. **Modality** — `in_person` | `virtual_from_pharmacy` | `virtual_remote`.
   `virtual_remote` requires a **rural ODB fee tier** (`9.93` / `12.14` / `13.25`) **and** a recorded reason that on-site staff cannot meet virtual demand. A regular-tier pharmacy (`8.83`) selecting remote is hard-blocked.
   Every virtual assessment records the pharmacist's **specific physical location**.
2. **Eligibility** — valid Ontario health number (OHIP or ODB); name exactly as on card; DOB `YYYYMMDD`; gender `F`/`M`/`U`. No health number → not publicly funded, flow cannot reach a billable claim.
   **LTC branch:** resident + this pharmacy is the primary provider → capitation, `$0` claim. Secondary provider → emergency only, `LT`.
   **Self/family attestation** — block if it fails.
3. **Claim history** — see below.
4. **Red flags** — per-ailment, sourced from `ailment_red_flag` reference data. A fire exits to referral with **no claim**.
5. **Existing prescription** — either blocking condition above → no claim.
6. **Consent** — patient or SDM, verbal or written. Record *that* consent was obtained, by whom, when, how; SDM name + relationship if applicable.
7. **Assessment & outcome** — presenting complaint, health/med history, findings verifying self-diagnosis, shared decision-making, care plan. No-Rx requires a **structured** rationale, not free text alone. Tell the patient (and record telling them) they may fill at **any pharmacy of their choice** — follow-up is still owed either way.
8. **Claim assembly** — `deriveClaimDraft()`.

### Claim-history gate — and the honesty constraint

Ask: *"In the last 12 months, have you been assessed at **any pharmacy** for this same condition?"* → No / Yes / Not sure (+ how many, where).

Combine three signals, shown side by side:
1. Patient self-report.
2. This platform's own count for health number + ailment group over the trailing 365 days.
3. Pharmacist attestation that they checked **ConnectingOntario or ClinicalConnect** (timestamped, with link-out).

**Advisory only.** We cannot see claims made at other pharmacies. HNS adjudicates on submission with a 365-day lookback and rejects with `LO – Benefit Maximum Exceeded` — **no intervention code overrides it.** The UI says "likely eligible" or "at or near maximum — verify in clinical viewer," and **never** "eligible: yes."

Also enforce: **one claim per person, per ailment, per day — regardless of outcome or pharmacy visited.** An existing same-day record requires a hard warning and an override reason.

---

## Auth & billing gates

- Email + password with **mandatory TOTP**. This portal reaches PHI; single-factor is not acceptable.
- Sessions: `httpOnly`, `secure`, `sameSite: lax`, 30-min idle with rolling refresh, server-side revocation on sign-out. Rate-limit sign-in and reset.
- **No public signup.** Pharmacy admins issue single-use, expiring invitations.
- Roles: `pharmacy_admin`, `pharmacist`, `intern`, `student`, `technician`.
- **A pharmacist without a recorded OCP "Mandatory Orientation for Minor Ailments Module" completion cannot complete a billable assessment.** This is a hard gate, not a warning.
- Interns/students link to a supervising pharmacist, whose OCP number goes in the prescriber field.

## Audit & retention

- `audit_log` is **append-only enforced at the database level**: ship a migration that runs `REVOKE UPDATE, DELETE` on it from the application role, and run the app as a dedicated non-owner role. Application-level "we don't update it" is not immutability.
- Retention: **10 years** from the last recorded service to the individual, **or** 10 years after they turned (or would have turned) 18 — whichever is longer. Store a computed `retain_until` on each record.
- Ministry can recover overpayments on post-payment review. The audit trail is the pharmacy's defence — treat it as a feature, not plumbing.

---

## Before you call any of this done

- [ ] `tsc --noEmit` clean; test suite green
- [ ] Unit tests exist and pass for: PIN/fee derivation · 365-day lookback counting · one-claim-per-day · insect/tick same-day mutex · remote-virtual eligibility by fee tier
- [ ] `grep` finds no hardcoded PIN or claim maximum outside the seed source
- [ ] `grep` finds no `process.env` outside `src/env.ts`
- [ ] No PHI reachable from any client component or browser storage
- [ ] Every route touching assessment data requires an authenticated session
- [ ] `docs/COMPLIANCE.md` maps each implemented rule to its EO Notice section

---

## Appendix — one-time Firebase→Supabase migration

Historical. Skip if already complete; check for the Firebase SDK in `package.json` first.

0. Disable/gate the unauthenticated FHIR route and any client-side PHI write. **Before anything else.**
1. Docs: PDF → `docs/regulatory/`; `docs/COMPLIANCE.md` skeleton; single reference-data source file.
2. Env: `src/env.ts`, `next.config.ts` wiring, `.env.example`, purge `process.env` and all Firebase vars.
3. DB: Drizzle + Supabase connection, schema, first migration.
4. Seed: idempotent `npm run db:seed` with `effective_date`; derivation unit tests.
5. `better-auth`: TOTP, roles, invitations, rate limits, rolling sessions, `proxy.ts` optimistic gate.
6. Pharmacy + pharmacist profiles: OCP number, orientation gate, supervisor link, As-of-Right, ODB fee tier.
7. Assessment wizard rebuilt as guarded server actions.
8. `deriveClaimDraft()` + validate + persist + export.
9. Audit + retention, `REVOKE` migration, audit page moved server-side.
10. Strip all mock data and fake PHI (including marketing pages); remove the Firebase SDK.
11. `COMPLIANCE.md` mapping; full typecheck + tests.
