# Worklog — Audit Clickable Rows (Task 4)

**Branch:** `claude/audit-clickable-task-4-r7r7e5`
**Commit:** `2a58d46` — *feat(audit): clickable rows -> server-rendered record dialog + per-record PDF*
**Date:** 2026-07-20

## Goal

Make the audit log actionable: click a row to pull up a completed assessment,
read the generated PIN for Kroll entry, and print a per-record PDF — without
ever leaking PHI to the client.

## What I built

| File | Change |
|---|---|
| `audit/page.tsx`, `query.ts` | Rows became whole-row stretched `Link`s; query extended to fetch a single record scoped to the actor's pharmacy |
| `audit/@modal/(.)[id]/page.tsx` | Intercepting route — soft nav overlays the table with a modal |
| `audit/[id]/page.tsx` | Full page for a direct visit / refresh / deep-link / print |
| `audit/@modal/default.tsx`, `layout.tsx` | Parallel-route wiring for the `@modal` slot |
| `RecordDetail.tsx` | **Server** component rendering the record content |
| `RecordModal.tsx` | **Client** overlay shell — receives only `children`, never record data |
| `audit/[id]/pdf/route.ts` | Server-side PDF (jspdf), returned as a file |
| `record.module.css` | Dialog + record styling |

## The PHI constraint (the part most likely to be wrong)

- **Rows are server-rendered Links** — no client JS, so the table's PHI stays
  in server HTML.
- **The dialog uses a Next.js intercepting route** (`@modal/(.)[id]`). Soft nav
  from a row = modal overlay; a direct visit to `/pharmacist/audit/[id]` renders
  the full page.
- **Record content is a server component (`RecordDetail`)** passed as `children`
  into the client shell (`RecordModal`). The shell never receives the record
  data, so patient identity never becomes a client prop. Verified live:
  localStorage empty, no PHI in any browser storage.
- **PDF is generated server-side** and returned as a file — the browser never
  builds it from PHI in JS.

## Correctness & billing

- **PIN read from the persisted `claim_draft`** — never derived or hardcoded.
  Shown prominently alongside fee / modality / outcome. Clean "no claim, no PIN"
  branch for non-billable records.
- **Every route re-verifies the session server-side** (`requirePortalPage` /
  `requirePortalUser`) and scopes the query to the actor's pharmacy — another
  store's id 404s. PDF route: 401 unauthenticated, 404 not-found.
- **`audit.record_exported` event** written on every PDF pull (who exported
  which record).

## Adversarial review + a11y fixes

Ran a 7-agent adversarial review (PHI-leak, authz-scoping, correctness) — all
clean. Fixed the 3 confirmed accessibility findings:

1. **Full WAI-ARIA modal focus management** in `RecordModal` — focus moves to
   the panel on open, Tab is trapped, focus restored to the trigger on close.
   Verified live (focus-in → Tab-wrap → Escape → focus-restored-to-row).
2. **Accessible dialog name** via `aria-labelledby` → the server-rendered
   patient heading.
3. **Mono fields** (health card, PIN, prescriber id) made one-click-selectable,
   mitigating the whole-row link blocking table text-selection (copy-out also
   served by the detail view + CSV/PDF export — an intentional tradeoff to keep
   whole-row-click).

## Definition of done

`tsc` clean · lint clean on touched files (3/0 overall, pre-existing and
outside these files) · 78/78 tests green · no PIN literal in audit code · no PHI
in client props or browser storage · verified end-to-end in the browser.
