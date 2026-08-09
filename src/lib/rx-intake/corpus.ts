import type { RxFieldKey } from "./contract";

/**
 * The synthetic corpus for AI-RX-06.
 *
 * Every name, CPSO number, phone number, and date below is invented. There is
 * no real prescriber, no real patient, and no real prescription here, and
 * nothing in this file may ever be replaced with a transcription of a real
 * document — that would put PHI in the repository, in git history, and in every
 * developer's checkout at once.
 *
 * Names are drawn from obviously-fictional stock ("Sample", "Testerson") and
 * CPSO numbers use the reserved 99xxxx range that the College does not issue.
 * The phone numbers are 555-01xx, reserved for fiction.
 *
 * `text` simulates OCR output rather than clean typing, because a parser tested
 * only on clean text proves nothing about the case it exists to handle. The
 * noise is the realistic kind: `0`/`O` and `1`/`l` confusion, dropped diacritics,
 * smeared characters, and inconsistent label spacing.
 */

export type RxCorpusFixture = {
  id: string;
  /** Shown in the picker. Says what the case exercises, not what it contains. */
  label: string;
  /** What this fixture is here to prove. Shown to the reviewer. */
  intent: string;
  /** Simulated OCR text. Line numbers in extraction output index into this. */
  text: string;
  /**
   * What a correct parse looks like — the fixture's ground truth, used by the
   * parser tests. `null` means the field genuinely is not in the document and
   * the parser is expected to report it missing rather than guess.
   */
  expected: Partial<Record<RxFieldKey, string | null>>;
};

export const RX_CORPUS: readonly RxCorpusFixture[] = [
  {
    id: "clean-001",
    label: "Clean scan — all fields present",
    intent:
      "Baseline. Every required field is legible, so the parser should reach high confidence and report no missing fields.",
    text: [
      "RIVERBEND FAMILY HEALTH TEAM",
      "128 Sample Street, Toronto ON  M5V 0A1",
      "Tel: 416-555-0142   Fax: 416-555-0143",
      "",
      "Patient: Jordan Sample",
      "DOB: 1984-03-11",
      "",
      "Rx",
      "Amoxicillin 500 mg capsule",
      "Sig: 1 capsule PO TID x 7 days",
      "Qty: 21",
      "Repeats: 0",
      "",
      "Date: 2026-07-14",
      "Dr. Alexis Testerson, MD",
      "CPSO #: 998412",
      "Signature: A. Testerson",
    ].join("\n"),
    expected: {
      patientName: "Jordan Sample",
      patientDob: "1984-03-11",
      prescriberName: "Alexis Testerson",
      prescriberLicence: "998412",
      prescriberPhone: "416-555-0142",
      medicationName: "Amoxicillin",
      medicationStrength: "500 mg",
      medicationForm: "capsule",
      directions: "1 capsule PO TID x 7 days",
      quantity: "21",
      repeats: "0",
      writtenDate: "2026-07-14",
    },
  },
  {
    id: "noisy-002",
    label: "Degraded fax — character-level OCR noise",
    intent:
      "Digit/letter confusion in the strength and CPSO number. The parser should still extract, but must flag the affected fields rather than silently normalising them.",
    text: [
      "NORTHSIDE WALK-IN CL1NIC",
      "Tel: 6l3-555-0177",
      "",
      "Patient:  Rowan Examplebury",
      "D.0.B.  1971-11-02",
      "",
      "Rx:  Metfonnin  5OO mg  tablet",
      "Sig:  1 tab PO BID with meals",
      "Qty  6O",
      "Rpt: 3",
      "",
      "Written:  2026-06-28",
      "Dr. Sam Placeholder",
      "CPSO 99O357",
      "Signed: S. Placeholder",
    ].join("\n"),
    expected: {
      patientName: "Rowan Examplebury",
      patientDob: "1971-11-02",
      prescriberName: "Sam Placeholder",
      prescriberLicence: "99O357",
      prescriberPhone: "6l3-555-0177",
      medicationName: "Metfonnin",
      medicationStrength: "5OO mg",
      medicationForm: "tablet",
      directions: "1 tab PO BID with meals",
      quantity: "6O",
      repeats: "3",
      writtenDate: "2026-06-28",
    },
  },
  {
    id: "missing-003",
    label: "Incomplete — no quantity, no signature",
    intent:
      "Two required elements are absent. The parser must report them missing and must not infer a quantity from the directions.",
    text: [
      "LAKESHORE MEDICAL ASSOCIATES",
      "Tel: 905-555-0119",
      "",
      "Patient: Casey Fictional",
      "DOB: 1995-08-22",
      "",
      "Rx",
      "Hydrocortisone 1% cream",
      "Sig: Apply thin layer to affected area BID",
      "",
      "Date: 2026-07-02",
      "Dr. Morgan Notreal",
      "CPSO #: 997120",
    ].join("\n"),
    expected: {
      patientName: "Casey Fictional",
      patientDob: "1995-08-22",
      prescriberName: "Morgan Notreal",
      prescriberLicence: "997120",
      prescriberPhone: "905-555-0119",
      medicationName: "Hydrocortisone",
      medicationStrength: "1%",
      medicationForm: "cream",
      directions: "Apply thin layer to affected area BID",
      quantity: null,
      repeats: null,
      writtenDate: "2026-07-02",
    },
  },
  {
    id: "controlled-004",
    label: "Controlled substance — mandatory review path",
    intent:
      "A narcotic. Classification must force review and prescriber verification even when every field parses cleanly.",
    text: [
      "CENTRETOWN PAIN CLINIC",
      "Tel: 613-555-0188",
      "",
      "Patient: Avery Synthetic",
      "DOB: 1962-01-30",
      "",
      "Rx",
      "Oxycodone 5 mg tablet",
      "Sig: 1 tablet PO q6h PRN severe pain",
      "Qty: 20",
      "Repeats: 0",
      "",
      "Date: 2026-07-19",
      "Dr. Reese Hypothetical",
      "CPSO #: 996538",
      "Signature: R. Hypothetical",
      "** DUPLICATE PRESCRIPTION PROGRAM **",
    ].join("\n"),
    expected: {
      patientName: "Avery Synthetic",
      patientDob: "1962-01-30",
      prescriberName: "Reese Hypothetical",
      prescriberLicence: "996538",
      prescriberPhone: "613-555-0188",
      medicationName: "Oxycodone",
      medicationStrength: "5 mg",
      medicationForm: "tablet",
      directions: "1 tablet PO q6h PRN severe pain",
      quantity: "20",
      repeats: "0",
      writtenDate: "2026-07-19",
    },
  },
  {
    id: "contradictory-005",
    label: "Internally contradictory — two written dates",
    intent:
      "The document states two different dates. The parser must surface the conflict and must NOT decide which one is correct — that is a human judgement, and Task 10 prohibits delegating it.",
    text: [
      "HARBOURFRONT FAMILY PRACTICE",
      "Tel: 416-555-0166",
      "",
      "Patient: Quinn Placeholder",
      "DOB: 2001-05-17",
      "",
      "Rx",
      "Cephalexin 250 mg capsule",
      "Sig: 1 capsule PO QID x 10 days",
      "Qty: 40",
      "Repeats: 1",
      "",
      "Date: 2026-05-04",
      "Date written: 2026-06-04",
      "Dr. Harper Invented",
      "CPSO #: 995901",
      "Signature: H. Invented",
    ].join("\n"),
    expected: {
      patientName: "Quinn Placeholder",
      patientDob: "2001-05-17",
      prescriberName: "Harper Invented",
      prescriberLicence: "995901",
      prescriberPhone: "416-555-0166",
      medicationName: "Cephalexin",
      medicationStrength: "250 mg",
      medicationForm: "capsule",
      directions: "1 capsule PO QID x 10 days",
      quantity: "40",
      repeats: "1",
      writtenDate: "2026-05-04",
    },
  },
  {
    id: "altered-006",
    label: "Numeral/word disagreement — quantity and repeats",
    intent:
      "The figures and the written words disagree on both quantity and repeats. The parser must flag both as integrity concerns without deciding which value is correct, and without calling it fraud.",
    text: [
      "WESTVIEW COMMUNITY HEALTH CENTRE",
      "Tel: 519-555-0134",
      "",
      "Patient: Devon Notional",
      "DOB: 1988-09-14",
      "",
      "Rx",
      "Naproxen 250 mg tablet",
      "Sig: 1 tablet PO BID with food",
      "Qty: 90 (thirty)",
      "Repeats: 5 (one)",
      "",
      "Date: 2026-07-21",
      "Dr. Jamie Fabricated",
      "CPSO #: 994277",
      "Signature: J. Fabricated",
    ].join("\n"),
    expected: {
      patientName: "Devon Notional",
      patientDob: "1988-09-14",
      prescriberName: "Jamie Fabricated",
      prescriberLicence: "994277",
      prescriberPhone: "519-555-0134",
      medicationName: "Naproxen",
      medicationStrength: "250 mg",
      medicationForm: "tablet",
      directions: "1 tablet PO BID with food",
      quantity: "90",
      repeats: "5",
      writtenDate: "2026-07-21",
    },
  },
  {
    id: "mismatch-007",
    label: "Signature surname differs from printed prescriber",
    intent:
      "The printed prescriber and the signature are different people. The parser must report the discrepancy as an observation, leaving the explanation — locum, co-signer, or alteration — to the pharmacist.",
    text: [
      "GREENFIELD MEDICAL CENTRE",
      "Tel: 705-555-0122",
      "",
      "Patient: Sasha Imaginary",
      "DOB: 1979-02-08",
      "",
      "Rx",
      "Ramipril 5 mg capsule",
      "Sig: 1 capsule PO daily",
      "Qty: 30",
      "Repeats: 2",
      "",
      "Date: 2026-07-30",
      "Dr. Kiran Nonexistent",
      "CPSO #: 993610",
      "Signature: P. Wholly-Different",
    ].join("\n"),
    expected: {
      patientName: "Sasha Imaginary",
      patientDob: "1979-02-08",
      prescriberName: "Kiran Nonexistent",
      prescriberLicence: "993610",
      prescriberPhone: "705-555-0122",
      medicationName: "Ramipril",
      medicationStrength: "5 mg",
      medicationForm: "capsule",
      directions: "1 capsule PO daily",
      quantity: "30",
      repeats: "2",
      writtenDate: "2026-07-30",
    },
  },
  {
    id: "unidentified-008",
    label: "No clinic identifier, mixed date formats",
    intent:
      "A bare page with no letterhead and no phone, and two different date formats. The prescriber's origin cannot be established from the document, and the parser must say so rather than proceed quietly.",
    text: [
      "Patient: Alex Pretend",
      "DOB: 1990-06-25",
      "",
      "Rx",
      "Cetirizine 10 mg tablet",
      "Sig: 1 tablet PO daily PRN",
      "Qty: 30",
      "Repeats: 0",
      "",
      "Date: 2026-08-03",
      "Reviewed 04/08/2026",
      "Dr. Robin Invented",
      "CPSO #: 992845",
      "Signature: R. Invented",
    ].join("\n"),
    expected: {
      patientName: "Alex Pretend",
      patientDob: "1990-06-25",
      prescriberName: "Robin Invented",
      prescriberLicence: "992845",
      prescriberPhone: null,
      medicationName: "Cetirizine",
      medicationStrength: "10 mg",
      medicationForm: "tablet",
      directions: "1 tablet PO daily PRN",
      quantity: "30",
      repeats: "0",
      writtenDate: "2026-08-03",
    },
  },
];

export function findFixture(id: string): RxCorpusFixture | undefined {
  return RX_CORPUS.find((fixture) => fixture.id === id);
}

/** Picker metadata. Excludes `text` and `expected` so the UI cannot leak ground truth. */
export function listFixtureSummaries(): Array<
  Pick<RxCorpusFixture, "id" | "label" | "intent">
> {
  return RX_CORPUS.map(({ id, label, intent }) => ({ id, label, intent }));
}
