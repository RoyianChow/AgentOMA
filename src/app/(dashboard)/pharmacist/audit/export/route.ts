import { NextResponse, type NextRequest } from "next/server";

import { requirePortalUser, AuthorizationError } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import {
  OUTCOME_LABELS,
  queryAuditRecordsForExport,
  type AuditFilters,
  type AuditRecord,
} from "../query";

/**
 * Server-side audit exports (CSV / PDF). Patient identity never crosses into
 * browser JavaScript — the browser receives a finished file download.
 *
 * AUTHORIZATION happens HERE, in the handler (proxy.ts is a UX gate only):
 * requirePortalUser re-verifies session + TOTP + pharmacy, and the query is
 * scoped to that verified actor's pharmacy.
 */

function csvOf(rows: AuditRecord[]): string {
  const headers = [
    "Patient Name", "Date of Birth", "Health Card", "Ailment",
    "Outcome", "Service Date", "Created At",
  ];
  const lines = rows.map((r) =>
    [
      r.patientName,
      r.dob,
      r.healthNumber,
      r.ailmentGroupCode,
      OUTCOME_LABELS[r.outcome] || r.outcome,
      r.serviceDate,
      r.createdAt,
    ]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

async function pdfOf(rows: AuditRecord[]): Promise<ArrayBuffer> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(99, 102, 241);
  doc.text("AgentOMA — Ministry Audit Report", 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-CA")}   |   Records: ${rows.length}   |   10-Year Retention Required`,
    14,
    23
  );

  autoTable(doc, {
    startY: 28,
    head: [["Patient", "DOB", "Health Card", "Ailment", "Outcome", "Date"]],
    body: rows.map((r) => [
      r.patientName,
      r.dob,
      r.healthNumber,
      r.ailmentGroupCode,
      OUTCOME_LABELS[r.outcome] || r.outcome,
      new Date(r.createdAt).toLocaleDateString("en-CA"),
    ]),
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
    },
  });

  // getNumberOfPages() is the typed public API — no `as any` needed.
  const pageCount = doc.getNumberOfPages();
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

  return doc.output("arraybuffer");
}

export async function GET(request: NextRequest) {
  let actor;
  try {
    actor = await requirePortalUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const sp = request.nextUrl.searchParams;
  const format = sp.get("format") === "pdf" ? "pdf" : "csv";
  const filters: AuditFilters = {
    q: sp.get("q") ?? undefined,
    outcome: sp.get("outcome") ?? undefined,
    ailment: sp.get("ailment") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };

  const rows = await queryAuditRecordsForExport(actor, filters);
  const stamp = new Date().toISOString().slice(0, 10);

  // Access log for the export itself — WHO pulled PHI out, when, how much.
  // Best-effort, and the metadata holds no PHI (note: not the search text).
  try {
    await writeAudit({
      pharmacyId: actor.pharmacyId,
      actorUserId: actor.userId,
      action: "audit.exported",
      entityType: "audit_export",
      metadata: {
        format,
        rowCount: rows.length,
        filtered:
          Boolean(filters.q?.trim()) ||
          Boolean(filters.outcome && filters.outcome !== "ALL") ||
          Boolean(filters.ailment && filters.ailment !== "ALL") ||
          Boolean(filters.from) ||
          Boolean(filters.to),
      },
    });
  } catch (auditErr) {
    console.error("AUDIT WRITE FAILED for audit.exported", auditErr);
  }

  if (format === "pdf") {
    return new NextResponse(await pdfOf(rows), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="agentoma-audit-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse(csvOf(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agentoma-audit-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
