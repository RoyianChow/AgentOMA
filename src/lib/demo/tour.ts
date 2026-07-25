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
  "Synthetic information only",
  "Nothing is saved",
  "No portal access or HNS submission",
] as const;

export const DEMO_STAGES: ReadonlyArray<DemoStage> = [
  {
    id: "handoff",
    navLabel: "Patient handoff",
    eyebrow: "Stage 1 of 5",
    title: "A zero-identifying-data intake reaches the pharmacy",
    summary:
      "The patient-facing kiosk prepares a short-lived reference without collecting a name, birth date, or health number.",
    screenTitle: "Intake queue",
    status: "Waiting for pharmacist",
    fields: [
      { label: "Reference code", value: "DEMO24", emphasis: true },
      { label: "Patient identity", value: "Not collected" },
      { label: "Self-reported path", value: "Ready for pharmacist review" },
      { label: "Data state", value: "Synthetic preview only" },
    ],
    callout:
      "In the live workflow, identity is entered from the physical health card only at the authenticated pharmacist desk.",
  },
  {
    id: "record",
    navLabel: "Clinical record",
    eyebrow: "Stage 2 of 5",
    title: "The pharmacist documents a defensible assessment",
    summary:
      "The workspace brings consent, history, findings, shared decisions, care planning, and outcome evidence into one structured record.",
    screenTitle: "Assessment workspace",
    status: "Documentation in progress",
    fields: [
      { label: "Patient", value: "Sample patient — synthetic" },
      { label: "Consent", value: "Method, giver, and time recorded" },
      { label: "Clinical record", value: "Required sections complete" },
      { label: "Authorization", value: "Session, role, and pharmacy rechecked" },
    ],
    callout:
      "The real server action re-verifies authorization. The navigation proxy is never trusted as an access-control boundary.",
  },
  {
    id: "claim",
    navLabel: "Claim handoff",
    eyebrow: "Stage 3 of 5",
    title: "A billable outcome produces a read-only draft",
    summary:
      "Billing fields are derived from the completed assessment and effective-dated reference data; the pharmacist does not type them.",
    screenTitle: "Claim draft",
    status: "Ready for hand-entry",
    fields: [
      { label: "PIN", value: "Resolved from versioned reference data" },
      { label: "Fee", value: "Resolved from the applicable reference row" },
      { label: "Prescriber fields", value: "Resolved from the signed-in profile" },
      { label: "Submission", value: "Not submitted to HNS", emphasis: true },
    ],
    callout:
      "The live panel is for hand-entry into dispensing software. AgentOMA prepares and stores a draft; it does not submit a claim.",
  },
  {
    id: "follow-up",
    navLabel: "Follow-up",
    eyebrow: "Stage 4 of 5",
    title: "The service continues after the assessment",
    summary:
      "Every billable completion creates a follow-up plan so due work remains visible even when a prescription is filled elsewhere.",
    screenTitle: "Follow-ups due",
    status: "Open",
    fields: [
      { label: "Due", value: "Two days after service — demo" },
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
    title: "The record stays reviewable after the visit",
    summary:
      "Append-only audit evidence, immutable corrections, retention controls, and complete exports support pharmacy review and governance.",
    screenTitle: "Record governance",
    status: "History preserved",
    fields: [
      { label: "Audit", value: "Append-only activity trail" },
      { label: "Corrections", value: "Supersede — never erase" },
      { label: "Patient export", value: "Complete versioned record" },
      { label: "Retention", value: "Computed and database-enforced" },
    ],
    callout:
      "This tour is read-only. The live governance area requires an authenticated pharmacy administrator and remains pharmacy-scoped.",
  },
];
