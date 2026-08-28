import { stableRuntimeId } from "../core/ids";
import { encounterDefinitionSchema } from "./schema";

export const trapstarPaymentEncounter = encounterDefinitionSchema.parse({
  version: "trapstar_npc_encounter_v0_1_1",
  id: stableRuntimeId("encounter", "trapstar", "disputed_payment", "v0_1"),
  title: "Trapstar NPC Encounter",
  subtitle: "A disputed payment. Three rounds. One outcome.",
  setup: {
    location: "APARTMENT 305",
    time: "11:42 PM",
    problem: "The shipment came up short.",
    debt: "You owe Marcus “Broker” Hill $1,200.",
    payment: "You brought $900.",
    stakes: "Marcus needs reliable partners, but he cannot afford to look lenient.",
    objective: "Keep the relationship alive—or end it tonight.",
    ctaLabel: "ENTER",
  },
  npc: {
    id: stableRuntimeId("npc", "broker"),
    name: "Marcus “Broker” Hill",
    role: "Broker",
    motive: "He needs reliable partners because a larger deal is approaching.",
    vulnerability: "He cannot afford to appear lenient.",
    verbalHabit: "He speaks in clipped questions and repeats the number or claim he thinks the other person is avoiding.",
  },
  initialState: { trust: 0, tension: 0 },
  bounds: {
    trust: { min: -2, max: 4 },
    tension: { min: 0, max: 4 },
  },
  moodRules: [
    { mood: "angry", when: [{ dimension: "tension", comparison: "GTE", value: 2 }] },
    { mood: "agreement", when: [{ dimension: "trust", comparison: "GTE", value: 2 }] },
    { mood: "guarded", when: [{ dimension: "trust", comparison: "LTE", value: 0 }] },
  ],
  defaultMood: "neutral",
  rounds: [
    {
      id: stableRuntimeId("round", "payment", 1),
      ordinal: 1,
      dialogue: [
        { id: stableRuntimeId("dialogue", "payment", 1, "opening"), text: "You’re late. We said twelve. You got twelve?" },
      ],
      choices: [
        {
          id: stableRuntimeId("choice", "payment", 1, "settle_rest"),
          text: "I brought nine. I want to settle the rest.",
          intentLabel: "MAKE GOOD",
          outcomeInterpretation: "You acknowledged the shortfall and said you intended to settle the remainder.",
          effect: { trust: 1, tension: 0 },
        },
        {
          id: stableRuntimeId("choice", "payment", 1, "nine_is_fair"),
          text: "The delivery was short. Nine is fair.",
          intentLabel: "JUSTIFY",
          outcomeInterpretation: "You defended the reduced payment by pointing to the short delivery.",
          effect: { trust: 0, tension: 1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 1, "take_it_or_leave_it"),
          text: "Take nine or get nothing.",
          intentLabel: "THREATEN",
          outcomeInterpretation: "You turned the payment into an ultimatum.",
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
        { id: stableRuntimeId("dialogue", "payment", 2, "default"), text: "You came here to tell me what my work is worth?" },
      ],
      choices: [
        {
          id: stableRuntimeId("choice", "payment", 2, "one_more_week"),
          text: "Give me a week. I’ll bring the other three.",
          intentLabel: "BUY TIME",
          outcomeInterpretation: "You asked for another week and promised to complete the payment.",
          effect: { trust: 1, tension: -1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 2, "ten_today"),
          text: "Take ten today and we reset.",
          intentLabel: "RENEGOTIATE",
          outcomeInterpretation: "You offered a larger immediate payment to reset the arrangement.",
          effect: { trust: 1, tension: 0 },
        },
        {
          id: stableRuntimeId("choice", "payment", 2, "more_than_share"),
          text: "You already got more than your share.",
          intentLabel: "BLAME",
          outcomeInterpretation: "You shifted responsibility back onto Marcus.",
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
        { id: stableRuntimeId("dialogue", "payment", 3, "default"), text: "Give me one reason I should keep working with you." },
      ],
      choices: [
        {
          id: stableRuntimeId("choice", "payment", 3, "ten_now_two_later"),
          text: "Ten now, two next week, same terms after that.",
          intentLabel: "OFFER TERMS",
          outcomeInterpretation: "You proposed specific repayment terms and continued business afterward.",
          effect: { trust: 1, tension: -1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 3, "end_clean"),
          text: "Nine now. We end clean and go separate ways.",
          intentLabel: "WALK AWAY",
          outcomeInterpretation: "You proposed ending the relationship without further escalation.",
          effect: { trust: 0, tension: -1 },
        },
        {
          id: stableRuntimeId("choice", "payment", 3, "you_need_me"),
          text: "Because you need me more than I need you.",
          intentLabel: "LEVERAGE",
          outcomeInterpretation: "You challenged Marcus’s leverage and authority.",
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
      outcomeLead: "The exchange escalated past the point where Marcus would continue negotiating.",
      forcedMood: "angry",
      when: [{ dimension: "tension", comparison: "GTE", value: 3 }],
    },
    {
      id: stableRuntimeId("ending", "payment", "deal"),
      outcome: "deal",
      title: "DEAL REACHED",
      text: "Ten now, two next week. Don’t make me chase you.",
      outcomeLead: "You kept the negotiation workable long enough to reach terms.",
      forcedMood: "agreement",
      when: [{ dimension: "trust", comparison: "GTE", value: 2 }],
    },
    {
      id: stableRuntimeId("ending", "payment", "walk_away"),
      outcome: "walk_away",
      title: "NEGOTIATION ENDED",
      text: "Keep your money. We’re finished after tonight.",
      outcomeLead: "You ended the relationship without pushing the exchange into open conflict.",
    },
  ],
});
