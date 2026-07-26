export type DemoStage = {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  summary: string;
  screenTitle: string;
  status: string;
  fields: ReadonlyArray<{
    label: string;
    value: string;
    emphasis?: boolean;
  }>;
  callout: string;
};

export const DEMO_BOUNDARY = [
  "Synthetic example — no real patient",
  "Nothing is saved to any record",
  "No portal access or claim submission",
] as const;

/**
 * The three-step patient side of the walk-in flow, shown as a quick strip above
 * the detailed tour. Deliberately plain-language: this is what a patient in the
 * pharmacy actually does.
 */
export const PATIENT_STEPS = [
  {
    step: "1",
    title: "Scan at the counter",
    body: "Point your phone at the pharmacy's code — no app, no account, no sign-up.",
  },
  {
    step: "2",
    title: "Answer a few questions",
    body: "Plain-language questions narrow what's going on to one of the funded conditions. It never asks for your name, birth date, or health card.",
  },
  {
    step: "3",
    title: "Hand a code to the pharmacist",
    body: "You get a short reference code. Show it at the counter and the pharmacist picks up exactly where you left off.",
  },
] as const;

/**
 * Synthetic walk-in journey — a made-up "pink eye" visit — walked end to end so
 * both sides of the counter are clear. No real PINs, fees, or patient data
 * appear here; billing values are described, never shown (the live workflow
 * resolves them from effective-dated reference data).
 */
export const DEMO_STAGES: ReadonlyArray<DemoStage> = [
  {
    id: "handoff",
    navLabel: "Walk-in self-check",
    eyebrow: "Stage 1 of 5",
    title: "A walk-in patient starts the assessment on their own phone",
    summary:
      "In the waiting area the patient scans the pharmacy's code and answers a few plain-language questions. The tool narrows their concern to one of Ontario's funded minor ailments and hands the pharmacist a head start — with zero identifying data collected.",
    screenTitle: "Intake queue",
    status: "Waiting for pharmacist",
    fields: [
      { label: "Reference code", value: "PNK-24", emphasis: true },
      { label: "Self-reported concern", value: "Pink eye (example)" },
      { label: "Patient identity", value: "Not collected on the phone" },
      { label: "Data state", value: "Synthetic preview only" },
    ],
    callout:
      "The phone never holds a name, birth date, or health card. Identity is entered from the physical card only at the authenticated pharmacist desk.",
  },
  {
    id: "record",
    navLabel: "Pharmacist review",
    eyebrow: "Stage 2 of 5",
    title: "The pharmacist opens the intake and verifies in person",
    summary:
      "The pharmacist calls the reference code, keys identity from the health card, and reviews the patient's self-reported answers — then verifies the self-diagnosis and documents consent, history, findings, and the care plan in one structured record.",
    screenTitle: "Assessment workspace",
    status: "Documentation in progress",
    fields: [
      { label: "Loaded from", value: "Reference code PNK-24" },
      { label: "Assessment", value: "Pharmacist verifies the self-diagnosis" },
      { label: "Consent", value: "Method, giver, and time recorded" },
      { label: "Authorization", value: "Session, role, and pharmacy re-checked" },
    ],
    callout:
      "The self-check speeds the visit; it never replaces the pharmacist. The real server action re-verifies authorization — the navigation proxy is never an access boundary.",
  },
  {
    id: "claim",
    navLabel: "Claim handoff",
    eyebrow: "Stage 3 of 5",
    title: "A billable outcome produces a read-only claim draft",
    summary:
      "Whether a prescription is written or not, a completed assessment is a funded service. The billing fields are derived from the outcome and effective-dated reference data — the pharmacist types none of them.",
    screenTitle: "Claim draft",
    status: "Ready for hand-entry",
    fields: [
      { label: "PIN & fee", value: "Resolved from versioned reference data" },
      { label: "Prescriber fields", value: "Resolved from the signed-in profile" },
      { label: "Patient cost", value: "Covered by OHIP for eligible patients" },
      { label: "Submission", value: "Not submitted to HNS", emphasis: true },
    ],
    callout:
      "AgentOMA prepares and stores a draft for hand-entry into dispensing software — it does not submit a claim or guarantee payment. The patient may fill any prescription at the pharmacy of their choice.",
  },
  {
    id: "follow-up",
    navLabel: "Follow-up",
    eyebrow: "Stage 4 of 5",
    title: "The service continues after the patient leaves",
    summary:
      "Every billable completion creates a follow-up plan, so the pharmacist's duty of care stays visible even when the prescription is filled at another pharmacy.",
    screenTitle: "Follow-ups due",
    status: "Open",
    fields: [
      { label: "Due", value: "Two days after service — example" },
      { label: "Method", value: "Phone" },
      { label: "Monitoring", value: "Safety and efficacy review planned" },
      { label: "Attempt outcome", value: "Reached or not reached is recorded" },
    ],
    callout:
      "A not-reached attempt is valid documentation but does not close the plan. Corrections create a replacement and preserve the original.",
  },
  {
    id: "governance",
    navLabel: "Audit & governance",
    eyebrow: "Stage 5 of 5",
    title: "The record stays reviewable for a Ministry audit",
    summary:
      "Append-only audit evidence, immutable corrections, database-enforced retention, and complete exports give the pharmacy its defensible record if the Ministry reviews a claim.",
    screenTitle: "Record governance",
    status: "History preserved",
    fields: [
      { label: "Audit", value: "Append-only activity trail" },
      { label: "Corrections", value: "Supersede — never erase" },
      { label: "Patient export", value: "Complete versioned record" },
      { label: "Retention", value: "Computed and database-enforced" },
    ],
    callout:
      "This tour is read-only. The live governance area requires an authenticated pharmacy administrator and stays scoped to a single pharmacy.",
  },
];
