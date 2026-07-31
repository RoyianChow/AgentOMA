import { loadSandboxEnv } from "../../env/server";
import { buildSyntheticSamplePdf, verifySyntheticSamplePdf } from "../../evidence/sample-pdf";
import { requireLocalActive } from "../../lifecycle/state";
import { responseHeaders } from "../../security/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Response {
  try {
    const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
    if (new URL(request.url).origin !== env.origin) {
      return new Response("SANDBOX_ACCESS_DENIED:ORIGIN", { status: 421, headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }) });
    }
    requireLocalActive(env);
    const artifact = buildSyntheticSamplePdf();
    if (!verifySyntheticSamplePdf(artifact)) {
      return new Response("SANDBOX_ARTIFACT_DENIED:WATERMARK_VERIFICATION", { status: 500, headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }) });
    }
    return new Response(Buffer.from(artifact), {
      status: 200,
      headers: responseHeaders({
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"SYNTHETIC-NOT-FOR-CARE-SAMPLE.pdf\"",
      }),
    });
  } catch {
    return new Response("SANDBOX_ARTIFACT_DENIED:SAFE_FAILURE", { status: 503, headers: responseHeaders({ "Content-Type": "text/plain; charset=utf-8" }) });
  }
}
