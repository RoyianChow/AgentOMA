import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The experiment has its own strict ESLint configuration and gate. Keep
    // the production lint file set stable while the separate workspace grows.
    "apps/experiment-sandbox/**",
    // Impeccable installs the same vendor-owned skill runtime for each agent.
    // Its scripts are checked upstream and are not part of this application's
    // TypeScript/ESLint boundary.
    ".agents/skills/**",
    ".claude/skills/**",
    ".cursor/agents/**",
    ".cursor/skills/**",
    ".gemini/**",
    ".github/agents/**",
    ".github/skills/**",
  ]),
]);

export default eslintConfig;
