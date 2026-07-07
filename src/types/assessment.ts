import { z } from "zod";

// Permitted Ontario Minor Ailments as of July 2026
export type AilmentType =
  | "RHINITIS" // Merged allergic & viral
  | "CANDIDAL_STOMATITIS"
  | "CONJUNCTIVITIS"
  | "DERMATITIS" // Merged diaper, contact, eczema, etc.
  | "DYSMENORRHEA"
  | "GERD"
  | "HEMORRHOIDS"
  | "HERPES_LABIALIS"
  | "IMPETIGO"
  | "INSECT_BITES_URTICARIA"
  | "MUSCULOSKELETAL_SPRAINS_STRAINS"
  | "TICK_BITES"
  | "URINARY_TRACT_INFECTION"
  | "ACNE"
  | "CANKER_SORES"
  | "NAUSEA_VOMITING_PREGNANCY"
  | "PINWORMS_THREADWORMS"
  | "VULVOVAGINAL_CANDIDIASIS"
  | "CALLUSES_CORNS_WARTS"
  | "HEADACHE"
  | "PEDICULOSIS"
  | "TINEA_CORPORIS_CRURIS"
  | "XEROPHTHALMIA";

export type QuestionType = "BOOLEAN" | "CHOICE" | "TEXT";

export interface QuestionChoice {
  label: string;
  value: string;
  triggerRedFlag?: boolean;
  triggerRedFlagHeader?: boolean; // Keep matching key if required in choice definitions
}

export interface ClinicalQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  choices?: QuestionChoice[];
  // If true, answering true/selecting this choice flags a referral condition
  triggerRedFlagOnTrue?: boolean; 
}

export interface AilmentConfig {
  ailmentType: AilmentType;
  displayName: string;
  maxClaimsPerYear: number;
  questions: ClinicalQuestion[];
}
