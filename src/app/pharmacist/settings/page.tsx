"use client";

import { useState, useEffect } from "react";
import { usePharmacyConfig, PharmacyProfile } from "@/hooks/usePharmacyConfig";
import Link from "next/link";

export default function PharmacySettingsPage() {
  const { profile, saveProfile, isLoaded } = usePharmacyConfig();
  const [form, setForm] = useState<PharmacyProfile>(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isLoaded) setForm(profile);
  }, [isLoaded, profile]);

  const update = (field: keyof PharmacyProfile, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!isLoaded) return <div className="settings-loading">Loading configuration…</div>;

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
            Configure your store profile, billing preferences, and OCP programme parameters.
          </p>
        </div>
        <button
          className={`settings-save-btn ${saved ? "saved" : ""}`}
          onClick={handleSave}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div className="settings-grid">
        {/* ── Store Profile ────────────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">🏥</span>
            <h2 className="settings-card-title">Store Profile</h2>
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
            <label className="settings-label">Street Address</label>
            <input
              className="settings-input"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="e.g. 123 King St W"
            />
          </div>
          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">City</label>
              <input
                className="settings-input"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Postal Code</label>
              <input
                className="settings-input"
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                maxLength={7}
              />
            </div>
          </div>
          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">Phone</label>
              <input
                className="settings-input"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Fax Number</label>
              <input
                className="settings-input"
                value={form.faxNumber}
                onChange={(e) => update("faxNumber", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Billing Configuration ────────────────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">💳</span>
            <h2 className="settings-card-title">Billing Configuration</h2>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Pharmacy ID (OCP Registration)</label>
            <input
              className="settings-input settings-input-mono"
              value={form.pharmacyId}
              onChange={(e) => update("pharmacyId", e.target.value)}
              placeholder="e.g. PHARM-ONTARIO-1"
            />
          </div>
          <div className="settings-form-group">
            <label className="settings-label">Billing Provider ID</label>
            <input
              className="settings-input settings-input-mono"
              value={form.billingProviderId}
              onChange={(e) => update("billingProviderId", e.target.value)}
              placeholder="e.g. BILL-PROVIDER-001"
            />
          </div>

          {/* Default Modality Toggle */}
          <div className="settings-toggle-group">
            <div className="settings-toggle-label">
              <span>Default Assessment Modality</span>
              <span className="settings-toggle-sub">
                Sets the default billing type shown in the billing panel
              </span>
            </div>
            <div className="settings-segmented">
              <button
                className={`settings-seg-btn ${form.defaultModality === "in-person" ? "active" : ""}`}
                onClick={() => update("defaultModality", "in-person")}
              >
                🏪 In-Person
              </button>
              <button
                className={`settings-seg-btn ${form.defaultModality === "virtual" ? "active" : ""}`}
                onClick={() => update("defaultModality", "virtual")}
              >
                💻 Virtual
              </button>
            </div>
          </div>

          {/* ODB Toggle */}
          <div className="settings-toggle-group">
            <div className="settings-toggle-label">
              <span>ODB Station</span>
              <span className="settings-toggle-sub">
                Enable if this counter primarily serves ODB-eligible patients
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={form.defaultODB}
                onChange={(e) => update("defaultODB", e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>
        </section>

        {/* ── Rural Shortage Exception ─────────────────────────────────── */}
        <section className="settings-card settings-card-rural">
          <div className="settings-card-header">
            <span className="settings-card-icon">🌲</span>
            <h2 className="settings-card-title">Rural Shortage Exception</h2>
          </div>
          <p className="settings-rural-desc">
            When enabled, billing defaults to a maximum quantity of <strong>2</strong> per
            claim and marks all submissions with the rural exception flag per OCP guidelines.
          </p>

          <div className="settings-toggle-group">
            <div className="settings-toggle-label">
              <span>Rural Exception Active</span>
              <span className={`settings-toggle-badge ${form.isRuralShortage ? "badge-active" : "badge-inactive"}`}>
                {form.isRuralShortage ? "ENABLED" : "DISABLED"}
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={form.isRuralShortage}
                onChange={(e) => update("isRuralShortage", e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          {form.isRuralShortage && (
            <div className="settings-form-group settings-rural-expiry">
              <label className="settings-label">Exception Expiry Date</label>
              <input
                className="settings-input"
                type="date"
                value={form.ruralShortageExpiry}
                onChange={(e) => update("ruralShortageExpiry", e.target.value)}
              />
              <span className="settings-input-hint">
                After this date, billing will revert to standard quantity limits.
              </span>
            </div>
          )}
        </section>

        {/* ── Quick Nav ────────────────────────────────────────────────── */}
        <section className="settings-card settings-card-nav">
          <div className="settings-card-header">
            <span className="settings-card-icon">🔗</span>
            <h2 className="settings-card-title">Quick Navigation</h2>
          </div>
          <div className="settings-nav-links">
            <Link href="/pharmacist" className="settings-nav-link">
              <span>📊</span>
              <div>
                <strong>Live Dashboard</strong>
                <span>Patient queue and clinical workspace</span>
              </div>
            </Link>
            <Link href="/pharmacist/audit" className="settings-nav-link">
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
