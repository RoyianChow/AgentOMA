/**
 * Effective-dated ODB dispensing-fee tiers from the July 1, 2026 EO Notice.
 *
 * These amounts are dispensing fees, not the $19/$15 minor-ailment service
 * fees. Remote-virtual eligibility is data, not an application constant.
 */
export const ODB_FEE_TIERS = [
  {
    code: "regular_8_83",
    dispensingFeeCents: 883,
    remoteVirtualEligible: false,
  },
  {
    code: "rural_9_93",
    dispensingFeeCents: 993,
    remoteVirtualEligible: true,
  },
  {
    code: "rural_12_14",
    dispensingFeeCents: 1214,
    remoteVirtualEligible: true,
  },
  {
    code: "rural_13_25",
    dispensingFeeCents: 1325,
    remoteVirtualEligible: true,
  },
] as const;

export type OdbFeeTierCode = (typeof ODB_FEE_TIERS)[number]["code"];
