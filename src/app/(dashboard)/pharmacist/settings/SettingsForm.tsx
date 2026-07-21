"use client";

import { useState } from "react";
import Link from "next/link";

import {
  updateMyPrescriberIdentity,
  updatePharmacySettings,
  type SettingsData,
} from "./actions";

// Label derived from the enum key itself (e.g. "rural_9_93" → "Rural — $9.93")
// so there is no hardcoded fee literal anywhere in the code.
function feeTierLabel(tier: string): string {
  const [kind, dollars, cents] = tier.split("_");
  const amount = dollars && cents ? `$${dollars}.${cents}` : tier;
  return `${kind === "regular" ? "Regular" : "Rural"} — ${amount}`;
}

export default function SettingsForm({
  initialData,
  feeTiers,
}: {
  initialData: SettingsData;
  feeTiers: string[];
}) {
  const canEdit = initialData.canEditPharmacy;
  const isTrainee = initialData.role === "intern" || initialData.role === "student";

  // ── Prescriber identity (self) ──────────────────────────────────────────
  const [ocpNumber, setOcpNumber] = useState(initialData.ocpNumber ?? "");
  const [isAsOfRight, setIsAsOfRight] = useState(initialData.isAsOfRight);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function saveProfile() {
    setProfileBusy(true);
    setProfileError(null);
    setProfileSaved(false);
    const res = await updateMyPrescriberIdentity({ ocpNumber, isAsOfRight });
    setProfileBusy(false);
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      setProfileError(res.error);
    }
  }

  // ── Pharmacy settings (admin) ───────────────────────────────────────────
  const [storeName, setStoreName] = useState(initialData.storeName);
  const [hnsAccountId, setHnsAccountId] = useState(initialData.hnsAccountId ?? "");
  const [odbFeeTier, setOdbFeeTier] = useState(initialData.odbFeeTier);
  const [addressLine1, setAddressLine1] = useState(initialData.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initialData.addressLine2 ?? "");
  const [city, setCity] = useState(initialData.city ?? "");
  const [province, setProvince] = useState(initialData.province ?? "ON");
  const [postalCode, setPostalCode] = useState(initialData.postalCode ?? "");
  const [phone, setPhone] = useState(initialData.phone ?? "");
  const [pharmacyBusy, setPharmacyBusy] = useState(false);
  const [pharmacySaved, setPharmacySaved] = useState(false);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);

  async function savePharmacy() {
    setPharmacyBusy(true);
    setPharmacyError(null);
    setPharmacySaved(false);
    const res = await updatePharmacySettings({
      storeName,
      hnsAccountId,
      odbFeeTier,
      addressLine1,
      addressLine2,
      city,
      province,
      postalCode,
      phone,
    });
    setPharmacyBusy(false);
    if (res.success) {
      setPharmacySaved(true);
      setTimeout(() => setPharmacySaved(false), 3000);
    } else {
      setPharmacyError(res.error);
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-header-left">
          <Link href="/pharmacist" className="settings-back-btn">← Back to Dashboard</Link>
          <h1 className="settings-title">Profile &amp; Settings</h1>
          <p className="settings-subtitle">
            Your prescriber identity, and this pharmacy&apos;s billing configuration.
          </p>
        </div>
      </div>

      <div className="settings-grid">
        {/* ── My prescriber identity (self-service) ────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">👤</span>
            <h2 className="settings-card-title">My prescriber identity</h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            The OCP registration number that goes on the claims you complete.
            {isTrainee && (
              <>
                {" "}
                <strong>
                  As an {initialData.role}, your claims bill under your supervising
                  pharmacist&apos;s number — not this one.
                </strong>
              </>
            )}
          </p>

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="ocp">OCP registration number</label>
            <input
              id="ocp"
              className="settings-input settings-input-mono"
              value={ocpNumber}
              onChange={(e) => setOcpNumber(e.target.value)}
              placeholder="e.g. 123456"
              inputMode="numeric"
              disabled={isAsOfRight}
              autoComplete="off"
            />
            {isAsOfRight && (
              <span className="settings-input-hint" style={{ marginTop: "0.25rem", display: "block" }}>
                As-of-Right is on — your claims will use <strong>PHR888</strong>, so no OCP number is needed.
              </span>
            )}
          </div>

          <div className="settings-toggle-group">
            <div className="settings-toggle-label">
              <span>Practising under As-of-Right</span>
              <span className="settings-toggle-sub">
                Turn on if you&apos;re practising in Ontario without a licence number yet.
              </span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={isAsOfRight}
                onChange={(e) => setIsAsOfRight(e.target.checked)}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          {/* Orientation status is READ-ONLY here — only an admin can record it
              (team page), and completing a billable assessment refuses without
              it. Shown so a pharmacist knows why billing might be blocked. */}
          <div className="settings-form-group" style={{ marginTop: "0.5rem" }}>
            <label className="settings-label">Minor-ailments orientation</label>
            <div style={{ fontSize: "0.9rem" }}>
              {initialData.orientationCompletedAt ? (
                <span style={{ color: "var(--primary)" }}>
                  ✓ Recorded {new Date(initialData.orientationCompletedAt).toLocaleDateString("en-CA")}
                </span>
              ) : (
                <span style={{ color: "var(--warning-text)" }}>
                  Not recorded — a pharmacy admin must record your OCP orientation-module
                  completion before you can complete a billable assessment.
                </span>
              )}
            </div>
          </div>

          {profileError && (
            <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
              {profileError}
            </div>
          )}
          <button
            className={`settings-save-btn ${profileSaved ? "saved" : ""}`}
            onClick={saveProfile}
            disabled={profileBusy}
            style={{ marginTop: "1rem" }}
          >
            {profileBusy ? "Saving…" : profileSaved ? "✓ Saved" : "Save my profile"}
          </button>
        </section>

        {/* ── Pharmacy settings (admin only) ───────────────────────────── */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-icon">🏥</span>
            <h2 className="settings-card-title">Pharmacy settings</h2>
          </div>
          {!canEdit && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Only a pharmacy admin can change these. Shown for reference.
            </p>
          )}

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="store">Store name</label>
            <input
              id="store"
              className="settings-input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Rexall — King Street"
              disabled={!canEdit}
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="hns">HNS account ID</label>
            <input
              id="hns"
              className="settings-input settings-input-mono"
              value={hnsAccountId}
              onChange={(e) => setHnsAccountId(e.target.value)}
              placeholder="optional"
              disabled={!canEdit}
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="address-line-1">Practice address</label>
            <input
              id="address-line-1"
              className="settings-input"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
              disabled={!canEdit}
            />
            <input
              className="settings-input"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Unit / suite (optional)"
              disabled={!canEdit}
              style={{ marginTop: "0.5rem" }}
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="city">City</label>
            <input
              id="city"
              className="settings-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="province">Province</label>
              <input
                id="province"
                className="settings-input"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label" htmlFor="postal-code">Postal code</label>
              <input
                id="postal-code"
                className="settings-input settings-input-mono"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="phone">Practice phone</label>
            <input
              id="phone"
              className="settings-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              disabled={!canEdit}
            />
            <span className="settings-input-hint" style={{ marginTop: "0.25rem", display: "block" }}>
              This address and phone are snapshotted onto issued prescription records.
            </span>
          </div>

          <div className="settings-form-group">
            <label className="settings-label" htmlFor="tier">ODB dispensing fee tier</label>
            <select
              id="tier"
              className="settings-input"
              value={odbFeeTier}
              onChange={(e) => setOdbFeeTier(e.target.value)}
              disabled={!canEdit}
            >
              {feeTiers.map((t) => (
                <option key={t} value={t}>{feeTierLabel(t)}</option>
              ))}
            </select>
            <span className="settings-input-hint" style={{ marginTop: "0.25rem", display: "block" }}>
              Remote virtual assessments are only permitted on a rural tier — the regular
              tier is blocked from remote billing.
            </span>
          </div>

          {canEdit && (
            <>
              {pharmacyError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                  {pharmacyError}
                </div>
              )}
              <button
                className={`settings-save-btn ${pharmacySaved ? "saved" : ""}`}
                onClick={savePharmacy}
                disabled={pharmacyBusy}
                style={{ marginTop: "1rem" }}
              >
                {pharmacyBusy ? "Saving…" : pharmacySaved ? "✓ Saved" : "Save pharmacy settings"}
              </button>
            </>
          )}
        </section>

        {/* ── Quick nav ────────────────────────────────────────────────── */}
        <section className="settings-card settings-card-nav" style={{ gridColumn: "1 / -1" }}>
          <div className="settings-card-header">
            <span className="settings-card-icon">🔗</span>
            <h2 className="settings-card-title">Quick navigation</h2>
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
                <strong>Ministry Audit Log</strong>
                <span>Historical records, CSV and PDF export</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
