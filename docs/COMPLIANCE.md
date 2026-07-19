# Compliance Map — Ontario Minor Ailment Services

This document maps each rule implemented in this codebase back to the specific
section of the source regulation. It is written for an OCP Practice Consultant
or a Ministry post-payment reviewer.

**Source of truth:** Ministry of Health, Health Programs and Delivery Division —
_Executive Officer Notice: Update to Funding for Minor Ailment Services in
Ontario Pharmacies_, **effective July 1, 2026**
([`docs/regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf`](regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf)).
This notice replaces the notice effective November 18, 2024. Page numbers below
refer to that PDF.

> **No invented regulatory content.** Everything in the reference tables is
> transcribed from the notice. Clinical red-flag algorithms are OCP-sourced and
> are marked `// TODO: PHARMACIST REVIEW REQUIRED` until a pharmacist signs off.

Status legend: ✅ implemented · 🔶 in progress · ⬜ planned

---

## 1. Reference data (fees, PINs, claim maximums)

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| $19 in-person / $15 virtual fee, paid regardless of Rx | p.5; Table 1 (pp.8–10) | `SERVICE_FEES_CENTS`, claim derivation | ✅ reference / ⬜ derivation |
| Four PINs per ailment (Rx/No-Rx × In-Person/Virtual) | Table 1 (pp.8–10) | `AILMENT_GROUPS[].pins` | ✅ |
| 23 ailment groups incl. 9 added 2026-07-01 | pp.2–3; Table 1 | `AILMENT_GROUPS` | ✅ |
| Dermatitis merged (incl. diaper, seborrheic), max 6 | p.2; Table 1 | `AILMENT_GROUPS` (DERMATITIS) | ✅ |
| Rhinitis merged (allergic, viral) | p.2; Table 1 | `AILMENT_GROUPS` (RHINITIS) | ✅ |
| Acne No-Rx-In-Person PIN is `9858250` (not `9858249`) | Table 1 (p.9) | `AILMENT_GROUPS` (ACNE) w/ note | ✅ |
| Per-ailment max claims / 365 days | Table 1 (pp.8–10) | `maxClaimsPer365Days` | ✅ reference / ⬜ enforcement |

## 2. Claim maximums & 365-day lookback

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| HNS looks back 365 days from date of service | p.7 | 365-day count (advisory) + UI wording | ⬜ |
| `LO – Benefit Maximum Exceeded`, no override | p.7 | UI must never promise payment | ⬜ |
| Our count is advisory only (other pharmacies invisible) | p.7 (principle) | claim-history gate wording | ⬜ |
| One claim/day/person/ailment regardless of outcome/pharmacy | p.2; p.14 | unique index + hard warn + override reason | ⬜ |

## 3. Cross-ailment rules (encoded as data)

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Insect bites/urticaria ⊕ tick bites — not same day | Table 1 footnotes (pp.8–9) | `CLAIM_RULES` MUTEX_INSECT_TICK_SAME_DAY | ✅ data / ⬜ enforcement |
| Warts on face/genitals out of scope → referral | p.3 (ailment list note) | `CLAIM_RULES` SCOPE_WARTS_FACE_GENITAL | ✅ data / ⬜ enforcement |

## 4. Eligibility

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Valid Ontario health number (OHIP or ODB eligibility #) | p.6; footnote 4 | eligibility gate | ⬜ |
| No health number → not publicly funded | p.6; p.14 | eligibility gate (block claim) | ⬜ |
| Name (as on card), DOB (YYYYMMDD), gender (F/M/U) for non-ODB | p.11; p.13 | demographics capture | ⬜ |
| LTC resident + primary provider → $0 (LTC capitation) | footnote 5 (p.7); p.14 | eligibility LTC branch | ⬜ |
| LTC secondary provider bills only in emergency (`LT`) | p.14–15 | eligibility LTC branch | ⬜ |
| Pharmacist not self/family | p.14 | attestation gate | ⬜ |
| Red flag identified → refer, no claim | pp.7–8; p.14 | red-flag gate (exit) | ⬜ |

## 5. Red flags (OCP-sourced)

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Per-ailment red flags via OCP algorithms | pp.7–8 | `ailment_red_flag` reference table | ⬜ (pharmacist review) |
| Red flag → referral pathway, **no billable claim** | pp.7–8; p.14 | red-flag gate (distinct from post-assessment referral) | ⬜ |
| UTI complicating factors (male, pregnancy, age < 12) | footnote 7 (p.9) | UTI red flags | ⬜ (pharmacist review) |

## 6. Existing prescription exclusion

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Existing Rx fillable/adaptable/extendable in scope → no claim | p.15 | existing-Rx gate | ⬜ |
| Rx from another prescriber needing verification, prescriber reachable → no claim | p.15 | existing-Rx gate | ⬜ |

## 7. Consent

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Informed consent (verbal or written) from person or SDM | p.5; p.12 | consent capture (who/when/method/SDM) | ⬜ |

## 8. Assessment, outcome & documentation

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| History, health/med history, verify self-diagnosis, shared decision, care plan | p.5 | structured assessment capture | ⬜ |
| If Rx: date, patient name/address/DOB, drug/strength/qty, directions, prescriber name/address/phone/OCP #, care plan, PCP notification date+method | p.5; p.12 | prescription record | ⬜ |
| If no Rx: structured rationale mandatory | p.12 | outcome capture | ⬜ |
| Inform patient they may fill anywhere; still owe follow-up | p.5 | outcome + follow-up | ⬜ |
| Follow-up plan (monitoring, safety/efficacy, next steps) | p.5; p.12 | follow-up capture (required) | ⬜ |

## 9. Claim assembly (derived, never typed)

| Field | Rule | Notice location | Status |
|---|---|---|---|
| PIN | f(ailment, modality, Rx?) | Table 1 | ⬜ |
| Fee | $19 / $15 / $0 LTC | p.5; Table 1; p.14 | ⬜ |
| Prescriber ID Reference | `09` (never 01/99 → `60` error) | p.11 | ⬜ |
| Prescriber ID | pharmacist OCP #, or `PHR888` As-of-Right | p.11 | ⬜ |
| Intervention codes | `PS`; non-ODB adds `ML`, Carrier `S` | p.13 | ⬜ |
| Quantity | `2` remote virtual, else `1` | p.11; p.14 | ⬜ |
| SSC | `4` when completed assessment ends in referral | p.11; p.13 | ⬜ |
| Claim date | day service provided | p.14 | ⬜ |
| No HNS integration | produce/validate/persist/export only | (design) | ⬜ |

## 10. Modality & virtual compliance

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| In-person or virtual from the pharmacy location | p.4 | modality gate | ⬜ |
| Remote virtual only for rural fee tiers ($9.93/$12.14/$13.25) | p.4 footnote 3; p.15 | modality gate (fee-tier check) | ⬜ |
| Remote requires on-site staff cannot meet demand (capture reason) | p.4 | modality gate (reason field) | ⬜ |
| Regular fee ($8.83) cannot do remote → hard block | p.15 | modality gate | ⬜ |
| Record specific physical location for every virtual assessment | p.13 | assessment.virtual_location | ⬜ |
| Remote virtual → Quantity `2`, else `1` | p.11; p.14 | claim derivation | ⬜ |

## 11. Audit & retention

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Append-only audit trail (post-payment verification) | p.12 | `audit_log`: 0004 trigger (`0A000`) + 0011 non-owner app role `agentoma_app` with only `SELECT, INSERT` (`42501` verified live) | ✅ |
| Retain 10 yrs from last service, or 10 yrs past age 18, whichever longer | p.12 | `computeRetainUntil` in app **and** DB trigger `assessment_retain_until_trg` (0011) recomputes on every write | ✅ |
| Overpayments recoverable | p.12 | audit trail as defence; events cover intake/patient/assessment/claim/orientation/invitation/**export access** | ⬜ |
| No PHI reachable from client components | (PHIPA posture) | audit page + CSV/PDF exports fully server-rendered/generated | ✅ |

## 12. Eligible pharmacy / pharmacist conditions

| Rule | Notice location | Where enforced | Status |
|---|---|---|---|
| Valid HNS Subscription Agreement | p.6 | pharmacy record (HNS account id) | ⬜ |
| Pharmacist completed OCP Mandatory Orientation for Minor Ailments Module | p.6 | orientation attestation gates billable assessment | ⬜ |
| Clinical viewer (ConnectingOntario / ClinicalConnect) check | p.6 | claim-history gate attestation + link-out | ⬜ |

## Architecture / security decisions (supporting compliance)

- **better-auth is the sole identity layer** (no Firebase Auth, no Supabase Auth);
  mandatory TOTP 2FA because the portal reaches PHI.
- **`proxy.ts` performs NO authorization** — it does at most an optimistic cookie
  presence check for redirects. Every server action independently re-verifies
  session + role + orientation attestation server-side; the client is never
  trusted. (Next.js 16 renamed `middleware` → `proxy`.)
- **Primary datastore: Supabase Postgres, region `ca-central-1` (Canada Central)**
  for PHIPA residency; all PHI-bearing tables live there. Firebase/Firestore
  removed from the stack; Rx/referral PDFs go to Supabase Storage; QR handshake
  sessions live in Postgres (no Firestore).
- **Audit immutability is DB-enforced** (application role has no UPDATE/DELETE on
  `audit_log`), not merely application convention.
