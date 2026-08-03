import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { resetSensitiveAssessmentState } from "@/lib/assessment-sensitive-state";
import { PHARMACIST_ROUTE_HEADERS } from "@/lib/phi-route-security";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PHARMACIST_ROOT = fileURLToPath(
  new URL("../../app/(dashboard)/pharmacist/", import.meta.url),
);
const WORKSPACE_PATH = fileURLToPath(
  new URL(
    "../../app/(dashboard)/pharmacist/assessment/AssessmentWorkspace.tsx",
    import.meta.url,
  ),
);
const ASSESSMENT_ACTIONS_PATH = fileURLToPath(
  new URL("../../app/(dashboard)/pharmacist/actions.ts", import.meta.url),
);
const ASSESSMENT_BOUNDARY_PATH = fileURLToPath(
  new URL("../p0-c-boundary-schema.ts", import.meta.url),
);
const ASSESSMENT_PAGE_PATH = fileURLToPath(
  new URL(
    "../../app/(dashboard)/pharmacist/assessment/page.tsx",
    import.meta.url,
  ),
);

function sourceFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const fullPath = `${path}/${entry}`;
    if (statSync(fullPath).isDirectory()) return sourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry) && !entry.includes(".test.")
      ? [fullPath]
      : [];
  });
}

describe("authenticated pharmacist PHI lifecycle", () => {
  it("resets every sensitive assessment branch to its safe default", () => {
    const setters = {
      setFirstName: vi.fn(),
      setLastName: vi.fn(),
      setDob: vi.fn(),
      setHealthNumber: vi.fn(),
      setIdentifierType: vi.fn(),
      setIdentifierIssuer: vi.fn(),
      setDocumentInspected: vi.fn(),
      setDobError: vi.fn(),
      setHealthNumberError: vi.fn(),
      setGender: vi.fn(),
      setViewerChecked: vi.fn(),
      setViewerSource: vi.fn(),
      setMaximumState: vi.fn(),
      setSystemCount: vi.fn(),
      setSystemMaximum: vi.fn(),
      setOutcome: vi.fn(),
      setModality: vi.fn(),
      setVirtualLocation: vi.fn(),
      setRemoteReason: vi.fn(),
      setLtcResident: vi.fn(),
      setLtcProviderRole: vi.fn(),
      setLtcIsEmergency: vi.fn(),
      resetClinical: vi.fn(),
      setIsOdbRecipient: vi.fn(),
      setSelfOrFamily: vi.fn(),
      setSameAilmentPrescription: vi.fn(),
      setVerificationConsultation: vi.fn(),
      setPatientSelfReportLocation: vi.fn(),
      setError: vi.fn(),
    };

    resetSensitiveAssessmentState(setters);

    const expectedCalls: Array<[keyof typeof setters, unknown]> = [
      ["setFirstName", ""],
      ["setLastName", ""],
      ["setDob", ""],
      ["setHealthNumber", ""],
      ["setIdentifierType", "ohip_health_number"],
      ["setIdentifierIssuer", ""],
      ["setDocumentInspected", false],
      ["setDobError", null],
      ["setHealthNumberError", null],
      ["setGender", ""],
      ["setViewerChecked", false],
      ["setViewerSource", ""],
      ["setMaximumState", ""],
      ["setSystemCount", null],
      ["setSystemMaximum", null],
      ["setOutcome", "rx_issued"],
      ["setModality", "in_person"],
      ["setVirtualLocation", ""],
      ["setRemoteReason", ""],
      ["setLtcResident", false],
      ["setLtcProviderRole", ""],
      ["setLtcIsEmergency", false],
      ["setIsOdbRecipient", ""],
      ["setSelfOrFamily", ""],
      ["setSameAilmentPrescription", ""],
      ["setVerificationConsultation", ""],
      ["setPatientSelfReportLocation", ""],
      ["setError", null],
    ];

    for (const [setterName, value] of expectedCalls) {
      expect(setters[setterName]).toHaveBeenCalledTimes(1);
      expect(setters[setterName]).toHaveBeenCalledWith(value);
    }
    expect(setters.resetClinical).toHaveBeenCalledTimes(1);
  });

  it("clears sensitive state on success and every browser lifecycle exit", () => {
    const workspace = readFileSync(WORKSPACE_PATH, "utf8");
    const signOut = readFileSync(
      `${PHARMACIST_ROOT}/SignOutButton.tsx`,
      "utf8",
    );
    const switchLink = readFileSync(
      `${PHARMACIST_ROOT}/assessment/ClearSensitiveLink.tsx`,
      "utf8",
    );

    expect(workspace).toMatch(
      /resetSensitiveState\(\{ preservePersistedResult: true \}\);\s*setIsDone\(true\)/,
    );
    expect(workspace).toContain(
      "window.addEventListener(CLEAR_SENSITIVE_STATE_EVENT, clear)",
    );
    expect(workspace).toMatch(
      /new Date\(sessionExpiresAt\)\.getTime\(\)[\s\S]*window\.setTimeout\([\s\S]*clearAndLeave/,
    );
    expect(switchLink).toContain("onClick={requestSensitiveStateClear}");
    expect(signOut.indexOf("requestSensitiveStateClear();")).toBeGreaterThan(-1);
    expect(signOut.indexOf("requestSensitiveStateClear();")).toBeLessThan(
      signOut.indexOf("await authClient.signOut();"),
    );
  });

  it("does not persist, log, analyze, or place patient-entered state in URLs", () => {
    const clientSource = sourceFiles(PHARMACIST_ROOT)
      .map((file) => readFileSync(file, "utf8"))
      .filter((source) => /^\s*["']use client["'];/.test(source))
      .join("\n");

    expect(clientSource).not.toMatch(
      /(?:window\.)?(?:localStorage|sessionStorage|indexedDB)\s*[.[]/,
    );
    expect(clientSource).not.toMatch(/console\.(?:log|warn|error|debug)\s*\(/);
    expect(clientSource).not.toMatch(
      /(?:gtag\s*\(|analytics\s*\.|posthog\s*\.|mixpanel\s*\.|segment\s*\.)/i,
    );
    expect(clientSource).not.toMatch(/from\s+["']next\/script["']|<Script\b|<script\b/);
    expect(clientSource).not.toMatch(
      /(?:URLSearchParams|window\.location|history\.(?:pushState|replaceState))\s*[.(]/,
    );

    const sensitiveNames = [
      "firstName",
      "lastName",
      "dob",
      "healthNumber",
      "clinical",
      "virtualLocation",
      "remoteReason",
    ];
    for (const field of sensitiveNames) {
      expect(clientSource).not.toMatch(
        new RegExp(`href\\s*=\\s*\\{[^}]*\\b${field}\\b`),
      );
    }
  });

  it("disables autocomplete for the sensitive assessment form", () => {
    const workspace = readFileSync(WORKSPACE_PATH, "utf8");
    expect(workspace).toMatch(/<form[\s\S]*?autoComplete="off"/);
    for (const valueExpression of [
      "identifierIssuer",
      "firstName",
      "lastName",
      "dob",
      "healthNumber",
      "clinical.sdmName",
      "clinical.patientAddressLine1",
      "patientSelfReportLocation",
      "virtualLocation",
      "remoteReason",
    ]) {
      expect(workspace).toMatch(
        new RegExp(
          `value=\\{${valueExpression.replace(".", "\\.")}\\}[\\s\\S]{0,260}?autoComplete="off"`,
        ),
      );
    }
  });

  it("makes pharmacist responses private/no-store and blocks third-party scripts", () => {
    expect(PHARMACIST_ROUTE_HEADERS).toContainEqual({
      key: "Cache-Control",
      value: "private, no-store",
    });
    const csp = PHARMACIST_ROUTE_HEADERS.find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/https?:|\*/);

    const nextConfig = readFileSync(`${ROOT}/next.config.ts`, "utf8");
    expect(nextConfig).toContain('source: "/pharmacist/:path*"');
    expect(nextConfig).toContain("headers: [...PHARMACIST_ROUTE_HEADERS]");
  });

  it("has no client or server orientation-override path", () => {
    const sources = [
      readFileSync(WORKSPACE_PATH, "utf8"),
      readFileSync(ASSESSMENT_ACTIONS_PATH, "utf8"),
      readFileSync(ASSESSMENT_BOUNDARY_PATH, "utf8"),
      readFileSync(ASSESSMENT_PAGE_PATH, "utf8"),
    ].join("\n");

    expect(sources).not.toContain("orientationOverrideReason");
    expect(sources).not.toContain("assessment.orientation_override");
    expect(sources).not.toContain("canOverrideOrientation");
    expect(sources).not.toContain("Override & sign assessment");

    const actions = readFileSync(ASSESSMENT_ACTIONS_PATH, "utf8");
    expect(actions).toMatch(
      /if \(!prescriber\.orientationCompletedAt\) \{[\s\S]*?orientationRequired: true as const,[\s\S]*?\n    \}/,
    );
  });

  it("keeps the required assessment-created audit inside the completion transaction", () => {
    const actions = readFileSync(ASSESSMENT_ACTIONS_PATH, "utf8");
    const transactionStart = actions.indexOf(
      "const completion = await db.transaction(async (tx) => {",
    );
    const transactionEnd = actions.indexOf(
      "if (!completion.success)",
      transactionStart,
    );
    const transaction = actions.slice(transactionStart, transactionEnd);
    const afterTransaction = actions.slice(transactionEnd);

    expect(transactionStart).toBeGreaterThan(-1);
    expect(transactionEnd).toBeGreaterThan(transactionStart);
    expect(transaction).toContain("await writeAuditWith(tx, {");
    expect(transaction).toContain('"assessment.created.claim_drafted"');
    expect(transaction).toContain('"assessment.created.no_claim"');
    expect(afterTransaction).not.toContain('action: "assessment.created.');
  });
});
