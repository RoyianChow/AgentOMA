"use server";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema/auth";
import { pharmacy, odbFeeTier } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePortalUser, AuthorizationError } from "@/lib/auth-guard";

export type PharmacySettingsDTO = {
  storeName: string;
  hnsAccountId: string | null;
  odbFeeTier: string;
  ocpNumber: string | null;
  isAsOfRight: boolean;
};

export async function getPharmacySettings(): Promise<{ success: true; data: PharmacySettingsDTO } | { success: false; error: string }> {
  try {
    const actor = await requirePortalUser();

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, actor.userId),
    });

    const dbPharmacy = await db.query.pharmacy.findFirst({
      where: eq(pharmacy.id, actor.pharmacyId),
    });

    if (!dbUser || !dbPharmacy) {
      return { success: false, error: "Profile or Pharmacy not found." };
    }

    return {
      success: true,
      data: {
        storeName: dbPharmacy.storeName,
        hnsAccountId: dbPharmacy.hnsAccountId,
        odbFeeTier: dbPharmacy.odbFeeTier,
        ocpNumber: dbUser.ocpNumber,
        isAsOfRight: dbUser.isAsOfRight,
      }
    };
  } catch (err) {
    if (err instanceof AuthorizationError) return { success: false, error: "Unauthorized" };
    console.error("Failed to fetch settings:", err);
    return { success: false, error: "Database error" };
  }
}

export async function updatePharmacySettings(data: {
  storeName: string;
  hnsAccountId: string;
  odbFeeTier: "regular_8_83" | "rural_9_93" | "rural_12_14" | "rural_13_25";
  ocpNumber: string;
  isAsOfRight: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const actor = await requirePortalUser();

    // Validate OCP format if not As-of-Right
    if (data.isAsOfRight) {
      // For As-of-Right, OCP number doesn't need strict validation, we will just clear it or let it be.
      // The instructions say "respect the As-of-Right case ... rather than forcing a fake OCP number".
      // We will allow empty ocpNumber here if AsOfRight is true.
    } else {
      const ocpStr = data.ocpNumber?.trim() || "";
      if (!/^\d{4,6}$/.test(ocpStr)) {
        return { success: false, error: "OCP Registration Number must be 4 to 6 digits." };
      }
    }

    await db.update(pharmacy)
      .set({
        storeName: data.storeName,
        hnsAccountId: data.hnsAccountId || null,
        odbFeeTier: data.odbFeeTier,
      })
      .where(eq(pharmacy.id, actor.pharmacyId));

    await db.update(user)
      .set({
        ocpNumber: data.ocpNumber || null,
        isAsOfRight: data.isAsOfRight,
      })
      .where(eq(user.id, actor.userId));

    return { success: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { success: false, error: "Unauthorized" };
    console.error("Failed to update settings:", err);
    return { success: false, error: "Database error" };
  }
}
