import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/env";
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
  /**
   * P0-A is a hard production gate. The shared clinical content has not yet
   * received pharmacist sign-off, so this route is intentionally impossible to
   * reach in a production build. Enabling it later requires a reviewed code
   * change after that sign-off; it is not a deploy-time toggle.
   */
  if (env.NODE_ENV === "production") {
    notFound();
  }

  return <SelfCheckFlow />;
}
