import type { VirtualCareGuardResult } from "../../virtual-care/guards";

/**
 * Task 06 — shared presentational pieces for the synthetic virtual-care
 * UI. Pure, prop-driven, no client-only hooks — safe to import from
 * either a Server or Client Component.
 */

export function humanize(value: string): string {
  return value
    .split("_")
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function GuardBadge({
  name,
  result,
}: Readonly<{ name: string; result: VirtualCareGuardResult }>) {
  return (
    <div className={`guard-badge ${result.allowed ? "guard-allow" : "guard-deny"}`} role="status">
      <span className="guard-name">{name}</span>
      <span className="guard-outcome">
        {result.allowed ? "Allowed" : `Denied — ${humanize(result.denialReason)}`}
      </span>
    </div>
  );
}

export function DeniedBanner({ reason }: Readonly<{ reason: string }>) {
  return (
    <div className="denied-banner" role="alert">
      <strong>This scenario cannot proceed.</strong>
      <span>{humanize(reason)}</span>
    </div>
  );
}

export function NotFoundBanner() {
  return (
    <div className="denied-banner" role="alert">
      <strong>Unknown or unavailable synthetic scenario.</strong>
      <span>
        This link does not match a known synthetic visit. Nothing is loaded, and no clinical
        interaction may begin.
      </span>
    </div>
  );
}

export const VIRTUAL_CARE_ROLE_OPTIONS = [
  { value: "patient", label: "Patient" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "delegate", label: "Delegate" },
  { value: "support_person", label: "Support person" },
  { value: "interpreter", label: "Interpreter" },
] as const;
