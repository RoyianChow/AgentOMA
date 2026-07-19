import Link from "next/link";

import { requirePortalPage } from "@/lib/auth-guard";
import {
  AUDIT_PAGE_SIZE,
  OUTCOME_LABELS,
  listAuditAilments,
  queryAuditPage,
  type AuditFilters,
} from "./query";

export const dynamic = "force-dynamic";

/**
 * Ministry audit log — fully SERVER-rendered. No client component ever holds
 * patient identity: filtering is a plain GET form, pagination and exports are
 * links, and the table is rendered here on the server. The CSV/PDF exports are
 * generated server-side by ./export/route.ts.
 */

const OUTCOME_COLORS: Record<string, string> = {
  rx_issued: "#10b981",
  no_rx_referral: "#ef4444",
  no_rx_otc_or_nonpharm: "#f59e0b",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function queryString(filters: AuditFilters, extra: Record<string, string | number> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, ...extra })) {
    if (v !== undefined && v !== "" && v !== "ALL") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    outcome?: string;
    ailment?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  // UX redirect; the queries below take this verified actor for tenancy.
  const actor = await requirePortalPage();

  const sp = await searchParams;
  const filters: AuditFilters = {
    q: sp.q,
    outcome: sp.outcome,
    ailment: sp.ailment,
    from: sp.from,
    to: sp.to,
  };
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ rows, total }, ailmentOptions] = await Promise.all([
    queryAuditPage(actor, filters, page),
    listAuditAilments(actor),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="audit-page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="audit-header">
        <div className="audit-header-left">
          <Link href="/pharmacist" className="audit-back-btn">← Dashboard</Link>
          <div>
            <h1 className="audit-title">Ministry Audit Log</h1>
            <p className="audit-subtitle">
              Complete historical record of all assessments.{" "}
              <strong>{total} matching</strong> — 10-year retention required by OCP.
            </p>
          </div>
        </div>
        <div className="audit-export-group">
          {/* Server-generated downloads carrying the current filters. */}
          <a
            className="audit-export-btn audit-export-csv"
            href={`/pharmacist/audit/export${queryString(filters, { format: "csv" })}`}
          >
            ⬇ Export CSV
          </a>
          <a
            className="audit-export-btn audit-export-pdf"
            href={`/pharmacist/audit/export${queryString(filters, { format: "pdf" })}`}
          >
            📄 Export PDF
          </a>
        </div>
      </div>

      {/* ── Retention Banner ─────────────────────────────────────────────── */}
      <div className="audit-retention-banner">
        <span className="audit-retention-icon">⚠️</span>
        Records are retained for a minimum of <strong>10 years</strong> (or 10 years
        after the patient turns 18, whichever is longer). Nothing here can be
        deleted — the audit trail is append-only at the database level.
      </div>

      {/* ── Filters (plain GET form — no client JS touches these values) ── */}
      <form method="get" className="audit-filters">
        <input
          className="audit-search"
          type="search"
          name="q"
          placeholder="Search by patient name or health card…"
          defaultValue={filters.q ?? ""}
        />
        <select className="audit-select" name="outcome" defaultValue={filters.outcome ?? "ALL"}>
          <option value="ALL">All Outcomes</option>
          <option value="rx_issued">Rx Issued</option>
          <option value="no_rx_referral">No Rx - Referral</option>
          <option value="no_rx_otc_or_nonpharm">No Rx - OTC</option>
        </select>
        <select className="audit-select" name="ailment" defaultValue={filters.ailment ?? "ALL"}>
          <option value="ALL">All Ailments</option>
          {ailmentOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="audit-date-range">
          <label className="audit-date-label">From</label>
          <input type="date" className="audit-date-input" name="from" defaultValue={filters.from ?? ""} />
          <label className="audit-date-label">To</label>
          <input type="date" className="audit-date-input" name="to" defaultValue={filters.to ?? ""} />
        </div>
        <button type="submit" className="audit-page-btn">Apply</button>
        <span className="audit-result-count">
          {total} record{total !== 1 ? "s" : ""} found
        </span>
      </form>

      {/* ── Table (server-rendered) ─────────────────────────────────────── */}
      <div className="audit-table-wrapper">
        {rows.length === 0 ? (
          <div className="audit-empty">
            <span className="audit-empty-icon">🗂️</span>
            <p>No records match your filters.</p>
          </div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>DOB</th>
                <th>Health Card</th>
                <th>Ailment</th>
                <th>Outcome</th>
                <th>Service Date</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="audit-row">
                  <td className="audit-td-name">{r.patientName || "—"}</td>
                  <td>{r.dob || "—"}</td>
                  <td className="audit-td-mono">{r.healthNumber || "—"}</td>
                  <td>{r.ailmentGroupCode || "—"}</td>
                  <td>
                    <span
                      className="audit-status-badge"
                      style={{
                        background: `${OUTCOME_COLORS[r.outcome] || "#6b7280"}22`,
                        color: OUTCOME_COLORS[r.outcome] || "#6b7280",
                      }}
                    >
                      {OUTCOME_LABELS[r.outcome] || r.outcome}
                    </span>
                  </td>
                  <td>{r.serviceDate}</td>
                  <td className="audit-td-date">{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination (links, filters preserved) ───────────────────────── */}
      {totalPages > 1 && (
        <div className="audit-pagination">
          <Link
            className={`audit-page-btn ${page === 1 ? "disabled" : ""}`}
            aria-disabled={page === 1}
            href={`/pharmacist/audit${queryString(filters, { page: Math.max(1, page - 1) })}`}
          >
            ← Prev
          </Link>
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="audit-page-ellipsis">…</span>
            ) : (
              <Link
                key={p}
                className={`audit-page-btn ${page === p ? "active" : ""}`}
                href={`/pharmacist/audit${queryString(filters, { page: p })}`}
              >
                {p}
              </Link>
            )
          )}
          <Link
            className={`audit-page-btn ${page === totalPages ? "disabled" : ""}`}
            aria-disabled={page === totalPages}
            href={`/pharmacist/audit${queryString(filters, { page: Math.min(totalPages, page + 1) })}`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
