# Task: Firebase migration, better-auth pharmacist portal, and MoH-compliant minor ailment assessment

You are working on an existing Ontario pharmacy minor-ailments web platform. Read the codebase first and produce a written plan before writing code. Do not start editing files until you have shown me the plan and I approve it.

## Reference document

`moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf` is in the repo (add it under `docs/regulatory/` if it isn't already). It is the Ontario Ministry of Health Executive Officer Notice: *Update to Funding for Minor Ailment Services in Ontario Pharmacies*, **effective July 1, 2026**, which replaces the November 18, 2024 notice. It is the source of truth for ailments, PINs, claim maximums, fees, and billing rules. Read it fully before implementing the assessment flow.

---

## Part 0 — Two decisions to make before you touch anything

### 0a. better-auth + Firestore
better-auth ships adapters for Drizzle, Prisma, Kysely, and MongoDB. It has **no first-class Firestore adapter.** Pick one and justify it in the plan:

- **Option A (recommended):** Postgres (Cloud SQL or Supabase, region `northamerica-northeast1/2`) as the primary datastore with Drizzle + better-auth's Drizzle adapter. Firebase used only for what it's actually good at here — file/document storage, and optionally Firestore for non-PHI ephemeral state like QR session handshakes.
- **Option B:** Firestore as primary, with a hand-written better-auth adapter implementing the `Adapter` interface (`create`, `findOne`, `findMany`, `update`, `delete`, `count`). More code, more places to get session invalidation wrong.

Do not use Firebase Authentication. We are using better-auth as the identity layer.

### 0b. PHIPA data residency
Any store that touches personal health information must be pinned to a Canadian region (`northamerica-northeast1` Montréal or `northamerica-northeast2` Toronto). Firestore region is **immutable after creation** — get it right on first provision. Call out in the plan exactly which collections/tables hold PHI and confirm each one's region.

---

## Part 1 — Environment: `@t3-oss/env-nextjs`

Install `@t3-oss/env-nextjs` and `zod`. Create `src/env.ts` with strict server/client split.

- Server vars: database URL, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Firebase Admin service account credentials (project id, client email, private key), any HNS/clinical-viewer stub config.
- Client vars: only `NEXT_PUBLIC_*` — public Firebase web config, app URL. **No secrets, no service-account key.**
- Wire `env.ts` into `next.config.js` so builds fail fast on missing vars.
- Replace **every** `process.env.X` reference in the codebase with an import from `env`.
- Update `.env.example` with every var, and confirm `.env*` is gitignored.

---

## Part 2 — Remove hardcoded data

Audit the repo for hardcoded/mock data: ailment lists, PIN tables, patient records, queue items, pharmacy details, fee amounts, demo pharmacists. List every location you find in the plan.

Replace with real persistence:

- **Reference data** (ailments, PINs, claim maximums, fees) → a seeded, versioned reference table. Never inline these in components.
- **Operational data** (pharmacies, pharmacists, patients, assessments, claims, audit log) → the primary datastore.
- Everything reaches the client through typed server actions / route handlers. No direct client-side DB or Firestore reads for PHI.
- Write an idempotent seed script (`pnpm db:seed`) that loads the reference data from a single source file. Include an `effective_date` column on reference rows so the July 1, 2026 PIN set can coexist with future revisions.

### Reference seed data (from the EO Notice, Table 1)

Fees: **$19 in-person, $15 virtual — paid regardless of whether a prescription is issued.**
Four PINs per ailment group: Rx Issued (In-Person), No Rx Issued (In-Person), Rx Issued (Virtual), No Rx Issued (Virtual), in that column order.

| Ailment group | Max claims / 365d | Rx In-Person | No Rx In-Person | Rx Virtual | No Rx Virtual |
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
| Acne (mild) | 4 | 9858248 | 9858250 | 9858251 | 9858252 |
| Canker sores (oral aphthae) | 4 | 9858253 | 9858254 | 9858255 | 9858256 |
| Nausea & vomiting of pregnancy | 3 | 9858261 | 9858262 | 9858263 | 9858264 |
| Pinworms / threadworms | 3 | 9858265 | 9858266 | 9858267 | 9858268 |
| Vulvovaginal candidiasis | 4 | 9858269 | 9858270 | 9858271 | 9858272 |
| Calluses, corns and warts | 2 | 9858404 | 9858405 | 9858406 | 9858407 |
| Tinea corporis / cruris | 3 | 9858408 | 9858409 | 9858410 | 9858411 |
| Headache (mild, tension-type) | 3 | 9858412 | 9858413 | 9858414 | 9858415 |
| Pediculosis (head lice) | 3 | 9858428 | 9858429 | 9858430 | 9858431 |
| Xerophthalmia (dry eye) | 2 | 9858432 | 9858433 | 9858434 | 9858435 |

Note the Acne row: the No-Rx-In-Person PIN is **9858250**, not 9858249. Do not "fix" it.

Two mutual-exclusion rules to encode as data, not as ad-hoc `if` statements:
- Insect bites/urticaria and tick bites **cannot both be claimed on the same day** for the same person.
- Verrucae (warts) are billed under the Calluses/Corns/Warts group. Warts on the **face or genitals are out of scope** — that's a referral, not an assessment.

---

## Part 3 — better-auth pharmacist portal

Install `better-auth` and wire up the adapter chosen in 0a.

**Auth requirements:**
- Email + password, with **mandatory 2FA (TOTP)** via better-auth's `twoFactor` plugin. This portal reaches PHI; single-factor is not acceptable.
- Session cookies: `httpOnly`, `secure`, `sameSite: lax`, short idle timeout (30 min) with rolling refresh. Explicit sign-out invalidates server-side.
- Rate-limit sign-in and password reset.
- No public self-signup. Pharmacists are **invited** by a pharmacy admin; invites are single-use, expiring tokens.

**Roles** (`admin` plugin or custom `role` field): `pharmacy_admin`, `pharmacist`, `intern`, `student`, `technician`.

**Pharmacist profile fields — these gate billing eligibility, so make them required and validated:**
- OCP registration number
- Attestation that the OCP **Mandatory Orientation for Minor Ailments Module** is complete (with completion date). A pharmacist without this attestation must be **blocked** from completing a billable assessment — the EO Notice makes this an eligibility condition for the pharmacy, not a nice-to-have.
- Supervising pharmacist link for `intern` / `student` accounts. The supervising pharmacist's OCP number is what goes in the prescriber field.
- Whether they practise under **As of Right** legislation without an Ontario licence number yet → prescriber ID `PHR888`.

**Pharmacy record fields:** HNS account identifier, ODB dispensing fee tier (`8.83` regular vs `9.93` / `12.14` / `13.25` rural). The fee tier drives the remote-virtual rules in Part 4. Store it; do not hardcode it.

**Middleware:** every `/portal/*` route requires an authenticated session with an active role. Server actions re-verify — never trust the client.

---

## Part 4 — Virtual-assessment compliance (the important part)

Rebuild the assessment flow as a **guarded, stateful wizard**. Each gate can block progress, force a referral, or downgrade the claim. The output is a complete, defensible clinical record — not just a form submission.

### Modality gate (run first)
Capture `modality`: `in_person` | `virtual_from_pharmacy` | `virtual_remote`.

- `virtual_remote` is **only** selectable if the pharmacy's ODB dispensing fee tier is rural (`9.93` / `12.14` / `13.25`) **and** the pharmacist affirms that on-site staff cannot meet virtual demand (capture the reason; store it). A regular-fee pharmacy (`$8.83`) selecting remote must be hard-blocked with an explanation.
- Every virtual assessment records **the specific physical location the pharmacist was in**. This is a documentation requirement.
- Modality determines fee ($19 vs $15), PIN column, and the HNS `Quantity` field (`2` for remote virtual, `1` for everything else).

### Eligibility gate
- Valid Ontario health number (OHIP or ODB eligibility number) — validate format; capture name **exactly as it appears on the card**, DOB (`YYYYMMDD`), and gender (`F`/`M`/`U`, needed for non-ODB claims).
- No health number → not eligible for the publicly funded service. Show this plainly; do not let the flow proceed to a billable claim.
- LTC home resident? → if yes, and this pharmacy is the LTC home's **primary** provider, the service is covered under LTC capitation and must be claimed at a **zero-dollar fee**. A secondary provider may only bill in an emergency (intervention code `LT`). Surface this as an explicit branch, not a footnote.
- Self/family-member check: the pharmacist attests they are not assessing themselves or a family member. Block if they can't.

### Claim-history gate ← the "have you had an assessment in the last 365 days" step

Ask the patient, per ailment group:
> "In the last 12 months, have you been assessed at **any pharmacy** for this same condition?"
> → No / Yes / Not sure. If Yes: approximately how many times, and where?

Then combine three signals and show them side by side:

1. **Patient self-report** (above).
2. **This platform's own count** — assessments recorded in our system for this health number + ailment group in the trailing 365 days.
3. **Clinical viewer check** — the pharmacist must attest they checked ConnectingOntario or ClinicalConnect, which shows publicly funded professional-service history. Provide a link-out and an attestation checkbox with timestamp.

Then display: *"Max claims per 365 days for this ailment: N. Known prior claims: M."*

**Critical honesty constraint — do not violate this:** our count is **advisory only**. We cannot see claims made at other pharmacies. The only authority is HNS adjudication at submission time, which looks back 365 days from the date of service and rejects with `LO – Benefit Maximum Exceeded` (no intervention code can override it). The UI must never promise the claim will be paid. Word it as "likely eligible" / "at or near maximum — verify in clinical viewer before proceeding," never "eligible: yes."

Also enforce: **one claim per day, per person, per ailment, regardless of outcome or pharmacy visited.** If our system already has an assessment today for this health number + ailment group, warn hard and require an override reason.

### Red-flag gate
Per-ailment red-flag questions driven by OCP assessment algorithms (e.g. UTI in pregnancy, male sex, age < 12 → refer). Structure red flags as **reference data per ailment**, not hardcoded JSX.

If a red flag fires:
- The flow **must** exit to a referral pathway.
- **No claim may be submitted.** This is different from a completed-assessment-then-referral (see below). Make the distinction unmissable in the UI, because it's the one most likely to produce an improper claim.

### Existing-prescription gate
Cannot claim a minor ailment fee if the patient:
- already has a prescription for this ailment that could be **filled, adapted, or extended** within the pharmacist's normal scope (wrong dose, no refills left, etc.), or
- has a prescription from another prescriber that just needs verification/consultation (e.g. drug shortage) and that prescriber is reachable.

Ask both. A Yes on either blocks the billable claim.

### Consent
Explicit informed consent from the patient or substitute decision-maker, verbal or written. Record **that** consent was obtained, by whom, when, and the method. If an SDM consented, record their name and relationship.

### Assessment & outcome
- Structured capture: presenting complaint history, health and medication history, assessment findings verifying the self-diagnosis, shared decision-making notes, care plan.
- Outcome: `rx_issued` | `no_rx_referral` | `no_rx_otc_or_nonpharm`.
- If Rx issued, capture and render: date prescribed; patient name, address, DOB; drug name, strength, quantity; directions (dose, frequency, route); prescribing pharmacist's name, address, phone, **OCP registration number**; care plan; date and method of PCP notification.
- If no Rx, a **rationale is mandatory** — free text is not enough; require the structured reason.
- Tell the patient, and record that you told them, that they may take the prescription to **any pharmacy of their choice**. If they fill elsewhere, we still owe them follow-up.
- Follow-up plan: monitoring parameters, safety/efficacy evaluation, next steps. Required field.

### Claim assembly
Derive, never let the user type:
- **PIN** = f(ailment group, modality, Rx issued?)
- **Fee** = $19 in-person / $15 virtual — *or $0.00 for LTC primary provider*
- **Prescriber ID Reference** = `09` (never `01` or `99` — those reject with `60 – Prescriber License Code Error`)
- **Prescriber ID** = pharmacist's OCP number, or `PHR888` for As-of-Right without an Ontario licence
- **Intervention code** = `PS`; for **non-ODB** recipients also `ML`, with **Carrier ID `S`**
- **Quantity** = `2` remote virtual, else `1`
- **SSC = 4** if the completed assessment resulted in a referral to another provider *(note: this is a completed, billable assessment that ends in referral — it is NOT the same as a red-flag exit, which is not billable at all)*
- Claims are submitted **on the day the service was provided**.

Build this as a `ClaimDraft` object with a pure, unit-tested derivation function. Do **not** integrate with HNS. Produce the draft, validate it, persist it, and expose it for export/handoff to the pharmacy's existing dispensing software. Say so explicitly in the UI.

### Audit & retention
- Append-only audit log: who did what, when, from where. Enforce immutability at the database permission level — revoke `UPDATE`/`DELETE` from the application role. Application-level "we don't update it" is not immutability.
- Retention: **10 years** from the last recorded service to the individual, or 10 years after they turned/would have turned 18, whichever is longer. Store a computed `retain_until` on each record.
- Overpayments from improper claims are recoverable by the ministry. The audit trail is what defends the pharmacy in a post-payment review — treat it as a first-class feature.

---

## Part 5 — Working agreement

- TypeScript strict. Zod-validate every boundary (form input, server action, external response).
- Unit tests are **required** for: PIN/fee derivation, 365-day lookback counting, one-claim-per-day rule, insect-bite/tick-bite same-day exclusion, remote-virtual eligibility by fee tier. These are the rules that cost real money when wrong.
- Never log PHI. Never send PHI to a client component that doesn't need it.
- Commit in logical chunks with clear messages.
- Do not invent regulatory content. If something isn't in the EO Notice and you need it, **stop and ask me** rather than guessing. Clinical red-flag algorithms come from OCP guidance and must be reviewed by our pharmacist — mark any you scaffold with `// TODO: PHARMACIST REVIEW REQUIRED`.
- Add `docs/COMPLIANCE.md` mapping each implemented rule back to the specific section of the EO Notice it comes from. This is what an OCP Practice Consultant will want to see.

## Deliverable

Start with the plan: the two Part 0 decisions with reasoning, the full inventory of hardcoded data you found, the proposed schema, and an ordered implementation sequence. Wait for my approval before writing code.
