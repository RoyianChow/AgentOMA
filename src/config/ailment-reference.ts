/**
 * SINGLE SOURCE OF TRUTH — Ontario minor ailment reference data.
 *
 * Transcribed from Table 1 of the Ministry of Health Executive Officer Notice,
 * effective 2026-07-01 (docs/regulatory/moh-executive-officer-notice-minor-
 * ailments-en-2026-05-19.pdf). If this file and the PDF ever disagree, the PDF
 * wins.
 *
 * ⛔ SERVER ONLY. Never import this into a client component.
 *    Run `npm i server-only` and uncomment the import below to enforce it.
 *
 * This file replaces the claim maximums previously in `src/config/ailments.ts`,
 * 13 of which were wrong, and the PIN map previously inlined in the pharmacist
 * page, which contained PINs that do not exist.
 *
 * The seed script (`npm run db:seed`) reads THIS file. Once the reference tables
 * are live, server code should query the DB, not import from here — this then
 * becomes seed input only.
 */

// import "server-only";

import type { AilmentId } from "@/config/triage";

export const EO_NOTICE_EFFECTIVE_DATE = "2026-07-01";

/** Paid regardless of whether a prescription is issued. */
export const FEE_CENTS = {
  inPerson: 1900,
  virtual: 1500,
  /** LTC home primary pharmacy service provider — capitation, $0 claim. */
  ltcPrimary: 0,
} as const;

export interface AilmentReferenceRow {
  /** Becomes `ailment_group.code` in the reference table. */
  id: AilmentId;
  /** Pharmacist-facing name, as worded in the EO Notice. */
  clinical: string;
  /** HNS looks back 365 days from date of service. */
  maxClaimsPer365d: number;
  pins: {
    rxInPerson: string;
    noRxInPerson: string;
    rxVirtual: string;
    noRxVirtual: string;
  };
}

export const AILMENT_REFERENCE: Record<AilmentId, AilmentReferenceRow> = {
  rhinitis: {
    id: "rhinitis",
    clinical: "Rhinitis (allergic, viral)",
    maxClaimsPer365d: 4,
    pins: { rxInPerson: "9858181", noRxInPerson: "9858182", rxVirtual: "9858183", noRxVirtual: "9858184" },
  },
  candidal_stomatitis: {
    id: "candidal_stomatitis",
    clinical: "Candidal stomatitis (oral thrush)",
    maxClaimsPer365d: 4,
    pins: { rxInPerson: "9858185", noRxInPerson: "9858186", rxVirtual: "9858187", noRxVirtual: "9858188" },
  },
  conjunctivitis: {
    id: "conjunctivitis",
    clinical: "Conjunctivitis (bacterial, allergic, viral)",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858189", noRxInPerson: "9858190", rxVirtual: "9858191", noRxVirtual: "9858192" },
  },
  dermatitis: {
    id: "dermatitis",
    clinical: "Dermatitis (atopic, eczema, allergic, contact, diaper, seborrheic)",
    maxClaimsPer365d: 6,
    pins: { rxInPerson: "9858193", noRxInPerson: "9858194", rxVirtual: "9858195", noRxVirtual: "9858196" },
  },
  dysmenorrhea: {
    id: "dysmenorrhea",
    clinical: "Dysmenorrhea",
    maxClaimsPer365d: 2,
    pins: { rxInPerson: "9858197", noRxInPerson: "9858198", rxVirtual: "9858199", noRxVirtual: "9858200" },
  },
  gerd: {
    id: "gerd",
    clinical: "GERD",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858201", noRxInPerson: "9858202", rxVirtual: "9858203", noRxVirtual: "9858204" },
  },
  hemorrhoids: {
    id: "hemorrhoids",
    clinical: "Hemorrhoids",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858205", noRxInPerson: "9858206", rxVirtual: "9858207", noRxVirtual: "9858208" },
  },
  herpes_labialis: {
    id: "herpes_labialis",
    clinical: "Herpes labialis (cold sores)",
    maxClaimsPer365d: 8,
    pins: { rxInPerson: "9858209", noRxInPerson: "9858210", rxVirtual: "9858211", noRxVirtual: "9858212" },
  },
  impetigo: {
    id: "impetigo",
    clinical: "Impetigo",
    maxClaimsPer365d: 2,
    pins: { rxInPerson: "9858213", noRxInPerson: "9858214", rxVirtual: "9858215", noRxVirtual: "9858216" },
  },
  insect_urticaria: {
    id: "insect_urticaria",
    clinical: "Insect bites and urticaria (hives)",
    maxClaimsPer365d: 8,
    pins: { rxInPerson: "9858217", noRxInPerson: "9858218", rxVirtual: "9858219", noRxVirtual: "9858220" },
  },
  msk: {
    id: "msk",
    clinical: "Musculoskeletal sprains and strains",
    maxClaimsPer365d: 4,
    pins: { rxInPerson: "9858221", noRxInPerson: "9858222", rxVirtual: "9858223", noRxVirtual: "9858224" },
  },
  tick_bite: {
    id: "tick_bite",
    clinical: "Tick bites, post-exposure prophylaxis to prevent Lyme disease",
    maxClaimsPer365d: 4,
    pins: { rxInPerson: "9858225", noRxInPerson: "9858226", rxVirtual: "9858227", noRxVirtual: "9858228" },
  },
  uti: {
    id: "uti",
    clinical: "Urinary tract infection (uncomplicated)",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858229", noRxInPerson: "9858230", rxVirtual: "9858231", noRxVirtual: "9858232" },
  },
  acne: {
    id: "acne",
    clinical: "Acne (mild)",
    maxClaimsPer365d: 4,
    // The No-Rx In-Person PIN really is 9858250, not 9858249. Do not "correct" it.
    pins: { rxInPerson: "9858248", noRxInPerson: "9858250", rxVirtual: "9858251", noRxVirtual: "9858252" },
  },
  canker_sores: {
    id: "canker_sores",
    clinical: "Oral aphthae (canker sores)",
    maxClaimsPer365d: 4,
    pins: { rxInPerson: "9858253", noRxInPerson: "9858254", rxVirtual: "9858255", noRxVirtual: "9858256" },
  },
  nvp: {
    id: "nvp",
    clinical: "Nausea and vomiting of pregnancy",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858261", noRxInPerson: "9858262", rxVirtual: "9858263", noRxVirtual: "9858264" },
  },
  pinworms: {
    id: "pinworms",
    clinical: "Pinworms and threadworms",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858265", noRxInPerson: "9858266", rxVirtual: "9858267", noRxVirtual: "9858268" },
  },
  vvc: {
    id: "vvc",
    clinical: "Vulvovaginal candidiasis (yeast infection)",
    maxClaimsPer365d: 4,
    pins: { rxInPerson: "9858269", noRxInPerson: "9858270", rxVirtual: "9858271", noRxVirtual: "9858272" },
  },
  calluses_corns_warts: {
    id: "calluses_corns_warts",
    clinical: "Calluses, corns and warts",
    maxClaimsPer365d: 2,
    pins: { rxInPerson: "9858404", noRxInPerson: "9858405", rxVirtual: "9858406", noRxVirtual: "9858407" },
  },
  tinea: {
    id: "tinea",
    clinical: "Tinea corporis / cruris",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858408", noRxInPerson: "9858409", rxVirtual: "9858410", noRxVirtual: "9858411" },
  },
  headache: {
    id: "headache",
    clinical: "Headache (mild, tension-type)",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858412", noRxInPerson: "9858413", rxVirtual: "9858414", noRxVirtual: "9858415" },
  },
  pediculosis: {
    id: "pediculosis",
    clinical: "Pediculosis (head lice)",
    maxClaimsPer365d: 3,
    pins: { rxInPerson: "9858428", noRxInPerson: "9858429", rxVirtual: "9858430", noRxVirtual: "9858431" },
  },
  xerophthalmia: {
    id: "xerophthalmia",
    clinical: "Xerophthalmia (dry eye disease)",
    maxClaimsPer365d: 2,
    pins: { rxInPerson: "9858432", noRxInPerson: "9858433", rxVirtual: "9858434", noRxVirtual: "9858435" },
  },
};

/**
 * Cross-ailment rules. Data, not `if` statements — these seed `claim_rule`.
 */
export const CLAIM_RULES = [
  {
    type: "SAME_DAY_MUTEX" as const,
    ailments: ["insect_urticaria", "tick_bite"] as AilmentId[],
    note: "Insect bite/urticaria PINs cannot be combined with tick bite PINs on the same day.",
  },
  {
    type: "SCOPE_EXCLUSION" as const,
    ailment: "calluses_corns_warts" as AilmentId,
    note: "Verrucae excluding face and genitals. Face/genital warts are a referral, not an assessment.",
  },
];

/** Claim maximums only — safe to pass to the browser. No PINs, no fees. */
export function getClaimMaximums(): Record<AilmentId, number> {
  return Object.fromEntries(
    Object.values(AILMENT_REFERENCE).map((a) => [a.id, a.maxClaimsPer365d])
  ) as Record<AilmentId, number>;
}
