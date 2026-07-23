import Link from "next/link";

import { requirePortalPage } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { odbFeeTier } from "@/lib/db/schema";
import { and, asc, gte, isNull, lte, or } from "drizzle-orm";
import { getPharmacySettings } from "./actions";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function PharmacySettingsPage() {
  // UX redirect for signed-out visitors; the actions re-verify session + role.
  await requirePortalPage();

  const res = await getPharmacySettings();

  if (!res.success) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <div className="settings-header-left">
            <Link href="/pharmacist" className="settings-back-btn">← Back to Dashboard</Link>
            <h1 className="settings-title">Profile &amp; Settings</h1>
          </div>
        </div>
        <div style={{ color: "var(--danger)", padding: "1rem", background: "var(--danger-light)" }}>
          Error loading settings: {res.error}
        </div>
      </div>
    );
  }

  const feeTiers = await db
    .select({
      code: odbFeeTier.code,
      dispensingFeeCents: odbFeeTier.dispensingFeeCents,
      remoteVirtualEligible: odbFeeTier.remoteVirtualEligible,
    })
    .from(odbFeeTier)
    .where(
      and(
        lte(
          odbFeeTier.effectiveDate,
          new Date().toISOString().slice(0, 10),
        ),
        or(
          isNull(odbFeeTier.endDate),
          gte(
            odbFeeTier.endDate,
            new Date().toISOString().slice(0, 10),
          ),
        ),
      ),
    )
    .orderBy(asc(odbFeeTier.dispensingFeeCents));

  return <SettingsForm initialData={res.data} feeTiers={feeTiers} />;
}
