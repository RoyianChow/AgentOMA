import { headers } from "next/headers";

import { auth } from "./auth";
import { userRole } from "./db/schema/auth";

export const PORTAL_ROLES = userRole.enumValues;
export type PortalRole = (typeof PORTAL_ROLES)[number];

/** Roles that may complete an assessment themselves (their own OCP number on
 * the claim). Interns/students record under a supervising pharmacist;
 * technicians never complete assessments. */
export const ASSESSING_ROLES: PortalRole[] = ["pharmacy_admin", "pharmacist"];

export type AuthzRefusal =
  | "UNAUTHENTICATED"
  | "TOTP_ENROLLMENT_REQUIRED"
  | "NO_PHARMACY"
  | "FORBIDDEN_ROLE";

/**
 * Thrown by the guards below. Server actions catch it and return a refusal to
 * the UI — an unauthorized request must produce nothing, never a claim.
 */
export class AuthorizationError extends Error {
  constructor(public readonly reason: AuthzRefusal) {
    super(reason);
    this.name = "AuthorizationError";
  }
}

export type PortalUser = {
  userId: string;
  pharmacyId: string;
  role: PortalRole;
  name: string;
  email: string;
  supervisingPharmacistId: string | null;
};

/**
 * Bare session check — no TOTP/pharmacy/role requirements. ONLY for the
 * enrollment flow itself (a freshly invited user has a session but no TOTP
 * yet). Everything that reads or writes portal data goes through
 * requirePortalUser instead.
 */
export async function requireSession() {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) throw new AuthorizationError("UNAUTHENTICATED");
  return s;
}

/**
 * THE security boundary for every portal server action.
 *
 * proxy.ts performs NO authorization — it is an optimistic UX redirect that a
 * crafted request skips entirely. The check that matters is this one, running
 * inside the action, on the server, per request:
 *
 *   1. a live better-auth session (30-min rolling idle, revocable);
 *   2. TOTP enrolled — MANDATORY: this portal reaches PHI, and a
 *      single-factor session never gets past this line;
 *   3. a pharmacy assignment (tenancy — every query scopes to it);
 *   4. an allowed role for the specific action.
 */
export async function requirePortalUser(
  allowedRoles?: readonly PortalRole[]
): Promise<PortalUser> {
  const s = await requireSession();
  const user = s.user as typeof s.user & {
    role?: string | null;
    pharmacyId?: string | null;
    twoFactorEnabled?: boolean | null;
    supervisingPharmacistId?: string | null;
  };

  if (!user.twoFactorEnabled) {
    throw new AuthorizationError("TOTP_ENROLLMENT_REQUIRED");
  }
  const role = user.role;
  if (!role || !(PORTAL_ROLES as readonly string[]).includes(role)) {
    throw new AuthorizationError("FORBIDDEN_ROLE");
  }
  if (!user.pharmacyId) {
    throw new AuthorizationError("NO_PHARMACY");
  }
  if (allowedRoles && !allowedRoles.includes(role as PortalRole)) {
    throw new AuthorizationError("FORBIDDEN_ROLE");
  }

  return {
    userId: user.id,
    pharmacyId: user.pharmacyId,
    role: role as PortalRole,
    name: user.name,
    email: user.email,
    supervisingPharmacistId: user.supervisingPharmacistId ?? null,
  };
}
