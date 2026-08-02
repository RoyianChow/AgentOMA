import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

import { loadSandboxEnv } from "./src/env/server";
import { SANDBOX_HEADERS } from "./src/security/headers";

// Build-time validation is intentional. A sandbox build is not valid without
// explicit synthetic configuration and a recorded G1 decision.
const sandboxEnv = loadSandboxEnv({ phase: "build" });

const nextConfig: NextConfig = {
  distDir: ".next-sandbox",
  turbopack: {
    // A local workspace install keeps Next inside this boundary. This avoids
    // giving Turbopack a repository-wide filesystem root.
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  generateBuildId: async () => `sandbox-${sandboxEnv.instanceId.toLowerCase()}`,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...SANDBOX_HEADERS],
      },
    ];
  },
};

export default nextConfig;
