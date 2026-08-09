export type SyntheticFixture = {
  id: "SYNTH-FIXTURE-001";
  title: "Synthetic workflow review";
  status: "SIMULATION ONLY";
  summary: "A non-clinical workflow fixture for sandbox boundary testing.";
};

export const SYNTHETIC_FIXTURE: Readonly<SyntheticFixture> = Object.freeze({
  id: "SYNTH-FIXTURE-001",
  title: "Synthetic workflow review",
  status: "SIMULATION ONLY",
  summary: "A non-clinical workflow fixture for sandbox boundary testing.",
});

export const TASK04_SYNTHETIC_REFERENCES = Object.freeze({
  patient: "SYNTH-PATIENT-TASK04-0001",
  delegate: "SYNTH-DELEGATE-TASK04-0001",
  pharmacist: "SYNTH-PHARMACIST-TASK04-0001",
  systemWorker: "SYNTH-WORKER-TASK04-0001",
  contact: "SYNTH-CONTACT-TASK04-0001",
  delegationGrant: "SYNTH-DELEGATION-TASK04-0001",
});

export function getSyntheticFixture(): SyntheticFixture {
  return { ...SYNTHETIC_FIXTURE };
}
