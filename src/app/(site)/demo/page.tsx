import type { Metadata } from "next";

import DemoExperience from "./DemoExperience";

export const metadata: Metadata = {
  title: "Guided product demo — AgentOMA",
  description:
    "Explore AgentOMA's pharmacy workflow using a synthetic, read-only guided tour.",
};

export default function DemoPage() {
  return <DemoExperience />;
}
