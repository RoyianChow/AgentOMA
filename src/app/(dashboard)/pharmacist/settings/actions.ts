"use server";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { pharmacy, odbFeeTier } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePortalUser, AuthorizationError } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";

const FEE_TIERS = odbFeeTier.enumValues;

export type SettingsData = {
  // pharmacy (admin-editable)
  storeName: string;
  hnsAccountId: string | null;
  odbFeeTier: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  phone: string | null;
  // this pharmacist's own prescriber identity (self-editable)
  ocpNumber: string | null;
  isAsOfRight: boolean;
  orientationCompletedAt: string | null;
  role: string;
  /** Only a pharmacy admin may change the pharmacy fields (the fee tier gates
   * remote-virtual billing eligibility). */
  canEditPharmacy: boolean;
};

export async function getPharmacySettings(): Promise<
  { success: true; data: SettingsData } | { success: false; error: string }
> {
  try {
    const actor = await requirePortalUser();

    const [dbUser, dbPharmacy] = await Promise.all([
      db.query.user.findFirst({ where: eq(user.id, actor.userId) }),
      db.query.pharmacy.findFirst({ where: eq(pharmacy.id, actor.pharmacyId) }),
    ]);
    if (!dbUser || !dbPharmacy) {
      return { success: false, error: "Profile or pharmacy not found." };
    }

    return {
      success: true,
      data: {
        storeName: dbPharmacy.storeName,
        hnsAccountId: dbPharmacy.hnsAccountId,
        odbFeeTier: dbPharmacy.odbFeeTier,
        addressLine1: dbPharmacy.addressLine1,
        addressLine2: dbPharmacy.addressLine2,
        city: dbPharmacy.city,
        province: dbPharmacy.province,
        postalCode: dbPharmacy.postalCode,
        phone: dbPharmacy.phone,
        ocpNumber: dbUser.ocpNumber,
        isAsOfRight: dbUser.isAsOfRight,
        orientationCompletedAt: dbUser.orientationCompletedAt?.toISOString() ?? null,
        role: actor.role,
        canEditPharmacy: actor.role === "pharmacy_admin",
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) return { success: false, error: "Unauthorized" };
    console.error("Failed to fetch settings:", err);
    return { success: false, error: "Database error" };
  }
}

/**
 * A pharmacist's own prescriber identity — the OCP registration number that
 * goes on their claims (or the As-of-Right flag, which makes deriveClaimDraft
 * use PHR888 instead). SELF-service: this only ever writes the caller's own
 * row, and it NEVER touches orientationCompletedAt, so the orientation gate is
 * untouched. Interns/students bill under their supervisor's number regardless
 * of what they set here — the UI says so.
 */
export async function updateMyPrescriberIdentity(input: {
  ocpNumber: string;
  isAsOfRight: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const actor = await requirePortalUser();

    let ocpNumber: string | null;
    if (input.isAsOfRight) {
      // As-of-Right uses PHR888 (handled in deriveClaimDraft). Don't force a
      // fake OCP number, and clear any stale one so it can't mislead.
      ocpNumber = null;
    } else {
      const trimmed = input.ocpNumber.trim();
      // The EO Notice doesn't codify an OCP-number format; this is a sanity
      // check (OCP registration numbers are numeric), not an authority. Kept
      // permissive on length so it can't reject a valid registrant.
      if (!/^\d{4,7}$/.test(trimmed)) {
        return {
          success: false,
          error:
            "Enter your OCP registration number as digits only (4–7 digits), or turn on As-of-Right if you don't have an Ontario licence number yet.",
        };
      }
      ocpNumber = trimmed;
    }

    await db
      .update(user)
      .set({ ocpNumber, isAsOfRight: input.isAsOfRight })
      .where(eq(user.id, actor.userId));

    try {
      await writeAudit({
        pharmacyId: actor.pharmacyId,
        actorUserId: actor.userId,
        action: "user.prescriber_identity_updated",
        entityType: "user",
        entityId: actor.userId,
        metadata: { isAsOfRight: input.isAsOfRight, hasOcpNumber: ocpNumber !== null },
      });
    } catch (auditErr) {
      console.error("AUDIT WRITE FAILED for prescriber identity", actor.userId, auditErr);
    }

    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { success: false, error: "Unauthorized" };
    console.error("Failed to update prescriber identity:", err);
    return { success: false, error: "Database error" };
  }
}

/**
 * Pharmacy-wide settings. ADMIN-ONLY, re-verified server-side: the ODB fee
 * tier decides remote-virtual eligibility (rural tiers only; the regular tier
 * is hard-blocked from remote in deriveClaimDraft), so a non-admin must not be
 * able to change it. proxy.ts is a UX gate only — this is the real boundary.
 */
export async function updatePharmacySettings(input: {
  storeName: string;
  hnsAccountId: string;
  odbFeeTier: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const actor = await requirePortalUser(["pharmacy_admin"]);

    const storeName = input.storeName.trim();
    if (!storeName) return { success: false, error: "Store name is required." };

    const addressLine1 = input.addressLine1.trim();
    const city = input.city.trim();
    const province = input.province.trim();
    const postalCode = input.postalCode.trim();
    const phone = input.phone.trim();
    if (!addressLine1 || !city || !province || !postalCode || !phone) {
      return {
        success: false,
        error:
          "Practice address, city, province, postal code, and phone are required for prescription records.",
      };
    }

    // The tier must be a real enum value — never free text, or a typo would
    // silently flip remote-virtual eligibility.
    if (!(FEE_TIERS as readonly string[]).includes(input.odbFeeTier)) {
      return { success: false, error: "Select a valid ODB dispensing fee tier." };
    }

    await db
      .update(pharmacy)
      .set({
        storeName,
        hnsAccountId: input.hnsAccountId.trim() || null,
        odbFeeTier: input.odbFeeTier as (typeof FEE_TIERS)[number],
        addressLine1,
        addressLine2: input.addressLine2.trim() || null,
        city,
        province,
        postalCode,
        phone,
      })
      .where(eq(pharmacy.id, actor.pharmacyId));

    try {
      await writeAudit({
        pharmacyId: actor.pharmacyId,
        actorUserId: actor.userId,
        action: "pharmacy.settings_updated",
        entityType: "pharmacy",
        entityId: actor.pharmacyId,
        metadata: { odbFeeTier: input.odbFeeTier },
      });
    } catch (auditErr) {
      console.error("AUDIT WRITE FAILED for pharmacy settings", actor.pharmacyId, auditErr);
    }

    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: "Only a pharmacy admin can change pharmacy settings." };
    }
    console.error("Failed to update pharmacy settings:", err);
    return { success: false, error: "Database error" };
  }
}
