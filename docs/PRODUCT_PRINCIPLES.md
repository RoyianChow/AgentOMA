# Product principles — what AgentOMA is underneath the code

> [`AGENTS.md`](../AGENTS.md) tells you the rules. [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) tells you the shape.
> This file tells you the **character** — the beliefs the code is an argument for,
> and why it refuses the shortcuts a normal app would take.
>
> If you only read one thing before touching billing or PHI, read this, then the
> installed `ontario-minor-ailments` skill when it is available.

---

## The stakes are a person, not a request

Most of this platform is one of two people, mid-moment:

- A patient on their own phone in a pharmacy aisle — maybe unwell, maybe holding
  a sick child, maybe just scared — trying to figure out if what's wrong with
  them is something the pharmacist can treat today.
- A pharmacist at the counter with a line behind them, who is personally
  accountable to the Ontario College of Pharmacists for every claim that carries
  their registration number.

Behind both stands the **Ministry of Health**, who can claw back every improper
payment on a post-payment review, and **PHIPA**, under which a leaked health
number is not a bug ticket — it is a privacy violation with a name attached.

So the first belief is simple: **a mistake here is never "just a bug."** It is an
improper claim, or a privacy breach, or a patient sent home who should have been
sent to a doctor. We write like that is true, because it is.

---

## The three invariants that never bend

Everything else is negotiable. These are not.

1. **A red-flag exit writes ZERO claim rows.**
   When triage hits a red flag, the patient is referred and *nothing billable is
   created* — not a draft, not a pending row, nothing. The completed-then-referred
   case (billable) and the red-flag exit (not) look almost identical and are the
   single most likely source of an improper claim, so we keep them structurally
   and visually apart, and `deriveClaimDraft` refuses `RED_FLAG_EXIT` as a
   backstop even if something upstream slips.

2. **The patient intake collects ZERO PHI.**
   The phone in the aisle never holds a name, a date of birth, or a health card
   number. Identity is keyed by the pharmacist, from the *physical card*, at an
   authenticated desk — because the card is the authoritative source and a
   patient thumb-typing on a phone is a worse one, and because the cheapest
   possible answer to "is there PHI on this device?" is *no*.

3. **The 365-day count is advisory — never a promise of payment.**
   We cannot see claims made at other pharmacies. HNS adjudicates on submission
   and can still reject. So the UI says "likely eligible" or "at or near maximum
   — verify in the clinical viewer." It never says "eligible: yes." It never
   implies a claim *will* be paid. Honesty about what we can't see is a feature.

Break one of these and you haven't shipped a regression — you've broken the
promise the whole thing is built on.

---

## How we build

### We refuse; we never default.

The most dangerous line of code in a billing system is the fallback. The old
prototype's PIN lookup silently fell back to Rhinitis for eighteen ailments — so
eighteen conditions would have billed under the wrong code and nobody would have
seen it until the Ministry did. `deriveClaimDraft` is pure and it **refuses**: an
unknown lookup returns `UNKNOWN_PIN_LOOKUP`, not a guess. There is a unit test
whose only job is to be that old bug's tombstone. When we don't know, we stop and
say so — in code and to the user. A wrong claim is worse than no claim.

### We enforce at the database, not by convention.

"We don't update the audit log" is not immutability — it's a promise, and
promises drift. So the audit log is append-only as a *property*: a trigger raises
on any UPDATE/DELETE, the privilege is REVOKE'd, and the app runs as a non-owner
role so the REVOKE actually bites. The one-claim-per-day rule is a UNIQUE index.
The insect⊕tick mutex is a trigger holding a per-patient advisory lock, because
the app-level check couldn't close the race. The retention clock is recomputed by
a trigger on every write. If a rule matters, it lives where it cannot be bypassed
— in the schema, not in a code path someone can forget to call.

### We prove; we don't assert.

The reference table — every PIN, every fee, every claim maximum — was
adversarially verified: three independent passes re-extracted the source PDF and
diffed the results, which is how we learned the old prototype had **thirteen
wrong claim maximums and PINs that don't exist**. The money rules are tested
against **real Postgres**, never mocks, because a mocked money rule proves
nothing — it only proves the mock. The test database is rebuilt from migration
zero on every run, which makes the migration chain prove its own sufficiency.

### We never derive a number from memory.

Not a PIN, not a fee, not a claim maximum, not an intervention code. They come
from the seeded reference tables and nowhere else. If a value looks wrong, it is
probably right and your memory is wrong — Acne's No-Rx in-person PIN really is
`9858250`, and "correcting" it to the number you'd expect would be the bug. When
a value genuinely isn't there, the rule is: **stop and ask.** Never fill the gap
with a plausible guess.

### We hold the line on clinical content.

Every triage question and red flag is marked `PHARMACIST REVIEW REQUIRED` until a
pharmacist signs off. The tick-bite 72-hour threshold is explicitly labelled a
*guess* and must be replaced with OCP's Lyme PEP algorithm before go-live — and
until then, nobody "improves" it by reasoning, because reasoning about a
time-critical clinical threshold is exactly the mistake. Clinical truth comes
from a clinician, not from an agent's confidence.

---

## What we refuse to do

- **We don't reintroduce Firebase** — not even Firestore for "non-PHI" state. It
  was removed entirely and deliberately.
- **We don't run `db:push`.** It drops columns on a database holding PHI and
  bypasses migration tracking. It is how this repo drifted once already. The only
  path is `db:generate` → review the SQL → `db:migrate`.
- **We don't put a real `process.env` outside `src/env.ts`.** Env is typed and
  validated in one place, and the build fails fast when it's wrong.
- **We don't ship PHI to a client component or a log.** Not in props, not in a
  `console.log`, not in an error string. The audit page renders server-side and
  hands the browser a finished file, never the records.
- **We don't guess at the parked questions.** The LTC secondary/non-emergency
  branch is unresolved pending the ODB Help Desk; we refuse conservatively rather
  than reason our way into a payment rule. See `OPEN_QUESTIONS.md`.

---

## The scars we remember

A codebase's character is mostly its healed wounds:

- **The drift.** The database was once built with `db:push` while migration
  tracking recorded almost nothing. `migrate` then failed because it tried to
  recreate tables that already existed. Baselining fixed it. `db:push` is now
  banned by name — that scar is why.
- **The thirteen wrong maximums.** They shipped in a prototype and were caught
  only by adversarial re-extraction. That near-miss is why reference data has one
  verified source and why nobody transcribes a billing number from memory.
- **The silent Rhinitis fallback.** Eighteen ailments, one default, zero
  warnings. That's why `deriveClaimDraft` refuses instead of defaulting, and why
  the tombstone test exists.
- **The Prisma paste.** A request came in as a Prisma template and was reconciled
  back to Drizzle rather than quietly adopted. The stack is a decision, not a
  default.

We keep these in the docs on purpose. A stale copy of a rule that still describes
a long-dead column is dangerous — it can walk a future agent straight back into a
billing bug we already killed. So there is **one** canonical agent doc
(`AGENTS.md`); the rest are thin pointers; and when an invariant changes, it
changes there, in the same PR.

---

## The voice

When the system speaks to a patient or a pharmacist, it tells the truth,
including the uncomfortable parts:

- It says "this is not a diagnosis — the pharmacist will confirm," because the
  triage narrows, it doesn't decide.
- It says "likely eligible," never "eligible: yes."
- On a failed hand-off it says *the intake did not reach the pharmacy* and to
  show the pharmacist directly — it never renders a blank code as if it worked.
- It treats the audit trail as the pharmacy's defence in a Ministry review, not
  as plumbing.

Quiet, exact, and unwilling to imply more certainty than it has. That's the
voice. That's the soul.

---

*If you're an agent picking this up cold: orient from the docs, respect the three
invariants, refuse before you default, and when a number isn't in the reference
tables — stop and ask. The rest you can learn from the code.*
