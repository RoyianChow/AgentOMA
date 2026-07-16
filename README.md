# AgentOMA

A web platform for Ontario pharmacies to run publicly-funded **minor ailment** assessments —
the program where a pharmacist can assess and prescribe for ~23 common conditions and bill the
Ministry of Health.

Two sides, deliberately separated:

- **Patient intake** (`/assessment`) — a kiosk screen. A guided, **zero-PHI** triage that narrows
  symptoms to one funded ailment (or routes safely to 911 / a doctor), ending in a 6-character
  handoff code.
- **Pharmacist portal** (`/pharmacist/*`) — the pharmacist enters that code, reads the triage
  trail, adds identity from the physical health card, and records a compliant assessment.

> **This repo bills a public health system and handles PHI under PHIPA.** Mistakes here are not
> bugs — they are improper claims and privacy violations. Never derive a PIN, fee, or claim
> maximum from memory.

## Start here

| Doc | What's in it |
|---|---|
| **[`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md)** | Architecture, routes, data model, both user flows, and what's done vs. not. **Read this to orient — don't crawl the codebase.** |
| **[`docs/COMPLIANCE.md`](docs/COMPLIANCE.md)** | Every implemented rule mapped to its section of the EO Notice. |
| **[`AGENTS.md`](AGENTS.md)** | The canonical rules for AI agents (and a fast briefing for humans). |
| `docs/regulatory/*.pdf` | The binding source of truth. If it and any file disagree, the PDF wins. |

## Running it

Needs Node 22 and a Supabase Postgres instance. On Windows, PowerShell must allow scripts
(`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`) or `npm` will fail.

```bash
cp .env.example .env.local   # fill in DATABASE_URL / DIRECT_URL
npm install
npm run db:migrate           # schema + triggers
npm run db:seed              # reference data (idempotent)
npm run dev                  # http://localhost:3000
```

`npm run test` runs the money-rule tests. Schema changes go **`db:generate` → review the SQL →
`db:migrate`**; `db:push` is banned (it drops columns on a PHI database).
