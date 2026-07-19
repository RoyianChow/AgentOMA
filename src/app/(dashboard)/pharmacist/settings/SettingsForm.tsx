"use client";

import { useState } from "react";
import Link from "next/link";
import { updatePharmacySettings, type PharmacySettingsDTO } from "./actions";

export default function SettingsForm({ initialData }: { initialData: PharmacySettingsDTO }) {
  const [form, setForm] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof PharmacySettingsDTO, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    
    const res = await updatePharmacySettings({
      storeName: form.storeName,
      hnsAccountId: form.hnsAccountId || "",
      odbFeeTier: form.odbFeeTier as any,
      ocpNumber: form.ocpNumber || "",
      isAsOfRight: form.isAsOfRight,
    });
    
    setIsSubmitting(false);

    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="settings-page">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="settings-header">
        <div className="settings-header-left">
          <Link href="/pharmacist" className="settings-back-btn">
            ← Back to Dashboard
          </Link>
          <h1 className="settings-title">Pharmacy Settings</h1>
          <p className="settings-subtitle">
            Configure your store profile, billing preferences, and pharmacist profile.
          </p>
        </div>
        <button
          className={`settings-save-btn ${saved ? "saved" : ""}`}
          onClick={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--danger)", marginBottom: "1rem", padding: "0.75rem", background: "var(--danger-light)", borderRadius: "var(--radius-sm)" }}>
          {error}
        </div>
      )}

      <div className="settings-grid">
        {/* ── Pharmacist Profile ───────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">👤</span>
            <h2 className="settings-card-title">Pharmacist Profile</h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            The OCP Registration Number entered here is used on all claims you submit.
          </p>

          <div className="settings-form-group">
            <label className="settings-label">OCP Registration Number</label>
            <input
              className="settings-input settings-input-mono"
              value={form.ocpNumber || ""}
              onChange={(e) => update("ocpNumber", e.target.value)}
              placeholder="e.g. 12345"
              disabled={form.isAsOfRight}
            />
            {form.isAsOfRight && (
              <span className="settings-input-hint" style={{ marginTop: "0.25rem", display: "block" }}>
                As-of-Right flag is enabled. Claims will use PHR888.
              </span>
            )}
          </div>

          <div className="settings-toggle-group">
            <div className="settings-toggle-label">
              <span>Practising As-of-Right</span>
              <span className="settings-toggle-sub">
                Check this if you are practising in Ontario without an OCP number yet.
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={form.isAsOfRight}
                onChange={(e) => update("isAsOfRight", e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>
        </section>

        {/* ── Pharmacy Settings ────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">🏥</span>
            <h2 className="settings-card-title">Pharmacy Settings</h2>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Store Name</label>
            <input
              className="settings-input"
              value={form.storeName}
              onChange={(e) => update("storeName", e.target.value)}
              placeholder="e.g. Rexall — King Street"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">HNS Account ID</label>
            <input
              className="settings-input settings-input-mono"
              value={form.hnsAccountId || ""}
              onChange={(e) => update("hnsAccountId", e.target.value)}
              placeholder="e.g. HNS-12345"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">ODB Fee Tier</label>
            <select
              className="settings-input"
              value={form.odbFeeTier}
              onChange={(e) => update("odbFeeTier", e.target.value)}
            >
              <option value="regular_8_83">Regular ($8.83)</option>
              <option value="rural_9_93">Rural ($9.93)</option>
              <option value="rural_12_14">Rural ($12.14)</option>
              <option value="rural_13_25">Rural ($13.25)</option>
            </select>
            <span className="settings-input-hint" style={{ marginTop: "0.25rem", display: "block" }}>
              Note: Remote virtual assessments are only permitted for rural fee tiers.
            </span>
          </div>
        </section>

        {/* ── Quick Nav ────────────────────────────────────────────────── */}
        <section className="settings-card settings-card-nav" style={{ gridColumn: "1 / -1" }}>
          <div className="settings-card-header">
            <span className="settings-card-icon">🔗</span>
            <h2 className="settings-card-title">Quick Navigation</h2>
          </div>
          <div className="settings-nav-links" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/pharmacist" className="settings-nav-link" style={{ flex: 1, minWidth: "250px" }}>
              <span>📊</span>
              <div>
                <strong>Live Dashboard</strong>
                <span>Patient queue and clinical workspace</span>
              </div>
            </Link>
            <Link href="/pharmacist/audit" className="settings-nav-link" style={{ flex: 1, minWidth: "250px" }}>
              <span>🗂️</span>
              <div>
                <strong>Audit Log & Claims Exporter</strong>
                <span>Historical records, CSV and PDF export</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
