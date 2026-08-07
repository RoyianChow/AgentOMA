import {
  RX_CAPABILITY_ID,
  RX_EXTRACTION_SCHEMA_VERSION,
  RX_FIELD_CONFIDENCE_THRESHOLD,
  RX_FIELD_KEYS,
  RX_FIELD_LABELS,
  RX_REQUIRED_FIELDS,
  type RxExtraction,
  type RxField,
  type RxFieldKey,
  type RxPrescriptionType,
} from "./contract";
import type { RxCorpusFixture } from "./corpus";
import { detectIntegrityIndicators } from "./integrity";

/**
 * Deterministic extraction for AI-RX-06. No model, no network, no persistence —
 * see the header of `contract.ts` for why it is built this way.
 *
 * The parser is deliberately literal. It reports what it can match against a
 * labelled line and reports absence otherwise. It never infers a missing value
 * from a related one (no deriving quantity from the directions), never
 * normalises OCR noise into a plausible-looking clean value (`5OO mg` stays
 * `5OO mg`), and never resolves a contradiction. Each of those would replace a
 * legible "I could not read this" with a confident wrong answer, which is the
 * single worst thing a prescription parser can do.
 */

/** Confidence a match starts from, before penalties, by how it was found. */
const BASE_CONFIDENCE = {
  /** Canonical label, e.g. "Patient:". */
  exactLabel: 0.95,
  /** Recognised label variant, e.g. "D.0.B." for "DOB". */
  variantLabel: 0.8,
  /** Structure alone — no label, inferred from position. */
  positional: 0.65,
} as const;

const PENALTY = {
  /** Letter/digit confusion inside a value that should be numeric. */
  ocrNoise: 0.2,
  /** The document says two different things. Never resolved here. */
  contradiction: 0.3,
} as const;

/**
 * Drugs whose presence forces the mandatory-review path. This list is a routing
 * trigger, not a clinical or scheduling determination: a hit only ever makes
 * review MORE required and can never relax a control. A miss is therefore safe
 * in the sense that the draft still requires human disposition — every draft
 * does — but the list should still be extended as fixtures are added.
 */
const CONTROLLED_MARKERS = [
  "oxycodone",
  "hydromorphone",
  "morphine",
  "fentanyl",
  "codeine",
  "methadone",
  "buprenorphine",
  "lorazepam",
  "diazepam",
  "clonazepam",
  "alprazolam",
  "zopiclone",
  "methylphenidate",
  "amphetamine",
  "lisdexamfetamine",
  "duplicate prescription program",
];

const DOSAGE_FORMS = [
  "tablet",
  "capsule",
  "cream",
  "ointment",
  "gel",
  "lotion",
  "solution",
  "suspension",
  "syrup",
  "drops",
  "inhaler",
  "patch",
  "suppository",
  "spray",
];

type Candidate = {
  value: string;
  line: number;
  base: number;
};

/** One labelled-line rule: which labels introduce a field, and how canonical they are. */
type FieldRule = {
  exact: RegExp[];
  variant?: RegExp[];
  /**
   * Separator used to rejoin a multi-group match. Patterns that capture a value
   * in parts (a phone number as area/exchange/line) set this; single-group
   * patterns leave it unset and use group 1 directly.
   */
  join?: string;
};

const FIELD_RULES: Partial<Record<RxFieldKey, FieldRule>> = {
  patientName: { exact: [/^patient\s*:\s*(.+)$/i], variant: [/^pt\s*:\s*(.+)$/i] },
  patientDob: {
    exact: [/^dob\s*:\s*(.+)$/i, /^date of birth\s*:\s*(.+)$/i],
    // "D.0.B." — the zero is OCR noise in the label itself, not the value.
    variant: [/^d\s*[.,]\s*[0o]\s*[.,]\s*b\s*[.,]?\s*(.+)$/i],
  },
  prescriberLicence: {
    exact: [/^cpso\s*#?\s*:?\s*([0-9OolI]+)\s*$/i],
    variant: [/^licence\s*#?\s*:?\s*([0-9OolI]+)\s*$/i, /^lic\s*#?\s*:?\s*([0-9OolI]+)\s*$/i],
  },
  prescriberPhone: {
    // Matches the phone token only, not the rest of the line: letterhead
    // routinely puts "Tel: … Fax: …" on one line, and capturing to end-of-line
    // returns both numbers as the phone.
    exact: [
      /^(?:tel|phone)\s*:\s*\(?([0-9OolI]{3})\)?[\s\-.]?([0-9OolI]{3})[\s\-.]?([0-9OolI]{4})\b/i,
    ],
    variant: [/^t\s*:\s*\(?([0-9OolI]{3})\)?[\s\-.]?([0-9OolI]{3})[\s\-.]?([0-9OolI]{4})\b/i],
    join: "-",
  },
  directions: {
    exact: [/^sig\s*:\s*(.+)$/i],
    variant: [/^directions\s*:\s*(.+)$/i, /^instructions\s*:\s*(.+)$/i],
  },
  // The trailing `(?:[({[]…[)}\]])?` allows the written-word form that
  // prescription pads print beside the figure — "Qty: 30 (thirty)". Without it
  // the end-of-line anchor rejects the whole line and the quantity reads as
  // absent, which is the worst outcome: an anti-alteration device on the form
  // would cause the field it protects to go missing. Only the numeral is
  // captured; `integrity.ts` compares the two and flags any disagreement.
  quantity: {
    exact: [
      /^qty\s*:?\s*([0-9OolI]+)\s*(?:[({[][a-z\s-]+[)}\]])?\s*$/i,
      /^quantity\s*:?\s*([0-9OolI]+)\s*(?:[({[][a-z\s-]+[)}\]])?\s*$/i,
    ],
    variant: [/^disp\s*:?\s*([0-9OolI]+)\s*(?:[({[][a-z\s-]+[)}\]])?\s*$/i],
  },
  repeats: {
    exact: [/^repeats?\s*:?\s*([0-9OolI]+)\s*(?:[({[][a-z\s-]+[)}\]])?\s*$/i],
    variant: [
      /^rpt\s*:?\s*([0-9OolI]+)\s*(?:[({[][a-z\s-]+[)}\]])?\s*$/i,
      /^refills?\s*:?\s*([0-9OolI]+)\s*(?:[({[][a-z\s-]+[)}\]])?\s*$/i,
    ],
  },
  writtenDate: {
    exact: [/^date\s*:\s*(.+)$/i, /^date written\s*:\s*(.+)$/i],
    variant: [/^written\s*:?\s*(.+)$/i, /^rx date\s*:?\s*(.+)$/i],
  },
};

/** Fields where a letter standing in for a digit means the value is unreliable. */
const NUMERIC_FIELDS: readonly RxFieldKey[] = [
  "patientDob",
  "prescriberLicence",
  "prescriberPhone",
  "quantity",
  "repeats",
  "writtenDate",
  "medicationStrength",
];

/**
 * True when a value that should be numeric contains characters OCR commonly
 * substitutes for digits. `5OO` and `6l3` are the cases this catches.
 */
function hasDigitLetterConfusion(value: string): boolean {
  return /\d[OolI]|[OolI]\d/.test(value);
}

/** Rejoins a match's capture groups, honouring the rule's `join` separator. */
function captured(match: RegExpMatchArray | null, rule: FieldRule): string {
  if (!match) return "";
  const groups = match.slice(1).filter((group): group is string => Boolean(group));
  if (groups.length === 0) return "";
  return rule.join ? groups.join(rule.join).trim() : groups[0].trim();
}

function collectLabelled(lines: string[], rule: FieldRule): Candidate[] {
  const found: Candidate[] = [];
  lines.forEach((raw, index) => {
    const line = raw.trim();
    for (const pattern of rule.exact) {
      const value = captured(line.match(pattern), rule);
      if (value) {
        found.push({ value, line: index + 1, base: BASE_CONFIDENCE.exactLabel });
        return;
      }
    }
    for (const pattern of rule.variant ?? []) {
      const value = captured(line.match(pattern), rule);
      if (value) {
        found.push({ value, line: index + 1, base: BASE_CONFIDENCE.variantLabel });
        return;
      }
    }
  });
  return found;
}

/**
 * Prescriber name. Matched by the "Dr." honorific rather than a label, because
 * prescription forms put the name on a signature line, not after "Prescriber:".
 * Trailing credentials are dropped so the name matches how a pharmacist would
 * search for it; the honorific itself is dropped for the same reason.
 */
function collectPrescriberName(lines: string[]): Candidate[] {
  const found: Candidate[] = [];
  lines.forEach((raw, index) => {
    const match = raw.trim().match(/^dr\.?\s+([A-Za-z][A-Za-z'\-\s.]+?)\s*(?:,\s*[A-Za-z.]+)?$/i);
    if (match?.[1]?.trim()) {
      found.push({
        value: match[1].trim(),
        line: index + 1,
        base: BASE_CONFIDENCE.exactLabel,
      });
    }
  });
  return found;
}

type MedicationParts = {
  name: Candidate | null;
  strength: Candidate | null;
  form: Candidate | null;
};

/**
 * The medication line, which carries three fields at once and has no reliable
 * label. Located either by an inline `Rx:` prefix or by taking the first
 * non-empty line after a bare `Rx` marker.
 *
 * Strength matching accepts OCR-confused digits (`5OO mg`) so the field is
 * reported and flagged rather than dropped — a strength the pharmacist can see
 * and correct is more useful than a silent absence.
 */
function collectMedication(lines: string[]): MedicationParts {
  let target: { text: string; line: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const inline = line.match(/^rx\s*:\s*(.+)$/i);
    if (inline?.[1]?.trim()) {
      target = { text: inline[1].trim(), line: index + 1 };
      break;
    }
    if (/^rx\s*:?\s*$/i.test(line)) {
      for (let next = index + 1; next < lines.length; next += 1) {
        if (lines[next].trim()) {
          target = { text: lines[next].trim(), line: next + 1 };
          break;
        }
      }
      break;
    }
  }

  if (!target) return { name: null, strength: null, form: null };

  const formPattern = new RegExp(`\\b(${DOSAGE_FORMS.join("|")})s?\\b`, "i");
  const strengthPattern =
    /\b([0-9OolI]+(?:\.[0-9OolI]+)?\s*(?:mg|mcg|g|ml|iu|%)|[0-9OolI]+(?:\.[0-9OolI]+)?%)/i;

  const formMatch = target.text.match(formPattern);
  const strengthMatch = target.text.match(strengthPattern);

  // The name is whatever precedes the strength; failing that, whatever precedes
  // the form. Both are structural inferences, so both score as positional.
  let name = target.text;
  if (strengthMatch?.index !== undefined) {
    name = target.text.slice(0, strengthMatch.index);
  } else if (formMatch?.index !== undefined) {
    name = target.text.slice(0, formMatch.index);
  }
  name = name.replace(/[,;:]+\s*$/, "").trim();

  return {
    name: name
      ? { value: name, line: target.line, base: BASE_CONFIDENCE.positional }
      : null,
    strength: strengthMatch
      ? {
          value: strengthMatch[1].replace(/\s+/g, " ").trim(),
          line: target.line,
          base: BASE_CONFIDENCE.positional,
        }
      : null,
    form: formMatch
      ? {
          value: formMatch[1].toLowerCase(),
          line: target.line,
          base: BASE_CONFIDENCE.positional,
        }
      : null,
  };
}

/**
 * Turns candidates into a field. Keeps the first match, and when candidates
 * disagree records the conflict rather than picking a winner — deciding which
 * of two stated values is true is explicitly a human judgement under Task 10.
 */
function buildField(key: RxFieldKey, candidates: Candidate[]): RxField {
  if (candidates.length === 0) {
    return { key, value: null, confidence: 0, sourceLine: null, notes: [] };
  }

  const [first] = candidates;
  const notes: string[] = [];
  let confidence = first.base;

  const distinct = [...new Set(candidates.map((candidate) => candidate.value))];
  if (distinct.length > 1) {
    confidence -= PENALTY.contradiction;
    notes.push(
      `Document states ${distinct.length} different values (${distinct.join(
        " / ",
      )}) on lines ${candidates.map((c) => c.line).join(", ")}. Not resolved — confirm against the original.`,
    );
  }

  if (NUMERIC_FIELDS.includes(key) && hasDigitLetterConfusion(first.value)) {
    confidence -= PENALTY.ocrNoise;
    notes.push(
      "Contains characters commonly confused by OCR (O/0, l/1). Value left exactly as read.",
    );
  }

  return {
    key,
    value: first.value,
    confidence: Math.max(0, Math.min(1, Number(confidence.toFixed(2)))),
    sourceLine: first.line,
    notes,
  };
}

function classifyType(text: string, fields: RxField[]): RxPrescriptionType {
  const haystack = text.toLowerCase();
  if (CONTROLLED_MARKERS.some((marker) => haystack.includes(marker))) {
    return "controlled_substance";
  }
  const repeats = fields.find((field) => field.key === "repeats")?.value;
  if (repeats && /^[1-9]/.test(repeats)) return "new";
  if (/\brefill\b/.test(haystack)) return "refill";
  if (/\brenewal\b/.test(haystack)) return "renewal";
  if (/\btransfer\b/.test(haystack)) return "transfer";
  return "new";
}

/**
 * Extracts one synthetic fixture into the AI-RX-06 draft contract.
 *
 * Pure: same fixture in, same draft out. No clock, no randomness, no I/O — which
 * is what makes the fixture-by-fixture assertions in the tests meaningful.
 */
export function extractPrescription(fixture: RxCorpusFixture): RxExtraction {
  const lines = fixture.text.split("\n");

  const medication = collectMedication(lines);
  const candidatesByKey: Record<RxFieldKey, Candidate[]> = {
    patientName: collectLabelled(lines, FIELD_RULES.patientName!),
    patientDob: collectLabelled(lines, FIELD_RULES.patientDob!),
    prescriberName: collectPrescriberName(lines),
    prescriberLicence: collectLabelled(lines, FIELD_RULES.prescriberLicence!),
    prescriberPhone: collectLabelled(lines, FIELD_RULES.prescriberPhone!),
    medicationName: medication.name ? [medication.name] : [],
    medicationStrength: medication.strength ? [medication.strength] : [],
    medicationForm: medication.form ? [medication.form] : [],
    directions: collectLabelled(lines, FIELD_RULES.directions!),
    quantity: collectLabelled(lines, FIELD_RULES.quantity!),
    repeats: collectLabelled(lines, FIELD_RULES.repeats!),
    writtenDate: collectLabelled(lines, FIELD_RULES.writtenDate!),
  };

  const fields = RX_FIELD_KEYS.map((key) => buildField(key, candidatesByKey[key]));
  const byKey = new Map(fields.map((field) => [field.key, field]));

  const missingFields = RX_REQUIRED_FIELDS.filter((key) => !byKey.get(key)?.value);
  const lowConfidenceFields = fields
    .filter(
      (field) =>
        field.value !== null && field.confidence < RX_FIELD_CONFIDENCE_THRESHOLD,
    )
    .map((field) => field.key);

  const requiredScores = RX_REQUIRED_FIELDS.map(
    (key) => byKey.get(key)?.confidence ?? 0,
  );
  const overallScore = Number(
    (requiredScores.reduce((sum, score) => sum + score, 0) / requiredScores.length).toFixed(2),
  );

  const signaturePresent = /^\s*(signature|signed)\s*:/im.test(fixture.text);
  const prescriptionType = classifyType(fixture.text, fields);

  // SAFETY.md §6. Purely additive: indicators raise concern and can never clear
  // a document or relax a control — see the header of `integrity.ts`.
  const integrityIndicators = detectIntegrityIndicators({
    lines,
    fields,
    signaturePresent,
    contradictoryWrittenDate: (byKey.get("writtenDate")?.notes ?? []).some((note) =>
      note.includes("different values"),
    ),
  });

  const warnings: string[] = [];
  for (const key of missingFields) {
    warnings.push(`${RX_FIELD_LABELS[key]} is required and was not found in the document.`);
  }
  for (const key of lowConfidenceFields) {
    warnings.push(
      `${RX_FIELD_LABELS[key]} read with low confidence — verify against the source document.`,
    );
  }
  // The integrity module owns the signature wording so there is one source for
  // it; the rest surface here for the first time.
  for (const indicator of integrityIndicators) {
    warnings.push(indicator.detail);
  }
  if (prescriptionType === "controlled_substance") {
    warnings.push(
      "Classified as a controlled substance: prescriber verification is mandatory and no step may proceed without it.",
    );
  }

  return {
    schemaVersion: RX_EXTRACTION_SCHEMA_VERSION,
    capabilityId: RX_CAPABILITY_ID,
    corpusFixtureId: fixture.id,
    synthetic: true,
    // Always `requires_human_review`. There is no branch to `verified` here:
    // only a pharmacist's recorded disposition can move a draft off this state.
    status: "requires_human_review",
    prescriptionType,
    signaturePresent,
    fields,
    integrityIndicators,
    confidence: {
      overallScore,
      requiresHumanReview: true,
      lowConfidenceFields,
      missingFields,
    },
    warnings,
  };
}
