import type { jsPDF as JsPdfDocument } from "jspdf";
import {
  buildSelfCheckPdfContent,
  type PdfSection,
  type SelfCheckPdfContent,
  type SelfCheckSummary,
} from "./model";

type PdfDownloader = (summary: SelfCheckSummary) => Promise<void>;
type RGB = readonly [number, number, number];

const COLOURS = {
  paper: [248, 250, 249] as RGB,
  white: [255, 255, 255] as RGB,
  ink: [20, 32, 27] as RGB,
  muted: [95, 114, 106] as RGB,
  line: [221, 228, 224] as RGB,
  green: [14, 90, 74] as RGB,
  greenSoft: [228, 240, 236] as RGB,
  amber: [169, 112, 26] as RGB,
  amberSoft: [251, 240, 220] as RGB,
  red: [151, 41, 42] as RGB,
  redSoft: [251, 231, 229] as RGB,
};

const PAGE_MARGIN = 18;
const FOOTER_HEIGHT = 43;

function toneColours(tone: SelfCheckPdfContent["tone"]): {
  strong: RGB;
  soft: RGB;
} {
  if (tone === "red") {
    return { strong: COLOURS.red, soft: COLOURS.redSoft };
  }
  if (tone === "amber") {
    return { strong: COLOURS.amber, soft: COLOURS.amberSoft };
  }
  return { strong: COLOURS.green, soft: COLOURS.greenSoft };
}

function setFill(doc: JsPdfDocument, colour: RGB): void {
  doc.setFillColor(colour[0], colour[1], colour[2]);
}

function setStroke(doc: JsPdfDocument, colour: RGB): void {
  doc.setDrawColor(colour[0], colour[1], colour[2]);
}

function setText(doc: JsPdfDocument, colour: RGB): void {
  doc.setTextColor(colour[0], colour[1], colour[2]);
}

function textHeight(fontSize: number, lineCount: number): number {
  return fontSize * 0.4 * lineCount;
}

async function loadBrandLogo(): Promise<string | null> {
  if (typeof document === "undefined") return null;

  try {
    // This GET loads a public static asset only. No self-check answers or other
    // session state are sent to the server.
    const response = await fetch("/logo.png", { cache: "no-store" });
    if (!response.ok) return null;

    const blobUrl = URL.createObjectURL(await response.blob());
    try {
      const image = new Image();
      image.src = blobUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 320;
      const context = canvas.getContext("2d");
      if (!context) return null;

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    // The report remains usable with a text wordmark if the static asset fails.
    // Do not log: future logo-loader errors must never expose report context.
    return null;
  }
}

export function renderSelfCheckPdf(
  doc: JsPdfDocument,
  content: SelfCheckPdfContent,
  logoDataUrl: string | null,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const bodyBottom = pageHeight - FOOTER_HEIGHT;
  const palette = toneColours(content.tone);
  let y = 0;

  const drawWordmark = (compact = false) => {
    if (logoDataUrl) {
      const size = compact ? 9 : 17;
      doc.addImage(
        logoDataUrl,
        "PNG",
        PAGE_MARGIN,
        compact ? 8 : 10,
        size,
        size,
        "agentoma-logo",
        "FAST",
      );
    }

    const wordmarkX = PAGE_MARGIN + (logoDataUrl ? (compact ? 12 : 21) : 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(compact ? 10 : 14);
    setText(doc, COLOURS.green);
    doc.text("AgentOMA", wordmarkX, compact ? 14 : 18);

    if (!compact) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setText(doc, COLOURS.muted);
      doc.text("ONTARIO PHARMACY SELF-CHECK", wordmarkX, 23);
    }
  };

  const drawFirstPageHeader = () => {
    setFill(doc, COLOURS.green);
    doc.rect(0, 0, pageWidth, 3, "F");
    drawWordmark();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const labelWidth = doc.getTextWidth(content.reportLabel) + 10;
    setFill(doc, palette.soft);
    doc.roundedRect(
      pageWidth - PAGE_MARGIN - labelWidth,
      12,
      labelWidth,
      9,
      4.5,
      4.5,
      "F",
    );
    setText(doc, palette.strong);
    doc.text(
      content.reportLabel,
      pageWidth - PAGE_MARGIN - labelWidth / 2,
      17.7,
      { align: "center" },
    );

    setStroke(doc, COLOURS.line);
    doc.setLineWidth(0.35);
    doc.line(PAGE_MARGIN, 32, pageWidth - PAGE_MARGIN, 32);
  };

  const drawContinuationHeader = () => {
    drawWordmark(true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, COLOURS.muted);
    doc.text(content.reportLabel, pageWidth - PAGE_MARGIN, 14, {
      align: "right",
    });
    setStroke(doc, COLOURS.line);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, 20, pageWidth - PAGE_MARGIN, 20);
  };

  const addPage = () => {
    doc.addPage();
    drawContinuationHeader();
    y = 28;
  };

  const ensureSpace = (height: number) => {
    if (y + height <= bodyBottom) return;
    addPage();
  };

  const drawHighlight = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const lines = doc.splitTextToSize(
      content.highlight.value,
      contentWidth - 16,
    ) as string[];
    const height = Math.max(27, textHeight(13, lines.length) + 17);
    ensureSpace(height + 6);

    setFill(doc, palette.soft);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, height, 4, 4, "F");
    setFill(doc, palette.strong);
    doc.roundedRect(PAGE_MARGIN, y, 3, height, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setText(doc, palette.strong);
    doc.text(content.highlight.label, PAGE_MARGIN + 9, y + 8);

    doc.setFontSize(13);
    setText(doc, COLOURS.ink);
    doc.text(lines, PAGE_MARGIN + 9, y + 16);
    y += height + 9;
  };

  const measureItem = (item: PdfSection["items"][number]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    const labelLines = item.label
      ? (doc.splitTextToSize(item.label, contentWidth - 16) as string[])
      : [];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const valueWidth = item.label ? contentWidth - 16 : contentWidth - 20;
    const valueLines = doc.splitTextToSize(item.value, valueWidth) as string[];
    const labelBlock = labelLines.length
      ? textHeight(8.3, labelLines.length) + 2
      : 0;
    const rowHeight = Math.max(
      15,
      7 + labelBlock + textHeight(10, valueLines.length),
    );

    return { labelBlock, labelLines, rowHeight, valueLines };
  };

  const drawItem = (item: PdfSection["items"][number]) => {
    const { labelBlock, labelLines, rowHeight, valueLines } =
      measureItem(item);
    ensureSpace(rowHeight + 3);

    setFill(doc, COLOURS.paper);
    doc.roundedRect(PAGE_MARGIN, y, contentWidth, rowHeight, 3, 3, "F");

    if (item.label) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.3);
      setText(doc, COLOURS.muted);
      doc.text(labelLines, PAGE_MARGIN + 8, y + 6.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(doc, COLOURS.ink);
      doc.text(
        valueLines,
        PAGE_MARGIN + 8,
        y + 6.5 + labelBlock,
      );
    } else {
      setFill(doc, palette.strong);
      doc.circle(PAGE_MARGIN + 7, y + 7.5, 1.2, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      setText(doc, COLOURS.ink);
      doc.text(valueLines, PAGE_MARGIN + 12, y + 7.5);
    }

    y += rowHeight + 3;
  };

  const drawSection = (section: PdfSection) => {
    if (section.items.length === 0) return;
    const firstRowHeight = measureItem(section.items[0]).rowHeight;
    ensureSpace(11 + firstRowHeight + 3);
    setFill(doc, palette.strong);
    doc.roundedRect(PAGE_MARGIN, y + 0.5, 2.2, 7, 1.1, 1.1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, COLOURS.ink);
    doc.text(section.heading, PAGE_MARGIN + 6, y + 6.5);
    y += 11;

    for (const item of section.items) {
      drawItem(item);
    }
    y += 5;
  };

  const drawFinePrintFooter = (pageNumber: number, pageCount: number) => {
    const footerTop = pageHeight - FOOTER_HEIGHT + 4;
    setStroke(doc, COLOURS.line);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, footerTop, pageWidth - PAGE_MARGIN, footerTop);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.7);
    setText(doc, COLOURS.muted);
    doc.text("IMPORTANT INFORMATION", PAGE_MARGIN, footerTop + 4.5);

    let footerY = footerTop + 8.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    for (const note of content.finePrint) {
      const lines = doc.splitTextToSize(note, contentWidth) as string[];
      setText(doc, COLOURS.muted);
      doc.text(lines, PAGE_MARGIN, footerY);
      footerY += textHeight(6.3, lines.length) + 1.1;
    }

    doc.setFontSize(6.5);
    setText(doc, COLOURS.muted);
    doc.text(`AgentOMA  |  Page ${pageNumber} of ${pageCount}`, PAGE_MARGIN, pageHeight - 5.5);
    doc.text("Generated privately in your browser", pageWidth - PAGE_MARGIN, pageHeight - 5.5, {
      align: "right",
    });
  };

  drawFirstPageHeader();
  y = 44;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setText(doc, COLOURS.ink);
  const titleLines = doc.splitTextToSize(content.header, contentWidth) as string[];
  doc.text(titleLines, PAGE_MARGIN, y);
  y += textHeight(22, titleLines.length) + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, COLOURS.muted);
  const introLines = doc.splitTextToSize(content.introduction, contentWidth) as string[];
  doc.text(introLines, PAGE_MARGIN, y);
  y += textHeight(9.5, introLines.length) + 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setText(doc, COLOURS.green);
  doc.text(`GENERATED  ${content.generatedAt.toUpperCase()}`, PAGE_MARGIN, y);
  y += 8;

  drawHighlight();
  for (const section of content.sections) {
    drawSection(section);
  }

  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    drawFinePrintFooter(pageNumber, pageCount);
  }
}

/**
 * Generates and saves the document entirely in the browser. Answers remain in
 * memory and are never sent, cached, persisted, or logged. The only fetch is a
 * GET for the public company logo, with no report data attached.
 */
export async function downloadSelfCheckPdf(
  summary: SelfCheckSummary,
): Promise<void> {
  const [{ default: JsPdf }, logoDataUrl] = await Promise.all([
    import("jspdf"),
    loadBrandLogo(),
  ]);
  const content = buildSelfCheckPdfContent(summary);
  const doc = new JsPdf({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  renderSelfCheckPdf(doc, content, logoDataUrl);

  const filename =
    summary.kind === "pre_visit"
      ? "agentoma-pre-visit-self-check.pdf"
      : "agentoma-self-check-advisory.pdf";
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
