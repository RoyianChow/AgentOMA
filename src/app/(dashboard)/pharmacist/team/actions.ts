"use server";

import { eq } from "drizzle-orm";

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
      })
      .from(user)
      .where(eq(user.pharmacyId, actor.pharmacyId));
    return rows;
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
