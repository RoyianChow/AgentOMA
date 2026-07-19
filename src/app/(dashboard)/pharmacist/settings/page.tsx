import Link from "next/link";

import { requirePortalPage } from "@/lib/auth-guard";
import { odbFeeTier } from "@/lib/db/schema";
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

  return <SettingsForm initialData={res.data} feeTiers={odbFeeTier.enumValues} />;
}
