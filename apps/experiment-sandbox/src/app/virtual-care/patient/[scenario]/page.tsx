import { loadSandboxEnv } from "../../../../env/server";
import { requireLocalActive } from "../../../../lifecycle/state";
import { runVirtualCareSceneAction } from "../../../../virtual-care/actions";
import { evaluateVirtualCareScene } from "../../../../virtual-care/visit-server";
import { NotFoundBanner } from "../../scene-components";
import { PatientScene } from "./patient-scene";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INITIAL_REQUEST = {
  actorRef: "SYNTH-PATIENT-006-0001",
  claimedRole: "patient",
  trustedNowUtc: "2026-08-11T15:00:00.000Z",
};

export default async function VirtualCarePatientScenarioPage({
  params,
}: Readonly<{ params: Promise<{ scenario: string }> }>) {
  const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
  requireLocalActive(env);
  const { scenario } = await params;
  const initial = evaluateVirtualCareScene(scenario, INITIAL_REQUEST);

  return (
    <section className="card" aria-labelledby="patient-scene-title">
      <div className="eyebrow">Synthetic patient experience</div>
      <h1 id="patient-scene-title">Patient view</h1>
      {initial.found ? (
        <PatientScene scenario={scenario} initial={initial} runSceneAction={runVirtualCareSceneAction} />
      ) : (
        <NotFoundBanner />
      )}
    </section>
  );
}
