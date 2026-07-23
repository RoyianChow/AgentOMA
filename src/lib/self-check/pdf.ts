import {
  buildSelfCheckPdfContent,
  type SelfCheckSummary,
} from "./model";

type PdfDownloader = (summary: SelfCheckSummary) => Promise<void>;

/**
 * Generates and saves the document entirely in the browser. There is no
 * request, cache, temporary file, object storage, or database write.
 */
export async function downloadSelfCheckPdf(
  summary: SelfCheckSummary,
): Promise<void> {
  const { default: JsPdf } = await import("jspdf");
  const content = buildSelfCheckPdfContent(summary);
  const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const addWrappedText = (
    text: string,
    options: { fontSize: number; bold?: boolean; gapAfter?: number },
  ) => {
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(options.fontSize);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = options.fontSize * 0.42;
    ensureSpace(lines.length * lineHeight + (options.gapAfter ?? 0));
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + (options.gapAfter ?? 0);
  };

  addWrappedText(content.header, {
    fontSize: 17,
    bold: true,
    gapAfter: 5,
  });
  addWrappedText(`Generated: ${content.generatedAt}`, {
    fontSize: 9,
    gapAfter: 7,
  });

  for (const section of content.sections) {
    addWrappedText(section.heading, {
      fontSize: 12,
      bold: true,
      gapAfter: 2,
    });

    for (const line of section.lines) {
      addWrappedText(`• ${line}`, {
        fontSize: 10,
        gapAfter: 2,
      });
    }

    y += 3;
  }

  const filename =
    summary.kind === "pre_visit"
      ? "patient-self-assessment-pre-visit.pdf"
      : "patient-self-check-advisory.pdf";
  doc.save(filename);
}

/**
 * Converts any PDF-library failure to a generic UI result. It intentionally
 * never logs the summary or thrown error; either could expose health answers.
 */
export async function safelyDownloadSelfCheckPdf(
  summary: SelfCheckSummary,
  downloader: PdfDownloader = downloadSelfCheckPdf,
): Promise<{ ok: true } | { ok: false }> {
  try {
    await downloader(summary);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
