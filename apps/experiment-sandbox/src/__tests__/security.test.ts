import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SANDBOX_HEADERS, SYNTHETIC_BANNER } from "../security/headers";

describe("sandbox response and transport safety", () => {
  it("requires private, marked, no-referrer responses", () => {
    const names = new Map(SANDBOX_HEADERS.map((header) => [header.key, header.value]));
    expect(names.get("Cache-Control")).toBe("private, no-store");
    expect(names.get("Referrer-Policy")).toBe("no-referrer");
    expect(names.get("X-Robots-Tag")).toContain("noindex");
    expect(names.get("Content-Security-Policy")).toContain("connect-src 'self'");
    expect(SYNTHETIC_BANNER).toContain("NOT FOR PATIENT CARE");
  });

  it("denies network transport before DNS/socket work", () => {
    const preload = fileURLToPath(new URL("../../tools/deny-egress.cjs", import.meta.url));
    const result = spawnSync(process.execPath, ["--require", preload, "-e", "require('node:dns').lookup('example.test', () => {})"], {
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("SBX_EGRESS_DENIED:EXTERNAL_TRANSPORT");
  });
});
