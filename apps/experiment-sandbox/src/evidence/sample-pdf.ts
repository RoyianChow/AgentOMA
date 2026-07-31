const WATERMARK = "EXPERIMENT - SYNTHETIC DATA - NOT FOR PATIENT CARE";

function pdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function streamFor(page: number): string {
  return [
    "BT",
    "/F1 22 Tf",
    "72 730 Td",
    `(${pdfText(WATERMARK)}) Tj`,
    "0 -52 Td",
    "/F1 16 Tf",
    `(${pdfText(`Synthetic sample page ${page} of 2`)}) Tj`,
    "0 -32 Td",
    "/F1 12 Tf",
    "(No operational record, prescription, claim, or patient data.) Tj",
    "ET",
  ].join("\n");
}

export function buildSyntheticSamplePdf(): Uint8Array {
  const streams = [streamFor(1), streamFor(2)];
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(streams[0], "utf8")} >>\nstream\n${streams[0]}\nendstream`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${Buffer.byteLength(streams[1], "utf8")} >>\nstream\n${streams[1]}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Producer (AgentOMA experiment sandbox) /Title (Synthetic sample only) >>",
  ];

  let pdf = "%PDF-1.4\n%SYNTH\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

export function verifySyntheticSamplePdf(bytes: Uint8Array): boolean {
  const text = new TextDecoder().decode(bytes);
  return (
    text.startsWith("%PDF-1.4") &&
    (text.match(/\/Type \/Page\b/g) ?? []).length === 2 &&
    (text.match(new RegExp(WATERMARK, "g")) ?? []).length === 2 &&
    text.includes("/Producer (AgentOMA experiment sandbox)")
  );
}
