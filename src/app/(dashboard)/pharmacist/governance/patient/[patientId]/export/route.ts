import { z } from "zod";

import { requirePortalUser } from "@/lib/auth-guard";
import { assemblePatientExport, PatientRecordNotFoundError } from "@/lib/governance";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ patientId: string }> },
) {
  const actor = await requirePortalUser(["pharmacy_admin"]);
  const { patientId: rawPatientId } = await context.params;
  const parsed = z.string().uuid().safeParse(rawPatientId);
  if (!parsed.success) {
    return Response.json({ error: "Invalid patient record identifier." }, { status: 400 });
  }

  try {
    const exported = await assemblePatientExport(
      actor,
      parsed.data,
      "secure_download",
    );
    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="patient-record-${parsed.data}.json"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    if (error instanceof PatientRecordNotFoundError) {
      return Response.json({ error: "Patient record not found." }, { status: 404 });
    }
    return Response.json({ error: "The export could not be generated." }, { status: 500 });
  }
}
