/**
 * deriveClaimDraft — the function this product exists to produce.
 *
 * PURE. No database calls, no imports of live data. Everything it needs is
 * passed in, including `resolvePin`, which reads the SEEDED reference tables.
 * That is deliberate: PINs and fees must only ever come from the reference
 * data, never from a literal in application code.
 *
 * It DERIVES every field. The pharmacist types none of them.
 *
 * It REFUSES rather than guesses. Non-billability is a first-class result
 * (`{ billable: false, reason }`), not an exception and not a silent default.
 * There is no input that makes it emit a claim for a situation the EO Notice
 * says isn't billable.
 *
 * Field rules are from the EO Notice (effective 2026-07-01) — see
 * docs/COMPLIANCE.md §9 for the section-by-section mapping. The reference
 * tables carry PIN/fee/claim-maximum; the protocol constants below ('09', 'PS',
 * 'ML', 'LT', 'S', SSC 4) are specified in the Notice's Billing Procedures.
 *
 * NOTHING HERE TALKS TO HNS. The draft is produced, validated, persisted, and
 * exported for hand-entry into the pharmacy's dispensing software.
 */

export type AssessmentModality = "in_person" | "virtual_from_pharmacy" | "virtual_remote";
export type BillingModality = "in_person" | "virtual";
export type Outcome = "rx_issued" | "no_rx_referral" | "no_rx_otc_or_nonpharm";
export type OdbFeeTier = "regular_8_83" | "rural_9_93" | "rural_12_14" | "rural_13_25";
export type LtcProviderRole = "primary" | "secondary";

/** Only these tiers may provide remote virtual services (EO Notice p.4 fn.3, p.15). */
const RURAL_FEE_TIERS: ReadonlySet<string> = new Set([
  "rural_9_93",
  "rural_12_14",
  "rural_13_25",
]);

/**
 * Prescriber ID Reference. Must be '09'. '01' or '99' reject with
 * "60 – Prescriber License Code Error" (EO Notice p.11).
 */
const PRESCRIBER_ID_REFERENCE = "09" as const;

/** For pharmacists under As of Right without an Ontario licence number yet (p.11). */
const AS_OF_RIGHT_PRESCRIBER_ID = "PHR888" as const;

export type NotBillableReason =
  /** A red flag fired. Terminal referral, no claim. Should never reach here. */
  | "RED_FLAG_EXIT"
  | "SELF_OR_FAMILY"
  | "CLAIM_MAXIMUM_REACHED"
  | "EXISTING_RX_BLOCKS_CLAIM"
  | "REMOTE_VIRTUAL_REQUIRES_RURAL_FEE_TIER"
  | "REMOTE_VIRTUAL_MISSING_LOCATION_OR_REASON"
  | "LTC_SECONDARY_NON_EMERGENCY"
  | "MISSING_PRESCRIBER_ID"
  /** The reference lookup had no row. NEVER defaulted — see below. */
  | "UNKNOWN_PIN_LOOKUP";

export interface PinResolution {
  pinCode: string;
  feeCents: number;
}

/** Reads the seeded `pin` reference rows. Injected to keep this module pure. */
export type ResolvePin = (
  ailmentGroupCode: string,
  modality: BillingModality,
  rxIssued: boolean,
) => PinResolution | undefined;

export interface DeriveClaimDraftInput {
  ailmentGroupCode: string;
  modality: AssessmentModality;
  outcome: Outcome;
  resolvePin: ResolvePin;
  prescriber: {
    ocpRegistrationNumber?: string | null;
    /** Practising under As of Right with no Ontario licence number yet. */
    isAsOfRightWithoutOntarioLicence?: boolean;
  };
  isOdbRecipient: boolean;
  pharmacyFeeTier: OdbFeeTier;
  /** Required for any virtual assessment (documentation requirement, p.13). */
  virtualLocation?: string | null;
  /** Required for virtual_remote: why on-site staff can't meet demand (p.4). */
  remoteReason?: string | null;
  ltc?: {
    isResident: boolean;
    providerRole?: LtcProviderRole;
    isEmergency?: boolean;
  };
  /** Gates the caller must pass through. Defensive — the flow should stop earlier. */
  redFlagFired?: boolean;
  isSelfOrFamily?: boolean;
  claimMaximumReached?: boolean;
  existingRxBlocks?: boolean;
}

export interface ClaimDraft {
  ailmentGroupCode: string;
  modality: AssessmentModality;
  billingModality: BillingModality;
  rxIssued: boolean;
  pinCode: string;
  feeCents: number;
  prescriberIdReference: typeof PRESCRIBER_ID_REFERENCE;
  prescriberId: string;
  interventionCodes: string[];
  carrierId: "S" | null;
  quantity: 1 | 2;
  ssc: 4 | null;
}

export type DeriveClaimDraftResult =
  | { billable: true; draft: ClaimDraft }
  | { billable: false; reason: NotBillableReason };

/** Human-readable text for the pharmacist. Never phrased as a system error. */
export const NOT_BILLABLE_MESSAGES: Record<NotBillableReason, string> = {
  RED_FLAG_EXIT:
    "A red flag was identified, so this is a referral rather than an assessment. No claim can be submitted.",
  SELF_OR_FAMILY:
    "A pharmacist cannot assess themselves or a family member. No claim can be submitted.",
  CLAIM_MAXIMUM_REACHED:
    "This patient is at the funded maximum for this ailment in the last 365 days. No claim can be submitted — use your professional judgment about referring.",
  EXISTING_RX_BLOCKS_CLAIM:
    "The patient already has a prescription for this that can be filled, adapted, or extended within scope (or needs verification with a reachable prescriber). No claim can be submitted.",
  REMOTE_VIRTUAL_REQUIRES_RURAL_FEE_TIER:
    "Remote virtual assessments are only permitted for pharmacies on a rural ODB dispensing fee ($9.93 / $12.14 / $13.25). This pharmacy is on the regular tier.",
  REMOTE_VIRTUAL_MISSING_LOCATION_OR_REASON:
    "A remote virtual assessment must record the pharmacist's physical location and why on-site staff could not meet virtual demand.",
  // See docs/OPEN_QUESTIONS.md #1 — deliberately worded as unresolved.
  LTC_SECONDARY_NON_EMERGENCY:
    "This pharmacy is not the LTC home's primary provider and this isn't an emergency. Billing for this case needs verification before proceeding — check with the ODB Pharmacy Help Desk (1-800-668-6641). No claim has been drafted.",
  MISSING_PRESCRIBER_ID:
    "No OCP registration number is on file for this pharmacist, and they are not flagged as practising under As of Right. A claim needs a prescriber ID.",
  UNKNOWN_PIN_LOOKUP:
    "No PIN exists in the reference data for this ailment and modality combination. This is a configuration problem — do not hand-enter a PIN. Report it before proceeding.",
};

export function deriveClaimDraft(input: DeriveClaimDraftInput): DeriveClaimDraftResult {
  const refuse = (reason: NotBillableReason): DeriveClaimDraftResult => ({
    billable: false,
    reason,
  });

  // ── Gates first. Each of these means "no claim", full stop. ────────────────
  // A red-flag exit is terminal upstream and never reaches this function; this
  // is a backstop so the invariant holds even if a caller regresses.
  if (input.redFlagFired) return refuse("RED_FLAG_EXIT");
  if (input.isSelfOrFamily) return refuse("SELF_OR_FAMILY");
  if (input.claimMaximumReached) return refuse("CLAIM_MAXIMUM_REACHED");
  if (input.existingRxBlocks) return refuse("EXISTING_RX_BLOCKS_CLAIM");

  if (input.modality === "virtual_remote") {
    if (!RURAL_FEE_TIERS.has(input.pharmacyFeeTier)) {
      return refuse("REMOTE_VIRTUAL_REQUIRES_RURAL_FEE_TIER");
    }
    if (!input.virtualLocation?.trim() || !input.remoteReason?.trim()) {
      return refuse("REMOTE_VIRTUAL_MISSING_LOCATION_OR_REASON");
    }
  }

  const ltc = input.ltc;
  const isLtcPrimary = !!ltc?.isResident && ltc.providerRole === "primary";
  const isLtcSecondary = !!ltc?.isResident && ltc.providerRole === "secondary";
  const isLtcSecondaryEmergency = isLtcSecondary && !!ltc?.isEmergency;

  // TODO: VERIFY — EO Notice footnote 5 vs Exclusions; confirm with ODB Pharmacy
  // Help Desk (1-800-668-6641) whether a $0 claim must still be filed here.
  // Exclusions say a secondary provider may only bill in an emergency; footnote 5
  // says an ineligible pharmacy "must submit claims ... with a zero dollar fee".
  // We refuse (conservative: cannot produce an improper fee) rather than pick a
  // side. See docs/OPEN_QUESTIONS.md #1. Do not resolve this by reasoning.
  if (isLtcSecondary && !isLtcSecondaryEmergency) {
    return refuse("LTC_SECONDARY_NON_EMERGENCY");
  }

  // ── Prescriber ────────────────────────────────────────────────────────────
  const prescriberId = input.prescriber.isAsOfRightWithoutOntarioLicence
    ? AS_OF_RIGHT_PRESCRIBER_ID
    : input.prescriber.ocpRegistrationNumber?.trim();
  if (!prescriberId) return refuse("MISSING_PRESCRIBER_ID");

  // ── PIN + fee, from the reference data only ───────────────────────────────
  const billingModality: BillingModality =
    input.modality === "in_person" ? "in_person" : "virtual";
  const rxIssued = input.outcome === "rx_issued";

  const pin = input.resolvePin(input.ailmentGroupCode, billingModality, rxIssued);
  // AMENDMENT 1 / tombstone: the pre-Drizzle code had a pinMap covering 5
  // ailments that silently fell back to Rhinitis for the other 18 — billing the
  // wrong PIN with nobody noticing. An unknown lookup REFUSES. Never default.
  if (!pin) return refuse("UNKNOWN_PIN_LOOKUP");

  // ── Derived fields ────────────────────────────────────────────────────────
  // LTC primary providers are paid through the capitation model, so the claim is
  // filed at a zero dollar fee (a dollar amount rejects with "68 – Professional
  // Fee Error"). Otherwise the fee is whatever the seeded PIN row says.
  const feeCents = isLtcPrimary ? 0 : pin.feeCents;

  const interventionCodes = ["PS"];
  if (!input.isOdbRecipient) interventionCodes.push("ML");
  if (isLtcSecondaryEmergency) interventionCodes.push("LT");

  return {
    billable: true,
    draft: {
      ailmentGroupCode: input.ailmentGroupCode,
      modality: input.modality,
      billingModality,
      rxIssued,
      pinCode: pin.pinCode,
      feeCents,
      prescriberIdReference: PRESCRIBER_ID_REFERENCE,
      prescriberId,
      interventionCodes,
      carrierId: input.isOdbRecipient ? null : "S",
      quantity: input.modality === "virtual_remote" ? 2 : 1,
      // A completed assessment that ends in a referral IS billable, with SSC 4.
      // This is NOT the red-flag exit (which is refused above and files no claim).
      ssc: input.outcome === "no_rx_referral" ? 4 : null,
    },
  };
}
