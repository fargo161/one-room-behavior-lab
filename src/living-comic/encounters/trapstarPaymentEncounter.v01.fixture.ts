type ChoiceIndex = 0 | 1 | 2;
type Mood = "neutral" | "guarded" | "angry" | "agreement";
type Outcome = "deal" | "walk_away" | "argument";

export interface V01PathExpectation {
  selectedChoiceIndexes: readonly [ChoiceIndex, ChoiceIndex, ChoiceIndex];
  roundTwoDialogueId: string;
  roundThreeDialogueId: string;
  moodsAfterChoices: readonly [Mood, Mood, Mood];
  finalTrust: number;
  finalTension: number;
  outcome: Outcome;
  finalMood: Mood;
}

export const V01_CHOICE_IDS_BY_ROUND = [
  [
    "choice_payment_1_settle_rest",
    "choice_payment_1_nine_is_fair",
    "choice_payment_1_take_it_or_leave_it",
  ],
  [
    "choice_payment_2_one_more_week",
    "choice_payment_2_ten_today",
    "choice_payment_2_more_than_share",
  ],
  [
    "choice_payment_3_ten_now_two_later",
    "choice_payment_3_end_clean",
    "choice_payment_3_you_need_me",
  ],
] as const;

export const V01_ENDING_FACTS = {
  deal: {
    id: "ending_payment_deal",
    title: "DEAL REACHED",
    text: "Ten now, two next week. Don’t make me chase you.",
    forcedMood: "agreement",
  },
  walk_away: {
    id: "ending_payment_walk_away",
    title: "NEGOTIATION ENDED",
    text: "Keep your money. We’re finished after tonight.",
    forcedMood: null,
  },
  argument: {
    id: "ending_payment_argument",
    title: "CONFLICT ESCALATED",
    text: "Get out. The deal is dead.",
    forcedMood: "angry",
  },
} as const;

const EARNED_TRUST_R2 = "dialogue_payment_2_earned_trust";
const DEFAULT_R2 = "dialogue_payment_2_default";
const HIGH_TENSION_R2 = "dialogue_payment_2_high_tension";
const EARNED_TRUST_R3 = "dialogue_payment_3_earned_trust";
const DEFAULT_R3 = "dialogue_payment_3_default";
const HIGH_TENSION_R3 = "dialogue_payment_3_high_tension";

export const V01_PATHS = [
  { selectedChoiceIndexes: [0, 0, 0], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: EARNED_TRUST_R3, moodsAfterChoices: ["neutral", "agreement", "agreement"], finalTrust: 3, finalTension: 0, outcome: "deal", finalMood: "agreement" },
  { selectedChoiceIndexes: [0, 0, 1], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: EARNED_TRUST_R3, moodsAfterChoices: ["neutral", "agreement", "agreement"], finalTrust: 2, finalTension: 0, outcome: "deal", finalMood: "agreement" },
  { selectedChoiceIndexes: [0, 0, 2], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: EARNED_TRUST_R3, moodsAfterChoices: ["neutral", "agreement", "angry"], finalTrust: 1, finalTension: 2, outcome: "walk_away", finalMood: "angry" },
  { selectedChoiceIndexes: [0, 1, 0], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: EARNED_TRUST_R3, moodsAfterChoices: ["neutral", "agreement", "agreement"], finalTrust: 3, finalTension: 0, outcome: "deal", finalMood: "agreement" },
  { selectedChoiceIndexes: [0, 1, 1], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: EARNED_TRUST_R3, moodsAfterChoices: ["neutral", "agreement", "agreement"], finalTrust: 2, finalTension: 0, outcome: "deal", finalMood: "agreement" },
  { selectedChoiceIndexes: [0, 1, 2], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: EARNED_TRUST_R3, moodsAfterChoices: ["neutral", "agreement", "angry"], finalTrust: 1, finalTension: 2, outcome: "walk_away", finalMood: "angry" },
  { selectedChoiceIndexes: [0, 2, 0], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["neutral", "guarded", "neutral"], finalTrust: 1, finalTension: 0, outcome: "walk_away", finalMood: "neutral" },
  { selectedChoiceIndexes: [0, 2, 1], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["neutral", "guarded", "guarded"], finalTrust: 0, finalTension: 0, outcome: "walk_away", finalMood: "guarded" },
  { selectedChoiceIndexes: [0, 2, 2], roundTwoDialogueId: EARNED_TRUST_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["neutral", "guarded", "angry"], finalTrust: -1, finalTension: 3, outcome: "argument", finalMood: "angry" },
  { selectedChoiceIndexes: [1, 0, 0], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["guarded", "neutral", "agreement"], finalTrust: 2, finalTension: 0, outcome: "deal", finalMood: "agreement" },
  { selectedChoiceIndexes: [1, 0, 1], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["guarded", "neutral", "neutral"], finalTrust: 1, finalTension: 0, outcome: "walk_away", finalMood: "neutral" },
  { selectedChoiceIndexes: [1, 0, 2], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["guarded", "neutral", "angry"], finalTrust: 0, finalTension: 2, outcome: "walk_away", finalMood: "angry" },
  { selectedChoiceIndexes: [1, 1, 0], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["guarded", "neutral", "agreement"], finalTrust: 2, finalTension: 0, outcome: "deal", finalMood: "agreement" },
  { selectedChoiceIndexes: [1, 1, 1], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["guarded", "neutral", "neutral"], finalTrust: 1, finalTension: 0, outcome: "walk_away", finalMood: "neutral" },
  { selectedChoiceIndexes: [1, 1, 2], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["guarded", "neutral", "angry"], finalTrust: 0, finalTension: 3, outcome: "argument", finalMood: "angry" },
  { selectedChoiceIndexes: [1, 2, 0], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["guarded", "angry", "guarded"], finalTrust: 0, finalTension: 1, outcome: "walk_away", finalMood: "guarded" },
  { selectedChoiceIndexes: [1, 2, 1], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["guarded", "angry", "guarded"], finalTrust: -1, finalTension: 1, outcome: "walk_away", finalMood: "guarded" },
  { selectedChoiceIndexes: [1, 2, 2], roundTwoDialogueId: DEFAULT_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["guarded", "angry", "angry"], finalTrust: -2, finalTension: 4, outcome: "argument", finalMood: "angry" },
  { selectedChoiceIndexes: [2, 0, 0], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["angry", "guarded", "neutral"], finalTrust: 1, finalTension: 0, outcome: "walk_away", finalMood: "neutral" },
  { selectedChoiceIndexes: [2, 0, 1], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["angry", "guarded", "guarded"], finalTrust: 0, finalTension: 0, outcome: "walk_away", finalMood: "guarded" },
  { selectedChoiceIndexes: [2, 0, 2], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: DEFAULT_R3, moodsAfterChoices: ["angry", "guarded", "angry"], finalTrust: -1, finalTension: 3, outcome: "argument", finalMood: "angry" },
  { selectedChoiceIndexes: [2, 1, 0], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["angry", "angry", "neutral"], finalTrust: 1, finalTension: 1, outcome: "walk_away", finalMood: "neutral" },
  { selectedChoiceIndexes: [2, 1, 1], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["angry", "angry", "guarded"], finalTrust: 0, finalTension: 1, outcome: "walk_away", finalMood: "guarded" },
  { selectedChoiceIndexes: [2, 1, 2], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["angry", "angry", "angry"], finalTrust: -1, finalTension: 4, outcome: "argument", finalMood: "angry" },
  { selectedChoiceIndexes: [2, 2, 0], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["angry", "angry", "angry"], finalTrust: -1, finalTension: 2, outcome: "walk_away", finalMood: "angry" },
  { selectedChoiceIndexes: [2, 2, 1], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["angry", "angry", "angry"], finalTrust: -2, finalTension: 2, outcome: "walk_away", finalMood: "angry" },
  { selectedChoiceIndexes: [2, 2, 2], roundTwoDialogueId: HIGH_TENSION_R2, roundThreeDialogueId: HIGH_TENSION_R3, moodsAfterChoices: ["angry", "angry", "angry"], finalTrust: -2, finalTension: 4, outcome: "argument", finalMood: "angry" },
] as const satisfies readonly V01PathExpectation[];
