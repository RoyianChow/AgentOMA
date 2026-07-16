// Types for the seeded, versioned minor-ailment reference data.
//
// The values themselves come from the Ontario Ministry of Health Executive
// Officer Notice: "Update to Funding for Minor Ailment Services in Ontario
// Pharmacies", effective 2026-07-01 (docs/regulatory/), which is the sole
// source of truth for ailments, PINs, claim maximums, fees, and billing rules.
//
// Nothing here is inlined into components — it is loaded into versioned
// reference tables via the seed script (see npm run db:seed) so that the
// 2026-07-01 PIN set can coexist with future revisions via effective_date.

export type Modality = "in_person" | "virtual";

/**
 * The four PINs for an ailment group, in the exact column order of EO Notice
 * Table 1: Rx Issued (In-Person), No Rx Issued (In-Person), Rx Issued (Virtual),
 * No Rx Issued (Virtual).
 */
export interface AilmentPins {
  inPersonRxIssued: string;
  inPersonNoRx: string;
  virtualRxIssued: string;
  virtualNoRx: string;
}

export interface AilmentGroupReference {
  /** Stable machine code, e.g. RHINITIS. Seeds `ailment_group.code`. */
  code: string;
  /** Human label taken from the EO Notice ailment list / Table 1. */
  displayName: string;
  /** Maximum claims per rolling 365-day period (EO Notice Table 1). */
  maxClaimsPer365Days: number;
  pins: AilmentPins;
}

export type ClaimRuleType = "SAME_DAY_MUTEX" | "SCOPE_EXCLUSION";

/**
 * Cross-ailment billing rules that the EO Notice requires be enforced. Encoded
 * as data (not ad-hoc `if` statements) so they seed into a `claim_rule` table.
 */
export interface ClaimRuleReference {
  code: string;
  type: ClaimRuleType;
  description: string;
  /** SAME_DAY_MUTEX: the ailment codes that cannot both be claimed on one day. */
  ailmentCodes?: string[];
  /** SCOPE_EXCLUSION: the ailment the exclusion applies to. */
  ailmentCode?: string;
  /** Rule-specific parameters (e.g. out-of-scope anatomical locations). */
  params?: Record<string, unknown>;
}
