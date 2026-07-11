// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH — Ontario Minor Ailment reference data
// ---------------------------------------------------------------------------
// Source: Ministry of Health "Executive Officer Notice: Update to Funding for
// Minor Ailment Services in Ontario Pharmacies", effective 2026-07-01
// (docs/regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf).
// This notice replaces the notice effective 2024-11-18.
//
// Every PIN, claim maximum, and fee below is transcribed directly from Table 1
// of that notice. Do NOT edit values here to "fix" apparent inconsistencies
// (see the Acne note) — they must match the notice exactly. When a future
// revision lands, add a NEW reference file with its own effective date rather
// than mutating this one; the seed loads rows with an effective_date so multiple
// PIN sets coexist.
//
// See docs/COMPLIANCE.md for the rule-by-rule mapping back to the notice.

import type {
  AilmentGroupReference,
  ClaimRuleReference,
  Modality,
} from "./types";

/** The effective date stamped on every reference row seeded from this file. */
export const EO_NOTICE_EFFECTIVE_DATE = "2026-07-01";

export const EO_NOTICE_SOURCE = {
  title:
    "Executive Officer Notice: Update to Funding for Minor Ailment Services in Ontario Pharmacies",
  effectiveDate: "2026-07-01",
  replacesNoticeEffective: "2024-11-18",
  ministry: "Ontario Ministry of Health — Health Programs and Delivery Division",
  file: "docs/regulatory/moh-executive-officer-notice-minor-ailments-en-2026-05-19.pdf",
} as const;

/**
 * Professional service fee, in cents, paid regardless of whether a prescription
 * is issued. In-person = $19, virtual (incl. by phone) = $15. LTC primary
 * provider claims are $0 (paid under the LTC capitation model).
 */
export const SERVICE_FEES_CENTS = {
  inPerson: 1900,
  virtual: 1500,
  ltcPrimaryProvider: 0,
} as const;

/**
 * EO Notice Table 1. Column order for `pins`:
 *   inPersonRxIssued | inPersonNoRx | virtualRxIssued | virtualNoRx
 */
export const AILMENT_GROUPS: AilmentGroupReference[] = [
  {
    code: "RHINITIS",
    displayName: "Rhinitis (allergic, viral)",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858181",
      inPersonNoRx: "9858182",
      virtualRxIssued: "9858183",
      virtualNoRx: "9858184",
    },
  },
  {
    code: "CANDIDAL_STOMATITIS",
    displayName: "Candidal stomatitis (oral thrush)",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858185",
      inPersonNoRx: "9858186",
      virtualRxIssued: "9858187",
      virtualNoRx: "9858188",
    },
  },
  {
    code: "CONJUNCTIVITIS",
    displayName: "Conjunctivitis (bacterial, allergic, viral)",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858189",
      inPersonNoRx: "9858190",
      virtualRxIssued: "9858191",
      virtualNoRx: "9858192",
    },
  },
  {
    code: "DERMATITIS",
    displayName: "Dermatitis (atopic, eczema, allergic, contact, diaper, seborrheic)",
    maxClaimsPer365Days: 6,
    pins: {
      inPersonRxIssued: "9858193",
      inPersonNoRx: "9858194",
      virtualRxIssued: "9858195",
      virtualNoRx: "9858196",
    },
  },
  {
    code: "DYSMENORRHEA",
    displayName: "Dysmenorrhea",
    maxClaimsPer365Days: 2,
    pins: {
      inPersonRxIssued: "9858197",
      inPersonNoRx: "9858198",
      virtualRxIssued: "9858199",
      virtualNoRx: "9858200",
    },
  },
  {
    code: "GERD",
    displayName: "Gastroesophageal reflux disease (GERD)",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858201",
      inPersonNoRx: "9858202",
      virtualRxIssued: "9858203",
      virtualNoRx: "9858204",
    },
  },
  {
    code: "HEMORRHOIDS",
    displayName: "Hemorrhoids",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858205",
      inPersonNoRx: "9858206",
      virtualRxIssued: "9858207",
      virtualNoRx: "9858208",
    },
  },
  {
    code: "HERPES_LABIALIS",
    displayName: "Herpes labialis (cold sores)",
    maxClaimsPer365Days: 8,
    pins: {
      inPersonRxIssued: "9858209",
      inPersonNoRx: "9858210",
      virtualRxIssued: "9858211",
      virtualNoRx: "9858212",
    },
  },
  {
    code: "IMPETIGO",
    displayName: "Impetigo",
    maxClaimsPer365Days: 2,
    pins: {
      inPersonRxIssued: "9858213",
      inPersonNoRx: "9858214",
      virtualRxIssued: "9858215",
      virtualNoRx: "9858216",
    },
  },
  {
    code: "INSECT_BITES_URTICARIA",
    displayName: "Insect bites / urticaria (hives)",
    maxClaimsPer365Days: 8,
    pins: {
      inPersonRxIssued: "9858217",
      inPersonNoRx: "9858218",
      virtualRxIssued: "9858219",
      virtualNoRx: "9858220",
    },
  },
  {
    code: "MUSCULOSKELETAL_SPRAINS_STRAINS",
    displayName: "Musculoskeletal sprains & strains",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858221",
      inPersonNoRx: "9858222",
      virtualRxIssued: "9858223",
      virtualNoRx: "9858224",
    },
  },
  {
    code: "TICK_BITES",
    displayName: "Tick bites (post-exposure prophylaxis for Lyme disease)",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858225",
      inPersonNoRx: "9858226",
      virtualRxIssued: "9858227",
      virtualNoRx: "9858228",
    },
  },
  {
    code: "URINARY_TRACT_INFECTION",
    displayName: "Urinary tract infection (uncomplicated)",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858229",
      inPersonNoRx: "9858230",
      virtualRxIssued: "9858231",
      virtualNoRx: "9858232",
    },
  },
  {
    code: "ACNE",
    displayName: "Acne (mild)",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858248",
      // NOTE: The No-Rx (In-Person) PIN for Acne is 9858250, NOT 9858249. This
      // is exactly as printed in EO Notice Table 1. Do NOT "correct" it.
      inPersonNoRx: "9858250",
      virtualRxIssued: "9858251",
      virtualNoRx: "9858252",
    },
  },
  {
    code: "CANKER_SORES",
    displayName: "Canker sores (oral aphthae)",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858253",
      inPersonNoRx: "9858254",
      virtualRxIssued: "9858255",
      virtualNoRx: "9858256",
    },
  },
  {
    code: "NAUSEA_VOMITING_PREGNANCY",
    displayName: "Nausea & vomiting of pregnancy",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858261",
      inPersonNoRx: "9858262",
      virtualRxIssued: "9858263",
      virtualNoRx: "9858264",
    },
  },
  {
    code: "PINWORMS_THREADWORMS",
    displayName: "Pinworms / threadworms",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858265",
      inPersonNoRx: "9858266",
      virtualRxIssued: "9858267",
      virtualNoRx: "9858268",
    },
  },
  {
    code: "VULVOVAGINAL_CANDIDIASIS",
    displayName: "Vulvovaginal candidiasis (yeast infection)",
    maxClaimsPer365Days: 4,
    pins: {
      inPersonRxIssued: "9858269",
      inPersonNoRx: "9858270",
      virtualRxIssued: "9858271",
      virtualNoRx: "9858272",
    },
  },
  {
    code: "CALLUSES_CORNS_WARTS",
    displayName: "Calluses, corns and warts",
    maxClaimsPer365Days: 2,
    pins: {
      inPersonRxIssued: "9858404",
      inPersonNoRx: "9858405",
      virtualRxIssued: "9858406",
      virtualNoRx: "9858407",
    },
  },
  {
    code: "HEADACHE",
    displayName: "Headache (mild, tension-type)",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858412",
      inPersonNoRx: "9858413",
      virtualRxIssued: "9858414",
      virtualNoRx: "9858415",
    },
  },
  {
    code: "PEDICULOSIS",
    displayName: "Pediculosis (head lice)",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858428",
      inPersonNoRx: "9858429",
      virtualRxIssued: "9858430",
      virtualNoRx: "9858431",
    },
  },
  {
    code: "TINEA_CORPORIS_CRURIS",
    displayName: "Tinea corporis / cruris (ringworm, jock itch)",
    maxClaimsPer365Days: 3,
    pins: {
      inPersonRxIssued: "9858408",
      inPersonNoRx: "9858409",
      virtualRxIssued: "9858410",
      virtualNoRx: "9858411",
    },
  },
  {
    code: "XEROPHTHALMIA",
    displayName: "Xerophthalmia (dry eye)",
    maxClaimsPer365Days: 2,
    pins: {
      inPersonRxIssued: "9858432",
      inPersonNoRx: "9858433",
      virtualRxIssued: "9858434",
      virtualNoRx: "9858435",
    },
  },
];

/**
 * Cross-ailment billing rules from the EO Notice, encoded as data so they seed
 * into a `claim_rule` table rather than living as ad-hoc conditionals.
 */
export const CLAIM_RULES: ClaimRuleReference[] = [
  {
    code: "MUTEX_INSECT_TICK_SAME_DAY",
    type: "SAME_DAY_MUTEX",
    description:
      "Insect bites/urticaria and tick bites cannot both be claimed on the same day for the same eligible person (EO Notice Table 1 footnotes).",
    ailmentCodes: ["INSECT_BITES_URTICARIA", "TICK_BITES"],
  },
  {
    code: "SCOPE_WARTS_FACE_GENITAL",
    type: "SCOPE_EXCLUSION",
    description:
      "Verrucae (warts) are billed under Calluses/Corns/Warts, but warts on the face or genitals are out of scope — this is a referral, not a billable assessment (EO Notice: minor-ailment list note 'Verrucae (warts; excluding face and genitals)').",
    ailmentCode: "CALLUSES_CORNS_WARTS",
    params: { outOfScopeLocations: ["face", "genital"] },
  },
];

/** The set of valid ailment codes, derived from the reference data. */
export const AILMENT_CODES = AILMENT_GROUPS.map((g) => g.code);

/** Look up a single ailment group by its code. */
export function getAilmentGroup(code: string): AilmentGroupReference | undefined {
  return AILMENT_GROUPS.find((g) => g.code === code);
}

/** The service fee (cents) for a modality, ignoring the LTC $0 special case. */
export function feeCentsForModality(modality: Modality): number {
  return modality === "in_person"
    ? SERVICE_FEES_CENTS.inPerson
    : SERVICE_FEES_CENTS.virtual;
}

/**
 * Resolve the PIN for a given ailment / modality / outcome. This is the lookup
 * half of the claim-derivation logic; the full ClaimDraft derivation (fee,
 * prescriber id, intervention codes, quantity, SSC, LTC handling) is built and
 * unit-tested separately.
 */
export function resolvePin(
  code: string,
  modality: Modality,
  rxIssued: boolean,
): string | undefined {
  const group = getAilmentGroup(code);
  if (!group) return undefined;
  if (modality === "in_person") {
    return rxIssued ? group.pins.inPersonRxIssued : group.pins.inPersonNoRx;
  }
  return rxIssued ? group.pins.virtualRxIssued : group.pins.virtualNoRx;
}
