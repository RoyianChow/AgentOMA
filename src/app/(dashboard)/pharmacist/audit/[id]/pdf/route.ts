import { NextResponse, type NextRequest } from "next/server";

import { requirePortalUser, AuthorizationError } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import {
  MODALITY_LABELS,
  OUTCOME_LABELS,
  queryAuditRecordById,
  type AuditRecordDetail,
} from "../../query";
import {
  NO_RX_RATIONALE_LABELS,
  PCP_NOTIFICATION_METHOD_LABELS,
  SYMPTOM_COURSE_LABELS,
  type NoRxRationaleCode,
  type PcpNotificationMethod,
  type SymptomCourse,
} from "@/lib/clinical-record-types";

/**
 * Server-side single-record PDF (assessment + patient + claim draft). Patient
 * identity never crosses into browser JavaScript — the browser receives a
 * finished file. AUTHORIZATION runs here in the handler (proxy.ts is UX only):
 * requirePortalUser re-verifies session + TOTP + pharmacy, and the query is
 * scoped to that actor's pharmacy. The PIN is read from the persisted claim
 * draft — never derived here.
 */

async function pdfOf(rec: AuditRecordDetail): Promise<ArrayBuffer> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const left = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(13, 148, 136);
  doc.text("AgentOMA — Assessment Record", left, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Generated ${new Date().toLocaleString("en-CA")}  ·  CONFIDENTIAL — 10-year retention`,
    left,
    24
  );

  // PIN band — the number that goes into Kroll, made prominent.
  let y = 32;
  if (rec.claim) {
    doc.setFillColor(204, 251, 241);
    doc.rect(left, y, 182, 16, "F");
    doc.setTextColor(15, 118, 110);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PIN — ENTER IN KROLL", left + 3, y + 6);
    doc.setFontSize(20);
    doc.text(rec.claim.pinCode, left + 3, y + 13.5);
    doc.setFontSize(11);
    doc.text(`$${(rec.claim.feeCents / 100).toFixed(2)}`, 192, y + 10, { align: "right" });
    y += 22;
  } else {
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("No claim drafted (not billable) — no PIN to submit.", left, y + 4);
    y += 12;
  }

  const table = (title: string, rows: [string, string][]) => {
    autoTable(doc, {
      startY: y,
      head: [[title, ""]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: 127 } },
      margin: { left },
    });
    const withFinalY = doc as unknown as { lastAutoTable?: { finalY?: number } };
    y = (withFinalY.lastAutoTable?.finalY ?? y) + 6;
  };

  table("Patient (from health card)", [
    ["Name", rec.patient.name],
    ["Health card number", rec.patient.healthNumber],
    ["Date of birth", rec.patient.dob],
    ["Gender", rec.patient.gender],
  ]);

  table("Assessment", [
    ["Ailment group", rec.ailmentGroupCode],
    ["Modality", MODALITY_LABELS[rec.modality] ?? rec.modality],
    ["Outcome", OUTCOME_LABELS[rec.outcome] ?? rec.outcome],
    ["Service date", rec.serviceDate],
    ["Recorded", new Date(rec.createdAt).toLocaleString("en-CA")],
    ...(rec.virtualLocation ? ([["Pharmacist location", rec.virtualLocation]] as [string, string][]) : []),
  ]);

  if (rec.clinical) {
    table("Informed consent", [
      ["Method", rec.clinical.consentMethod],
      ["Given by", rec.clinical.consentGivenBy.replaceAll("_", " ")],
      ["Obtained at", new Date(rec.clinical.consentObtainedAt).toLocaleString("en-CA")],
      ...(rec.clinical.sdmName
        ? ([
            ["Substitute decision-maker", rec.clinical.sdmName],
            ["SDM relationship", rec.clinical.sdmRelationship ?? "—"],
          ] as [string, string][])
        : []),
    ]);

    table("Presenting complaint", [
      ["Primary concern", rec.clinical.presentingComplaint],
      ["Onset", rec.clinical.symptomOnset],
      ["Duration", rec.clinical.symptomDuration],
      [
        "Course",
        SYMPTOM_COURSE_LABELS[rec.clinical.symptomCourse as SymptomCourse] ??
          rec.clinical.symptomCourse,
      ],
      ["Associated symptoms", rec.clinical.associatedSymptoms],
      ["Aggravating factors", rec.clinical.aggravatingFactors],
      ["Relieving factors", rec.clinical.relievingFactors],
      ["Treatments tried", rec.clinical.treatmentsTried],
    ]);

    table("Clinical assessment and plan", [
      ["Health history", rec.clinical.healthHistory],
      ["Medication history", rec.clinical.medicationHistory],
      ["Allergies / intolerances", rec.clinical.allergies],
      ["Assessment findings", rec.clinical.assessmentFindings],
      ["Shared decision-making", rec.clinical.sharedDecisionMaking],
      ["Care plan", rec.clinical.carePlan],
      ["Follow-up / monitoring", rec.clinical.followUpPlan],
      ...(rec.clinical.noRxRationaleCode
        ? ([
            [
              "No-Rx rationale",
              NO_RX_RATIONALE_LABELS[
                rec.clinical.noRxRationaleCode as NoRxRationaleCode
              ] ?? rec.clinical.noRxRationaleCode,
            ],
            ...(rec.clinical.noRxRationaleNotes
              ? [["Rationale notes", rec.clinical.noRxRationaleNotes] as [string, string]]
              : []),
          ] as [string, string][])
        : []),
    ]);
  } else {
    table("Clinical record", [
      ["Status", "Legacy record — predates structured clinical and consent capture"],
    ]);
  }

  if (rec.prescription) {
    table("Prescription and PCP notification", [
      ["Date prescribed", rec.prescription.prescribedOn],
      ["Patient address", rec.prescription.patientAddress.join(", ")],
      ["Drug", rec.prescription.drugName],
      ["Strength", rec.prescription.strength],
      ["Quantity", rec.prescription.quantity],
      ["Dose", rec.prescription.dose],
      ["Frequency", rec.prescription.frequency],
      ["Route", rec.prescription.route],
      ["Prescribing pharmacist", rec.prescription.prescriberName],
      [
        "OCP registration / status",
        rec.prescription.prescriberIsAsOfRight
          ? "As-of-Right (no Ontario licence number recorded)"
          : rec.prescription.prescriberOcpNumber ?? "Not recorded",
      ],
      ["Prescriber address", rec.prescription.prescriberAddress.join(", ")],
      ["Prescriber phone", rec.prescription.prescriberPhone],
      ["PCP notified", new Date(rec.prescription.pcpNotificationAt).toLocaleString("en-CA")],
      [
        "PCP notification method",
        PCP_NOTIFICATION_METHOD_LABELS[
          rec.prescription.pcpNotificationMethod as PcpNotificationMethod
        ] ?? rec.prescription.pcpNotificationMethod,
      ],
      [
        "Patient informed of pharmacy choice",
        new Date(rec.prescription.patientChoiceInformedAt).toLocaleString("en-CA"),
      ],
    ]);
  }

  if (rec.claim) {
    table("Claim draft (for Kroll entry)", [
      ["PIN", rec.claim.pinCode],
      ["Professional fee", `$${(rec.claim.feeCents / 100).toFixed(2)}`],
      ["Prescriber ID reference", rec.claim.prescriberIdReference],
      ["Prescriber ID", rec.claim.prescriberId],
      ["Intervention codes", rec.claim.interventionCodes.join(", ") || "—"],
      ["Carrier ID", rec.claim.carrierId ?? "—"],
      ["Quantity", String(rec.claim.quantity)],
      ["SSC", rec.claim.ssc === null ? "—" : String(rec.claim.ssc)],
    ]);
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(
    "Draft for hand-entry into the dispensing software — not submitted to HNS. Eligibility is advisory.",
    left,
    doc.internal.pageSize.getHeight() - 8
  );

  return doc.output("arraybuffer");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let actor;
  try {
    actor = await requirePortalUser();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { id } = await params;
  const record = await queryAuditRecordById(actor, id);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Access log — WHO pulled this record's PHI out as a PDF. No PHI in metadata.
  try {
    await writeAudit({
      pharmacyId: actor.pharmacyId,
      actorUserId: actor.userId,
      action: "audit.record_exported",
      entityType: "assessment",
      entityId: record.id,
      metadata: { format: "pdf", hasClaim: record.claim !== null },
    });
  } catch (auditErr) {
    console.error("AUDIT WRITE FAILED for audit.record_exported", record.id, auditErr);
  }

  return new NextResponse(await pdfOf(record), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="agentoma-record-${record.serviceDate}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
