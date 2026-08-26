import { describe, expect, it } from "vitest";

import {
  evaluateDependencyPolicy,
  extractDependencyFindings,
  type DependencyException,
  type DependencyFinding,
  type RegisteredDependencyFinding,
} from "../dependency-audit";

const NOW = new Date("2026-08-26T07:00:00.000Z");
const FINDING: DependencyFinding = {
  key: "example-package:GHSA-AAAA-BBBB-CCCC",
  advisoryId: "GHSA-AAAA-BBBB-CCCC",
  packageName: "example-package",
  severity: "moderate",
  title: "Synthetic development-server finding",
  url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc",
};
const REGISTERED: RegisteredDependencyFinding = {
  key: FINDING.key,
  advisoryId: FINDING.advisoryId,
  packageName: FINDING.packageName,
  severity: FINDING.severity,
  exposure: "development",
  status: "OPEN",
  owner: "Task 11 dependency-security workstream",
  rationale: "Synthetic fixture for policy tests.",
  dependencyPath: "synthetic-tool > example-package",
};

function exception(
  overrides: Partial<DependencyException> = {},
): DependencyException {
  return {
    findingKey: FINDING.key,
    advisoryId: FINDING.advisoryId,
    packageName: FINDING.packageName,
    severity: FINDING.severity,
    exposure: "development",
    impact: "general",
    owner: "Synthetic owner",
    rationale: "Synthetic scoped exception.",
    dependencyPath: "synthetic-tool > example-package",
    compensatingControls: ["Network-denied synthetic test environment"],
    approvedBy: "Independent synthetic reviewer",
    approvedRole: "Security reviewer",
    independentReview: true,
    approvedAt: "2026-08-25T00:00:00.000Z",
    expiresAt: "2026-09-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("dependency audit policy", () => {
  it("extracts concrete advisories without counting propagated package names", () => {
    const findings = extractDependencyFindings({
      vulnerabilities: {
        "example-package": {
          name: "example-package",
          via: [
            {
              source: 123,
              name: "example-package",
              dependency: "example-package",
              title: "Synthetic development-server finding",
              url: FINDING.url,
              severity: "moderate",
            },
            "transitive-parent",
          ],
        },
        "transitive-parent": {
          name: "transitive-parent",
          via: ["example-package"],
        },
      },
    });

    expect(findings).toEqual([FINDING]);
  });

  it("passes a registered open finding without calling it resolved", () => {
    const result = evaluateDependencyPolicy({
      findings: [FINDING],
      registered: [REGISTERED],
      exceptions: [],
      now: NOW,
    });

    expect(result.violations).toEqual([`UNEXCEPTED_OPEN_FINDING:${FINDING.key}`]);
    expect(result.activeFindings).toEqual([FINDING.key]);
    expect(result.resolvedRegisteredFindings).toEqual([]);
  });

  it("fails a new or severity-escalated finding", () => {
    expect(
      evaluateDependencyPolicy({
        findings: [FINDING],
        registered: [],
        exceptions: [],
        now: NOW,
      }).violations,
    ).toEqual([`NEW_FINDING:${FINDING.key}`]);

    expect(
      evaluateDependencyPolicy({
        findings: [{ ...FINDING, severity: "high" }],
        registered: [REGISTERED],
        exceptions: [],
        now: NOW,
      }).violations,
    ).toEqual([`SEVERITY_ESCALATION:${FINDING.key}`]);
  });

  it("accepts only an exact, independently reviewed, unexpired exception", () => {
    expect(
      evaluateDependencyPolicy({
        findings: [FINDING],
        registered: [],
        exceptions: [exception()],
        now: NOW,
      }).violations,
    ).toEqual([]);

    expect(
      evaluateDependencyPolicy({
        findings: [FINDING],
        registered: [],
        exceptions: [exception({ expiresAt: "2026-08-26T06:59:59.000Z" })],
        now: NOW,
      }).violations,
    ).toEqual([`EXCEPTION_EXPIRED_OR_INVALID:${FINDING.key}`]);

    expect(
      evaluateDependencyPolicy({
        findings: [FINDING],
        registered: [],
        exceptions: [exception({ findingKey: "example-package:*" })],
        now: NOW,
      }).violations,
    ).toEqual([
      "EXCEPTION_SCOPE_NOT_EXACT:example-package:*",
      `NEW_FINDING:${FINDING.key}`,
      "ORPHANED_EXCEPTION:example-package:*",
    ]);
  });

  it("rejects wildcard exception scopes even when no finding uses them", () => {
    expect(
      evaluateDependencyPolicy({
        findings: [],
        registered: [],
        exceptions: [exception({ findingKey: "example-package:*" })],
        now: NOW,
      }).violations,
    ).toEqual([
      "EXCEPTION_SCOPE_NOT_EXACT:example-package:*",
      "ORPHANED_EXCEPTION:example-package:*",
    ]);
  });

  it("never permits critical or high production-runtime exceptions", () => {
    for (const [severity, exposure] of [
      ["critical", "development"],
      ["high", "production"],
    ] as const) {
      const finding = { ...FINDING, severity };
      expect(
        evaluateDependencyPolicy({
          findings: [finding],
          registered: [],
          exceptions: [exception({ severity, exposure })],
          now: NOW,
        }).violations,
      ).toEqual([`NON_WAIVABLE_FINDING:${FINDING.key}`]);
    }
  });

  it("never permits exceptions for protected security-impact categories", () => {
    for (const impact of [
      "phi_or_secret_disclosure",
      "auth_or_authorization_bypass",
      "tenant_escape",
      "unsafe_production_enablement",
    ] as const) {
      expect(
        evaluateDependencyPolicy({
          findings: [FINDING],
          registered: [],
          exceptions: [exception({ impact })],
          now: NOW,
        }).violations,
      ).toEqual([`NON_WAIVABLE_FINDING:${FINDING.key}`]);
    }
  });
});
