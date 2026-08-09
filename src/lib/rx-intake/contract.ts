import { z } from "zod";

import { INTEGRITY_INDICATOR_IDS } from "./integrity";

/**
 * AI-RX-06 — synthetic prescription-document extraction.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE CHANGING ANYTHING IN THIS DIRECTORY.
 *
 * This capability is an UNCHARTERED synthetic experiment. It is NOT one of the
 * five candidates in the Task 10 boundary matrix (AI-DQ-01, AI-FU-02, AI-AS-03,
 * AI-AQ-04, AI-OB-05). Before it may process a real document, it needs its own
 * intended-use statement, risk classification, experiment charter, corpus split,
 * frozen thresholds, pharmacist evaluation, and the named approvals in
 * `docs/tasks/autonomous-pharmacy/TASK-10-bounded-ai.md`. None of those exist.
 *
 * What that means in code, and what the boundary test enforces:
 *
 *   1. NO PHI. Input is a fixture id resolved against a built-in synthetic
 *      corpus. There is no upload, no paste, no free text, and no request field
 *      that can carry a real document. A caller cannot hand this module patient
 *      data even if it wants to.
 *   2. NO MODEL. Extraction is deterministic string parsing. There is no vendor,
 *      no inference call, no API key, no network. Task 10 states plainly that a
 *      no-AI result is valid where deterministic parsing is safer and equally
 *      useful — that is the case here, and this is that result.
 *   3. NO PERSISTENCE. Nothing this module produces is written to any table.
 *      It never reaches `assessment`, `claim_draft`, `patient`, or the audit log.
 *   4. NO DECISION. Output is an untrusted draft. It carries no clinical
 *      conclusion, no red-flag determination, no PIN, no fee, and no billing
 *      value. A pharmacist accepts, edits, or rejects it, and that action ends
 *      the flow — nothing downstream consumes it.
 *
 * `confidence` below is a DERIVED PARSE SIGNAL, not a model probability. It
 * scores how cleanly a deterministic pattern matched its line. Do not present
 * it as a measure of clinical correctness, and do not let it gate anything.
 */

/** Contract version. Bump on any change to the output shape. */
export const RX_EXTRACTION_SCHEMA_VERSION = "1.0.0";

/** Capability id, used in UI labelling and the charter that does not yet exist. */
export const RX_CAPABILITY_ID = "AI-RX-06";

/**
 * Workflow states, narrowed from the vendored
 * `docs/task-10/source-specs/PRESCRIPTION_SCHEMA.md` to the four
 * this experiment can actually reach. The states it omits — `received`,
 * `processing`, `cancelled`, `expired`, `completed` — all imply a persisted
 * lifecycle, and this capability persists nothing.
 */
export const RX_STATUSES = [
  "extracted",
  "requires_human_review",
  "verified",
  "rejected",
] as const;
export type RxStatus = (typeof RX_STATUSES)[number];

export const RX_PRESCRIPTION_TYPES = [
  "new",
  "refill",
  "renewal",
  "transfer",
  "controlled_substance",
  "verbal",
  "faxed",
  "electronic",
  "unknown",
] as const;
export type RxPrescriptionType = (typeof RX_PRESCRIPTION_TYPES)[number];

/** The pharmacist's disposition. There is no fourth option and no default. */
export const RX_REVIEW_DECISIONS = ["accepted", "edited", "rejected"] as const;
export type RxReviewDecision = (typeof RX_REVIEW_DECISIONS)[number];

/**
 * Every field the parser will attempt. This list is closed: the parser cannot
 * invent a field, and the UI renders exactly these keys in this order.
 */
export const RX_FIELD_KEYS = [
  "patientName",
  "patientDob",
  "prescriberName",
  "prescriberLicence",
  "prescriberPhone",
  "medicationName",
  "medicationStrength",
  "medicationForm",
  "directions",
  "quantity",
  "repeats",
  "writtenDate",
] as const;
export type RxFieldKey = (typeof RX_FIELD_KEYS)[number];

export const RX_FIELD_LABELS: Record<RxFieldKey, string> = {
  patientName: "Patient name",
  patientDob: "Date of birth",
  prescriberName: "Prescriber",
  prescriberLicence: "CPSO number",
  prescriberPhone: "Prescriber phone",
  medicationName: "Medication",
  medicationStrength: "Strength",
  medicationForm: "Form",
  directions: "Directions (Sig)",
  quantity: "Quantity",
  repeats: "Repeats",
  writtenDate: "Written date",
};

/**
 * Fields that must carry a value for the draft to be even structurally
 * complete. Mirrors the PRESCRIPTION_SCHEMA validation rules, minus the
 * `patient_id`/`prescriber_id`/`medication_id` record links — this capability
 * resolves nothing against the database, so it cannot populate them.
 */
export const RX_REQUIRED_FIELDS: readonly RxFieldKey[] = [
  "patientName",
  "prescriberName",
  "medicationName",
  "directions",
  "quantity",
  "writtenDate",
];

/**
 * Below this, a field is called out as low-confidence and the whole draft goes
 * to `requires_human_review`. Deliberately high: this experiment should route
 * to a human when in any doubt, and a false "clean" reading is the failure that
 * matters here.
 */
export const RX_FIELD_CONFIDENCE_THRESHOLD = 0.85;

/** One extracted field, with the source line it came from. */
export const rxFieldSchema = z.object({
  key: z.enum(RX_FIELD_KEYS),
  /** Null when the parser found nothing — never a guess, never a placeholder. */
  value: z.string().min(1).nullable(),
  /** Derived parse signal in [0,1]. NOT a model probability. Zero when absent. */
  confidence: z.number().min(0).max(1),
  /**
   * 1-indexed line of the source document that produced the value, so a
   * reviewer can check the reading against the original. Null when absent.
   */
  sourceLine: z.number().int().positive().nullable(),
  /** Why confidence was reduced, in plain language. Empty when clean. */
  notes: z.array(z.string()),
});
export type RxField = z.infer<typeof rxFieldSchema>;

export const rxExtractionSchema = z.object({
  schemaVersion: z.literal(RX_EXTRACTION_SCHEMA_VERSION),
  capabilityId: z.literal(RX_CAPABILITY_ID),
  /** Fixture id. There is no code path where this is a real document. */
  corpusFixtureId: z.string().min(1),
  /** Always true. Serialized so no consumer can mistake this for real output. */
  synthetic: z.literal(true),
  status: z.enum(RX_STATUSES),
  prescriptionType: z.enum(RX_PRESCRIPTION_TYPES),
  signaturePresent: z.boolean(),
  fields: z.array(rxFieldSchema),
  /**
   * Document-integrity observations, per §6 of the prescription-intake agent's
   * SAFETY.md. Concerns to check, never conclusions — see `integrity.ts`. An
   * empty array means nothing was detected, NOT that the document is genuine.
   */
  integrityIndicators: z.array(
    z.object({
      id: z.enum(INTEGRITY_INDICATOR_IDS),
      detail: z.string().min(1),
      sourceLine: z.number().int().positive().nullable(),
    }),
  ),
  confidence: z.object({
    /** Mean of required-field confidences. A summary, not a decision input. */
    overallScore: z.number().min(0).max(1),
    requiresHumanReview: z.literal(true),
    lowConfidenceFields: z.array(z.enum(RX_FIELD_KEYS)),
    missingFields: z.array(z.enum(RX_FIELD_KEYS)),
  }),
  warnings: z.array(z.string()),
});
export type RxExtraction = z.infer<typeof rxExtractionSchema>;

/**
 * `requiresHumanReview` is `z.literal(true)` above, and that is not an
 * oversight. This capability has no autonomous path: every draft it produces
 * requires a human disposition regardless of how cleanly it parsed. Making it a
 * literal means a future edit cannot quietly introduce an auto-accept branch
 * without failing type-check and the boundary test.
 */

/** Server-action request. A fixture id is the only accepted input. */
export const rxExtractionRequestSchema = z.object({
  corpusFixtureId: z.string().min(1).max(64),
});
export type RxExtractionRequest = z.infer<typeof rxExtractionRequestSchema>;
