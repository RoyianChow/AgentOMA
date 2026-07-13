"use client";

import { useState, useEffect, useMemo } from "react";
import { getAllAssessments } from "../actions";
import Link from "next/link";

interface AuditRecord {
  id: string;
  patientName: string;
  dob: string;
  healthNumber: string;
  ailmentGroupCode: string;
  outcome: string;
  serviceDate: string;
  createdAt: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  rx_issued: "#10b981",
  no_rx_referral: "#ef4444",
  no_rx_otc_or_nonpharm: "#f59e0b",
};

const OUTCOME_LABELS: Record<string, string> = {
  rx_issued: "Rx Issued",
  no_rx_referral: "Referred",
  no_rx_otc_or_nonpharm: "No Rx (OTC)",
};

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterAilment, setFilterAilment] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Load all records (including ARCHIVED) from Supabase
  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const data = await getAllAssessments();
        setRecords(data);
      } catch (err) {
        console.error("Failed to load audit records:", err);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, []);

  // Unique ailment names for filter dropdown
  const ailmentOptions = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.ailmentGroupCode))).filter(Boolean);
    return names.sort();
  }, [records]);

  // Filtered + searched records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const name = r.patientName || "";
      const card = r.healthNumber || "";
      const matchSearch =
        !searchQuery ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.includes(searchQuery);
      const matchStatus = filterStatus === "ALL" || r.outcome === filterStatus;
      const matchAilment =
        filterAilment === "ALL" ||
        r.ailmentGroupCode === filterAilment;
      const dateObj = new Date(r.createdAt);
      const matchFrom = !dateFrom || dateObj >= new Date(dateFrom);
      const matchTo = !dateTo || dateObj <= new Date(dateTo + "T23:59:59");
      return matchSearch && matchStatus && matchAilment && matchFrom && matchTo;
    });
  }, [records, searchQuery, filterStatus, filterAilment, dateFrom, dateTo]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-CA", {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const exportCSV = () => {
    const headers = [
      "Patient Name", "Date of Birth", "Health Card", "Ailment",
      "Outcome", "Service Date", "Created At",
    ];
    const rows = filtered.map((r) => {
      const name = r.patientName || "";
      const dob = r.dob || "";
      const card = r.healthNumber || "";
      return [
        name, dob, card,
        r.ailmentGroupCode || "",
        OUTCOME_LABELS[r.outcome] || r.outcome,
        r.serviceDate || "",
        r.createdAt || "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentoma-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(99, 102, 241);
    doc.text("AgentOMA — Ministry Audit Report", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-CA")}   |   Records: ${filtered.length}   |   10-Year Retention Required`,
      14,
      23
    );

    // Table
    const tableRows = filtered.map((r) => {
      const name = r.patientName || "";
      const dob = r.dob || "";
      const card = r.healthNumber || "";
      return [
        name, dob, card,
        r.ailmentGroupCode || "",
        OUTCOME_LABELS[r.outcome] || r.outcome,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-CA") : "",
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [["Patient", "DOB", "Health Card", "Ailment", "Outcome", "Date"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 24 },
        2: { cellWidth: 28 },
        3: { cellWidth: 48 },
        4: { cellWidth: 24 },
        5: { cellWidth: 18 },
        6: { cellWidth: 28 },
      },
    });

    // Footer on every page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}  |  CONFIDENTIAL — Ontario Minor Ailments Programme — 10-Year Retention Required`,
        14,
        doc.internal.pageSize.getHeight() - 6
      );
    }

    doc.save(`agentoma-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

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
              <strong>{records.length} total</strong> — 10-year retention required by OCP.
            </p>
          </div>
        </div>
        <div className="audit-export-group">
          <button className="audit-export-btn audit-export-csv" onClick={exportCSV}>
            ⬇ Export CSV
          </button>
          <button className="audit-export-btn audit-export-pdf" onClick={exportPDF}>
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* ── Retention Banner ─────────────────────────────────────────────── */}
      <div className="audit-retention-banner">
        <span className="audit-retention-icon">⚠️</span>
        Records must be retained for a minimum of <strong>10 years</strong> per Ontario College of
        Pharmacists guidelines. Do not delete records — use the{" "}
        <em>ARCHIVED</em> status to remove items from the live queue.
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="audit-filters">
        <input
          className="audit-search"
          type="search"
          placeholder="Search by patient name or health card…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
        />
        <select
          className="audit-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">All Outcomes</option>
          <option value="rx_issued">Rx Issued</option>
          <option value="no_rx_referral">No Rx - Referral</option>
          <option value="no_rx_otc_or_nonpharm">No Rx - OTC</option>
        </select>
        <select
          className="audit-select"
          value={filterAilment}
          onChange={(e) => { setFilterAilment(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">All Ailments</option>
          {ailmentOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="audit-date-range">
          <label className="audit-date-label">From</label>
          <input type="date" className="audit-date-input" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
          <label className="audit-date-label">To</label>
          <input type="date" className="audit-date-input" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
        </div>
        <span className="audit-result-count">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="audit-table-wrapper">
        {loading ? (
          <div className="audit-loading">
            <div className="audit-spinner" />
            <span>Loading records…</span>
          </div>
        ) : filtered.length === 0 ? (
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
              {paginated.map((r) => {
                const name = r.patientName || "—";
                const dob = r.dob || "—";
                const card = r.healthNumber || "—";
                return (
                  <tr key={r.id} className="audit-row">
                    <td className="audit-td-name">{name}</td>
                    <td>{dob}</td>
                    <td className="audit-td-mono">{card}</td>
                    <td>{r.ailmentGroupCode || "—"}</td>
                    <td>
                      <span
                        className="audit-status-badge"
                        style={{ background: `${OUTCOME_COLORS[r.outcome] || "#6b7280"}22`, color: OUTCOME_COLORS[r.outcome] || "#6b7280" }}
                      >
                        {OUTCOME_LABELS[r.outcome] || r.outcome}
                      </span>
                    </td>
                    <td>{r.serviceDate}</td>
                    <td className="audit-td-date">{formatDate(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {!loading && totalPages > 1 && (
        <div className="audit-pagination">
          <button
            className="audit-page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="audit-page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`audit-page-btn ${currentPage === p ? "active" : ""}`}
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </button>
              )
            )}
          <button
            className="audit-page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
