import type { AilmentId } from "@/config/triage";

export const SELF_CHECK_PDF_HEADER =
  "Patient Self-Assessment — Pre-Visit Summary";

export const SELF_CHECK_ADVISORY_HEADER = "Self-Check Advisory";

export interface SelfReportedAnswer {
  question: string;
  answer: string;
}

interface SummaryBase {
  generatedAtIso: string;
  answers: SelfReportedAnswer[];
}

export interface PreVisitSummary extends SummaryBase {
  kind: "pre_visit";
  suspectedAilment: {
    id: AilmentId;
    label: string;
  };
  redFlagAnswers: SelfReportedAnswer[];
}

export type AdvisoryReason =
  | "emergency"
  | "red_flag"
  | "out_of_scope"
  | "unsure";

/**
 * Deliberately has no ailment field. This makes it harder for the advisory
 * branch to accidentally name a suspected condition in UI or PDF output.
 */
export interface AdvisorySummary extends SummaryBase {
  kind: "advisory";
  reason: AdvisoryReason;
  flaggedItems: string[];
}

export type SelfCheckSummary = PreVisitSummary | AdvisorySummary;

export interface PdfSection {
  heading: string;
  items: Array<{
    label?: string;
    value: string;
  }>;
}

export interface SelfCheckPdfContent {
  reportLabel: string;
  header: string;
  introduction: string;
  generatedAt: string;
  tone: "green" | "amber" | "red";
  highlight: {
    label: string;
    value: string;
  };
  sections: PdfSection[];
  finePrint: string[];
}

export function createPreVisitSummary(input: {
  ailmentId: AilmentId;
  ailmentLabel: string;
  answers: SelfReportedAnswer[];
  redFlagQuestions: string[];
  now?: Date;
}): PreVisitSummary {
  return {
    kind: "pre_visit",
    generatedAtIso: (input.now ?? new Date()).toISOString(),
    answers: input.answers,
    suspectedAilment: {
      id: input.ailmentId,
      label: input.ailmentLabel,
    },
    redFlagAnswers: input.redFlagQuestions.map((question) => ({
      question,
      answer: "No",
    })),
  };
}

export function createAdvisorySummary(input: {
  reason: AdvisoryReason;
  answers: SelfReportedAnswer[];
  flaggedItems: string[];
  now?: Date;
}): AdvisorySummary {
  return {
    kind: "advisory",
    generatedAtIso: (input.now ?? new Date()).toISOString(),
    answers: input.answers,
    reason: input.reason,
    flaggedItems: input.flaggedItems,
  };
}

function answerItems(answers: SelfReportedAnswer[]): PdfSection["items"] {
  return answers.map(({ question, answer }) => ({
    label: question,
    value: answer,
  }));
}

const COMMON_FINE_PRINT = [
  "Prepared from answers entered in the public self-check. These responses have not been verified by a pharmacist or other clinician.",
  "This report is not a diagnosis or prescription. A pharmacist must perform and document an independent assessment.",
  "Nothing has been billed or submitted. This report does not confirm eligibility for a publicly funded service or guarantee a prescription or service.",
  "This downloaded report contains health-related answers. Store it securely and share it only with a pharmacy or health professional you choose.",
];

function formatGeneratedAt(iso: string): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);

  return `${datePart} at ${timePart}`;
}

/**
 * Pure document content assembly. No billing data is accepted by the type, and
 * the advisory branch cannot carry an ailment. Rendering/downloading happens
 * separately in the browser.
 */
export function buildSelfCheckPdfContent(
  summary: SelfCheckSummary,
): SelfCheckPdfContent {
  if (summary.kind === "pre_visit") {
    return {
      reportLabel: "PRE-VISIT REPORT",
      header: SELF_CHECK_PDF_HEADER,
      introduction:
        "A concise summary to bring to an Ontario pharmacy for an independent pharmacist assessment.",
      generatedAt: formatGeneratedAt(summary.generatedAtIso),
      tone: "green",
      highlight: {
        label: "SUGGESTED ASSESSMENT AREA",
        value: summary.suspectedAilment.label,
      },
      sections: [
        {
          heading: "Response summary",
          items: answerItems(summary.answers),
        },
        {
          heading: "Safety review",
          items: answerItems(summary.redFlagAnswers),
        },
      ],
      finePrint: COMMON_FINE_PRINT,
    };
  }

  const guidance =
    summary.reason === "emergency"
      ? "Call 911 or go to an emergency department. Do not rely on this self-check."
      : "This self-check cannot determine that a pharmacy assessment is appropriate. Please be seen by a pharmacist in person, a physician, or a nurse practitioner.";

  return {
    reportLabel: "ADVISORY REPORT",
    header: SELF_CHECK_ADVISORY_HEADER,
    introduction:
      "A summary of the answers that stopped or could not complete the public self-check.",
    generatedAt: formatGeneratedAt(summary.generatedAtIso),
    tone: summary.reason === "emergency" ? "red" : "amber",
    highlight: {
      label: "RECOMMENDED NEXT STEP",
      value: guidance,
    },
    sections: [
      {
        heading: "Items requiring attention",
        items: summary.flaggedItems.map((item) => ({ value: item })),
      },
      {
        heading: "Response summary",
        items: answerItems(summary.answers),
      },
    ],
    finePrint: COMMON_FINE_PRINT,
  };
}
