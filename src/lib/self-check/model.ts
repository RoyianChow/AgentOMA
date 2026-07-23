import type { AilmentId } from "@/config/triage";

export const SELF_CHECK_PDF_HEADER =
  "Patient Self-Assessment — Pre-Visit Summary. Not a diagnosis, prescription, or billing claim.";

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
  lines: string[];
}

export interface SelfCheckPdfContent {
  header: string;
  generatedAt: string;
  sections: PdfSection[];
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
      answer: "No (self-reported)",
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

function answerLines(answers: SelfReportedAnswer[]): string[] {
  return answers.map(
    ({ question, answer }) =>
      `${question} — ${answer} (self-reported)`,
  );
}

/**
 * Pure document content assembly. No billing data is accepted by the type, and
 * the advisory branch cannot carry an ailment. Rendering/downloading happens
 * separately in the browser.
 */
export function buildSelfCheckPdfContent(
  summary: SelfCheckSummary,
): SelfCheckPdfContent {
  const sections: PdfSection[] = [
    {
      heading: "Important",
      lines: [
        "This document records answers provided by the person using the self-check.",
        "It is not a diagnosis or prescription. Nothing has been billed or submitted.",
      ],
    },
  ];

  if (summary.kind === "pre_visit") {
    sections.push(
      {
        heading: "Self-reported suspected ailment group",
        lines: [summary.suspectedAilment.label],
      },
      {
        heading: "For the pharmacist",
        lines: [
          "Please perform and document your own assessment. This summary does not establish eligibility, authorize prescribing, or create a billing claim.",
        ],
      },
      {
        heading: "Self-reported answers",
        lines: answerLines(summary.answers),
      },
      {
        heading: "Safety questions",
        lines: answerLines(summary.redFlagAnswers),
      },
    );
  } else {
    const guidance =
      summary.reason === "emergency"
        ? "Call 911 or go to an emergency department. Do not rely on this self-check."
        : "This self-check cannot determine that a pharmacy assessment is appropriate. Please be seen by a pharmacist in person, a physician, or a nurse practitioner.";

    sections.push(
      {
        heading: "Advisory",
        lines: [guidance],
      },
      {
        heading: "What was flagged",
        lines: summary.flaggedItems.map((item) => `${item} (self-reported)`),
      },
      {
        heading: "Self-reported answers",
        lines: answerLines(summary.answers),
      },
    );
  }

  return {
    header: SELF_CHECK_PDF_HEADER,
    generatedAt: summary.generatedAtIso,
    sections,
  };
}
