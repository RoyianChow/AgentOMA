import type { Metadata } from "next";
import SelfCheckFlow from "./SelfCheckFlow";

export const metadata: Metadata = {
  title: "Minor ailment self-check | AgentOMA",
  description:
    "A private, pharmacy-agnostic self-check to prepare for a conversation with an Ontario pharmacist.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SelfCheckPage() {
  return <SelfCheckFlow />;
}
