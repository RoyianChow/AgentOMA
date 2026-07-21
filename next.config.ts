import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Validate environment variables at build/start time so a misconfigured deploy
// fails fast instead of surfacing as a runtime error in front of a pharmacist.
import "./src/env";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to THIS project. A stray lockfile in a
  // parent directory (e.g. ~/pnpm-lock.yaml) otherwise makes Turbopack infer
  // the wrong root and 404 every route. See the multi-lockfile warning.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
