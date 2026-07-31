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

export function getSyntheticFixture(): SyntheticFixture {
  return { ...SYNTHETIC_FIXTURE };
}
