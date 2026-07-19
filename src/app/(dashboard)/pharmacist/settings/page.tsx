import { getPharmacySettings } from "./actions";
import SettingsForm from "./SettingsForm";
import Link from "next/link";

export default async function PharmacySettingsPage() {
  const res = await getPharmacySettings();

  if (!res.success) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <div className="settings-header-left">
            <Link href="/pharmacist" className="settings-back-btn">
              ← Back to Dashboard
            </Link>
            <h1 className="settings-title">Pharmacy Settings</h1>
          </div>
        </div>
        <div style={{ color: "var(--danger)", padding: "1rem", background: "var(--danger-light)" }}>
          Error loading settings: {res.error}
        </div>
      </div>
    );
  }

  return <SettingsForm initialData={res.data} />;
}
