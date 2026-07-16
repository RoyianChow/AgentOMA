# AGENTS.md — the one canonical agent doc for this repo

> **This repo bills Ontario's public health system and handles PHI under PHIPA.**
> Mistakes here are not bugs. They are improper claims and privacy violations.

- **NEVER derive a PIN, fee, claim maximum, or intervention code from memory.** They come only
  from `src/config/ailment-reference.ts` and the seeded reference tables. Not there? Stop and ask.
- **NEVER touch without the lead's explicit sign-off — say so and stop:** red-flag content in
  `src/config/triage.ts` · the reference PIN data · `src/lib/db/migrations/` · `deriveClaimDraft`
  (claim derivation) · the audit log.
- **Invariants that must survive every change:**
  1. A red-flag exit writes **ZERO** claim rows.
  2. The patient intake collects **ZERO** PHI.
  3. The 365-day count is **advisory** — never a promise of payment.

---

## Orient from the docs, not by crawling the repo

Reading these costs a fraction of what exploring the codebase costs. Do that first.

| Read | For | When |
|---|---|---|
| `docs/PROJECT_OVERVIEW.md` | Architecture, routes, data model, what's done vs. not | **Always, to orient.** Read this *instead of* crawling. Do not `cat` the codebase to figure out what this is — the overview exists so you don't have to. |
| `docs/COMPLIANCE.md` | Which rule maps to which EO Notice section | Touching billing, claims, retention, or audit |
| `docs/regulatory/*.pdf` | The binding source of truth | Only when a compliance question is actually in play. It's long — don't read it to "get context." |

If the PDF and any file disagree, **the PDF wins** — and say so rather than silently picking one.

---

## Environment & commands

**Windows.** PowerShell must be on `RemoteSigned` or npm fails. If `npm` errors with
*"running scripts is disabled on this system"*, **do not work around it** (don't shell out to
cmd, don't call node directly to dodge it). Tell the user to run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**npm only** — not pnpm, not yarn.

| Script | Use |
|---|---|
| `npm run dev` / `npm run build` | Next dev server / production build |
| `npm run test` | Vitest (the money-rule tests) |
| `npm run lint` | ESLint |
| `npm run db:generate` → `npm run db:migrate` | The **only** sanctioned schema change path |
| `npm run db:push` | 🚫 **BANNED.** It drops columns on a database holding PHI. Never run it, never suggest it. |

**Stack:** Supabase Postgres (`ca-central-1`, for PHIPA residency) · Drizzle ORM · Next.js 16.

**Next.js 16 is not the Next.js in your training data.** APIs, conventions, and file layout
differ. Notably: middleware is **`proxy.ts`**, not `middleware.ts`. Check
`node_modules/next/dist/docs/` before writing framework code, and heed deprecation notices.

---

## Definition of done — every PR

- `tsc --noEmit` clean.
- `npm run test` green. Money-rule tests **must exercise real Postgres, not mocks** —
  a mocked money rule proves nothing.
- Lint clean.
- **No new `process.env` outside `src/env.ts`.** Env is typed and validated there.
- **No PHI in client components or logs.** Not in props, not in `console.log`, not in an
  error message.

---

## Maintenance rule

**`AGENTS.md` is the only agent doc with content.** `CLAUDE.md`, `GEMINI.md`,
`.cursor/rules/oma.mdc`, and `.github/copilot-instructions.md` are thin pointers to this file —
they must never contain a copy of these rules. (Codex reads `AGENTS.md` natively and needs no
pointer file.)

Duplicated agent docs drift, and drift here is dangerous: a stale copy still describing a
long-dead column or config would walk an agent straight back into a billing bug we already
killed.

**If an invariant changes, change it here, in the same PR. The pointer files never change.**
