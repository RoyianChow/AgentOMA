import { loadSandboxEnv } from "../../../../env/server";
import { requireLocalActive } from "../../../../lifecycle/state";
import { runVirtualCareSceneAction } from "../../../../virtual-care/actions";
import { evaluateVirtualCareScene } from "../../../../virtual-care/visit-server";
import { NotFoundBanner } from "../../scene-components";
import { PharmacistScene } from "./pharmacist-scene";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INITIAL_REQUEST = {
  actorRef: "SYNTH-PHARMACIST-006-0001",
  claimedRole: "pharmacist",
  trustedNowUtc: "2026-08-11T15:00:00.000Z",
};

export default async function VirtualCarePharmacistScenarioPage({
  params,
}: Readonly<{ params: Promise<{ scenario: string }> }>) {
  const env = loadSandboxEnv({ phase: "startup", allowExpired: true });
  requireLocalActive(env);
  const { scenario } = await params;
  const initial = evaluateVirtualCareScene(scenario, INITIAL_REQUEST);

  return (
    <section className="card" aria-labelledby="pharmacist-scene-title">
      <div className="eyebrow">Synthetic pharmacist experience</div>
      <h1 id="pharmacist-scene-title">Pharmacist view</h1>
      {initial.found ? (
        <PharmacistScene scenario={scenario} initial={initial} runSceneAction={runVirtualCareSceneAction} />
      ) : (
        <NotFoundBanner />
      )}
    </section>
  );
}
