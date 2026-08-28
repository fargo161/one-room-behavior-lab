import { stableRuntimeId } from "../core/ids";
import { encounterDefinitionSchema } from "./schema";

export const trapstarPaymentEncounter = encounterDefinitionSchema.parse({
  version: "trapstar_npc_encounter_v0_1",
  id: stableRuntimeId("encounter", "trapstar", "disputed_payment", "v0_1"),
  title: "Trapstar NPC Encounter",
  subtitle: "A disputed payment. Three rounds. One outcome.",
  npc: {
    id: stableRuntimeId("npc", "broker"),
    name: "The Broker",
  },
  initialState: {
    trust: 0,
    tension: 0,
  },
  bounds: {
    trust: { min: -2, max: 4 },
    tension: { min: 0, max: 4 },
  },
  moodRules: [
    {
      mood: "angry",
      when: [{ dimension: "tension", comparison: "GTE", value: 2 }],
    },
    {
      mood: "agreement",
      when: [{ dimension: "trust", comparison: "GTE", value: 2 }],
    },
    {
      mood: "guarded",
      when: [{ dimension: "trust", comparison: "LTE", value: 0 }],
    },
  ],
  defaultMood: "neutral",
  rounds: [
    {
      id: stableRuntimeId("round", "payment", 1),
      ordinal: 1,
      dialogue: [
        {
          id: stableRuntimeId("dialogue", "payment", 1, "opening"),
          text: "You’re late. We said twelve. You got twelve?",
        },
      ],
      choices: [
        {
          id: stableRuntimeId("choice", "payment", 1, "settle_rest"),
          text: "I brought nine. I want to settle the rest.",
          effect: { trust: 1, tension: 0 },
        },
        {
          id: stableRuntimeId("choice", "payment", 1, "nine_is_fair"),
          text: "The delivery was short. Nine is fair.",
          effect: { trust: 0, tension: 1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 1, "take_it_or_leave_it"),
          text: "Take nine or get nothing.",
          effect: { trust: -1, tension: 2 },
        },
      ],
    },
    {
      id: stableRuntimeId("round", "payment", 2),
      ordinal: 2,
      dialogue: [
        {
          id: stableRuntimeId("dialogue", "payment", 2, "high_tension"),
          text: "You’re standing in my spot talking to me like that?",
          when: [{ dimension: "tension", comparison: "GTE", value: 2 }],
        },
        {
          id: stableRuntimeId("dialogue", "payment", 2, "earned_trust"),
          text: "At least you’re saying it straight.",
          when: [{ dimension: "trust", comparison: "GTE", value: 1 }],
        },
        {
          id: stableRuntimeId("dialogue", "payment", 2, "default"),
          text: "You came here to tell me what my work is worth?",
        },
      ],
      choices: [
        {
          id: stableRuntimeId("choice", "payment", 2, "one_more_week"),
          text: "Give me a week. I’ll bring the other three.",
          effect: { trust: 1, tension: -1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 2, "ten_today"),
          text: "Take ten today and we reset.",
          effect: { trust: 1, tension: 0 },
        },
        {
          id: stableRuntimeId("choice", "payment", 2, "more_than_share"),
          text: "You already got more than your share.",
          effect: { trust: -1, tension: 1 },
        },
      ],
    },
    {
      id: stableRuntimeId("round", "payment", 3),
      ordinal: 3,
      dialogue: [
        {
          id: stableRuntimeId("dialogue", "payment", 3, "high_tension"),
          text: "One more wrong word and we’re done.",
          when: [{ dimension: "tension", comparison: "GTE", value: 2 }],
        },
        {
          id: stableRuntimeId("dialogue", "payment", 3, "earned_trust"),
          text: "All right. What exactly are you offering?",
          when: [{ dimension: "trust", comparison: "GTE", value: 2 }],
        },
        {
          id: stableRuntimeId("dialogue", "payment", 3, "default"),
          text: "Give me one reason I should keep working with you.",
        },
      ],
      choices: [
        {
          id: stableRuntimeId("choice", "payment", 3, "ten_now_two_later"),
          text: "Ten now, two next week, same terms after that.",
          effect: { trust: 1, tension: -1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 3, "end_clean"),
          text: "Nine now. We end clean and go separate ways.",
          effect: { trust: 0, tension: -1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 3, "you_need_me"),
          text: "Because you need me more than I need you.",
          effect: { trust: -1, tension: 2 },
        },
      ],
    },
  ],
  endings: [
    {
      id: stableRuntimeId("ending", "payment", "argument"),
      outcome: "argument",
      title: "CONFLICT ESCALATED",
      text: "Get out. The deal is dead.",
      forcedMood: "angry",
      when: [{ dimension: "tension", comparison: "GTE", value: 3 }],
    },
    {
      id: stableRuntimeId("ending", "payment", "deal"),
      outcome: "deal",
      title: "DEAL REACHED",
      text: "Ten now, two next week. Don’t make me chase you.",
      forcedMood: "agreement",
      when: [{ dimension: "trust", comparison: "GTE", value: 2 }],
    },
    {
      id: stableRuntimeId("ending", "payment", "walk_away"),
      outcome: "walk_away",
      title: "NEGOTIATION ENDED",
      text: "Keep your money. We’re finished after tonight.",
    },
  ],
});
