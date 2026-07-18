"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import {
  requirePortalUser,
  AuthorizationError,
  type PortalRole,
} from "@/lib/auth-guard";
import { issueInvitation } from "@/lib/invitations";
import { env } from "@/env";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: PortalRole;
  ocpNumber: string | null;
  supervisingPharmacistId: string | null;
  twoFactorEnabled: boolean;
  orientationCompletedAt: string | null;
};

export async function listTeam(): Promise<TeamMember[]> {
  try {
    // Session + role re-verified here, not in proxy.ts — server actions are
    // public endpoints and this one lists staff emails.
    const actor = await requirePortalUser();
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        ocpNumber: user.ocpNumber,
        supervisingPharmacistId: user.supervisingPharmacistId,
        twoFactorEnabled: user.twoFactorEnabled,
        orientationCompletedAt: user.orientationCompletedAt,
      })
      .from(user)
      .where(eq(user.pharmacyId, actor.pharmacyId));
    return rows.map((r) => ({
      ...r,
      orientationCompletedAt: r.orientationCompletedAt?.toISOString() ?? null,
    }));
  } catch (err) {
    if (err instanceof AuthorizationError) return [];
    console.error("Failed to list team:", err);
    return [];
  }
}

export type InviteActionResult =
  | { ok: true; inviteUrl: string; expiresAt: string }
  | { ok: false; error: string };

export async function issueInvitationAction(input: {
  email: string;
  role: PortalRole;
  supervisingPharmacistId?: string | null;
}): Promise<InviteActionResult> {
  try {
    // ADMIN-ONLY, verified server-side in the action (proxy.ts is UX only).
    const actor = await requirePortalUser(["pharmacy_admin"]);
    const res = await issueInvitation({
      pharmacyId: actor.pharmacyId,
      invitedByUserId: actor.userId,
      email: input.email,
      role: input.role,
      supervisingPharmacistId: input.supervisingPharmacistId ?? null,
    });
    if (!res.ok) return { ok: false, error: res.message };

    // The raw token exists only in this response — the DB stores its hash.
    const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${res.token}`;
    return { ok: true, inviteUrl, expiresAt: res.expiresAt.toISOString() };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, error: "Only a pharmacy admin can issue invitations." };
    }
    console.error("Failed to issue invitation:", err);
    return { ok: false, error: "Something went wrong issuing the invitation." };
  }
}

/**
 * Records the OCP "Mandatory Orientation for Minor Ailments Module" completion
 * on a colleague's profile. Until it is recorded, createAssessment REFUSES to
 * complete any assessment where that person is the prescriber (the orientation
 * gate). Admin-only, own pharmacy only; recording an attestation on someone's
 * behalf is itself an audited statement, so keep it deliberate.
 */
export async function recordOrientationCompletion(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // ADMIN-ONLY, verified server-side in the action (proxy.ts is UX only).
    const actor = await requirePortalUser(["pharmacy_admin"]);
    const [updated] = await db
      .update(user)
      .set({ orientationCompletedAt: new Date() })
      .where(and(eq(user.id, userId), eq(user.pharmacyId, actor.pharmacyId)))
      .returning({ id: user.id });
    if (!updated) return { ok: false, error: "No such user at this pharmacy." };
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, error: "Only a pharmacy admin can record orientation completion." };
    }
    console.error("Failed to record orientation completion:", err);
    return { ok: false, error: "Something went wrong." };
  }
}
