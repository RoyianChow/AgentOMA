# Open questions

Regulatory/clinical ambiguities that **code must not resolve on its own**. Each one names who
can answer it and what the code does in the meantime.

The rule: where the EO Notice is genuinely unclear, we take the **conservative branch** (the one
that cannot produce an improper claim or an unsafe outcome), mark it `// TODO: VERIFY` at the
branch, and log it here. An agent that "reasonably infers" an answer gets it wrong forever; a
pharmacist or the ODB help desk settles it in five minutes.

---

## 1. LTC secondary provider, non-emergency — is a $0 claim still required?

**Status:** open · **Who answers:** ODB Pharmacy Help Desk **1-800-668-6641** (or the pilot pharmacist)
**Code:** `src/lib/claims/derive-claim-draft.ts` → `LTC_SECONDARY_NON_EMERGENCY`

The Notice is arguably in tension with itself:

- **Exclusions (p.14)** — minor ailment services for an LTC resident "must be provided by the LTC
  home's contracted primary pharmacy service provider"; secondary providers are eligible for the
  fee **only in emergency situations**. Reads as: a secondary provider shouldn't be doing this
  at all outside an emergency.
- **Footnote 5 (p.7) / Exclusions (p.14)** — "Pharmacies ineligible to receive a service fee must
  submit claims for minor ailment services with a **zero dollar fee**." Reads as: if the service
  happened anyway, a $0 claim is still filed rather than no claim at all.

**Current behaviour:** `deriveClaimDraft` **refuses** — returns
`{ billable: false, reason: "LTC_SECONDARY_NON_EMERGENCY" }`. This is the conservative choice: it
cannot emit an improper fee. It may, however, be wrong in the other direction (failing to file a
required $0 claim).

**What would change if the answer is "file a $0 claim":** the branch returns a billable draft with
`feeCents: 0` (same shape as the LTC-primary path), instead of refusing.

**Do not resolve this by reasoning about it.** Ask the help desk.

---

## 2. Tick-bite post-exposure prophylaxis timing threshold

**Status:** open · **Who answers:** pilot pharmacist, against OCP's Lyme PEP algorithm
**Code:** `src/config/triage.ts` → `RED_FLAGS.tick_bite`

The **72-hour** figure in the tick-bite red flags is a **guess**, flagged in-file. It is
time-critical and being wrong is unsafe. It must be replaced with the threshold from OCP's actual
assessment/prescribing algorithm before go-live. Not ours to change — clinical content is the
lead's.

---

## 3. Red-flag and triage content generally

**Status:** open · **Who answers:** pilot pharmacist
**Code:** `src/config/triage.ts`

Every triage question and red flag is drafted from general clinical knowledge, **not** OCP's
algorithms. The whole file is marked `PHARMACIST REVIEW REQUIRED`. It produces a *self-reported
presenting complaint*, never a diagnosis — the pharmacist still verifies the self-diagnosis, which
is what the Notice actually requires.
