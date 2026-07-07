import { AilmentType, AilmentConfig } from "@/types/assessment";

export const AILMENT_CONFIGS: Record<AilmentType, AilmentConfig> = {
  URINARY_TRACT_INFECTION: {
    ailmentType: "URINARY_TRACT_INFECTION",
    displayName: "Urinary Tract Infection (Uncomplicated)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "isPregnant",
        label: "Are you currently pregnant?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasSystemicSymptoms",
        label: "Are you experiencing fever, chills, severe vomiting, or back/flank pain?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "primarySymptom",
        label: "What is your main localized symptom?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Pain or burning sensation when urinating", value: "burning" },
          { label: "Frequent urge to urinate with little output", value: "frequency" },
          { label: "None of the above", value: "none", triggerRedFlag: true }
        ]
      }
    ]
  },
  HERPES_LABIALIS: {
    ailmentType: "HERPES_LABIALIS",
    displayName: "Herpes Labialis (Cold Sores)",
    maxClaimsPerYear: 8,
    questions: [
      {
        id: "durationDays",
        label: "How long have the sores been present?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Under 14 days", value: "normal_duration" },
          { label: "14 days or longer", value: "prolonged", triggerRedFlag: true }
        ]
      },
      {
        id: "isImmunocompromised",
        label: "Do you have a condition or take medication that significantly weakens your immune system?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true
      }
    ]
  },
  ACNE: {
    ailmentType: "ACNE",
    displayName: "Mild Acne",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasSevereCysts",
        label: "Do you have large, painful, deep nodules or cysts under the skin?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true
      },
      {
        id: "isWidespread",
        label: "Is your acne spreading to major parts of your back, chest, or shoulders?",
        type: "BOOLEAN",
        required: true
      }
    ]
  },
  GERD: {
    ailmentType: "GERD",
    displayName: "Gastroesophageal Reflux Disease (GERD)",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasDysphagia",
        label: "Do you have difficulty or pain when swallowing food?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true
      },
      {
        id: "hasBleedingSigns",
        label: "Have you noticed blood in your vomit or black tarry stools?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true
      }
    ]
  },
  DERMATITIS: {
    ailmentType: "DERMATITIS",
    displayName: "Mild Dermatitis & Eczema",
    maxClaimsPerYear: 5,
    questions: [
      {
        id: "isBlistering",
        label: "Is the rash painful, blistering, peeling, or oozing yellow fluid?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true
      },
      {
        id: "hasSystemicSpread",
        label: "Is the rash spreading rapidly or accompanied by a high fever?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true
      }
    ]
  },
  // Generic stubs for the remaining 18 ailments to complete the 23-ailment schema
  RHINITIS: {
    ailmentType: "RHINITIS",
    displayName: "Allergic Rhinitis (Allergies)",
    maxClaimsPerYear: 4,
    questions: [{ id: "severeAsthma", label: "Are you experiencing severe shortness of breath?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  CANDIDAL_STOMATITIS: {
    ailmentType: "CANDIDAL_STOMATITIS",
    displayName: "Oral Thrush",
    maxClaimsPerYear: 3,
    questions: [{ id: "isSpreadingThroat", label: "Does the white coating spread into your throat or cause difficulty swallowing?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  CONJUNCTIVITIS: {
    ailmentType: "CONJUNCTIVITIS",
    displayName: "Conjunctivitis (Pink Eye)",
    maxClaimsPerYear: 3,
    questions: [{ id: "hasVisionLoss", label: "Are you experiencing vision changes, severe eye pain, or extreme sensitivity to light?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  DYSMENORRHEA: {
    ailmentType: "DYSMENORRHEA",
    displayName: "Dysmenorrhea (Period Pain)",
    maxClaimsPerYear: 3,
    questions: [{ id: "suddenSevere", label: "Is this sudden, severe pain that is drastically different from your regular period pain?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  HEMORRHOIDS: {
    ailmentType: "HEMORRHOIDS",
    displayName: "Hemorrhoids",
    maxClaimsPerYear: 3,
    questions: [{ id: "heavyBleeding", label: "Are you experiencing heavy rectal bleeding or severe, constant pain?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  IMPETIGO: {
    ailmentType: "IMPETIGO",
    displayName: "Impetigo",
    maxClaimsPerYear: 3,
    questions: [{ id: "isLargeArea", label: "Are the crusty sores widespread or spreading rapidly despite hygiene measures?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  INSECT_BITES_URTICARIA: {
    ailmentType: "INSECT_BITES_URTICARIA",
    displayName: "Insect Bites & Hives",
    maxClaimsPerYear: 4,
    questions: [{ id: "anaphylaxis", label: "Are you experiencing facial swelling, throat tightness, or difficulty breathing?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  MUSCULOSKELETAL_SPRAINS_STRAINS: {
    ailmentType: "MUSCULOSKELETAL_SPRAINS_STRAINS",
    displayName: "Musculoskeletal Sprains & Strains",
    maxClaimsPerYear: 3,
    questions: [{ id: "inabilityBearWeight", label: "Are you completely unable to bear weight or is there visible joint deformity?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  TICK_BITES: {
    ailmentType: "TICK_BITES",
    displayName: "Tick Bites (Post-exposure Prophylaxis)",
    maxClaimsPerYear: 2,
    questions: [{ id: "tickAttachedOver36", label: "Was the tick attached for less than 24 hours, or are you showing signs of fever or rash?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  CANKER_SORES: {
    ailmentType: "CANKER_SORES",
    displayName: "Canker Sores",
    maxClaimsPerYear: 3,
    questions: [{ id: "longerThan14Days", label: "Have the sores been present for longer than 14 days?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  NAUSEA_VOMITING_PREGNANCY: {
    ailmentType: "NAUSEA_VOMITING_PREGNANCY",
    displayName: "Nausea & Vomiting in Pregnancy",
    maxClaimsPerYear: 4,
    questions: [{ id: "dehydrationSigns", label: "Are you unable to keep liquids down for 24 hours, showing dark urine, or feeling dizzy?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  PINWORMS_THREADWORMS: {
    ailmentType: "PINWORMS_THREADWORMS",
    displayName: "Pinworms",
    maxClaimsPerYear: 3,
    questions: [{ id: "vaginalItchfever", label: "Is there vaginal discharge, localized skin breakdown, or fever?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  VULVOVAGINAL_CANDIDIASIS: {
    ailmentType: "VULVOVAGINAL_CANDIDIASIS",
    displayName: "Vulvovaginal Candidiasis (Yeast Infection)",
    maxClaimsPerYear: 3,
    questions: [{ id: "foulOdourFever", label: "Is there a foul-smelling vaginal discharge, pelvic pain, or fever?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  CALLUSES_CORNS_WARTS: {
    ailmentType: "CALLUSES_CORNS_WARTS",
    displayName: "Warts, Corns & Calluses",
    maxClaimsPerYear: 3,
    questions: [{ id: "isDiabeticWarts", label: "Do you have diabetes or poor blood circulation in your legs or feet?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  HEADACHE: {
    ailmentType: "HEADACHE",
    displayName: "Mild Headaches",
    maxClaimsPerYear: 3,
    questions: [{ id: "suddenThunderclap", label: "Did this headache start suddenly and reach maximum intensity within a minute (thunderclap)?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  PEDICULOSIS: {
    ailmentType: "PEDICULOSIS",
    displayName: "Head Lice (Pediculosis)",
    maxClaimsPerYear: 3,
    questions: [{ id: "scalpInfection", label: "Are there signs of a secondary bacterial infection (severe itching, pus, bleeding scalp)?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  TINEA_CORPORIS_CRURIS: {
    ailmentType: "TINEA_CORPORIS_CRURIS",
    displayName: "Ringworm / Jock Itch",
    maxClaimsPerYear: 3,
    questions: [{ id: "extensiveOozing", label: "Is the rash leaking pus, spreading to your face, or covering a large portion of your body?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  },
  XEROPHTHALMIA: {
    ailmentType: "XEROPHTHALMIA",
    displayName: "Dry Eyes",
    maxClaimsPerYear: 4,
    questions: [{ id: "corneaScratches", label: "Do you have eye pain, foreign body sensation that won't go away, or blurred vision?", type: "BOOLEAN", required: true, triggerRedFlagOnTrue: true }]
  }
};
