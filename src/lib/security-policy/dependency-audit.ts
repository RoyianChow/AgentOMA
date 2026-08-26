export type DependencySeverity =
  | "info"
  | "low"
  | "moderate"
  | "high"
  | "critical";

export type DependencyExposure = "development" | "production";

export type DependencyImpact =
  | "general"
  | "phi_or_secret_disclosure"
  | "auth_or_authorization_bypass"
  | "tenant_escape"
  | "unsafe_production_enablement";

export type DependencyFinding = {
  key: string;
  advisoryId: string;
  packageName: string;
  severity: DependencySeverity;
  title: string;
  url: string;
};

export type RegisteredDependencyFinding = {
  key: string;
  advisoryId: string;
  packageName: string;
  severity: DependencySeverity;
  exposure: DependencyExposure;
  status: "OPEN";
  owner: string;
  rationale: string;
  dependencyPath: string;
};

export type DependencyException = {
  findingKey: string;
  advisoryId: string;
  packageName: string;
  severity: DependencySeverity;
  exposure: DependencyExposure;
  impact: DependencyImpact;
  owner: string;
  rationale: string;
  dependencyPath: string;
  compensatingControls: string[];
  approvedBy: string;
  approvedRole: string;
  independentReview: true;
  approvedAt: string;
  expiresAt: string;
};

type NpmAuditAdvisory = {
  dependency?: unknown;
  name?: unknown;
  severity?: unknown;
  title?: unknown;
  url?: unknown;
  source?: unknown;
};

type NpmAuditVulnerability = {
  name?: unknown;
  via?: unknown;
};

type NpmAuditReport = {
  vulnerabilities?: unknown;
};

const SEVERITY_RANK: Record<DependencySeverity, number> = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const EXACT_TOKEN = /^[A-Za-z0-9@/_.:-]+$/;

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, "en-US", {
    sensitivity: "variant",
    numeric: false,
  });
}

function isSeverity(value: unknown): value is DependencySeverity {
  return (
    value === "info" ||
    value === "low" ||
    value === "moderate" ||
    value === "high" ||
    value === "critical"
  );
}

function isExposure(value: unknown): value is DependencyExposure {
  return value === "development" || value === "production";
}

function isImpact(value: unknown): value is DependencyImpact {
  return (
    value === "general" ||
    value === "phi_or_secret_disclosure" ||
    value === "auth_or_authorization_bypass" ||
    value === "tenant_escape" ||
    value === "unsafe_production_enablement"
  );
}

function advisoryId(advisory: NpmAuditAdvisory): string | null {
  if (typeof advisory.url === "string") {
    const match = advisory.url.match(/\/(GHSA-[A-Za-z0-9-]+)$/i);
    if (match?.[1]) return match[1].toUpperCase();
  }
  if (
    (typeof advisory.source === "number" ||
      typeof advisory.source === "string") &&
    String(advisory.source).length > 0
  ) {
    return `NPM-${String(advisory.source)}`;
  }
  return null;
}

/**
 * Extracts only concrete advisory objects from npm's report. npm also repeats
 * package names as strings while propagating severity up the dependency tree;
 * treating those strings as findings would count one advisory many times.
 */
export function extractDependencyFindings(
  report: NpmAuditReport,
): DependencyFinding[] {
  if (
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== "object" ||
    Array.isArray(report.vulnerabilities)
  ) {
    throw new Error("DEPENDENCY_AUDIT_DENIED:MALFORMED_REPORT");
  }

  const findings = new Map<string, DependencyFinding>();
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    if (!vulnerability || typeof vulnerability !== "object") continue;
    const candidate = vulnerability as NpmAuditVulnerability;
    if (!Array.isArray(candidate.via)) continue;

    for (const via of candidate.via) {
      if (!via || typeof via !== "object") continue;
      const advisory = via as NpmAuditAdvisory;
      const id = advisoryId(advisory);
      const packageName =
        typeof advisory.dependency === "string"
          ? advisory.dependency
          : typeof advisory.name === "string"
            ? advisory.name
            : typeof candidate.name === "string"
              ? candidate.name
              : null;
      if (
        !id ||
        !packageName ||
        !isSeverity(advisory.severity) ||
        typeof advisory.title !== "string" ||
        typeof advisory.url !== "string"
      ) {
        throw new Error("DEPENDENCY_AUDIT_DENIED:MALFORMED_ADVISORY");
      }

      const key = `${packageName}:${id}`;
      const finding: DependencyFinding = {
        key,
        advisoryId: id,
        packageName,
        severity: advisory.severity,
        title: advisory.title,
        url: advisory.url,
      };
      const existing = findings.get(key);
      if (
        !existing ||
        SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]
      ) {
        findings.set(key, finding);
      }
    }
  }

  return [...findings.values()].sort((left, right) =>
    compareStrings(left.key, right.key),
  );
}

export type DependencyPolicyResult = {
  violations: string[];
  activeFindings: string[];
  resolvedRegisteredFindings: string[];
};

function hasWildcard(value: string): boolean {
  return value.includes("*") || value.includes("?");
}

function validExactToken(value: string): boolean {
  return value.length > 0 && EXACT_TOKEN.test(value) && !hasWildcard(value);
}

function validateException(
  exception: DependencyException,
  finding: DependencyFinding,
  now: Date,
): string | null {
  if (
    exception.findingKey !== finding.key ||
    exception.advisoryId !== finding.advisoryId ||
    exception.packageName !== finding.packageName ||
    exception.severity !== finding.severity
  ) {
    return "EXCEPTION_SCOPE_MISMATCH";
  }
  if (
    !validExactToken(exception.findingKey) ||
    !validExactToken(exception.advisoryId) ||
    !validExactToken(exception.packageName) ||
    !isExposure(exception.exposure) ||
    !isImpact(exception.impact)
  ) {
    return "EXCEPTION_SCOPE_NOT_EXACT";
  }
  if (
    exception.owner.trim().length === 0 ||
    exception.rationale.trim().length === 0 ||
    exception.dependencyPath.trim().length === 0 ||
    hasWildcard(exception.dependencyPath) ||
    exception.approvedBy.trim().length === 0 ||
    exception.approvedRole.trim().length === 0 ||
    exception.independentReview !== true ||
    exception.compensatingControls.length === 0 ||
    exception.compensatingControls.some((item) => item.trim().length === 0)
  ) {
    return "EXCEPTION_REVIEW_INCOMPLETE";
  }
  const approvedAt = new Date(exception.approvedAt);
  const expiresAt = new Date(exception.expiresAt);
  if (
    !Number.isFinite(approvedAt.getTime()) ||
    !Number.isFinite(expiresAt.getTime()) ||
    approvedAt > now ||
    expiresAt <= now ||
    expiresAt <= approvedAt
  ) {
    return "EXCEPTION_EXPIRED_OR_INVALID";
  }
  if (
    finding.severity === "critical" ||
    (finding.severity === "high" && exception.exposure === "production") ||
    exception.impact !== "general"
  ) {
    return "NON_WAIVABLE_FINDING";
  }
  return null;
}

export function evaluateDependencyPolicy(input: {
  findings: DependencyFinding[];
  registered: RegisteredDependencyFinding[];
  exceptions: DependencyException[];
  now?: Date;
}): DependencyPolicyResult {
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new Error("DEPENDENCY_AUDIT_DENIED:INVALID_CLOCK");
  }

  const violations: string[] = [];
  const registered = new Map<string, RegisteredDependencyFinding>();
  for (const item of input.registered) {
    if (
      !validExactToken(item.key) ||
      item.key !== `${item.packageName}:${item.advisoryId}` ||
      !isSeverity(item.severity) ||
      !isExposure(item.exposure) ||
      item.status !== "OPEN" ||
      item.owner.trim().length === 0 ||
      item.rationale.trim().length === 0 ||
      item.dependencyPath.trim().length === 0
    ) {
      violations.push(`INVALID_REGISTER_ENTRY:${item.key}`);
      continue;
    }
    if (registered.has(item.key)) {
      violations.push(`DUPLICATE_REGISTER_ENTRY:${item.key}`);
      continue;
    }
    if (
      item.severity === "critical" ||
      (item.severity === "high" && item.exposure === "production")
    ) {
      violations.push(`NON_WAIVABLE_REGISTER_ENTRY:${item.key}`);
      continue;
    }
    registered.set(item.key, item);
  }

  const exceptions = new Map<string, DependencyException>();
  for (const item of input.exceptions) {
    if (
      !validExactToken(item.findingKey) ||
      !validExactToken(item.advisoryId) ||
      !validExactToken(item.packageName)
    ) {
      violations.push(`EXCEPTION_SCOPE_NOT_EXACT:${item.findingKey}`);
      continue;
    }
    if (exceptions.has(item.findingKey)) {
      violations.push(`DUPLICATE_EXCEPTION:${item.findingKey}`);
      continue;
    }
    exceptions.set(item.findingKey, item);
  }

  const activeKeys = new Set(input.findings.map((finding) => finding.key));
  for (const finding of input.findings) {
    const known = registered.get(finding.key);
    if (known) {
      if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[known.severity]) {
        violations.push(`SEVERITY_ESCALATION:${finding.key}`);
        continue;
      }
    }

    const exception = exceptions.get(finding.key);
    if (!exception) {
      violations.push(
        `${known ? "UNEXCEPTED_OPEN_FINDING" : "NEW_FINDING"}:${finding.key}`,
      );
      continue;
    }
    const exceptionViolation = validateException(exception, finding, now);
    if (exceptionViolation) {
      violations.push(`${exceptionViolation}:${finding.key}`);
    }
  }

  for (const exception of input.exceptions) {
    if (!activeKeys.has(exception.findingKey)) {
      violations.push(`ORPHANED_EXCEPTION:${exception.findingKey}`);
    }
  }

  return {
    violations: violations.sort(compareStrings),
    activeFindings: [...activeKeys].sort(compareStrings),
    resolvedRegisteredFindings: [...registered.keys()]
      .filter((key) => !activeKeys.has(key))
      .sort(compareStrings),
  };
}
