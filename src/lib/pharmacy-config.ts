import { env } from "@/env";

/**
 * The application serves exactly one pharmacy. This identifier is server
 * configuration, never client input and never a session-selected tenant.
 */
export function getConfiguredPharmacyId(): string | null {
  return env.PHARMACY_ID ?? null;
}

export class PharmacyNotConfiguredError extends Error {
  constructor() {
    super("PHARMACY_ID is not configured.");
    this.name = "PharmacyNotConfiguredError";
  }
}

export function requireConfiguredPharmacyId(): string {
  const pharmacyId = getConfiguredPharmacyId();
  if (!pharmacyId) throw new PharmacyNotConfiguredError();
  return pharmacyId;
}
