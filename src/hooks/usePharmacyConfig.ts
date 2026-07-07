"use client";

import { useState, useEffect, useCallback } from "react";

export interface PharmacyProfile {
  pharmacyId: string;
  storeName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  faxNumber: string;
  billingProviderId: string;
  isRuralShortage: boolean;
  ruralShortageExpiry: string; // ISO date string "YYYY-MM-DD"
  defaultModality: "in-person" | "virtual";
  defaultODB: boolean; // true = ODB station
}

const DEFAULT_PHARMACY_PROFILE: PharmacyProfile = {
  pharmacyId: "PHARM-ONTARIO-1",
  storeName: "My Pharmacy",
  address: "123 Main Street",
  city: "Toronto",
  postalCode: "M1A 1A1",
  phone: "416-555-0100",
  faxNumber: "416-555-0101",
  billingProviderId: "BILL-PROVIDER-001",
  isRuralShortage: false,
  ruralShortageExpiry: "",
  defaultModality: "in-person",
  defaultODB: false,
};

const STORAGE_KEY = "agentoma_pharmacy_profile";

export function usePharmacyConfig() {
  const [profile, setProfile] = useState<PharmacyProfile>(DEFAULT_PHARMACY_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfile({ ...DEFAULT_PHARMACY_PROFILE, ...JSON.parse(stored) });
      }
    } catch {
      // If localStorage is unavailable, use default
    }
    setIsLoaded(true);
  }, []);

  const saveProfile = useCallback((updated: PharmacyProfile) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail
    }
    setProfile(updated);
  }, []);

  return { profile, saveProfile, isLoaded };
}
