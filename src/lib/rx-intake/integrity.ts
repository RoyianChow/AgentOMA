import type { RxField, RxFieldKey } from "./contract";

/**
 * Document-integrity indicators for AI-RX-06.
 *
 * Implements §6 of the prescription-intake agent's `SAFETY.md`, recovered from
 * the `agentrx-ai-pharmacist-agents-main` drop. That section lists eight signals
 * that a prescription document may have been altered, and sets the posture this
 * module follows exactly:
 *
 *   > The agent may flag concerns.
 *   > The agent must not declare fraud as fact.
 *
 * So nothing here concludes anything. Each indicator reports a factual
 * observation — "the numeral and the written word disagree" — and leaves the
 * judgement to the pharmacist. No indicator says "forged", "altered", or
 * "fraudulent", and the wording is deliberately flat: a parser that cries fraud
 * on a doctor's sloppy handwriting is worse than one that stays quiet.
 *
 * Indicators are strictly ADDITIVE to review. Detecting one can only raise
 * concern; none can clear a document, lower a confidence, or relax a control.
 * `integrityOnlyEscalates` in the tests pins that property.
 *
 * Seven of the eight are implemented. The eighth — "unusual controlled substance
 * requests" — is deliberately omitted: judging a request unusual means reasoning
 * about dose, indication, and patient context, which is clinical interpretation
 * and prohibited by TASK-10. Controlled substances already force mandatory
 * review through `classifyType`, so the safety outcome is unchanged.
 */

export const INTEGRITY_INDICATOR_IDS = [
  "missing_signature",
  "inconsistent_dates",
  "altered_quantity",
  "altered_refills",
  "suspicious_formatting",
  "prescriber_mismatch",
  "missing_clinic_identifier",
] as const;
export type IntegrityIndicatorId = (typeof INTEGRITY_INDICATOR_IDS)[number];

export type IntegrityIndicator = {
  id: IntegrityIndicatorId;
  /** Neutral, factual statement of what was observed. Never a conclusion. */
  detail: string;
  sourceLine: number | null;
};

/** Enough to cover quantities and repeat counts as written on a prescription. */
const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

/** Parses "thirty" and "thirty-five". Returns null for anything else. */
function parseWordNumber(text: string): number | null {
  const parts = text.toLowerCase().trim().split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return null;

  const values = parts.map((part) => WORD_NUMBERS[part]);
  if (values.some((value) => value === undefined)) return null;
  if (values.length === 1) return values[0];

  // "thirty-five" = 35. Reject "five-thirty", which is not a quantity.
  if (values[0] >= 20 && values[1] < 10) return values[0] + values[1];
  return null;
}

/** Reads OCR-confused digits as digits, so "6O" compares as 60. */
function toNumber(value: string): number | null {
  const normalised = value.replace(/[Oo]/g, "0").replace(/[lI]/g, "1");
  return /^\d+$/.test(normalised) ? Number(normalised) : null;
}

/** Surname, for comparing a printed prescriber name against a signature. */
function surname(name: string): string | null {
  const parts = name
    .replace(/\b(dr|md|mb|bs|do|np|rn)\b\.?/gi, "")
    .trim()
    .split(/\s+/)
    .filter((part) => part.replace(/\./g, "").length > 1);
  return parts.length ? parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, "") : null;
}

/**
 * A numeral immediately followed by the same value in words — "Qty: 30 (thirty)"
 * — is a standard anti-alteration device on prescription forms. When the two
 * disagree, one of them was changed.
 */
function checkNumeralWordAgreement(
  lines: string[],
  labelPattern: RegExp,
): { detail: string; sourceLine: number } | null {
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].trim().match(labelPattern);
    if (!match) continue;

    const numeral = toNumber(match[1]);
    const word = parseWordNumber(match[2]);
    if (numeral === null || word === null || numeral === word) continue;

    return {
      detail: `Written as "${match[1]}" in figures and "${match[2]}" in words on line ${index + 1}. The two do not agree; confirm against the original before proceeding.`,
      sourceLine: index + 1,
    };
  }
  return null;
}

function fieldOf(fields: RxField[], key: RxFieldKey): RxField | undefined {
  return fields.find((field) => field.key === key);
}

export type IntegrityInput = {
  lines: string[];
  fields: RxField[];
  signaturePresent: boolean;
  /** True when the parser found more than one distinct written date. */
  contradictoryWrittenDate: boolean;
};

export function detectIntegrityIndicators({
  lines,
  fields,
  signaturePresent,
  contradictoryWrittenDate,
}: IntegrityInput): IntegrityIndicator[] {
  const indicators: IntegrityIndicator[] = [];

  if (!signaturePresent) {
    indicators.push({
      id: "missing_signature",
      detail: "No prescriber signature line was found.",
      sourceLine: null,
    });
  }

  if (contradictoryWrittenDate) {
    indicators.push({
      id: "inconsistent_dates",
      detail:
        "The document states more than one written date. Confirm which is correct against the original.",
      sourceLine: fieldOf(fields, "writtenDate")?.sourceLine ?? null,
    });
  }

  const quantity = checkNumeralWordAgreement(
    lines,
    /^(?:qty|quantity|disp)\s*:?\s*([0-9OolI]+)\s*[({[]\s*([a-z\s-]+?)\s*[)}\]]/i,
  );
  if (quantity) {
    indicators.push({ id: "altered_quantity", ...quantity });
  }

  const refills = checkNumeralWordAgreement(
    lines,
    /^(?:repeats?|rpt|refills?)\s*:?\s*([0-9OolI]+)\s*[({[]\s*([a-z\s-]+?)\s*[)}\]]/i,
  );
  if (refills) {
    indicators.push({ id: "altered_refills", ...refills });
  }

  // Digits broken up by internal whitespace ("3 0") in a field that should be a
  // single number. A common look for a digit inserted after the fact.
  for (const key of ["quantity", "repeats"] as const) {
    const field = fieldOf(fields, key);
    if (field?.value && /\d\s+\d/.test(field.value)) {
      indicators.push({
        id: "suspicious_formatting",
        detail: `The ${key === "quantity" ? "quantity" : "repeat count"} "${field.value}" contains internal spacing between digits.`,
        sourceLine: field.sourceLine,
      });
    }
  }

  // Two different date formats in one document — e.g. an ISO date on the
  // letterhead and a slashed date by the signature.
  const isoDates = lines.filter((line) => /\b\d{4}-\d{2}-\d{2}\b/.test(line)).length;
  const slashDates = lines.filter((line) => /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(line)).length;
  if (isoDates > 0 && slashDates > 0) {
    indicators.push({
      id: "suspicious_formatting",
      detail:
        "The document mixes date formats (YYYY-MM-DD and DD/MM/YYYY). Confirm each date against the original.",
      sourceLine: null,
    });
  }

  // Printed prescriber name versus the name on the signature line.
  const printed = fieldOf(fields, "prescriberName")?.value;
  const signatureLine = lines.findIndex((line) =>
    /^\s*(signature|signed)\s*:/i.test(line),
  );
  if (printed && signatureLine >= 0) {
    const signed = lines[signatureLine].replace(/^\s*(signature|signed)\s*:/i, "");
    const a = surname(printed);
    const b = surname(signed);
    if (a && b && a !== b) {
      indicators.push({
        id: "prescriber_mismatch",
        detail: `The printed prescriber name ("${printed}") and the signature ("${signed.trim()}") do not share a surname.`,
        sourceLine: signatureLine + 1,
      });
    }
  }

  // Clinic identification: a phone number, or a letterhead-style heading.
  const hasPhone = Boolean(fieldOf(fields, "prescriberPhone")?.value);
  const firstContentLine = lines.find((line) => line.trim().length > 0)?.trim() ?? "";
  const looksLikeLetterhead =
    /^[A-Z][A-Z0-9\s&.,'()-]{7,}$/.test(firstContentLine) &&
    firstContentLine.split(/\s+/).length >= 2;

  if (!hasPhone && !looksLikeLetterhead) {
    indicators.push({
      id: "missing_clinic_identifier",
      detail:
        "No clinic name or contact number was found. The prescriber's origin cannot be identified from this document.",
      sourceLine: null,
    });
  }

  return indicators;
}
