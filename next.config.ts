import type { NextConfig } from "next";

// Validate environment variables at build/start time so a misconfigured deploy
// fails fast instead of surfacing as a runtime error in front of a pharmacist.
import "./src/env";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
