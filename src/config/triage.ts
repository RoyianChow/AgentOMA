/**
 * PATIENT TRIAGE TREE
 *
 * Narrows a patient's presenting concern to one of the 23 publicly funded
 * Ontario minor-ailment claim categories, or routes the patient to a pharmacist
 * without forcing a category.
 *
 * Client-safe: contains no PINs, no fees, no claim maximums, no PHI.
 * Claim maximums are passed in from the server (see assessment/page.tsx).
 *
 * IMPORTANT CLINICAL BOUNDARY
 *
 * - This is an intake and routing aid, not a diagnostic, prescribing, referral,
 *   or billing-decision engine.
 * - A matched item in RED_FLAGS must stop self-service and trigger pharmacist
 *   review. Code must not automatically turn a match into a diagnosis, a
 *   referral destination, or a claim/no-claim decision.
 * - The tick-bite and uncomplicated-UTI sections below were aligned to the
 *   public PHO/OCP algorithms current in July 2026.
 * - The remaining clinical prompts are conservative drafts. A practising
 *   Ontario pharmacist must approve them against the pharmacy's chosen current
 *   clinical algorithms before production use.
 *
 * This produces a SELF-REPORTED PRESENTING COMPLAINT, never a diagnosis. The EO
 * Notice requires the pharmacist to "verify the person's self-diagnosis." This
 * is the input to that, not a replacement for it.
 *
 * Public funding eligibility is separate. Server/pharmacist workflows must also
 * verify the Ontario health number, pharmacy/provider eligibility, condition
 * claim maximum, same-day claim rule, red-flag status, service location,
 * self/family and LTC restrictions, and the existing-prescription exclusions in
 * the EO Notice effective July 1, 2026.
 */

export const ASSESSMENT_POLICY = {
  jurisdiction: "Ontario",
  fundingEffectiveDate: "2026-07-01",
  reviewedOn: "2026-07-26",
  fundingNotice:
    "Executive Officer Notice: Update to Funding for Minor Ailment Services in Ontario Pharmacies",
  ocpScopeUrl:
    "https://ocpinfo.com/pharmacy-professionals/expanded-scope-of-practice/minor-ailments/",
  tickBiteAlgorithmUrl:
    "https://www.publichealthontario.ca/-/media/Documents/L/2023/lyme-disease-assessment-prescribing-algorithm-antibiotic-prophylaxis.pdf",
  utiAlgorithmUrl:
    "https://www.ocpinfo.com/wp-content/uploads/2022/12/assessment-prescribing-algorithm-urinary-tract-infection-english.pdf",
  utiInclusiveCareUrl:
    "https://ocpinfo.com/ocp-resources/providing-respectful-and-inclusive-minor-ailment-assessments-for-a-uti/",
} as const;

export type AilmentId =
  | "rhinitis"
  | "candidal_stomatitis"
  | "conjunctivitis"
  | "dermatitis"
  | "dysmenorrhea"
  | "gerd"
  | "hemorrhoids"
  | "herpes_labialis"
  | "impetigo"
  | "insect_urticaria"
  | "msk"
  | "tick_bite"
  | "uti"
  | "acne"
  | "canker_sores"
  | "nvp"
  | "pinworms"
  | "vvc"
  | "calluses_corns_warts"
  | "tinea"
  | "headache"
  | "pediculosis"
  | "xerophthalmia";

/** Patient-facing labels. Plain language, no clinical jargon. */
export const AILMENT_LABELS: Record<AilmentId, string> = {
  rhinitis: "Runny, blocked, or congested nose",
  candidal_stomatitis: "Oral thrush",
  conjunctivitis: "Pink eye",
  dermatitis: "Eczema or dermatitis",
  dysmenorrhea: "Painful periods",
  gerd: "Heartburn or acid reflux",
  hemorrhoids: "Hemorrhoids",
  herpes_labialis: "Cold sore",
  impetigo: "Impetigo",
  insect_urticaria: "Insect bites or hives",
  msk: "Sprain or strain",
  tick_bite: "Recent tick bite (Lyme disease prevention)",
  uti: "Possible urinary tract infection (UTI)",
  acne: "Mild acne",
  canker_sores: "Canker sore",
  nvp: "Morning sickness",
  pinworms: "Pinworms",
  vvc: "Vaginal yeast infection",
  calluses_corns_warts: "Callus, corn, or wart (not on the face or genitals)",
  tinea: "Ringworm on the body or jock itch",
  headache: "Mild tension-type headache",
  pediculosis: "Head lice",
  xerophthalmia: "Dry eye",
};

export const ALL_AILMENT_IDS = Object.keys(AILMENT_LABELS) as AilmentId[];

/* ── Tree outcomes ──────────────────────────────────────────────────────────
   The tree itself has only three terminal shapes:

   ailment       Candidate funded category; pharmacist assessment is required.
   not_funded    Outside this publicly funded list; pharmacist can still advise.
   unsure        No safe category; hand off to the pharmacist.

   Emergency screening happens before the tree. Referral and claim eligibility
   are later pharmacist/server decisions and are intentionally not tree outcomes.
   ────────────────────────────────────────────────────────────────────────── */
export type DeadEnd = "not_funded" | "unsure";

interface TriageOptionBase {
  label: string;
  sub?: string;
  /** Highlights the option — used for time-critical paths (tick bites). */
  urgent?: boolean;
}

/** Exactly one destination is required; TypeScript rejects mixed destinations. */
export type TriageOption = TriageOptionBase &
  (
    | {
      ailment: AilmentId;
      next?: never;
      outcome?: never;
      reason?: never;
    }
    | {
      next: string;
      ailment?: never;
      outcome?: never;
      reason?: never;
    }
    | {
      outcome: "unsure";
      ailment?: never;
      next?: never;
      reason?: never;
    }
    | {
      outcome: "not_funded";
      reason: string;
      ailment?: never;
      next?: never;
    }
  );

export interface TriageNode {
  title: string;
  help?: string;
  options: TriageOption[];
}

/** Always first and never skippable. A positive answer exits self-service. */
export const EMERGENCY_SIGNS: string[] = [
  "Chest pain or pressure, especially spreading to the arm, jaw, or back",
  "Trouble breathing, or swelling of the lips, tongue, or throat",
  "The worst headache of your life, or one that came on like a thunderclap",
  "Sudden weakness, numbness, confusion, slurred speech, or vision loss",
  "Fever with a severe headache or stiff neck, with or without a rash",
  "Heavy bleeding that will not stop",
  "A seizure, loss of consciousness, or difficulty waking normally",
  "Fainting with chest pain, trouble breathing, severe bleeding, or failure to recover fully",
];

export const EMERGENCY_ACTION =
  "Call 911 or go to the nearest emergency department now. Do not continue this questionnaire.";

export const TRIAGE_ROOT = "region";

export const NODES: Record<string, TriageNode> = {
  region: {
    title: "Where is the main problem?",
    help: "Choose the concern that is bothering you most. Tell the pharmacist about every other symptom too.",
    options: [
      { label: "Skin, hair, or nails", next: "skin_where" },
      { label: "Eyes", next: "eye" },
      {
        label: "Nose or sinuses",
        sub: "Runny, blocked, sneezing, congested",
        ailment: "rhinitis",
      },
      { label: "Mouth, lips, or tongue", next: "mouth" },
      { label: "Heartburn, or feeling sick to the stomach", next: "gi" },
      { label: "Back passage or bottom", next: "bottom" },
      { label: "Peeing, or vaginal symptoms", next: "urogenital" },
      {
        label: "Period pain",
        sub: "Cramping that comes with your period",
        ailment: "dysmenorrhea",
      },
      {
        label: "A muscle, joint, or back",
        sub: "After an injury, a fall, or overdoing it",
        ailment: "msk",
      },
      { label: "Headache", next: "headache_type" },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  /* ── Skin: the crowded branch. ────────────────────────────────────────── */
  skin_where: {
    title: "Where on the body?",
    options: [
      { label: "Scalp or hair", next: "skin_scalp" },
      { label: "Face", next: "skin_face" },
      { label: "Lips or around the mouth", next: "mouth" },
      { label: "Body, arms, or legs", next: "skin_body" },
      { label: "Groin, inner thigh, or buttocks", next: "skin_groin" },
      { label: "Hands or feet", next: "skin_extremity" },
      {
        label: "A baby's diaper or nappy area",
        sub: "Red, sore skin under the diaper",
        ailment: "dermatitis",
      },
      { label: "Somewhere else, or I'm not sure", outcome: "unsure" },
    ],
  },

  skin_scalp: {
    title: "What does the scalp look like?",
    options: [
      {
        label: "Itchy, and there are lice or eggs in the hair",
        sub: "Or someone at school or daycare has had them",
        ailment: "pediculosis",
      },
      {
        label: "Flaking, with greasy yellowish scales",
        sub: "Dandruff, or seborrheic dermatitis",
        ailment: "dermatitis",
      },
      {
        label: "A round, scaly bald patch",
        outcome: "not_funded",
        reason:
          "Ringworm of the scalp isn't on Ontario's funded list — only ringworm on the body and in the groin are. The pharmacist can still look at it and point you in the right direction.",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  skin_face: {
    title: "What's on the face?",
    options: [
      { label: "Pimples, blackheads, or whiteheads", ailment: "acne" },
      {
        label: "Red, flaky, greasy patches",
        sub: "Often around the nose, eyebrows, or hairline",
        ailment: "dermatitis",
      },
      {
        label: "A blister or sore on the edge of the lip",
        sub: "It tingled or burned before it appeared, and it comes back in the same spot",
        ailment: "herpes_labialis",
      },
      {
        label: "Golden-yellow crusty sores that are spreading",
        ailment: "impetigo",
      },
      {
        label: "A rough, raised wart",
        outcome: "not_funded",
        reason:
          "Warts on the face aren't on the funded list — Ontario specifically excludes the face and genitals. This one is worth having a doctor look at.",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  skin_body: {
    title: "Which of these is closest?",
    help: "If two seem to fit, pick the one you noticed first.",
    options: [
      {
        label: "You found a tick attached to the skin",
        sub: "Or you removed one recently. Tell the pharmacist straight away — timing matters for this one.",
        ailment: "tick_bite",
        urgent: true,
      },
      {
        label: "Dry, itchy, red or scaly — and it comes and goes",
        sub: "Often in the creases of the elbows or knees",
        ailment: "dermatitis",
      },
      {
        label: "It started after touching something new",
        sub: "A plant, jewellery, a new soap or detergent",
        ailment: "dermatitis",
      },
      {
        label: "Raised itchy welts that fade within hours and move around",
        sub: "Hives",
        ailment: "insect_urticaria",
      },
      {
        label: "Itchy bumps after being outside or around insects",
        ailment: "insect_urticaria",
      },
      {
        label: "A round scaly patch with a raised edge and a clearer middle",
        sub: "Slowly getting bigger — ringworm",
        ailment: "tinea",
      },
      {
        label: "Mild pimples, blackheads, or whiteheads",
        sub: "For example, on the chest, shoulders, or upper back",
        ailment: "acne",
      },
      {
        label: "A rough, raised growth, sometimes with tiny black dots",
        sub: "A common wart away from the face and genitals",
        ailment: "calluses_corns_warts",
      },
      { label: "Golden-yellow crusty sores", ailment: "impetigo" },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  skin_groin: {
    title: "What's happening there?",
    options: [
      {
        label: "Itchy, red, scaly rash in the skin folds",
        sub: "Jock itch",
        ailment: "tinea",
      },
      { label: "Vaginal itching, soreness, or discharge", next: "urogenital" },
      { label: "Red, itchy, dry rash — like eczema", ailment: "dermatitis" },
      {
        label: "Warts in the genital area",
        outcome: "not_funded",
        reason:
          "Genital warts aren't on the funded list — Ontario specifically excludes them. Please see a doctor or a sexual health clinic.",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  skin_extremity: {
    title: "What's on the hands or feet?",
    options: [
      {
        label: "Hard, thickened skin from pressure or rubbing",
        sub: "Usually on the foot — a callus or corn",
        ailment: "calluses_corns_warts",
      },
      {
        label: "A rough, raised growth, sometimes with tiny black dots",
        sub: "A wart or verruca",
        ailment: "calluses_corns_warts",
      },
      {
        label: "Dry, cracked, itchy skin",
        sub: "Eczema or dermatitis",
        ailment: "dermatitis",
      },
      {
        label: "Itchy, scaly, cracked skin between the toes",
        outcome: "not_funded",
        reason:
          "Athlete's foot isn't on Ontario's funded list. The pharmacist can absolutely still recommend a treatment — it just isn't a billable minor ailment assessment.",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  /* ── Eye ──────────────────────────────────────────────────────────────── */
  eye: {
    title: "What's happening with the eye?",
    options: [
      {
        label: "Red or pink, gritty, with discharge or crusting",
        sub: "Lids sometimes stuck together in the morning",
        ailment: "conjunctivitis",
      },
      {
        label: "Very itchy and watery, often in both eyes",
        sub: "Sometimes with sneezing or other allergy symptoms",
        ailment: "conjunctivitis",
      },
      {
        label: "Dry, burning, gritty — but no discharge",
        sub: "Worse with screens, wind, or air conditioning",
        ailment: "xerophthalmia",
      },
      { label: "Something else", outcome: "unsure" },
    ],
  },

  /* ── Mouth: the inside/outside distinction patients get wrong ─────────── */
  mouth: {
    title: "Where exactly is the sore?",
    help: "This one matters. Cold sores and canker sores are different things, and they're treated differently.",
    options: [
      {
        label: "On the outside — the edge of the lip",
        sub: "It tingled or burned first, and it's come back in the same place before",
        ailment: "herpes_labialis",
      },
      {
        label: "Inside the mouth — cheek, tongue, or inner lip",
        sub: "A painful ulcer, white or yellow with a red rim",
        ailment: "canker_sores",
      },
      {
        label: "White patches that wipe or scrape off",
        sub: "On the tongue or inside the cheeks, sore or burning",
        ailment: "candidal_stomatitis",
      },
      {
        label: "Golden crusty sores around the mouth that are spreading",
        ailment: "impetigo",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  /* ── Upper GI ─────────────────────────────────────────────────────────── */
  gi: {
    title: "Which describes it better?",
    options: [
      {
        label: "Burning behind the breastbone, or acid coming up",
        sub: "Worse after meals or when lying down",
        ailment: "gerd",
      },
      { label: "Feeling sick or vomiting — and I'm pregnant", ailment: "nvp" },
      {
        label: "Feeling sick or vomiting — and I'm not pregnant",
        outcome: "not_funded",
        reason:
          "Nausea and vomiting outside of pregnancy isn't on Ontario's funded list. The pharmacist can still talk it through with you, and will tell you if you should see a doctor.",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  /* ── Bottom ───────────────────────────────────────────────────────────── */
  bottom: {
    title: "Which is closer?",
    options: [
      {
        label: "Pain, itching, a lump, or bright red blood on the paper",
        sub: "Worse when straining or sitting",
        ailment: "hemorrhoids",
      },
      {
        label: "Intense itching, especially at night",
        sub: "You may have seen tiny white thread-like worms",
        ailment: "pinworms",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  /* ── Urogenital ───────────────────────────────────────────────────────── */
  urogenital: {
    title: "What are the symptoms?",
    options: [
      {
        label: "Burning or stinging when peeing, going often or urgently",
        ailment: "uti",
      },
      {
        label: "Vaginal itching, soreness, and thick white discharge",
        ailment: "vvc",
      },
      { label: "Something else", outcome: "unsure" },
    ],
  },

  /* ── Headache: migraine is NOT on the funded list. Only tension-type. ─── */
  headache_type: {
    title: "What does the headache feel like?",
    help: "Ontario's funded list covers tension-type headache only.",
    options: [
      {
        label: "A dull, tight band of pressure across the head",
        sub: "Both sides, mild to moderate, not made worse by moving around",
        ailment: "headache",
      },
      {
        label: "Throbbing on one side, with nausea or sensitivity to light",
        sub: "Or you see flashes or zigzags beforehand",
        outcome: "not_funded",
        reason:
          "That sounds more like migraine, which isn't on Ontario's funded minor ailment list — only tension-type headache is. The pharmacist can still help, and will tell you whether you should see a doctor.",
      },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },
};

/**
 * Official July 2026 PHO/OCP Lyme prophylaxis criteria.
 *
 * All four must be satisfied before doxycycline prophylaxis is considered.
 * Failure to satisfy a criterion means "do not prescribe prophylaxis"; it is
 * not, by itself, an automatic urgent referral. Every patient should receive
 * 30-day symptom-monitoring advice from the pharmacist.
 */
export const TICK_BITE_PEP_CRITERIA: string[] = [
  "The tick was removed within the past 72 hours",
  "The bite occurred in a higher-risk area where blacklegged ticks have been identified",
  "The tick was likely attached for 24 hours or more",
  "Doxycycline is not contraindicated for this patient",
];

/**
 * Official OCP symptom threshold for considering acute uncomplicated UTI.
 *
 * The presentation is acute dysuria OR at least two of: new urgency/frequency,
 * suprapubic pain/discomfort, and hematuria. The pharmacist must still rule out
 * every complicating factor and recurrence/relapse trigger below.
 */
export const UTI_PRESENTATION_CRITERIA = {
  acuteDysuriaIsSufficient: true,
  alternativeMinimumCount: 2,
  alternativeSymptoms: [
    "New urinary urgency or frequency",
    "Suprapubic pain or discomfort",
    "Hematuria",
  ],
} as const;

export const UTI_PRIVATE_QUESTION_INTRO =
  "Some UTI questions concern private anatomy because it affects safe treatment. You may pause or stop at any time.";

/**
 * PRESCREEN ESCALATION TRIGGERS — one set per ailment.
 *
 * A match stops automated intake and requires pharmacist review. These strings
 * deliberately do not decide whether the item is an official Ministry/OCP red
 * flag, whether referral is required, or whether a claim may be submitted.
 *
 * The EO Notice distinguishes an ineligible/red-flag presentation (no paid
 * claim) from a completed eligible assessment whose care plan includes referral
 * (the appropriate No-Rx PIN and SSC 4 may apply). Only the pharmacist and
 * billing workflow can make that distinction.
 */
export const RED_FLAGS: Record<AilmentId, string[]> = {
  rhinitis: [
    "Symptoms have lasted more than 10 days and are getting worse",
    "High fever",
    "Severe pain or swelling on one side of the face",
    "Any change in vision, or swelling around the eye",
  ],
  candidal_stomatitis: [
    "Trouble swallowing or breathing",
    "The white patches are spreading down the throat",
    "You have a weakened immune system, or you're on chemotherapy",
    "This keeps coming back with no clear cause",
    "A baby who is refusing to feed",
  ],
  conjunctivitis: [
    "Any change in your vision",
    "Moderate or severe pain in the eye",
    "Strong sensitivity to light",
    "You wear contact lenses",
    "Recent eye injury, eye surgery, or something got in the eye",
    "One pupil looks different from the other",
  ],
  xerophthalmia: [
    "Any change in your vision",
    "Moderate or severe pain in the eye",
    "Strong sensitivity to light",
    "There's discharge or crusting",
    "You wear contact lenses and the eye is red, painful, or sensitive to light",
    "Recent eye surgery",
    "Dry eyes along with a dry mouth and aching joints",
  ],
  dermatitis: [
    "Signs of infection — pus, spreading warmth, or fever",
    "It covers a large part of the body",
    "The skin is blistering or peeling",
    "It hasn't improved with treatment you've already tried",
  ],
  impetigo: [
    "Fever",
    "It's spreading quickly, or covers a large area",
    "Deep sores or ulcers rather than surface crusting",
    "It's near the eyes",
    "You have a weakened immune system",
    "It hasn't improved with treatment you've already tried",
  ],
  herpes_labialis: [
    "The sores have spread near or into the eye",
    "You have a weakened immune system",
    "The sores have lasted more than 2 weeks",
    "You get them very frequently",
  ],
  acne: [
    "Deep, painful lumps under the skin, or cysts",
    "It's leaving scars",
    "It came on suddenly and severely",
    "It hasn't improved with treatments you've already tried",
  ],
  insect_urticaria: [
    "Trouble breathing, or swelling of the lips, tongue, or throat",
    "Hives along with dizziness or feeling faint",
    "The hives have lasted more than 6 weeks",
    "The bite looks infected — spreading redness, warmth, or pus",
    "Fever",
  ],
  // PHO/OCP algorithm: symptoms after a tick bite require physician/NP referral.
  // The separate 72-hour, risk-area, attachment-time, and doxycycline checks
  // above determine prophylaxis eligibility; they are not red flags themselves.
  tick_bite: [
    "An expanding rash, sometimes like a bull's-eye",
    "Fever, chills, headache, stiff neck, unusual tiredness, or loss of appetite",
    "Muscle or joint aches, joint swelling, or swollen glands after the tick bite",
  ],
  tinea: [
    "It covers a large part of the body",
    "It's on the scalp or affecting the nails",
    "You have diabetes, or a weakened immune system",
    "It hasn't improved with treatment you've already tried",
    "Signs of a bacterial infection — pus, spreading warmth",
  ],
  pediculosis: [
    "The person is under 2 years old",
    "You're pregnant or breastfeeding",
    "The scalp looks infected from scratching",
    "The eyelashes are involved",
    "Treatment has already been tried and failed",
  ],
  calluses_corns_warts: [
    "You have diabetes",
    "You have poor circulation in your feet",
    "Your feet are numb, or you can't feel them properly",
    "The area is bleeding, infected, or has changed colour or shape",
    "It's on the face or genitals",
  ],
  gerd: [
    "Trouble or pain swallowing, or food feels like it sticks",
    "Losing weight without trying",
    "Vomiting blood, or vomit that looks like coffee grounds",
    "Black, tarry stools",
    "Chest pain that spreads to your arm, jaw, or back",
    "These are new symptoms and you're over 50",
  ],
  nvp: [
    "You can't keep any fluids down",
    "You're losing weight",
    "Signs of dehydration — very dark urine, dizziness, not passing urine",
    "Severe abdominal pain",
    "Fever",
    "The nausea or vomiting started for the first time later in the pregnancy",
  ],
  hemorrhoids: [
    "Heavy bleeding",
    "Dark red or black blood, or blood mixed into the stool",
    "A change in your usual bowel pattern",
    "Losing weight without trying",
    "A family history of bowel cancer",
    "Severe pain, or a hard lump that won't go back in",
    "You're over 50 and this bleeding is new",
  ],
  pinworms: [
    "The person is pregnant",
    "The person is under 2 years old",
    "It hasn't cleared after treatment",
    "Blood in the stool, weight loss, or abdominal pain",
  ],
  // Aligned to OCP's public uncomplicated-UTI algorithm. Hematuria can form part
  // of the qualifying symptom pattern; isolated gross hematuria is different and
  // requires investigation.
  uti: [
    "The patient does not have female genitourinary anatomy, or the relevant anatomy is uncertain",
    "The person is pregnant",
    "The person is under 12 years old",
    "Fever or shaking chills",
    "Pain in the back or side, below the ribs",
    "Nausea or vomiting",
    "Visible blood is the main symptom, or there is confusion or delirium without typical UTI symptoms",
    "You have a weakened immune system",
    "You have a catheter, neurogenic bladder, kidney stones, kidney disease, or another urinary tract abnormality",
    "Symptoms returned within 4 weeks of finishing antibiotic treatment",
    "You've had 2 or more UTIs in 6 months, or 3 or more in 12 months",
  ],
  vvc: [
    "This is the first time you've ever had this",
    "You're pregnant",
    "You've had 4 or more in the past year",
    "Fever, or pain in the pelvis or abdomen",
    "The discharge smells bad, or is green, grey, or yellow",
    "There's a chance you've been exposed to an STI",
    "You have diabetes that isn't well controlled",
    "The person is under 12 years old",
  ],
  dysmenorrhea: [
    "Pain outside of your period, not just during it",
    "The pain is getting worse cycle after cycle",
    "Unusually heavy bleeding",
    "Pain during sex",
    "Fever",
    "There's a chance you're pregnant",
    "This pain is new, and you've never had it before",
  ],
  msk: [
    "You can't put weight on it, or can't use the limb",
    "It looks bent, out of shape, or deformed",
    "Numbness, tingling, or weakness",
    "Severe swelling or bruising",
    "You heard or felt a snap or pop when it happened",
    "Back pain along with loss of bladder or bowel control",
    "You hit your head",
    "Fever",
  ],
  headache: [
    "The worst headache of your life, or it came on like a thunderclap",
    "Fever with a stiff neck",
    "It started after a blow to the head",
    "Weakness, numbness, confusion, slurred speech, or a change in vision",
    "It's worse lying down, or it wakes you from sleep",
    "It's been getting steadily worse over days or weeks",
    "This is a new or different kind of headache and you're over 50",
    "You're pregnant and also have high blood pressure or swelling",
    "You have a weakened immune system",
  ],
  canker_sores: [
    "An ulcer that hasn't healed in 3 weeks",
    "Very large ulcers, or a lot of them",
    "You also get ulcers on the eyes or genitals",
    "You can't eat or drink properly",
    "You have a weakened immune system",
  ],
};

/** Which ailments are still reachable from this node. Drives the pool counter. */
export function computePool(
  nodeId: string,
  seen: Set<string> = new Set(),
): Set<AilmentId> {
  const out = new Set<AilmentId>();
  if (seen.has(nodeId)) return out;

  const node = NODES[nodeId];
  if (!node) return out;

  const nextSeen = new Set(seen);
  nextSeen.add(nodeId);

  for (const opt of node.options) {
    if (opt.ailment) {
      out.add(opt.ailment);
    } else if (opt.next) {
      for (const a of computePool(opt.next, nextSeen)) out.add(a);
    }
  }
  return out;
}

export type TriageValidationCode =
  | "missing_root"
  | "empty_node"
  | "invalid_destination"
  | "missing_node"
  | "missing_reason"
  | "forced_category"
  | "cycle"
  | "unreachable_node"
  | "unreachable_ailment"
  | "missing_red_flags";

export interface TriageValidationIssue {
  code: TriageValidationCode;
  message: string;
  nodeId?: string;
  optionIndex?: number;
  ailment?: AilmentId;
}

/**
 * Lightweight integrity check for tests and startup diagnostics.
 *
 * This validates the graph and data shape only. A clean result does not replace
 * pharmacist clinical review.
 */
export function validateTriageDefinition(): TriageValidationIssue[] {
  const issues: TriageValidationIssue[] = [];

  if (!NODES[TRIAGE_ROOT]) {
    issues.push({
      code: "missing_root",
      message: `Triage root "${TRIAGE_ROOT}" does not exist.`,
      nodeId: TRIAGE_ROOT,
    });
    return issues;
  }

  for (const [nodeId, node] of Object.entries(NODES)) {
    if (node.options.length === 0) {
      issues.push({
        code: "empty_node",
        message: `Node "${nodeId}" has no options.`,
        nodeId,
      });
    }

    if (!node.options.some((option) => option.outcome === "unsure")) {
      issues.push({
        code: "forced_category",
        message: `Node "${nodeId}" has no safe "unsure" handoff.`,
        nodeId,
      });
    }

    node.options.forEach((option, optionIndex) => {
      const destinationCount = [
        option.ailment,
        option.next,
        option.outcome,
      ].filter((value) => value !== undefined).length;

      if (destinationCount !== 1) {
        issues.push({
          code: "invalid_destination",
          message: `Option ${optionIndex} in "${nodeId}" must have exactly one destination.`,
          nodeId,
          optionIndex,
        });
      }

      if (option.next && !NODES[option.next]) {
        issues.push({
          code: "missing_node",
          message: `Option ${optionIndex} in "${nodeId}" points to missing node "${option.next}".`,
          nodeId,
          optionIndex,
        });
      }

      if (option.outcome === "not_funded" && !option.reason.trim()) {
        issues.push({
          code: "missing_reason",
          message: `Non-funded option ${optionIndex} in "${nodeId}" needs a patient-facing reason.`,
          nodeId,
          optionIndex,
        });
      }
    });
  }

  const reachableNodes = new Set<string>();
  const activePath = new Set<string>();

  const visit = (nodeId: string): void => {
    if (activePath.has(nodeId)) {
      issues.push({
        code: "cycle",
        message: `Triage graph contains a cycle through "${nodeId}".`,
        nodeId,
      });
      return;
    }
    if (reachableNodes.has(nodeId) || !NODES[nodeId]) return;

    activePath.add(nodeId);
    for (const option of NODES[nodeId].options) {
      if (option.next) visit(option.next);
    }
    activePath.delete(nodeId);
    reachableNodes.add(nodeId);
  };

  visit(TRIAGE_ROOT);

  for (const nodeId of Object.keys(NODES)) {
    if (!reachableNodes.has(nodeId)) {
      issues.push({
        code: "unreachable_node",
        message: `Node "${nodeId}" cannot be reached from "${TRIAGE_ROOT}".`,
        nodeId,
      });
    }
  }

  const reachableAilments = computePool(TRIAGE_ROOT);
  for (const ailment of ALL_AILMENT_IDS) {
    if (!reachableAilments.has(ailment)) {
      issues.push({
        code: "unreachable_ailment",
        message: `Ailment "${ailment}" cannot be reached from "${TRIAGE_ROOT}".`,
        ailment,
      });
    }

    if (!RED_FLAGS[ailment]?.length) {
      issues.push({
        code: "missing_red_flags",
        message: `Ailment "${ailment}" has no prescreen escalation triggers.`,
        ailment,
      });
    }
  }

  return issues;
}