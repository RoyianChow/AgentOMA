/**
 * PATIENT TRIAGE TREE
 *
 * Narrows a patient's "something is wrong with me" down to one of the 23 funded
 * Ontario minor-ailment groups, or routes safely out.
 *
 * Client-safe: contains no PINs, no fees, no claim maximums, no PHI.
 * Claim maximums are passed in from the server (see assessment/page.tsx).
 *
 * ⚠️  PHARMACIST REVIEW REQUIRED — EVERY QUESTION AND EVERY RED FLAG BELOW.
 *
 *     These are drafted from general clinical knowledge. They are NOT OCP's
 *     assessment and prescribing algorithms. Before this touches a real patient,
 *     the pilot pharmacist must review and sign off on each line. The tick-bite
 *     timing threshold in particular is a guess and must be corrected against the
 *     actual Lyme PEP algorithm — it is time-critical and being wrong is unsafe.
 *
 * This produces a SELF-REPORTED PRESENTING COMPLAINT, never a diagnosis. The EO
 * Notice requires the pharmacist to "verify the person's self-diagnosis." This
 * is the input to that, not a replacement for it.
 */

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
  rhinitis: "Runny or blocked nose",
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
  tick_bite: "Tick bite",
  uti: "Urinary tract infection",
  acne: "Mild acne",
  canker_sores: "Canker sore",
  nvp: "Morning sickness",
  pinworms: "Pinworms",
  vvc: "Vaginal yeast infection",
  calluses_corns_warts: "Callus, corn, or wart",
  tinea: "Ringworm or jock itch",
  headache: "Tension headache",
  pediculosis: "Head lice",
  xerophthalmia: "Dry eye",
};

export const ALL_AILMENT_IDS = Object.keys(AILMENT_LABELS) as AilmentId[];

/* ── Outcomes ───────────────────────────────────────────────────────────────
   Five, not two. The fourth is the one people miss.

   emergency    911 / ER. Not an assessment.                        no claim
   assessable   Funded ailment, no red flags.                       CLAIM
   refer        Funded ailment BUT a red flag fired.                NO CLAIM
   not_funded   Real condition, pharmacist can advise, not on list. NO CLAIM
   unsure       Can't narrow. Talk to the pharmacist.               n/a
   ────────────────────────────────────────────────────────────────────────── */
export type DeadEnd = "not_funded" | "unsure";

export interface TriageOption {
  label: string;
  sub?: string;
  /** Highlights the option — used for time-critical paths (tick bites). */
  urgent?: boolean;
  /** Exactly one of these three. */
  ailment?: AilmentId;
  next?: string;
  outcome?: DeadEnd;
  /** Required when outcome === "not_funded". Shown to the patient. */
  reason?: string;
}

export interface TriageNode {
  title: string;
  help?: string;
  options: TriageOption[];
}

/** Always first. Never skippable. PHARMACIST REVIEW REQUIRED. */
export const EMERGENCY_SIGNS: string[] = [
  "Chest pain or pressure, especially spreading to the arm, jaw, or back",
  "Trouble breathing, or swelling of the lips, tongue, or throat",
  "The worst headache of your life, or one that came on like a thunderclap",
  "Sudden weakness, numbness, confusion, slurred speech, or vision loss",
  "Fever with a stiff neck and a rash",
  "Heavy bleeding that will not stop",
  "Fainting, or feeling like you are about to pass out",
  "Severe pain anywhere that is getting rapidly worse",
];

export const TRIAGE_ROOT = "region";

export const NODES: Record<string, TriageNode> = {
  region: {
    title: "Where's the problem?",
    help: "Pick the thing bothering you most. You can raise anything else with the pharmacist afterwards.",
    options: [
      { label: "Skin, hair, or nails", next: "skin_where" },
      { label: "Eyes", next: "eye" },
      { label: "Nose or sinuses", sub: "Runny, blocked, sneezing, congested", ailment: "rhinitis" },
      { label: "Mouth, lips, or tongue", next: "mouth" },
      { label: "Heartburn, or feeling sick to the stomach", next: "gi" },
      { label: "Back passage or bottom", next: "bottom" },
      { label: "Peeing, or vaginal symptoms", next: "urogenital" },
      { label: "Period pain", sub: "Cramping that comes with your period", ailment: "dysmenorrhea" },
      { label: "A muscle, joint, or back", sub: "After an injury, a fall, or overdoing it", ailment: "msk" },
      { label: "Headache", next: "headache_type" },
      { label: "Something else, or I'm not sure", outcome: "unsure" },
    ],
  },

  /* ── Skin: the crowded branch. Nine candidates. ───────────────────────── */
  skin_where: {
    title: "Where on the body?",
    options: [
      { label: "Scalp or hair", next: "skin_scalp" },
      { label: "Face", next: "skin_face" },
      { label: "Lips or around the mouth", next: "mouth" },
      { label: "Body, arms, or legs", next: "skin_body" },
      { label: "Groin, inner thigh, or buttocks", next: "skin_groin" },
      { label: "Hands or feet", next: "skin_extremity" },
      { label: "A baby's nappy area", sub: "Red, sore skin under the diaper", ailment: "dermatitis" },
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
      { label: "Golden-yellow crusty sores that are spreading", ailment: "impetigo" },
      {
        label: "A rough, raised wart",
        outcome: "not_funded",
        reason:
          "Warts on the face aren't on the funded list — Ontario specifically excludes the face and genitals. This one is worth having a doctor look at.",
      },
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
      { label: "Itchy bumps after being outside or around insects", ailment: "insect_urticaria" },
      {
        label: "A round scaly patch with a raised edge and a clearer middle",
        sub: "Slowly getting bigger — ringworm",
        ailment: "tinea",
      },
      { label: "Golden-yellow crusty sores", ailment: "impetigo" },
    ],
  },

  skin_groin: {
    title: "What's happening there?",
    options: [
      { label: "Itchy, red, scaly rash in the skin folds", sub: "Jock itch", ailment: "tinea" },
      { label: "Vaginal itching, soreness, or discharge", next: "urogenital" },
      { label: "Red, itchy, dry rash — like eczema", ailment: "dermatitis" },
      {
        label: "Warts in the genital area",
        outcome: "not_funded",
        reason:
          "Genital warts aren't on the funded list — Ontario specifically excludes them. Please see a doctor or a sexual health clinic.",
      },
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
      { label: "Dry, cracked, itchy skin", sub: "Eczema or dermatitis", ailment: "dermatitis" },
      {
        label: "Itchy, scaly, cracked skin between the toes",
        outcome: "not_funded",
        reason:
          "Athlete's foot isn't on Ontario's funded list. The pharmacist can absolutely still recommend a treatment — it just isn't a billable minor ailment assessment.",
      },
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
      { label: "Golden crusty sores around the mouth that are spreading", ailment: "impetigo" },
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
    ],
  },

  /* ── Urogenital ───────────────────────────────────────────────────────── */
  urogenital: {
    title: "What are the symptoms?",
    options: [
      { label: "Burning or stinging when peeing, going often or urgently", ailment: "uti" },
      { label: "Vaginal itching, soreness, and thick white discharge", ailment: "vvc" },
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
    ],
  },
};

/**
 * RED FLAGS — one set per ailment.
 *
 * If ANY of these fires: the patient is referred, and NO CLAIM MAY BE SUBMITTED.
 * This is different from a completed assessment that ends in a referral (which
 * IS billable, with SSC = 4). Do not collapse the two.
 *
 * ⚠️  PHARMACIST REVIEW REQUIRED on every line.
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
    "You wear contact lenses",
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
  // ⚠️ TIME-CRITICAL. The 72-hour figure below is a GUESS and must be replaced
  //    with the threshold from OCP's Lyme PEP algorithm before go-live.
  tick_bite: [
    "It has been more than 72 hours since the tick was removed",
    "An expanding rash, sometimes like a bull's-eye",
    "Fever, chills, headache, or aching joints",
    "You already feel unwell",
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
    "The vomiting started after about week 9 of pregnancy",
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
  // The first three are the complicating factors named in footnote 7 of the
  // EO Notice (male sex, pregnancy, age < 12).
  uti: [
    "The person is male",
    "The person is pregnant",
    "The person is under 12 years old",
    "Fever or chills",
    "Pain in the back or side, below the ribs",
    "Nausea or vomiting",
    "Blood in the urine",
    "Symptoms have lasted more than 7 days",
    "You've had 2 or more in the last 6 months",
    "You have a catheter, diabetes, or a weakened immune system",
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
export function computePool(nodeId: string, seen: Set<string> = new Set()): Set<AilmentId> {
  const node = NODES[nodeId];
  const out = new Set<AilmentId>();
  if (!node) return out;

  for (const opt of node.options) {
    if (opt.ailment) {
      out.add(opt.ailment);
    } else if (opt.next && !seen.has(opt.next)) {
      const nextSeen = new Set(seen);
      nextSeen.add(opt.next);
      for (const a of computePool(opt.next, nextSeen)) out.add(a);
    }
  }
  return out;
}
