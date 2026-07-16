# Pointer — the rules live in AGENTS.md

**Read `AGENTS.md` before doing anything.** It is the single source of truth for this repo's
invariants. This file is a pointer and deliberately contains no rules of its own.

⚠️ This repo bills Ontario's public health system and handles PHI under PHIPA. **Never derive a
PIN, fee, claim maximum, or intervention code from memory** — they come only from
`src/config/ailment-reference.ts` and the seeded reference tables. Red-flag content, PIN data,
migrations, claim derivation, and the audit log are off-limits without the lead's sign-off.
