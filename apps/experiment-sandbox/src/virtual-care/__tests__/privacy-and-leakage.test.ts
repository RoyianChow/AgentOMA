import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { allVirtualCareFixtures } from "../fixtures";
import { evaluateVirtualCareScene } from "../visit-server";

const virtualCareSourceRoot = fileURLToPath(new URL("..", import.meta.url));
const virtualCareUiRoot = fileURLToPath(
  new URL("../../app/virtual-care", import.meta.url),
);

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const sourceFiles = [...filesUnder(virtualCareSourceRoot), ...filesUnder(virtualCareUiRoot)]
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !file.includes(`${join("__tests__", "")}`));
const combinedSource = sourceFiles.map((file) => readFileSync(file, "utf8")).join("\n");

describe("privacy and leakage — source-level enforcement", () => {
  it("never imports browser storage, analytics, telemetry, or session-replay APIs", () => {
    expect(combinedSource).not.toMatch(
      /(?:localStorage|sessionStorage|indexedDB|serviceWorker|navigator\.sendBeacon)/i,
    );
    expect(combinedSource).not.toMatch(
      /(?:from|import)\s*["'][^"']*(?:posthog|segment|sentry|mixpanel|amplitude|hotjar|fullstory)[^"']*["']/i,
    );
  });

  it("never calls console.* — this feature follows the repo's payload-free logging discipline", () => {
    expect(combinedSource).not.toMatch(/console\.\w+\s*\(/);
  });

  it("never references raw SDP, ICE, TURN, or vendor webhook secret material", () => {
    expect(combinedSource).not.toMatch(/\bsdp\b|\bice[Cc]andidate\b|turnCredential|turnSecret/);
    expect(combinedSource).not.toMatch(/webhookSecret|vendorSecret/);
  });

  it("never puts a client-safe scene value into a URL query string", () => {
    const queryStringConstructions = combinedSource.match(/href=\{[^}]*\?[^}]*\}/g) ?? [];
    expect(queryStringConstructions).toEqual([]);
  });

  it("never reads process.env outside the sanctioned server validator", () => {
    const offenders = sourceFiles
      .filter((file) => !file.endsWith(join("env", "server.ts")))
      .filter((file) => /process\.env/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("keeps every safe scene snapshot free of PHI-shaped or non-synthetic identifiers", () => {
    for (const world of allVirtualCareFixtures()) {
      const scene = evaluateVirtualCareScene(world.scenario, {
        actorRef: world.patientActorRef,
        claimedRole: "patient",
        trustedNowUtc: "2026-08-11T15:00:00.000Z",
      });
      expect(scene.found).toBe(true);
      if (!scene.found) continue;
      const serialized = JSON.stringify(scene.snapshot);
      // Health-card-shaped digit runs, emails, and phone numbers must never appear.
      expect(serialized).not.toMatch(/\b\d{10}\b/);
      expect(serialized).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      expect(serialized).not.toMatch(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    }
  });

  it("never sets a shared-cacheable response header anywhere in this feature", () => {
    expect(combinedSource).not.toMatch(/Cache-Control['"]?\s*:\s*['"]?public/);
  });

  it("has no recording or transcription capability that could be enabled in production", () => {
    expect(combinedSource.toLowerCase()).not.toMatch(/getusermedia|mediarecorder|transcri/);
  });

  it("cannot be enabled outside this sandbox — no production import path exists into it", () => {
    // Mirrors the sandbox's own G3 allowlist invariant: production code must
    // never import from this synthetic feature, and this feature must never
    // import production modules.
    expect(combinedSource).not.toMatch(/from\s+["']@\//);
    expect(combinedSource).not.toMatch(/(?:\.\.\/){2,}src[\\/]/);
  });
});
