# AgentOMA

AgentOMA is a Next.js platform for Ontario pharmacies to conduct publicly funded minor-ailment assessments. It deliberately separates a zero-PHI patient kiosk from an authenticated pharmacist portal that handles clinical and billing records.

> This is an authenticated pilot build, not a production-ready clinical service. Pharmacist review and several compliance workflow gates remain open. Start with the status documents below.

## Documentation

| Document | Purpose |
|---|---|
| [`docs/README.md`](docs/README.md) | Documentation index and reading order |
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | Current architecture, routes, data, and security model |
| [`docs/COMPLETED_WORK.md`](docs/COMPLETED_WORK.md) | What has been implemented and verified |
| [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md) | Prioritized work remaining before a pilot or go-live |
| [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) | Implementation status mapped to the EO Notice |
| [`docs/OPEN_QUESTIONS.md`](docs/OPEN_QUESTIONS.md) | Regulatory and clinical decisions awaiting human review |
| [`docs/SELF_CHECK.md`](docs/SELF_CHECK.md) | Public `/check` boundaries, implementation map, and production gate |
| [`AGENTS.md`](AGENTS.md) | Canonical safety and engineering instructions for AI agents |

The binding regulatory source is the Ministry of Health notice in `docs/regulatory/`. Never derive billing values from this README or from memory.

## Local development

Requirements: Node 22, npm, Docker Desktop for database-backed tests, and a Canadian-region Supabase Postgres project for development/deployment.

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`db:seed` writes reference data only. Local demo fixtures are intentionally
separate under `npm run db:seed:demo` and must never be run against production.

On Windows, if PowerShell blocks `npm.ps1`, run this once and reopen the terminal:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Quality gates:

```powershell
npm exec -- tsc --noEmit
npm run test
npm run lint
```

Database changes use `npm run db:generate`, SQL review, then `npm run db:migrate`. `db:push` is banned because it bypasses the reviewed migration chain and can destructively alter a PHI database.
