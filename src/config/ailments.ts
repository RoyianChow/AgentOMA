import { AilmentType, AilmentConfig } from "@/types/assessment";

export const AILMENT_CONFIGS: Record<AilmentType, AilmentConfig> = {
  // =========================================================================
  // FULLY EXPANDED OCP CLINICAL SCHEMAS
  // =========================================================================

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
          { label: "None of the above", value: "none", triggerRedFlag: true },
        ],
      },
      {
        id: "hasDiabetes",
        label: "Do you have diabetes or an immunocompromising condition?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
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
          { label: "14 days or longer", value: "prolonged", triggerRedFlag: true },
        ],
      },
      {
        id: "isImmunocompromised",
        label: "Do you have a condition or take medication that significantly weakens your immune system?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "lesionLocation",
        label: "Where are the sores located?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "On or around the lips only", value: "lips" },
          { label: "Near my eye (ocular area)", value: "ocular", triggerRedFlag: true },
          { label: "Inside the mouth or tongue", value: "intraoral", triggerRedFlag: true },
          { label: "On my fingers or other body areas", value: "other", triggerRedFlag: true },
        ],
      },
    ],
  },

  TICK_BITES: {
    ailmentType: "TICK_BITES",
    displayName: "Tick Bites (Post-Exposure Prophylaxis)",
    maxClaimsPerYear: 2,
    questions: [
      {
        id: "tickAttachmentTime",
        label: "How long was the tick attached?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Less than 24 hours", value: "under_24h" },
          { label: "24 to 36 hours", value: "24_36h", triggerRedFlag: true },
          { label: "More than 36 hours (or unsure)", value: "over_36h", triggerRedFlag: true },
        ],
      },
      {
        id: "isLymeEndemicArea",
        label: "Did the bite occur in a Lyme-endemic area? (e.g. Southern Ontario, Georgian Bay, Lake Erie shores)",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasBullseyeRash",
        label: "Do you have a distinctive bull's-eye (ring-shaped) rash at or around the bite site?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasSystemicLymeSymptoms",
        label: "Are you experiencing flu-like symptoms (fever, fatigue, aching joints, neck stiffness) since the bite?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "tickIdentified",
        label: "Could you identify the tick? (Black-legged/deer ticks carry Lyme disease)",
        type: "CHOICE",
        required: false,
        choices: [
          { label: "Yes, it appeared to be a black-legged (deer) tick", value: "deer_tick" },
          { label: "Yes, it appeared to be a dog or wood tick", value: "dog_tick" },
          { label: "No, I could not identify it", value: "unknown" },
        ],
      },
    ],
  },

  CONJUNCTIVITIS: {
    ailmentType: "CONJUNCTIVITIS",
    displayName: "Conjunctivitis (Pink Eye)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "hasVisionChanges",
        label: "Are you experiencing blurred vision or any vision loss that persists after blinking?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasEyePain",
        label: "Do you have significant eye pain or severe light sensitivity (photophobia)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isContactLensWearer",
        label: "Do you wear contact lenses?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "dischargeType",
        label: "What type of discharge do you have from the eye?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Watery or clear discharge (allergic/viral)", value: "watery" },
          { label: "Sticky/crusty discharge (especially in the morning)", value: "crusty" },
          { label: "Copious thick yellow/green pus", value: "purulent", triggerRedFlag: true },
        ],
      },
      {
        id: "hasRecentSTI",
        label: "Have you recently been diagnosed with a sexually transmitted infection?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  CANDIDAL_STOMATITIS: {
    ailmentType: "CANDIDAL_STOMATITIS",
    displayName: "Oral Thrush (Candidal Stomatitis)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "hasThroatInvolvement",
        label: "Does the white coating or soreness extend beyond the mouth into your throat?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasDysphagia",
        label: "Are you experiencing pain or difficulty swallowing?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isImmunocompromised",
        label: "Do you have HIV, are you undergoing chemotherapy, or taking long-term immunosuppressants?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isInfant",
        label: "Is this for an infant under 4 months of age?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "priorAntifungalTreatment",
        label: "Have you already tried antifungal treatment (e.g. nystatin, fluconazole) with no improvement?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  DYSMENORRHEA: {
    ailmentType: "DYSMENORRHEA",
    displayName: "Dysmenorrhea (Period Pain)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "isSuddenChange",
        label: "Is this pain significantly different from your usual period cramps (sudden onset or severe escalation)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasFeverOrDischarge",
        label: "Do you have a fever, unusual vaginal discharge, or pelvic tenderness outside of your period?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "painTiming",
        label: "When does the pain typically start?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "1-2 days before or at the start of my period", value: "typical_primary" },
          { label: "Mid-cycle or at other times during the month", value: "atypical", triggerRedFlag: true },
        ],
      },
      {
        id: "hasNoResponseToOTC",
        label: "Have over-the-counter pain medications (e.g. Ibuprofen, Naproxen) provided no relief?",
        type: "BOOLEAN",
        required: false,
        triggerRedFlagOnTrue: false,
      },
    ],
  },

  DERMATITIS: {
    ailmentType: "DERMATITIS",
    displayName: "Mild Dermatitis, Eczema & Contact Rash",
    maxClaimsPerYear: 5,
    questions: [
      {
        id: "isBlistering",
        label: "Is the rash painful, blistering, oozing yellow fluid, or forming a honey-coloured crust?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasSystemicSpread",
        label: "Is the rash spreading rapidly over a large area of your body, or are you experiencing fever?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isNearEyesOrMouth",
        label: "Is the rash near your eyes, lips, or mucous membranes?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "rashPattern",
        label: "How would you describe the rash pattern?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Dry, itchy, and scaling patches (eczema-like)", value: "eczema" },
          { label: "Contact redness (touched something irritating)", value: "contact" },
          { label: "Ring-shaped rash with clearing centre (ringworm)", value: "ringworm" },
          { label: "Raised, fluid-filled blisters", value: "vesicular", triggerRedFlag: true },
        ],
      },
    ],
  },

  ACNE: {
    ailmentType: "ACNE",
    displayName: "Mild to Moderate Acne",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasSevereCysts",
        label: "Do you have large, painful, deep nodules or cysts under the skin?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasAcneWithFever",
        label: "Do you have a sudden severe outbreak of acne accompanied by fever or joint pain?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isOnIsotretinoin",
        label: "Are you currently taking or have recently taken isotretinoin (Accutane)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "acneDistribution",
        label: "Where is the acne predominantly located?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Face only (forehead, chin, cheeks)", value: "face" },
          { label: "Back or chest (truncal)", value: "truncal" },
          { label: "Extensive — face, back, and chest simultaneously", value: "extensive", triggerRedFlag: true },
        ],
      },
    ],
  },

  MUSCULOSKELETAL_SPRAINS_STRAINS: {
    ailmentType: "MUSCULOSKELETAL_SPRAINS_STRAINS",
    displayName: "Musculoskeletal Sprains & Strains",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "inabilityBearWeight",
        label: "Are you completely unable to bear weight on the injured limb (4 steps without support)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasBoneTenderness",
        label: "Do you have point tenderness directly on a bone (not just soft tissue)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasVisibleDeformity",
        label: "Is there visible joint deformity, extreme swelling, or bruising that developed immediately?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "injuryMechanism",
        label: "How did the injury happen?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Rolling my ankle (inversion/eversion)", value: "ankle_roll" },
          { label: "Twisting a knee or wrist", value: "twist" },
          { label: "Muscle pull during physical activity", value: "muscle_pull" },
          { label: "Direct blow, fall, or collision", value: "direct_trauma", triggerRedFlag: true },
        ],
      },
    ],
  },

  GERD: {
    ailmentType: "GERD",
    displayName: "Gastroesophageal Reflux Disease (GERD / Heartburn)",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasDysphagia",
        label: "Do you have difficulty or pain when swallowing food or liquids?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasBleedingSigns",
        label: "Have you noticed blood in your vomit, or black/tarry stools?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasUnintendedWeightLoss",
        label: "Have you experienced unintended weight loss recently?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isHighRiskAge",
        label: "Are you over 50 years old AND have experienced chronic heartburn for more than 5 years?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  HEMORRHOIDS: {
    ailmentType: "HEMORRHOIDS",
    displayName: "Hemorrhoids",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "hasHeavyBleeding",
        label: "Are you experiencing heavy or continuous rectal bleeding (more than slight spotting on toilet paper)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasProlapseOrSeverePain",
        label: "Is there a painful lump protruding from your rectum that cannot be pushed back in, or severe constant pain?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasChangedBowelHabits",
        label: "Have you noticed a recent significant change in bowel habits (frequency, shape, or consistency)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hemorrhoidType",
        label: "How would you describe your symptoms?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Mild itching and slight discomfort around the anus", value: "external_mild" },
          { label: "Bleeding on the toilet paper (bright red, small amount)", value: "bleeding_mild" },
          { label: "Painful swelling at the anal opening", value: "thrombosed", triggerRedFlag: true },
        ],
      },
    ],
  },

  VULVOVAGINAL_CANDIDIASIS: {
    ailmentType: "VULVOVAGINAL_CANDIDIASIS",
    displayName: "Vulvovaginal Candidiasis (Yeast Infection)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "hasFoulOdourOrFever",
        label: "Do you have a foul or fishy-smelling vaginal discharge, pelvic pain, or fever?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isRecurrent",
        label: "Have you had 4 or more confirmed yeast infections in the past 12 months?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isPregnant",
        label: "Are you currently pregnant?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "dischargeAppearance",
        label: "How would you describe the vaginal discharge?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Thick, white, and cottage cheese-like (no odour)", value: "typical_candida" },
          { label: "Grey, watery, and fishy-smelling", value: "bv_like", triggerRedFlag: true },
          { label: "Yellow-green with odour", value: "sti_like", triggerRedFlag: true },
        ],
      },
    ],
  },

  // =========================================================================
  // REMAINING AILMENT STUBS (standard screening templates)
  // =========================================================================

  RHINITIS: {
    ailmentType: "RHINITIS",
    displayName: "Allergic Rhinitis (Seasonal Allergies)",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasBreathingDifficulty",
        label: "Are you experiencing severe shortness of breath, wheezing, or a tight chest?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasFacialSwelling",
        label: "Do you have swelling of the face, lips, or tongue?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "mainSymptoms",
        label: "What are your main symptoms?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Sneezing, runny nose, and watery eyes", value: "typical_allergic" },
          { label: "Blocked nose with thick discoloured mucus", value: "sinusitis_like" },
          { label: "Loss of smell or severe facial pressure", value: "sinusitis_severe", triggerRedFlag: true },
        ],
      },
    ],
  },

  IMPETIGO: {
    ailmentType: "IMPETIGO",
    displayName: "Impetigo",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "isLargeAreaOrSpreading",
        label: "Are the crusty sores widespread or spreading rapidly to new areas despite basic hygiene?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasFeverOrLymphadenopathy",
        label: "Do you have a fever or swollen, tender lymph nodes near the sores?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  INSECT_BITES_URTICARIA: {
    ailmentType: "INSECT_BITES_URTICARIA",
    displayName: "Insect Bites & Hives (Urticaria)",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasAnaphylaxisSigns",
        label: "Are you experiencing facial swelling, throat tightness, difficulty breathing, or dizziness?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hivesExtent",
        label: "How widespread are the hives?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Localized to the bite area only", value: "local" },
          { label: "Spreading beyond the bite area", value: "spreading" },
          { label: "Covering most of my body", value: "widespread", triggerRedFlag: true },
        ],
      },
    ],
  },

  NAUSEA_VOMITING_PREGNANCY: {
    ailmentType: "NAUSEA_VOMITING_PREGNANCY",
    displayName: "Nausea & Vomiting in Pregnancy (NVP)",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasHyperemesisGravidarum",
        label: "Are you unable to keep any liquids down for more than 24 hours, or showing signs of dehydration (dark urine, dizziness)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasBloodInVomit",
        label: "Do you have blood in your vomit?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  PINWORMS_THREADWORMS: {
    ailmentType: "PINWORMS_THREADWORMS",
    displayName: "Pinworms (Enterobiasis)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "hasVaginalItchOrFever",
        label: "Is there vaginal discharge, localized skin breakdown, or fever?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "patientAge",
        label: "Who is affected?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Child (2 years or older)", value: "child" },
          { label: "Adult", value: "adult" },
          { label: "Infant under 2 years", value: "infant", triggerRedFlag: true },
        ],
      },
    ],
  },

  CALLUSES_CORNS_WARTS: {
    ailmentType: "CALLUSES_CORNS_WARTS",
    displayName: "Warts, Corns & Calluses",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "isDiabeticOrPVD",
        label: "Do you have diabetes, poor circulation, or peripheral vascular disease affecting your feet?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasInfectionSigns",
        label: "Is the wart/callus painful, bleeding, inflamed, or showing signs of infection?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  HEADACHE: {
    ailmentType: "HEADACHE",
    displayName: "Mild Headaches",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "isThunderclapOnset",
        label: "Did this headache reach maximum intensity within seconds or a minute (thunderclap headache)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasNeurologicalSymptoms",
        label: "Do you have visual disturbances, slurred speech, facial drooping, or weakness in your arms or legs?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasNeckStiffnessWithFever",
        label: "Do you have a fever along with a stiff neck and sensitivity to light?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "headacheType",
        label: "How would you describe the headache?",
        type: "CHOICE",
        required: true,
        choices: [
          { label: "Tension-type: pressure/tightness around the head", value: "tension" },
          { label: "Migraine-type: throbbing, one-sided, with nausea or light sensitivity", value: "migraine" },
          { label: "Behind one eye with watering (cluster headache)", value: "cluster" },
        ],
      },
    ],
  },

  PEDICULOSIS: {
    ailmentType: "PEDICULOSIS",
    displayName: "Head Lice (Pediculosis Capitis)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "hasScalpInfection",
        label: "Are there signs of a bacterial superinfection of the scalp (pus, crusting, bleeding, or swollen neck lymph nodes)?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "priorTreatmentFailed",
        label: "Have you already used a lice treatment product with no improvement?",
        type: "BOOLEAN",
        required: false,
        triggerRedFlagOnTrue: false,
      },
    ],
  },

  TINEA_CORPORIS_CRURIS: {
    ailmentType: "TINEA_CORPORIS_CRURIS",
    displayName: "Ringworm / Jock Itch (Tinea)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "isExtensiveOrFacial",
        label: "Is the rash covering a large area of the body, spreading to the face, or resistant to treatment?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isImmunocompromised",
        label: "Do you have a condition that weakens your immune system?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  XEROPHTHALMIA: {
    ailmentType: "XEROPHTHALMIA",
    displayName: "Dry Eyes (Xerophthalmia)",
    maxClaimsPerYear: 4,
    questions: [
      {
        id: "hasCornealPain",
        label: "Do you have significant eye pain, a persistent feeling of a foreign body, or vision changes?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isContactLensWearer",
        label: "Do you wear contact lenses?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },

  CANKER_SORES: {
    ailmentType: "CANKER_SORES",
    displayName: "Canker Sores (Aphthous Ulcers)",
    maxClaimsPerYear: 3,
    questions: [
      {
        id: "longerThan3Weeks",
        label: "Have the ulcers been present for more than 3 weeks?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "hasSystemicSymptoms",
        label: "Do you have associated fever, eye redness, genital sores, or skin rash?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
      {
        id: "isLargeOrDeep",
        label: "Is the ulcer larger than 1 cm in diameter or extremely deep and painful?",
        type: "BOOLEAN",
        required: true,
        triggerRedFlagOnTrue: true,
      },
    ],
  },
};
