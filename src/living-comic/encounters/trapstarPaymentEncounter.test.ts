import { describe, expect, it } from "vitest";
import {
  buildEncounterDesignerView,
  buildEncounterPlayerView,
} from "./presentation";
import {
  applyEncounterChoice,
  createInitialEncounterState,
  currentEncounterDialogue,
  currentEncounterEnding,
} from "./runtime";
import { encounterDefinitionSchema, encounterStateSchema } from "./schema";
import { trapstarPaymentEncounter as encounter } from "./trapstarPaymentEncounter";
import {
  V01_CHOICE_IDS_BY_ROUND,
  V01_ENDING_FACTS,
  V01_PATHS,
} from "./trapstarPaymentEncounter.v01.fixture";
import {
  createInitialNpcEncounterPresentationState,
  enterNpcEncounterSession,
  restartNpcEncounterSession,
  setNpcEncounterDesignerOpen,
} from "../web/npcEncounterPresentationState";

const exactChoiceTexts = [
  [
    "I brought nine. I want to settle the rest.",
    "The delivery was short. Nine is fair.",
    "Take nine or get nothing.",
  ],
  [
    "Give me a week. I’ll bring the other three.",
    "Take ten today and we reset.",
    "You already got more than your share.",
  ],
  [
    "Ten now, two next week, same terms after that.",
    "Nine now. We end clean and go separate ways.",
    "Because you need me more than I need you.",
  ],
] as const;

const exactEffects = [
  [{ trust: 1, tension: 0 }, { trust: 0, tension: 1 }, { trust: -1, tension: 2 }],
  [{ trust: 1, tension: -1 }, { trust: 1, tension: 0 }, { trust: -1, tension: 1 }],
  [{ trust: 1, tension: -1 }, { trust: 0, tension: -1 }, { trust: -1, tension: 2 }],
] as const;

const exactIntentLabels = [
  ["MAKE GOOD", "JUSTIFY", "THREATEN"],
  ["BUY TIME", "RENEGOTIATE", "BLAME"],
  ["OFFER TERMS", "WALK AWAY", "LEVERAGE"],
] as const;

const exactInterpretations = [
  [
    "You acknowledged the shortfall and said you intended to settle the remainder.",
    "You defended the reduced payment by pointing to the short delivery.",
    "You turned the payment into an ultimatum.",
  ],
  [
    "You asked for another week and promised to complete the payment.",
    "You offered a larger immediate payment to reset the arrangement.",
    "You shifted responsibility back onto Marcus.",
  ],
  [
    "You proposed specific repayment terms and continued business afterward.",
    "You proposed ending the relationship without further escalation.",
    "You challenged Marcus’s leverage and authority.",
  ],
] as const;

const choiceId = (roundIndex: number, choiceIndex: number): string =>
  encounter.rounds[roundIndex]!.choices[choiceIndex]!.id;

const play = (choiceIndexes: number[]) => choiceIndexes.reduce(
  (state, index, roundIndex) => applyEncounterChoice(encounter, state, choiceId(roundIndex, index)),
  createInitialEncounterState(encounter),
);

const playFixturePath = (choiceIndexes: readonly [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2]) =>
  choiceIndexes.reduce(
    (state, index, roundIndex) => applyEncounterChoice(
      encounter,
      state,
      V01_CHOICE_IDS_BY_ROUND[roundIndex]![index],
    ),
    createInitialEncounterState(encounter),
  );

describe("Trapstar disputed-payment encounter", () => {
  it("loads as portable validated data with exactly three rounds and three choices each", () => {
    const serialized = JSON.stringify(encounter);
    const restored = encounterDefinitionSchema.parse(JSON.parse(serialized));

    expect(restored).toEqual(encounter);
    expect(encounter.rounds).toHaveLength(3);
    expect(encounter.rounds.every(({ choices }) => choices.length === 3)).toBe(true);
    expect(serialized).not.toMatch(/className|HTMLElement|callback|function|React/);
  });

  it("starts at Trust 0, Tension 0, round one, and the guarded mood", () => {
    const state = createInitialEncounterState(encounter);

    expect(state).toMatchObject({
      roundIndex: 0,
      trust: 0,
      tension: 0,
      mood: "guarded",
      status: "ACTIVE",
      endingId: null,
      latestEffect: null,
    });
    expect(currentEncounterDialogue(encounter, state).text)
      .toBe("You’re late. We said twelve. You got twelve?");
  });

  it("keeps all nine authored choice effects exact and applies each through bounded state", () => {
    expect(encounter.rounds.map(({ choices }) => choices.map(({ effect }) => effect))).toEqual([
      [{ trust: 1, tension: 0 }, { trust: 0, tension: 1 }, { trust: -1, tension: 2 }],
      [{ trust: 1, tension: -1 }, { trust: 1, tension: 0 }, { trust: -1, tension: 1 }],
      [{ trust: 1, tension: -1 }, { trust: 0, tension: -1 }, { trust: -1, tension: 2 }],
    ]);

    const roundBases = [
      createInitialEncounterState(encounter),
      play([1]),
      play([1, 1]),
    ];

    roundBases.forEach((base, roundIndex) => {
      encounter.rounds[roundIndex]!.choices.forEach((choice) => {
        const next = applyEncounterChoice(encounter, base, choice.id);
        const expectedTrust = Math.min(4, Math.max(-2, base.trust + choice.effect.trust));
        const expectedTension = Math.min(4, Math.max(0, base.tension + choice.effect.tension));
        expect({ trust: next.trust, tension: next.tension }).toEqual({
          trust: expectedTrust,
          tension: expectedTension,
        });
        expect(next.latestEffect?.authored).toEqual(choice.effect);
        expect(next.latestEffect?.applied).toEqual({
          trust: expectedTrust - base.trust,
          tension: expectedTension - base.tension,
        });
      });
    });
  });

  it("selects round-two dialogue in tension, trust, then fallback precedence", () => {
    expect(currentEncounterDialogue(encounter, play([2])).text)
      .toBe("You’re standing in my spot talking to me like that?");
    expect(currentEncounterDialogue(encounter, play([0])).text)
      .toBe("At least you’re saying it straight.");
    expect(currentEncounterDialogue(encounter, play([1])).text)
      .toBe("You came here to tell me what my work is worth?");
  });

  it("selects round-three dialogue in tension, trust, then fallback precedence", () => {
    expect(currentEncounterDialogue(encounter, play([2, 1])).text)
      .toBe("One more wrong word and we’re done.");
    expect(currentEncounterDialogue(encounter, play([0, 0])).text)
      .toBe("All right. What exactly are you offering?");
    expect(currentEncounterDialogue(encounter, play([1, 1])).text)
      .toBe("Give me one reason I should keep working with you.");
  });

  it("derives neutral, guarded, angry, and agreement moods from ordered rules", () => {
    expect(createInitialEncounterState(encounter).mood).toBe("guarded");
    expect(play([0]).mood).toBe("neutral");
    expect(play([2]).mood).toBe("angry");
    expect(play([0, 0]).mood).toBe("agreement");
  });

  it("reaches every exact ending and applies ending mood forces", () => {
    const deal = play([0, 0, 0]);
    const walkAway = play([1, 1, 1]);
    const argument = play([2, 2, 2]);

    expect(currentEncounterEnding(encounter, deal)).toMatchObject({
      outcome: "deal",
      title: "DEAL REACHED",
      text: "Ten now, two next week. Don’t make me chase you.",
    });
    expect(deal.mood).toBe("agreement");

    expect(currentEncounterEnding(encounter, walkAway)).toMatchObject({
      outcome: "walk_away",
      title: "NEGOTIATION ENDED",
      text: "Keep your money. We’re finished after tonight.",
    });

    expect(currentEncounterEnding(encounter, argument)).toMatchObject({
      outcome: "argument",
      title: "CONFLICT ESCALATED",
      text: "Get out. The deal is dead.",
    });
    expect(argument).toMatchObject({ trust: -2, tension: 4, mood: "angry" });
    expect(argument.latestEffect).toMatchObject({
      authored: { trust: -1, tension: 2 },
      applied: { trust: 0, tension: 1 },
    });
  });

  it("exhaustively resolves all 27 choice paths with every ending reachable", () => {
    const counts = { deal: 0, walk_away: 0, argument: 0 };
    for (let first = 0; first < 3; first += 1) {
      for (let second = 0; second < 3; second += 1) {
        for (let third = 0; third < 3; third += 1) {
          const ending = currentEncounterEnding(encounter, play([first, second, third]));
          if (!ending) throw new Error("Three choices must finish the encounter.");
          counts[ending.outcome] += 1;
        }
      }
    }

    expect(counts).toEqual({ deal: 6, walk_away: 15, argument: 6 });
  });

  it("keeps encounter-local state out of the player view and exposes it in Designer View", () => {
    const state = play([0]);
    const player = buildEncounterPlayerView(encounter, state);
    const designer = buildEncounterDesignerView(encounter, state);

    expect(JSON.stringify(player)).not.toMatch(/"(?:trust|tension|latestStateEffect)"\s*:/i);
    expect(designer).toMatchObject({
      trust: 1,
      tension: 0,
      mood: "neutral",
      currentRound: "2 / 3",
      latestStateEffect: "Trust +1 · Tension 0",
    });
  });

  it("restarts to a fresh initial state and rejects out-of-node choices", () => {
    const completed = play([2, 2, 2]);
    expect(createInitialEncounterState(encounter)).toEqual(createInitialEncounterState(encounter));
    expect(() => applyEncounterChoice(encounter, completed, choiceId(0, 0)))
      .toThrow("Restart the encounter");
    expect(() => applyEncounterChoice(encounter, createInitialEncounterState(encounter), choiceId(1, 0)))
      .toThrow("is not valid");
  });

  it("adds only validated portable v0.1.1 setup, profile, intent, interpretation, and outcome-lead data", () => {
    const serialized = JSON.stringify(encounter);
    const restored = encounterDefinitionSchema.parse(JSON.parse(serialized));

    expect(restored).toEqual(encounter);
    expect(encounter.version).toBe("trapstar_npc_encounter_v0_1_1");
    expect(encounter.setup).toEqual({
      location: "APARTMENT 305",
      time: "11:42 PM",
      problem: "The shipment came up short.",
      debt: "You owe Marcus “Broker” Hill $1,200.",
      payment: "You brought $900.",
      stakes: "Marcus needs reliable partners, but he cannot afford to look lenient.",
      objective: "Keep the relationship alive—or end it tonight.",
      ctaLabel: "ENTER",
    });
    expect(encounter.npc).toEqual({
      id: "npc_broker",
      name: "Marcus “Broker” Hill",
      role: "Broker",
      motive: "He needs reliable partners because a larger deal is approaching.",
      vulnerability: "He cannot afford to appear lenient.",
      verbalHabit: "He speaks in clipped questions and repeats the number or claim he thinks the other person is avoiding.",
    });
    expect(serialized).not.toMatch(/className|HTMLElement|callback|function|React|DOM|CSS|scene-maker|\.png|artwork/i);
  });

  it("preserves all stable IDs, choice copy, effects, labels, and interpretations exactly", () => {
    expect(encounter.id).toBe("encounter_trapstar_disputed_payment_v0_1");
    expect(encounter.rounds.map(({ id }) => id)).toEqual([
      "round_payment_1",
      "round_payment_2",
      "round_payment_3",
    ]);
    expect(encounter.rounds.map(({ choices }) => choices.map(({ id }) => id)))
      .toEqual(V01_CHOICE_IDS_BY_ROUND);
    expect(encounter.rounds.map(({ choices }) => choices.map(({ text }) => text)))
      .toEqual(exactChoiceTexts);
    expect(encounter.rounds.map(({ choices }) => choices.map(({ effect }) => effect)))
      .toEqual(exactEffects);
    expect(encounter.rounds.map(({ choices }) => choices.map(({ intentLabel }) => intentLabel)))
      .toEqual(exactIntentLabels);
    expect(encounter.rounds.map(({ choices }) => choices.map(({ outcomeInterpretation }) => outcomeInterpretation)))
      .toEqual(exactInterpretations);
  });

  it("preserves exact ordered dialogue, mood, and ending rule precedence", () => {
    expect(encounter.rounds.map(({ dialogue }) => dialogue)).toEqual([
      [{ id: "dialogue_payment_1_opening", text: "You’re late. We said twelve. You got twelve?" }],
      [
        { id: "dialogue_payment_2_high_tension", text: "You’re standing in my spot talking to me like that?", when: [{ dimension: "tension", comparison: "GTE", value: 2 }] },
        { id: "dialogue_payment_2_earned_trust", text: "At least you’re saying it straight.", when: [{ dimension: "trust", comparison: "GTE", value: 1 }] },
        { id: "dialogue_payment_2_default", text: "You came here to tell me what my work is worth?" },
      ],
      [
        { id: "dialogue_payment_3_high_tension", text: "One more wrong word and we’re done.", when: [{ dimension: "tension", comparison: "GTE", value: 2 }] },
        { id: "dialogue_payment_3_earned_trust", text: "All right. What exactly are you offering?", when: [{ dimension: "trust", comparison: "GTE", value: 2 }] },
        { id: "dialogue_payment_3_default", text: "Give me one reason I should keep working with you." },
      ],
    ]);
    expect(encounter.moodRules).toEqual([
      { mood: "angry", when: [{ dimension: "tension", comparison: "GTE", value: 2 }] },
      { mood: "agreement", when: [{ dimension: "trust", comparison: "GTE", value: 2 }] },
      { mood: "guarded", when: [{ dimension: "trust", comparison: "LTE", value: 0 }] },
    ]);
    expect(encounter.endings.map(({ id, outcome, title, text, outcomeLead, forcedMood, when }) => ({ id, outcome, title, text, outcomeLead, forcedMood: forcedMood ?? null, when }))).toEqual([
      { id: "ending_payment_argument", outcome: "argument", title: "CONFLICT ESCALATED", text: "Get out. The deal is dead.", outcomeLead: "The exchange escalated past the point where Marcus would continue negotiating.", forcedMood: "angry", when: [{ dimension: "tension", comparison: "GTE", value: 3 }] },
      { id: "ending_payment_deal", outcome: "deal", title: "DEAL REACHED", text: "Ten now, two next week. Don’t make me chase you.", outcomeLead: "You kept the negotiation workable long enough to reach terms.", forcedMood: "agreement", when: [{ dimension: "trust", comparison: "GTE", value: 2 }] },
      { id: "ending_payment_walk_away", outcome: "walk_away", title: "NEGOTIATION ENDED", text: "Keep your money. We’re finished after tonight.", outcomeLead: "You ended the relationship without pushing the exchange into open conflict.", forcedMood: null, when: undefined },
    ]);
  });

  it("covers every one of the 27 static v0.1 paths exactly once", () => {
    const pathKeys = V01_PATHS.map(({ selectedChoiceIndexes }) => selectedChoiceIndexes.join(""));
    expect(V01_PATHS).toHaveLength(27);
    expect(new Set(pathKeys).size).toBe(27);
  });

  it.each(V01_PATHS)(
    "matches the static v0.1 conformance baseline for path $selectedChoiceIndexes",
    (expected) => {
      let state = createInitialEncounterState(encounter);
      const appliedIds: string[] = [];

      expected.selectedChoiceIndexes.forEach((choiceIndex, roundIndex) => {
        if (roundIndex === 1) {
          expect(currentEncounterDialogue(encounter, state).id).toBe(expected.roundTwoDialogueId);
        }
        if (roundIndex === 2) {
          expect(currentEncounterDialogue(encounter, state).id).toBe(expected.roundThreeDialogueId);
        }
        const selectedId = V01_CHOICE_IDS_BY_ROUND[roundIndex]![choiceIndex];
        appliedIds.push(selectedId);
        state = applyEncounterChoice(encounter, state, selectedId);
        expect(state.selectedChoiceIds).toEqual(appliedIds);
        expect(state.mood).toBe(expected.moodsAfterChoices[roundIndex]);
      });

      const ending = currentEncounterEnding(encounter, state);
      const endingFacts = V01_ENDING_FACTS[expected.outcome];
      expect(state).toMatchObject({
        version: "trapstar_npc_state_v0_1_1",
        trust: expected.finalTrust,
        tension: expected.finalTension,
        mood: expected.finalMood,
        status: "COMPLETE",
        selectedChoiceIds: appliedIds,
      });
      expect(ending).toMatchObject({
        id: endingFacts.id,
        outcome: expected.outcome,
        title: endingFacts.title,
        text: endingFacts.text,
      });
      expect(ending?.forcedMood ?? null).toBe(endingFacts.forcedMood);
    },
  );

  it("keeps ordered choice paths bounded, coherent, immutable on failure, and resettable", () => {
    const initial = createInitialEncounterState(encounter);
    expect(initial.selectedChoiceIds).toEqual([]);
    expect(initial.version).toBe("trapstar_npc_state_v0_1_1");

    const afterOne = applyEncounterChoice(encounter, initial, V01_CHOICE_IDS_BY_ROUND[0][0]);
    expect(afterOne.selectedChoiceIds).toEqual([V01_CHOICE_IDS_BY_ROUND[0][0]]);
    expect(afterOne.selectedChoiceIds).not.toBe(initial.selectedChoiceIds);
    expect(afterOne.selectedChoiceIds).toHaveLength(afterOne.roundIndex);

    const beforeInvalid = structuredClone(afterOne);
    expect(() => applyEncounterChoice(encounter, afterOne, V01_CHOICE_IDS_BY_ROUND[0][1]))
      .toThrow("is not valid");
    expect(afterOne).toEqual(beforeInvalid);

    const completed = playFixturePath([0, 0, 0]);
    expect(completed.selectedChoiceIds).toHaveLength(3);
    expect(() => applyEncounterChoice(encounter, completed, V01_CHOICE_IDS_BY_ROUND[0][0]))
      .toThrow("Restart the encounter");
    expect(createInitialEncounterState(encounter).selectedChoiceIds).toEqual([]);

    expect(encounterStateSchema.safeParse({ ...initial, roundIndex: 1 }).success).toBe(false);
    expect(encounterStateSchema.safeParse({
      ...completed,
      selectedChoiceIds: [...completed.selectedChoiceIds, V01_CHOICE_IDS_BY_ROUND[0][0]],
    }).success).toBe(false);

    const forged = {
      ...afterOne,
      stateId: "npc_state_forged_path",
      selectedChoiceIds: [V01_CHOICE_IDS_BY_ROUND[1][0]],
    };
    expect(() => applyEncounterChoice(encounter, forged, V01_CHOICE_IDS_BY_ROUND[1][1]))
      .toThrow("is not valid for prior round");
  });

  it("includes the full ordered path in deterministic state identity", () => {
    const firstPath = playFixturePath([0, 0, 0]);
    const convergentPath = playFixturePath([0, 1, 0]);
    const replay = playFixturePath([0, 0, 0]);

    expect(firstPath).toMatchObject({ trust: 3, tension: 0, endingId: "ending_payment_deal" });
    expect(convergentPath).toMatchObject({ trust: 3, tension: 0, endingId: "ending_payment_deal" });
    expect(firstPath.latestEffect?.choiceId).toBe(convergentPath.latestEffect?.choiceId);
    expect(firstPath.selectedChoiceIds).not.toEqual(convergentPath.selectedChoiceIds);
    expect(firstPath.stateId).not.toBe(convergentPath.stateId);
    expect(firstPath.stateId).toBe(replay.stateId);
  });

  it("builds exactly three ordered player-safe ending factors for all 27 paths", () => {
    const counts = { deal: 0, walk_away: 0, argument: 0 };

    V01_PATHS.forEach((expected) => {
      const state = playFixturePath(expected.selectedChoiceIndexes);
      const view = buildEncounterPlayerView(encounter, state);
      const ending = currentEncounterEnding(encounter, state)!;
      const expectedFactors = expected.selectedChoiceIndexes.map(
        (choiceIndex, roundIndex) => exactInterpretations[roundIndex]![choiceIndex],
      );
      const summary = [view.ending?.outcomeLead, ...(view.ending?.factors ?? [])].join(" ");

      expect(view.ending?.factors).toEqual(expectedFactors);
      expect(view.ending?.factors).toHaveLength(3);
      expect(summary).not.toMatch(/choice_payment_|Trust|Tension|>=|<=|\+\d|-\d|believed|Belief/i);
      counts[ending.outcome] += 1;
    });

    expect(counts).toEqual({ deal: 6, walk_away: 15, argument: 6 });
  });

  it("keeps numeric encounter state out of player copy and fully shapes Designer View", () => {
    const activeState = applyEncounterChoice(
      encounter,
      createInitialEncounterState(encounter),
      V01_CHOICE_IDS_BY_ROUND[0][0],
    );
    const activePlayer = buildEncounterPlayerView(encounter, activeState);
    const activeJson = JSON.stringify(activePlayer);
    expect(activeJson).not.toMatch(/"(?:trust|tension|effect|roundIndex|progressLabel)"\s*:/i);
    expect(activePlayer).toMatchObject({
      setup: { location: "APARTMENT 305", time: "11:42 PM", ctaLabel: "ENTER" },
      npc: { name: "Marcus “Broker” Hill", role: "Broker", visualMoodToken: "neutral" },
    });

    const state = playFixturePath([0, 1, 0]);
    const designer = buildEncounterDesignerView(encounter, state);
    expect(designer).toMatchObject({
      trust: 3,
      tension: 0,
      mood: "agreement",
      currentRound: "Ending",
      status: "COMPLETE",
      currentNodeId: "ending_payment_deal",
      latestStateEffect: "Trust +1 · Tension -1",
      appliedStateEffect: "Trust +1 · Tension 0",
      selectedChoiceIds: [
        "choice_payment_1_settle_rest",
        "choice_payment_2_ten_today",
        "choice_payment_3_ten_now_two_later",
      ],
      intentPath: ["MAKE GOOD", "RENEGOTIATE", "OFFER TERMS"],
      matchedOutcome: "Deal",
      endingRulePrecedence: [
        "Tension >= 3 → Argument",
        "Else Trust >= 2 → Deal",
        "Else → Walk-away",
      ],
      matchedEndingRule: "Else Trust >= 2 → Deal",
      boundaryNote: "Encounter-local metrics; not Living Comic Belief, Scene Pressure, or History.",
    });
  });

  it("keeps setup entry presentation-only and restart fresh across both state layers", () => {
    const authoritative = createInitialEncounterState(encounter);
    const authoritativeSnapshot = structuredClone(authoritative);
    const setup = createInitialNpcEncounterPresentationState();
    const enteredSession = enterNpcEncounterSession(authoritative, setup);

    expect(enteredSession.presentationState).toEqual({ entered: true, designerOpen: false });
    expect(enteredSession.encounterState).toBe(authoritative);
    expect(enteredSession.encounterState).toEqual(authoritativeSnapshot);

    const progressed = playFixturePath([2, 2, 2]);
    const designerOpen = setNpcEncounterDesignerOpen(enteredSession.presentationState, true);
    expect(progressed.selectedChoiceIds).toHaveLength(3);
    expect(designerOpen).toEqual({ entered: true, designerOpen: true });

    const restartedSession = restartNpcEncounterSession(encounter);
    expect(restartedSession.encounterState).toEqual(authoritativeSnapshot);
    expect(restartedSession.encounterState).not.toBe(progressed);
    expect(restartedSession.presentationState).toEqual({ entered: false, designerOpen: false });
  });
});
